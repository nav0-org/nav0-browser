import { app } from 'electron';

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
    .split('.')
    .map((part, idx) => (idx === 0 ? part : '0'))
    .join('.');
}

/**
 * Normalize `app.userAgentFallback` so webContents created without an explicit
 * UA override do not leak the "Electron/x.y.z" / "nav0-browser/x.y.z" tokens.
 * Must be called before any BrowserWindow/WebContentsView is created.
 */
export function configureUserAgentFallback(): void {
  const defaultUA = app.userAgentFallback || '';
  const chromeVersion = process.versions.chrome;

  let newUA = defaultUA
    .replace(/nav0-browser\/\S+\s?/i, '')
    .replace(/Nav0\/\S+\s?/i, '')
    .replace(/Electron\/\S+\s?/, '');

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

// Single source of truth for the Chromium brand identity. The SAME list must
// appear in the SEC-CH-UA request header (applyClientHints, below) AND in the
// JS-visible navigator.userAgentData (buildFingerprintAlignmentScript), or bot
// detectors cross-checking the two flag the browser as spoofed.
//
// Why this matters beyond Turnstile: Electron natively reports only "Chromium"
// in navigator.userAgentData.brands (never "Google Chrome") and exposes an
// empty window.chrome. Under the Chrome User-Agent we present, reCAPTCHA's
// client-side botguard reads those JS values, sees "UA says Chrome but brands
// say Chromium and window.chrome is empty", decides the browser is fake, and
// never completes the checkbox handshake — the widget spins until it throws
// "reCAPTCHA Timeout". Unlike the accounts.google.com sign-in fix (a header-only
// Firefox swap that works because Google's SERVER branches on the UA), this
// detection runs in JS, so the fingerprint has to be aligned in the page too.
const GREASE_BRAND = 'Not.A/Brand';
const GREASE_VERSION = '99';

export interface UABrand {
  brand: string;
  version: string;
}

/**
 * The low-entropy SEC-CH-UA brand list implied by a Chrome/Edge User-Agent, in
 * the order a real browser emits it. Returns null for non-Chromium UAs
 * (Firefox/Safari presets), which legitimately expose no brands and no
 * navigator.userAgentData — those must not be given a Chrome fingerprint.
 */
export function buildBrandList(ua: string): UABrand[] | null {
  const chromeMajor = ua.match(/Chrome\/(\d+)/)?.[1];
  if (!chromeMajor) return null;
  const edgeMajor = ua.match(/Edg\/(\d+)/)?.[1];
  const primary: UABrand = edgeMajor
    ? { brand: 'Microsoft Edge', version: edgeMajor }
    : { brand: 'Google Chrome', version: chromeMajor };
  return [
    primary,
    { brand: 'Chromium', version: chromeMajor },
    { brand: GREASE_BRAND, version: GREASE_VERSION },
  ];
}

/**
 * The high-entropy fullVersionList counterpart of buildBrandList: the same
 * brands carrying full `x.y.z.w` versions (the real Chromium version for the
 * Chrome/Edge + Chromium entries).
 */
export function buildFullVersionList(ua: string, fullChromeVersion: string): UABrand[] | null {
  const brands = buildBrandList(ua);
  if (!brands) return null;
  return brands.map((b) => ({
    brand: b.brand,
    version: b.brand === GREASE_BRAND ? `${GREASE_VERSION}.0.0.0` : fullChromeVersion,
  }));
}

function formatBrandList(brands: UABrand[]): string {
  return brands.map((b) => `"${b.brand}";v="${b.version}"`).join(', ');
}

/**
 * Builds a main-world script that aligns the JS-visible fingerprint with the
 * Chrome User-Agent + SEC-CH-UA header we already present: it adds the
 * "Google Chrome" (or "Microsoft Edge") brand to navigator.userAgentData
 * (both `brands` and `getHighEntropyValues()`), and populates window.chrome so
 * it isn't an empty object. Injected at navigation commit in every frame (see
 * Tab) so reCAPTCHA/botguard read a consistent Chrome before they initialise.
 *
 * Returns '' for non-Chromium UAs (Firefox/Safari presets) so their genuinely
 * brand-less fingerprint is left untouched.
 */
export function buildFingerprintAlignmentScript(ua: string): string {
  const brands = buildBrandList(ua);
  if (!brands) return '';
  const fullList = buildFullVersionList(ua, process.versions.chrome) ?? brands;
  const brandsJson = JSON.stringify(brands);
  const fullListJson = JSON.stringify(fullList);
  return `(function(){
  try {
    if (window.__nav0UAAlign) return;
    Object.defineProperty(window, '__nav0UAAlign', { value: true, enumerable: false });
    var brands = ${brandsJson};
    var fullList = ${fullListJson};
    var clone = function(list){ return list.map(function(b){ return { brand: b.brand, version: b.version }; }); };
    var uad = navigator.userAgentData;
    if (uad) {
      // navigator.userAgentData hands back a FRESH instance on every access, so
      // the override has to live on the shared prototype, not on an instance.
      var proto = Object.getPrototypeOf(uad);
      try {
        Object.defineProperty(proto, 'brands', { configurable: true, enumerable: true, get: function(){ return clone(brands); } });
      } catch (e) {}
      var origHEV = proto && proto.getHighEntropyValues;
      if (typeof origHEV === 'function') {
        try {
          Object.defineProperty(proto, 'getHighEntropyValues', {
            configurable: true, writable: true,
            value: function(hints){
              return origHEV.call(this, hints).then(function(v){
                try {
                  if (v && v.brands) v.brands = clone(brands);
                  if (v && v.fullVersionList) v.fullVersionList = clone(fullList);
                } catch (e) {}
                return v;
              });
            },
          });
        } catch (e) {}
      }
    }
    // A Chrome UA with an empty window.chrome is itself a bot tell; give it the
    // stubs real Chrome exposes.
    try {
      var c = window.chrome = window.chrome || {};
      if (!c.runtime) c.runtime = { connect: function(){}, sendMessage: function(){} };
      if (!c.loadTimes) c.loadTimes = function(){ return {}; };
      if (!c.csi) c.csi = function(){ return {}; };
      if (!c.app) c.app = {
        isInstalled: false,
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
        getDetails: function(){ return null; },
        getIsInstalled: function(){ return false; },
      };
    } catch (e) {}
  } catch (e) {}
})();`;
}

/**
 * Mutates the given request-header map so SEC-CH-UA* headers are consistent
 * with the User-Agent in the same map. This mirrors what a real Chrome/Edge
 * browser sends and is what Cloudflare Turnstile cross-checks.
 *
 * - For Chrome/Edge UAs: writes matching brand/version client hints (from the
 *   shared buildBrandList, so the header and the JS fingerprint agree).
 * - For Firefox/Safari UAs: strips any SEC-CH-UA headers Chromium may have
 *   auto-populated, since those browsers do not send them.
 */
export function applyClientHints(headers: Record<string, string | string[]>): void {
  const rawUA = headers['User-Agent'] ?? headers['user-agent'] ?? '';
  const ua = Array.isArray(rawUA) ? rawUA[0] : rawUA;
  if (!ua) return;

  const isFirefox = /Firefox\//.test(ua);
  const isSafariOnly = /Safari\//.test(ua) && !/Chrome\/|Chromium\/|Edg\//.test(ua);

  if (isFirefox || isSafariOnly) {
    delete headers['sec-ch-ua'];
    delete headers['Sec-CH-UA'];
    delete headers['sec-ch-ua-mobile'];
    delete headers['Sec-CH-UA-Mobile'];
    delete headers['sec-ch-ua-platform'];
    delete headers['Sec-CH-UA-Platform'];
    return;
  }

  const brands = buildBrandList(ua);
  if (!brands) return;

  // Delete any pre-existing casing variants to avoid duplicates in the final request.
  delete headers['Sec-CH-UA'];
  delete headers['Sec-CH-UA-Mobile'];
  delete headers['Sec-CH-UA-Platform'];

  headers['sec-ch-ua'] = formatBrandList(brands);
  headers['sec-ch-ua-mobile'] = '?0';
  headers['sec-ch-ua-platform'] = platformFromUA(ua);
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
  return ua.replace(/Chrome\/\S+/g, `Chrome/${reduced}`).replace(/Edg\/\S+/g, `Edg/${reduced}`);
}
