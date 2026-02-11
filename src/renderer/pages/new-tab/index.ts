
import { InAppUrls } from '../../../constants/app-constants';
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

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

// Handle shortcut clicks
document.getElementById('llm-chat')?.addEventListener('click', (e: Event) => {
  e.preventDefault();
  window.BrowserAPI.navigate(window.BrowserAPI.appWindowId, window.BrowserAPI.tabId, InAppUrls.LLM_CHAT + '#/new-conversation?conversationType=llm-chat');
});
document.getElementById('rag-chat')?.addEventListener('click', (e: Event) => {
  e.preventDefault();
  window.BrowserAPI.navigate(window.BrowserAPI.appWindowId, window.BrowserAPI.tabId, InAppUrls.LLM_CHAT + '#/new-conversation?conversationType=rag');
});
document.getElementById('web-research')?.addEventListener('click', (e: Event) => {
  e.preventDefault();
  window.BrowserAPI.navigate(window.BrowserAPI.appWindowId, window.BrowserAPI.tabId, InAppUrls.LLM_CHAT + '#/new-conversation?conversationType=web-research');
});
document.getElementById('browser-agent')?.addEventListener('click', (e: Event) => {
  e.preventDefault();
  window.BrowserAPI.navigate(window.BrowserAPI.appWindowId, window.BrowserAPI.tabId, InAppUrls.LLM_CHAT + '#/new-conversation?conversationType=browser-agent');
});