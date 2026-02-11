
import { HtmlUtils } from '../../../renderer/common/html-utils';
import { FormatUtils } from '../../../renderer/common/format-utils';
import { BrowsingHistoryRecord } from '../../../types/browsing-history-record';
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

const historyListElement = document.getElementById('history-list') as HTMLElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;

document.addEventListener('DOMContentLoaded', async() => {
  renderBrowsingHistoryItems();

  document.getElementById('delete-all')?.addEventListener('click', async () => {
    await window.BrowserAPI.removeAllBrowsingHistory(window.BrowserAPI.appWindowId);
    historyListElement.innerHTML = '';
    document.getElementById('no-history').style.display = 'block';
    document.getElementById('delete-all').style.display = 'none';
  });

  const debouncedSearchHandler = HtmlUtils.debounce(renderBrowsingHistoryItems, 300);
  document.getElementById('search-input')?.addEventListener('input', debouncedSearchHandler);
});

const renderBrowsingHistoryItems = async (): Promise<void> => {
  const searchTerm = searchInput.value || '';
  const historyData: Array<BrowsingHistoryRecord> = await window.BrowserAPI.fetchBrowsingHistory(window.BrowserAPI.appWindowId, searchTerm, 1000, 0);
  historyListElement.innerHTML = '';
  if(historyData.length === 0) {
    document.getElementById('no-history').style.display = 'block';
    document.getElementById('delete-all').style.display = 'none';
    return;
  } else { 
    document.getElementById('no-history').style.display = 'none';
    document.getElementById('delete-all').style.display = 'block';
  }
  
  historyData.forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      
      historyItem.innerHTML = `
        <div id="history-content" class="history-time">${FormatUtils.getFriendlyDateString(item.createdDate)}</div>
          <div><img src="${item.faviconUrl}" alt="" class="history-favicon" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'"></div>
          <div class="history-content">
              <div class="history-title" title="${item.title}">${item.title}</div>
              <div class="history-domain">${item.topLevelDomain}</div>
          </div>
          <div>
              <button id="delete-history-button" class="delete-button btn-icon" data-id="${item.id}">
                  <i data-lucide="x" width="16" height="16"></i>
              </button>
          </div>
      `;

      historyItem.querySelector('#delete-history-button')?.addEventListener('click', async (e: Event) => {
        e.stopPropagation(); // Prevent opening the URL
        await window.BrowserAPI.removeBrowsingHistory(window.BrowserAPI.appWindowId, item.id);
        historyItem.remove();
        historyData.splice(historyData.indexOf(item), 1);
        if(historyData.length === 0) {
          document.getElementById('no-history').style.display = 'block';
          document.getElementById('delete-all').style.display = 'none';
        }
      });

      historyItem.querySelector('.history-content')?.addEventListener('click', async (e: Event) => {
        e.stopPropagation(); 
        await window.BrowserAPI.createTab(window.BrowserAPI.appWindowId, item.url, true);
      });

      historyListElement.appendChild(historyItem);
  });
  
  createIcons({ icons });
};
