import { net } from 'electron';

// Tabs fetch their pages' favicons from the main process, so those requests
// carry no frame or referrer for the ad blocker to judge them by. Each fetch is
// listed here with the page it is for: by URL, and by request id once the ad
// blocker has seen it (a redirect keeps the id).
type FaviconFetch = { url: string; pageUrl: string; requestIds: Set<number> };
const fetchesInFlight = new Set<FaviconFetch>();

/** The page a main-process request is fetching the favicon of, or null. */
export function pageFetchingFavicon(requestId: number, url: string): string | null {
  for (const fetch of fetchesInFlight) {
    if (fetch.requestIds.has(requestId)) return fetch.pageUrl;
  }
  // Each fetch is one request: two pages fetching the same URL each get their
  // own, in the order they started.
  for (const fetch of fetchesInFlight) {
    if (fetch.url === url && fetch.requestIds.size === 0) {
      fetch.requestIds.add(requestId);
      return fetch.pageUrl;
    }
  }
  return null;
}

/** A favicon's bytes and content type. */
export type Favicon = { type: string; bytes: Buffer };

// A favicon request that met a redirect it wouldn't follow.
const REDIRECTED = Symbol('redirected');

// The favicon goes to the chrome, the favicon cache and the saved session.
export const MAX_FAVICON_BYTES = 1024 * 1024;

function isOnOrigin(url: string, origin: string): boolean {
  try {
    return origin !== 'null' && new URL(url).origin === origin;
  } catch {
    return false;
  }
}

// Chromium would follow a redirect to a file: URL, and read the file.
function isWebUrl(url: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

// One request, listed while it runs.
async function listed<T>(url: string, pageUrl: string, request: () => Promise<T>): Promise<T> {
  const fetch: FaviconFetch = { url, pageUrl, requestIds: new Set() };
  fetchesInFlight.add(fetch);
  try {
    return await request();
  } finally {
    fetchesInFlight.delete(fetch);
  }
}

// A favicon request that follows a redirect only where `follow` allows: the
// favicon, null if the server has none to give, or REDIRECTED.
function requestFavicon(
  ses: Electron.Session,
  url: string,
  credentials: 'include' | 'omit',
  follow: (url: string) => boolean
) {
  return new Promise<Favicon | null | typeof REDIRECTED>((resolve, reject) => {
    const request = net.request({ url, session: ses, credentials, redirect: 'manual' });
    request.on('redirect', (statusCode, method, redirectUrl) => {
      if (follow(redirectUrl)) request.followRedirect();
      else resolve(REDIRECTED);
    });
    request.on('response', (response) => {
      response.on('error', reject);
      // An error page is no favicon: don't wait for it.
      if (response.statusCode < 200 || response.statusCode >= 300) {
        resolve(null);
        request.abort();
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('data', (chunk) => {
        chunks.push(chunk);
        size += chunk.length;
        if (size > MAX_FAVICON_BYTES) request.abort();
      });
      response.on('end', () => {
        if (size > MAX_FAVICON_BYTES) return reject(new Error('too large'));
        const header = response.headers['content-type'];
        const type = Array.isArray(header) ? header[0] : header;
        resolve({ type: type || 'image/x-icon', bytes: Buffer.concat(chunks) });
      });
      response.on('aborted', () => reject(new Error('aborted')));
    });
    request.on('abort', () => reject(new Error('aborted')));
    request.on('error', reject);
    request.end();
  });
}

/**
 * Fetches a page's favicon in the page's own session (its proxy, and a private
 * window's in-memory storage), or null if the server has none to give. One on
 * the origin of the page's document (a sandboxed document's is 'null') goes
 * with the cookies the page's own requests carry, so it can share their
 * connection (the only way to reach a site whose certificate the user let
 * through); should it redirect off that origin, it starts over without them,
 * as any other goes. A favicon gets no more credentials than the page's own
 * image would, and never leaves the web.
 */
export async function fetchFavicon(
  ses: Electron.Session,
  url: string,
  pageUrl: string,
  pageOrigin: string
): Promise<Favicon | null> {
  if (isOnOrigin(url, pageOrigin)) {
    const favicon = await listed(url, pageUrl, () =>
      requestFavicon(ses, url, 'include', (to) => isOnOrigin(to, pageOrigin))
    );
    if (favicon !== REDIRECTED) return favicon;
  }
  const favicon = await listed(url, pageUrl, () => requestFavicon(ses, url, 'omit', isWebUrl));
  return favicon === REDIRECTED ? null : favicon;
}
