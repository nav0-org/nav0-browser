import { InAppUrls } from '../constants/app-constants';

// How the address bar reads what was typed into it. The main process
// (Tab.loadURL) uses these to decide where Enter goes; the renderer's
// suggestion lists use isNavigableAddressInput to leave out the "search" row
// for input Enter would open as a URL. Keep both in step: a new kind of input
// that Tab.loadURL navigates to belongs in isNavigableAddressInput as well.

// Anything without whitespace that contains a dot, such as `github.com`.
// There is no TLD list, so `node.js` and `3.14` match too.
export const DOMAIN_PATTERN = /^[^\s]+\.[^\s]+$/;

// Protocols handed off to the OS default handler: communication (mailto,
// tel, sms), calendar (webcal), and common app deep-links (slack, zoom,
// teams, discord, vscode, etc.).
export const EXTERNAL_PROTOCOL_RE =
  /^(mailto|tel|callto|sms|facetime|webcal|slack|zoommtg|zoomus|msteams|discord|spotify|vscode|vscode-insiders|obsidian|notion|figma|linear|raycast):/i;

// The built-in pages Tab.loadURL opens by their Nav0:// URL.
const BUILT_IN_PAGE_URLS = [
  InAppUrls.BOOKMARKS,
  InAppUrls.BROWSER_SETTINGS,
  InAppUrls.DOWNLOADS,
  InAppUrls.HISTORY,
  InAppUrls.NEW_TAB,
  InAppUrls.ABOUT,
];

/**
 * Detects address-bar input that should be treated as a local URL even
 * without an http:// scheme — e.g. `localhost:3000`, `127.0.0.1/foo`,
 * `myapp.local`, `backend.test`. Returning true routes the input to a
 * direct HTTP navigation instead of a search fallback + https upgrade.
 */
export function looksLikeLocalhostInput(input: string): boolean {
  if (!input) return false;
  const raw = input.trim();
  if (!raw || /\s/.test(raw)) return false;
  // Split off path/query to isolate the authority portion
  const authority = raw.split(/[/?#]/, 1)[0];
  if (!authority) return false;
  // Strip port
  let host = authority;
  const portIdx = host.lastIndexOf(':');
  if (portIdx > -1 && /^\d+$/.test(host.slice(portIdx + 1))) {
    host = host.slice(0, portIdx);
  }
  host = host.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    host === '::1'
  )
    return true;
  // Loopback / link-local TLDs commonly used for local dev and intranet
  if (
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.test') ||
    host.endsWith('.lan') ||
    host.endsWith('.internal') ||
    host.endsWith('.home.arpa')
  )
    return true;
  return false;
}

/**
 * True when pressing Enter on this input opens it as an address (a built-in
 * page, an app link, a file, a web URL, a local host or a bare domain), false
 * when it searches the default engine with it.
 */
export function isNavigableAddressInput(input: string): boolean {
  const value = input.trim();
  if (!value) return false;
  return (
    BUILT_IN_PAGE_URLS.some((pageUrl) => value.startsWith(pageUrl)) ||
    EXTERNAL_PROTOCOL_RE.test(value) ||
    value.startsWith('file://') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    looksLikeLocalhostInput(value) ||
    DOMAIN_PATTERN.test(value)
  );
}
