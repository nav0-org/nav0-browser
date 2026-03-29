
import { HtmlUtils } from '../../../renderer/common/html-utils';
import { BookmarkRecord } from '../../../types/bookmark-record';
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

const PAGE_SIZE = 50;
let currentOffset = 0;
let isLoading = false;
let hasMore = true;
let currentSearchTerm = '';
let allLoadedItems: BookmarkRecord[] = [];

const bookmarksListContainer = document.getElementById('bookmarks-list') as HTMLElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;

document.addEventListener('DOMContentLoaded', async() => {
  loadBookmarksPage();

  document.getElementById('delete-all')?.addEventListener('click', async () => {
    await window.BrowserAPI.removeAllBookmarks(window.BrowserAPI.appWindowId);
    bookmarksListContainer.innerHTML = '';
    allLoadedItems = [];
    document.getElementById('no-bookmarks').style.display = 'block';
    document.getElementById('delete-all').style.display = 'none';
  });

  const debouncedSearchHandler = HtmlUtils.debounce(() => {
    resetAndReload();
  }, 300);
  document.getElementById('search-input')?.addEventListener('input', debouncedSearchHandler);

  bookmarksListContainer.addEventListener('scroll', () => {
    if (isLoading || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = bookmarksListContainer;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadBookmarksPage();
    }
  });
});

const resetAndReload = () => {
  currentOffset = 0;
  hasMore = true;
  allLoadedItems = [];
  bookmarksListContainer.innerHTML = '';
  loadBookmarksPage();
};

const loadBookmarksPage = async (): Promise<void> => {
  if (isLoading || !hasMore) return;
  isLoading = true;
  currentSearchTerm = searchInput.value || '';

  showLoadingIndicator();

  const bookmarksData: Array<BookmarkRecord> = await window.BrowserAPI.fetchBookmarks(
    window.BrowserAPI.appWindowId, currentSearchTerm, PAGE_SIZE, currentOffset
  );

  removeLoadingIndicator();

  if (bookmarksData.length < PAGE_SIZE) {
    hasMore = false;
  }

  if (currentOffset === 0 && bookmarksData.length === 0) {
    document.getElementById('no-bookmarks').style.display = 'block';
    document.getElementById('delete-all').style.display = 'none';
    isLoading = false;
    return;
  } else {
    document.getElementById('no-bookmarks').style.display = 'none';
    document.getElementById('delete-all').style.display = 'block';
  }

  allLoadedItems = allLoadedItems.concat(bookmarksData);
  currentOffset += bookmarksData.length;

  appendBookmarkItems(bookmarksData);
  isLoading = false;
};

const appendBookmarkItems = (items: BookmarkRecord[]): void => {
  items.forEach(item => {
    const bookmarkItem = document.createElement('div');
    bookmarkItem.className = 'bookmark-item';

    bookmarkItem.innerHTML = `
      <div><img src="${item.faviconUrl}" alt="" class="bookmark-favicon" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'"></div>
      <div class="bookmark-content">
        <div class="bookmark-title">${item.title}</div>
        <div class="bookmark-domain">${item.url}</div>
      </div>
      <div>
        <button class="bookmark-button">
          <i data-lucide="bookmark-x" width="14" height="14"></i>
        </button>
      </div>
    `;

    bookmarkItem.querySelector('.bookmark-button')?.addEventListener('click', async (e: Event) => {
      e.stopPropagation();
      await window.BrowserAPI.removeBookmark(window.BrowserAPI.appWindowId, item.id);
      bookmarkItem.remove();
      allLoadedItems.splice(allLoadedItems.indexOf(item), 1);
      if (allLoadedItems.length === 0) {
        document.getElementById('no-bookmarks').style.display = 'block';
        document.getElementById('delete-all').style.display = 'none';
      }
    });

    bookmarkItem.querySelector('.bookmark-content')?.addEventListener('click', async (e: Event) => {
      e.stopPropagation();
      await window.BrowserAPI.createTab(window.BrowserAPI.appWindowId, item.url, true);
    });

    bookmarksListContainer.appendChild(bookmarkItem);
  });

  createIcons({ icons });
};

const showLoadingIndicator = (): void => {
  const loader = document.createElement('div');
  loader.id = 'loading-indicator';
  loader.className = 'loading-indicator';
  loader.textContent = 'Loading...';
  bookmarksListContainer.appendChild(loader);
};

const removeLoadingIndicator = (): void => {
  document.getElementById('loading-indicator')?.remove();
};
