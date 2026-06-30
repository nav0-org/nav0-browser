/**
 * In-page hover status bar (Chrome-style).
 *
 * When the user hovers (or keyboard-focuses) a link, its URL is shown in a
 * small pill anchored to the bottom-left of the viewport, and hidden again when
 * the pointer/focus leaves the link.
 *
 * The hovered URL comes from two complementary sources, whichever fires:
 *   1. DOM events watched directly here in the preload (`mouseover`/`focusin`),
 *      resolving the nearest `<a href>` / `<area href>`. This is self-contained
 *      and needs nothing from the main process.
 *   2. Chromium's `update-target-url`, forwarded by the Tab over IPC. This is
 *      the canonical browser signal and also covers cases the DOM scan misses.
 * `render()` de-dupes, so the two sources never conflict.
 *
 * The bar lives in a closed shadow root attached to <html> so page styles can't
 * touch it and it can't touch theirs, and the host is `pointer-events: none`
 * so it never intercepts clicks on the content underneath it. The shadow root
 * also makes it immune to page CSP (unlike injected <script> tags).
 *
 * Shared by every preload that backs a tab's page (web content + built-in
 * pages).
 */

import { ipcRenderer } from 'electron';
import { MainToRendererEventsForBrowserIPC } from '../constants/app-constants';

// Truncate URLs longer than this and append an ellipsis. A hard character cap
// keeps the bar compact; the CSS `max-width` below is a secondary guard for
// narrow windows.
const MAX_URL_LENGTH = 120;
const HOST_ID = '__nav0-hover-status-bar';

const STATUS_BAR_CSS = `
:host { all: initial; }
.bar {
  display: inline-block;
  box-sizing: border-box;
  max-width: 60vw;
  padding: 3px 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 12px;
  line-height: 1.4;
  color: #333333;
  background: #fbfaf8;
  border-top: 1px solid #dcd9d4;
  border-right: 1px solid #dcd9d4;
  border-top-right-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  transform: translateY(2px);
  transition: opacity 90ms ease, transform 90ms ease;
}
.bar.visible {
  opacity: 1;
  transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  .bar { transition: none; transform: none; }
  .bar.visible { transform: none; }
}
`;

let hostEl: HTMLElement | null = null;
let labelEl: HTMLElement | null = null;
let currentUrl = '';

function truncateUrl(url: string): string {
  if (url.length <= MAX_URL_LENGTH) return url;
  // Drop any trailing whitespace before the ellipsis. Avoid String.trimEnd()
  // since the project targets ES6 (its lib predates trimEnd).
  return url.slice(0, MAX_URL_LENGTH - 1).replace(/\s+$/, '') + '…';
}

// Lazily build (or rebuild, if the page replaced <html>) the host + shadow DOM.
// Returns false if the document isn't ready enough to attach to yet.
function ensureElements(): boolean {
  const root = document.documentElement;
  if (!root) return false;
  if (hostEl && labelEl && root.contains(hostEl)) return true;

  hostEl = document.createElement('div');
  hostEl.id = HOST_ID;
  hostEl.setAttribute(
    'style',
    'all: initial; position: fixed; left: 0; bottom: 0; z-index: 2147483647; pointer-events: none;'
  );

  const shadow = hostEl.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = STATUS_BAR_CSS;
  labelEl = document.createElement('div');
  labelEl.className = 'bar';

  shadow.appendChild(style);
  shadow.appendChild(labelEl);
  root.appendChild(hostEl);
  return true;
}

function render(url: string): void {
  if (url === currentUrl) return;
  currentUrl = url;
  if (!url) {
    if (labelEl) labelEl.classList.remove('visible');
    return;
  }
  if (!ensureElements() || !labelEl) return;
  labelEl.textContent = truncateUrl(url);
  labelEl.classList.add('visible');
}

// Resolve the link URL for an element the pointer/focus is on, walking up to the
// nearest anchor. `.href` on <a>/<area> is already an absolute, resolved URL.
function linkUrlFor(target: EventTarget | null): string {
  if (!(target instanceof Element)) return '';
  const anchor = target.closest('a[href], area[href]') as
    | HTMLAnchorElement
    | HTMLAreaElement
    | null;
  if (!anchor) return '';
  const href = anchor.href;
  if (!href || href.toLowerCase().startsWith('javascript:')) return '';
  return href;
}

export function installHoverStatusBar(): void {
  try {
    // --- DOM-driven detection (self-contained, CSP-immune) ---
    // Capture phase so we observe the event even if the page stops propagation.
    document.addEventListener(
      'mouseover',
      (e) => {
        render(linkUrlFor(e.target));
      },
      true
    );
    document.addEventListener(
      'mouseout',
      (e: MouseEvent) => {
        // Pointer left the document/window entirely.
        if (!e.relatedTarget) render('');
      },
      true
    );
    window.addEventListener('blur', () => render(''));
    document.addEventListener(
      'focusin',
      (e) => {
        const url = linkUrlFor(e.target);
        if (url) render(url);
      },
      true
    );
    document.addEventListener('focusout', () => render(''), true);
  } catch {
    // A preload must never throw into the page.
  }

  // --- Canonical browser signal, forwarded by the Tab (empty string ⇒ hide) ---
  ipcRenderer.on(MainToRendererEventsForBrowserIPC.TARGET_URL_UPDATED, (_event, url: unknown) => {
    try {
      render(typeof url === 'string' ? url : '');
    } catch {
      // A preload must never throw into the page.
    }
  });
}
