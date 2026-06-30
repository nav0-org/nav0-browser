/**
 * In-page hover status bar (Chrome-style).
 *
 * When the user hovers a link, Chromium's `update-target-url` event fires in
 * the main process; the Tab forwards the resolved URL to this page over IPC.
 * We render it in a small pill anchored to the bottom-left of the viewport and
 * hide it again when the URL clears (the event fires with an empty string when
 * the pointer leaves the link).
 *
 * The bar lives in a closed shadow root attached to <html> so page styles can't
 * touch it and it can't touch theirs, and the host is `pointer-events: none`
 * so it never intercepts clicks on the content underneath it.
 *
 * Shared by every preload that backs a tab's page (web content + built-in
 * pages). Chrome / overlay webContents never receive the event — only Tab
 * webContents forward it — so installing it there is an idle no-op.
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
  if (!url) {
    if (labelEl) labelEl.classList.remove('visible');
    return;
  }
  if (!ensureElements() || !labelEl) return;
  labelEl.textContent = truncateUrl(url);
  labelEl.classList.add('visible');
}

export function installHoverStatusBar(): void {
  ipcRenderer.on(MainToRendererEventsForBrowserIPC.TARGET_URL_UPDATED, (_event, url: unknown) => {
    try {
      render(typeof url === 'string' ? url : '');
    } catch {
      // A preload must never throw into the page.
    }
  });
}
