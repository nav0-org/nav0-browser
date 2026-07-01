/**
 * Chrome-style hover URL status bar — injected into a tab's page from the MAIN
 * process via `webContents.executeJavaScript` (see Tab.injectHoverStatusBar).
 *
 * This is the same mechanism reader mode and the custom error page use to render
 * visible DOM into a page. Injecting the equivalent script from a preload does
 * NOT work here: with `sandbox: true`, a preload's `webFrame.executeJavaScript`
 * does not reach the page's main world (verified against Electron 41), so the
 * element was never created — which is why earlier preload-based attempts were
 * invisible.
 *
 * The script runs once per document (guarded by a window flag), watches
 * `mouseover`/`focusin`, resolves the nearest `<a href>`/`<area href>`, and
 * shows the URL in a pill anchored to the bottom-left of the viewport. The pill
 * lives in a closed shadow root with `pointer-events: none`, so page styles
 * (and the ad-blocker's cosmetic CSS) can't touch it and it never intercepts
 * clicks on the content beneath it. Long URLs are truncated at 120 chars.
 *
 * Colours mirror the design tokens (--chrome-2 surface, --border-1 hairline,
 * --fg-2 text, --r-md corner, --shadow-sm) since a page-injected element can't
 * reference global.css. `prefers-reduced-motion` is honoured.
 */
export const HOVER_STATUS_BAR_SCRIPT = `
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
    // display:flex avoids the inline-block descender gap that otherwise leaves a
    // few px below the pill, so it sits flush at the bottom.
    // z-index is one below INT_MAX on purpose: the ad-blocker's cosmetic filter
    // hides any element whose inline style contains the exact "z-index:2147483647"
    // (the value ad overlays use), which would otherwise display:none our bar on
    // every page where ad-blocking runs. 2147483646 is still effectively top-most
    // but sidesteps that rule. Keep it out of the literal 2147483647.
    host.setAttribute(
      'style',
      'all:initial;display:flex;position:fixed;left:0;bottom:0;z-index:2147483646;pointer-events:none;'
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
