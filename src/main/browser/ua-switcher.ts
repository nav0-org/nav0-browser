import { app } from "electron";

/*
 * User-Agent and Client-Hints normalization.
 *
 * Cloudflare Turnstile (and similar bot-detection systems) cross-check the
 * User-Agent header against the SEC-CH-UA client-hint headers. Electron's
 * default User-Agent contains "Electron/..." and the app name, and Chromium
 * sends SEC-CH-UA headers that reflect Electron's exact Chromium version
 * (e.g. "133.0.6943.53"). That combination is trivially detectable.
 *
 * This module implements the same mitigation used by Min Browser
 * (https://github.com/minbrowser/min/blob/master/main/UASwitcher.js):
 *
 *   1. Rewrite `app.userAgentFallback` to strip the "Electron/..." and
 *      "nav0-browser/..." tokens and zero out the Chrome minor/patch version
 *      numbers (matching Chrome's own User-Agent reduction).
 *   2. Inject SEC-CH-UA / SEC-CH-UA-Mobile / SEC-CH-UA-Platform request
 *      headers that align with whatever User-Agent is actually being sent on
 *      the wire (so Turnstile sees a consistent Chrome profile).
 */

function reduceChromeVersion(version: string): string {
  // "133.0.6943.53" -> "133.0.0.0" (Chrome UA-Reduction form)
  return version
    .split(".")
    .map((part, idx) => (idx === 0 ? part : "0"))
    .join(".");
}

/**
 * Normalize `app.userAgentFallback` so webContents created without an explicit
 * UA override do not leak the "Electron/x.y.z" / "nav0-browser/x.y.z" tokens.
 * Must be called before any BrowserWindow/WebContentsView is created.
 */
export function configureUserAgentFallback(): void {
  const defaultUA = app.userAgentFallback || "";
  const chromeVersion = process.versions.chrome;

  let newUA = defaultUA
    .replace(/nav0-browser\/\S+\s?/i, "")
    .replace(/Nav0\/\S+\s?/i, "")
    .replace(/Electron\/\S+\s?/, "");

  if (chromeVersion) {
    newUA = newUA.replace(chromeVersion, reduceChromeVersion(chromeVersion));
  }

  app.userAgentFallback = newUA.trim();
}

function platformFromUA(ua: string): string {
  if (/Windows/.test(ua)) return '"Windows"';
  if (/Macintosh|Mac OS X/.test(ua)) return '"macOS"';
  if (/Android/.test(ua)) return '"Android"';
  if (/CrOS/.test(ua)) return '"Chrome OS"';
  if (/Linux/.test(ua)) return '"Linux"';
  return '"Unknown"';
}

/**
 * Mutates the given request-header map so SEC-CH-UA* headers are consistent
 * with the User-Agent in the same map. This mirrors what a real Chrome/Edge
 * browser sends and is what Cloudflare Turnstile cross-checks.
 *
 * - For Chrome/Edge UAs: writes matching brand/version client hints.
 * - For Firefox/Safari UAs: strips any SEC-CH-UA headers Chromium may have
 *   auto-populated, since those browsers do not send them.
 */
export function applyClientHints(headers: Record<string, string | string[]>): void {
  const rawUA = headers["User-Agent"] ?? headers["user-agent"] ?? "";
  const ua = Array.isArray(rawUA) ? rawUA[0] : rawUA;
  if (!ua) return;

  const isFirefox = /Firefox\//.test(ua);
  const isSafariOnly = /Safari\//.test(ua) && !/Chrome\/|Chromium\/|Edg\//.test(ua);

  if (isFirefox || isSafariOnly) {
    delete headers["sec-ch-ua"];
    delete headers["Sec-CH-UA"];
    delete headers["sec-ch-ua-mobile"];
    delete headers["Sec-CH-UA-Mobile"];
    delete headers["sec-ch-ua-platform"];
    delete headers["Sec-CH-UA-Platform"];
    return;
  }

  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  if (!chromeMatch) return;
  const chromeMajor = chromeMatch[1];
  const edgeMatch = ua.match(/Edg\/(\d+)/);

  let brandHeader: string;
  if (edgeMatch) {
    const edgeMajor = edgeMatch[1];
    brandHeader = `"Microsoft Edge";v="${edgeMajor}", "Chromium";v="${chromeMajor}", "Not.A/Brand";v="99"`;
  } else {
    brandHeader = `"Google Chrome";v="${chromeMajor}", "Chromium";v="${chromeMajor}", "Not.A/Brand";v="99"`;
  }

  // Delete any pre-existing casing variants to avoid duplicates in the final request.
  delete headers["Sec-CH-UA"];
  delete headers["Sec-CH-UA-Mobile"];
  delete headers["Sec-CH-UA-Platform"];

  headers["sec-ch-ua"] = brandHeader;
  headers["sec-ch-ua-mobile"] = "?0";
  headers["sec-ch-ua-platform"] = platformFromUA(ua);
}

/**
 * Rewrite the `Chrome/x.y.z.w` (and, if present, `Edg/x.y.z.w`) token in a UA
 * preset so its major/minor version matches Electron's ACTUAL Chromium
 * version, with the remaining parts zeroed (Chrome UA-Reduction form).
 *
 * Why this is necessary: the nav0 UA presets hard-code a Chrome major like
 * `Chrome/136.0.0.0`, but Electron ships its own Chromium (e.g. 134). If we
 * call `session.setUserAgent()` with the preset verbatim, then:
 *   - `navigator.userAgent` reports Chrome 136 (from our override)
 *   - `navigator.userAgentData.brands` reports Chromium 134 (from Electron's
 *     real Chromium — this is NOT changeable from the main process)
 * Cloudflare Turnstile reads both JS APIs and flags the drift. By substituting
 * Electron's real Chromium major into the preset string before calling
 * `setUserAgent`, the UA string, userAgentData, and our SEC-CH-UA header all
 * agree on the Chrome major version. Min Browser sidesteps this by never
 * overriding the UA at all; we can't do that without losing the preset
 * feature, so we align versions instead.
 *
 * Platform masquerading (e.g. "Chrome on macOS" from Windows) is preserved —
 * only the Chrome version number changes.
 *
 * Pass-through for non-Chrome presets (Firefox / Safari): the regex simply
 * doesn't match, and the UA is returned unchanged.
 */
export function alignUAWithRealChromeVersion(ua: string): string {
  const chromeVersion = process.versions.chrome;
  if (!ua || !chromeVersion) return ua;
  const reduced = reduceChromeVersion(chromeVersion);
  // Replaces "Chrome/<anything up to whitespace>" — same for Edg/.
  return ua
    .replace(/Chrome\/\S+/g, `Chrome/${reduced}`)
    .replace(/Edg\/\S+/g, `Edg/${reduced}`);
}
