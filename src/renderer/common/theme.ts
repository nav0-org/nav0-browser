/**
 * Shared dark mode theme utility.
 * Reads theme from localStorage and listens for cross-window changes.
 */
export function initTheme(): void {
  applyTheme();

  // Listen for theme changes from other windows/BrowserViews
  window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
      applyTheme();
    }
  });
}

function applyTheme(): void {
  const theme = localStorage.getItem('theme');
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}
