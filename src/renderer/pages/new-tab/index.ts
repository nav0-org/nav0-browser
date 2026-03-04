
import './index.css';
import { initTheme } from '../../common/theme';

import { createIcons, icons } from 'lucide';
createIcons({ icons });
initTheme();

// Handle search input
const searchBar = document.getElementById('search-bar') as HTMLInputElement;
searchBar?.focus();
if (searchBar) {
  searchBar.addEventListener('keypress', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const query = (e.currentTarget as HTMLInputElement).value.trim();
      window.BrowserAPI.navigate(window.BrowserAPI.appWindowId, window.BrowserAPI.tabId, query);
    }
  });
}
