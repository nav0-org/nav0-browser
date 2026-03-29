
import { HtmlUtils } from '../../../renderer/common/html-utils';
import { FormatUtils } from '../../../renderer/common/format-utils';
import { BrowsingHistoryRecord } from '../../../types/browsing-history-record';
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

const PAGE_SIZE = 50;
let currentOffset = 0;
let isLoading = false;
let hasMore = true;
let currentSearchTerm = '';
let allLoadedItems: BrowsingHistoryRecord[] = [];

const historyListElement = document.getElementById('history-list') as HTMLElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;

document.addEventListener('DOMContentLoaded', async() => {
  loadHistoryPage();

  document.getElementById('delete-all')?.addEventListener('click', async () => {
    await window.BrowserAPI.removeAllBrowsingHistory(window.BrowserAPI.appWindowId);
    historyListElement.innerHTML = '';
    allLoadedItems = [];
    document.getElementById('no-history').style.display = 'block';
    document.getElementById('delete-all').style.display = 'none';
  });

  const debouncedSearchHandler = HtmlUtils.debounce(() => {
    resetAndReload();
  }, 300);
  document.getElementById('search-input')?.addEventListener('input', debouncedSearchHandler);

  historyListElement.addEventListener('scroll', () => {
    if (isLoading || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = historyListElement;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadHistoryPage();
    }
  });
});

const resetAndReload = () => {
  currentOffset = 0;
  hasMore = true;
  allLoadedItems = [];
  historyListElement.innerHTML = '';
  loadHistoryPage();
};

const loadHistoryPage = async (): Promise<void> => {
  if (isLoading || !hasMore) return;
  isLoading = true;
  currentSearchTerm = searchInput.value || '';

  showLoadingIndicator();

  const historyData: Array<BrowsingHistoryRecord> = await window.BrowserAPI.fetchBrowsingHistory(
    window.BrowserAPI.appWindowId, currentSearchTerm, PAGE_SIZE, currentOffset
  );

  removeLoadingIndicator();

  if (historyData.length < PAGE_SIZE) {
    hasMore = false;
  }

  if (currentOffset === 0 && historyData.length === 0) {
    document.getElementById('no-history').style.display = 'block';
    document.getElementById('delete-all').style.display = 'none';
    isLoading = false;
    return;
  } else {
    document.getElementById('no-history').style.display = 'none';
    document.getElementById('delete-all').style.display = 'block';
  }

  allLoadedItems = allLoadedItems.concat(historyData);
  currentOffset += historyData.length;

  appendHistoryItems(historyData);
  isLoading = false;
};

const appendHistoryItems = (items: BrowsingHistoryRecord[]): void => {
  items.forEach(item => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';

    historyItem.innerHTML = `
      <div class="history-time">${FormatUtils.getFriendlyDateString(item.createdDate)}</div>
      <div><img src="${item.faviconUrl}" alt="" class="history-favicon" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'"></div>
      <div class="history-content">
        <div class="history-title" title="${item.title}">${item.title}</div>
        <div class="history-domain">${item.topLevelDomain}</div>
      </div>
      <div>
        <button class="delete-button btn-icon" data-id="${item.id}">
          <i data-lucide="x" width="14" height="14"></i>
        </button>
      </div>
    `;

    historyItem.querySelector('.delete-button')?.addEventListener('click', async (e: Event) => {
      e.stopPropagation();
      await window.BrowserAPI.removeBrowsingHistory(window.BrowserAPI.appWindowId, item.id);
      historyItem.remove();
      allLoadedItems.splice(allLoadedItems.indexOf(item), 1);
      if (allLoadedItems.length === 0) {
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

const showLoadingIndicator = (): void => {
  const loader = document.createElement('div');
  loader.id = 'loading-indicator';
  loader.className = 'loading-indicator';
  loader.textContent = 'Loading...';
  historyListElement.appendChild(loader);
};

const removeLoadingIndicator = (): void => {
  document.getElementById('loading-indicator')?.remove();
};
