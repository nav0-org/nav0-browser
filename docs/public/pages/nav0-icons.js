// Shared lucide icon initialization for all Nav0 pages.
// Pages should include lucide via:
//   <script src="https://unpkg.com/lucide@0.475.0/dist/umd/lucide.min.js"></script>
//   <script src="nav0-icons.js" defer></script>

(function () {
  function initIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({ attrs: { 'stroke-width': 1.75 } });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIcons);
  } else {
    initIcons();
  }
  // Re-run on theme toggle (icons swap inside theme-toggle button)
  window.addEventListener('nav0:theme-changed', initIcons);
})();
