/**
 * In-page hover status bar (Chrome-style).
 *
 * When the user hovers (or keyboard-focuses) a link, its URL is shown in a
 * small pill anchored to the bottom-left of the viewport, and hidden again when
 * the pointer/focus leaves the link. Long URLs are truncated with an ellipsis.
 *
 * Implementation: we inject a small, self-contained script into the page's
 * MAIN world via `webFrame.executeJavaScript`. This is the same mechanism the
 * Google `chrome.runtime` stub uses in web-content-preload.ts — it runs in the
 * page's own world (where DOM nodes reliably render, unlike the isolated
 * preload world) and bypasses page CSP entirely. The bar lives in a closed
 * shadow root attached to <html> with `pointer-events: none`, so page styles
 * can't touch it and it never intercepts clicks on the content beneath it.
 *
 * Shared by every preload that backs a tab's page (web content + built-in
 * pages).
 */

import { webFrame } from 'electron';

// The bootstrap runs in the page's main world. Keep it ES5-ish and fully
// self-contained — it can reference nothing from this module. `…` is the
// truncation ellipsis; 120 is the max URL length before truncating.
const STATUS_BAR_BOOTSTRAP = `
(function () {
  if (window.__nav0HoverBarInstalled) return;
  window.__nav0HoverBarInstalled = true;

  var MAX = 120;
  var HOST_ID = '__nav0-hover-status-bar';
  var CSS =
    ":host{all:initial}" +
    ".bar{display:inline-block;box-sizing:border-box;max-width:60vw;" +
    "padding:3px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;" +
    "font-size:12px;line-height:1.4;color:#333333;background:#fbfaf8;" +
    "border-top:1px solid #dcd9d4;border-right:1px solid #dcd9d4;border-top-right-radius:4px;" +
    "box-shadow:0 1px 2px rgba(0,0,0,.06);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" +
    "opacity:0;transform:translateY(2px);transition:opacity 90ms ease,transform 90ms ease}" +
    ".bar.visible{opacity:1;transform:translateY(0)}" +
    "@media (prefers-reduced-motion:reduce){.bar{transition:none;transform:none}.bar.visible{transform:none}}";

  var host = null, label = null, current = '';

  function truncate(u) {
    if (u.length <= MAX) return u;
    return u.slice(0, MAX - 1).replace(/\\s+$/, '') + '…';
  }

  function ensure() {
    var root = document.documentElement;
    if (!root) return false;
    if (host && label && root.contains(host)) return true;
    host = document.createElement('div');
    host.id = HOST_ID;
    host.setAttribute(
      'style',
      'all:initial;position:fixed;left:0;bottom:0;z-index:2147483647;pointer-events:none;'
    );
    var style = document.createElement('style');
    style.textContent = CSS;
    label = document.createElement('div');
    label.className = 'bar';
    if (host.attachShadow) {
      var shadow = host.attachShadow({ mode: 'closed' });
      shadow.appendChild(style);
      shadow.appendChild(label);
    } else {
      host.appendChild(style);
      host.appendChild(label);
    }
    root.appendChild(host);
    return true;
  }

  function render(url) {
    if (url === current) return;
    current = url;
    if (!url) { if (label) label.classList.remove('visible'); return; }
    if (!ensure() || !label) return;
    label.textContent = truncate(url);
    label.classList.add('visible');
  }

  function linkFor(t) {
    if (!t || !t.closest) return '';
    var a = t.closest('a[href], area[href]');
    if (!a) return '';
    var href = a.href;
    if (!href || href.toLowerCase().indexOf('javascript:') === 0) return '';
    return href;
  }

  document.addEventListener('mouseover', function (e) { render(linkFor(e.target)); }, true);
  document.addEventListener('mouseout', function (e) { if (!e.relatedTarget) render(''); }, true);
  window.addEventListener('blur', function () { render(''); });
  document.addEventListener('focusin', function (e) { var u = linkFor(e.target); if (u) render(u); }, true);
  document.addEventListener('focusout', function () { render(''); }, true);
})();
`;

export function installHoverStatusBar(): void {
  try {
    // webFrame.executeJavaScript runs in the page's main world and bypasses CSP.
    webFrame.executeJavaScript(STATUS_BAR_BOOTSTRAP).catch(() => {
      /* page may block; ignore */
    });
  } catch {
    // A preload must never throw into the page.
  }
}
