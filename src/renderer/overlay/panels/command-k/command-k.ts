import './command-k.css';
import { createIcons, icons } from 'lucide';

type ResultItem = {
  type: 'tab' | 'bookmark' | 'history' | 'download' | 'search';
  title: string;
  url: string;
  faviconUrl?: string;
  meta?: string;
  tabId?: string;
};

let activeIndex = -1;
let currentResults: ResultItem[] = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

let containerEl: HTMLElement;
let searchInput: HTMLInputElement;
let resultsContainer: HTMLElement;
let emptyState: HTMLElement;
let loadingIndicator: HTMLElement;

const COMMAND_K_HTML = `
  <div class="command-container">
    <!-- Search input area -->
    <div class="search-area">
      <i data-lucide="search" class="search-icon" width="18" height="18"></i>
      <input type="text" id="cmdk-search-input" class="search-input" placeholder="Search tabs, bookmarks, history, downloads or the web..." autofocus>
      <div class="keyboard-hint">
        <span class="key">Tab</span>
        <span class="key">\u2191</span>
        <span class="key">\u2193</span>
        <span class="key">Enter</span>
      </div>
    </div>

    <!-- Results section -->
    <div class="results-container" id="cmdk-results-container">
      <!-- Dynamic results will be rendered here -->

      <!-- Empty state -->
      <div class="empty-state" id="cmdk-empty-state">
        <i data-lucide="search" width="32" height="32"></i>
        <div>Type to search your bookmarks, history, and downloads</div>
      </div>

      <!-- Loading indicator -->
      <div class="loading" id="cmdk-loading-indicator">
        <div class="loader"></div>
        <div>Searching...</div>
      </div>
    </div>
  </div>
`;

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (diffDays === 0) return `Today, ${timeStr}`;
  if (diffDays === 1) return `Yesterday, ${timeStr}`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const getFaviconLetter = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '').charAt(0).toUpperCase();
  } catch {
    return url.charAt(0).toUpperCase();
  }
};

const createResultItemElement = (item: ResultItem, index: number): HTMLElement => {
  const el = document.createElement('div');
  el.className = `result-item${index === activeIndex ? ' active' : ''}${item.type === 'search' ? ' search-engine-item' : ''}`;
  el.dataset.index = String(index);

  let iconHtml = '';
  if (item.type === 'search') {
    iconHtml = `<div class="result-icon"><i data-lucide="search" width="16" height="16"></i></div>`;
  } else if (item.type === 'download') {
    iconHtml = `<div class="result-icon"><i data-lucide="download" width="16" height="16"></i></div>`;
  } else if (item.type === 'tab') {
    if (item.faviconUrl) {
      iconHtml = `<div class="result-favicon"><img src="${escapeHtml(item.faviconUrl)}" onerror="this.parentElement.textContent='${getFaviconLetter(item.url)}'"></div>`;
    } else {
      iconHtml = `<div class="result-icon"><i data-lucide="app-window" width="16" height="16"></i></div>`;
    }
  } else if (item.faviconUrl) {
    iconHtml = `<div class="result-favicon"><img src="${escapeHtml(item.faviconUrl)}" onerror="this.parentElement.textContent='${getFaviconLetter(item.url)}'"></div>`;
  } else {
    iconHtml = `<div class="result-favicon">${getFaviconLetter(item.url)}</div>`;
  }

  let metaHtml = '';
  if (item.meta) {
    metaHtml = `<div class="result-meta"><span>${escapeHtml(item.meta)}</span></div>`;
  }

  let urlHtml = '';
  if (item.type !== 'search') {
    urlHtml = `<div class="result-url">${escapeHtml(item.url)}</div>`;
  }

  const sublineHtml =
    metaHtml || urlHtml ? `<div class="result-subline">${metaHtml}${urlHtml}</div>` : '';

  el.innerHTML = `
    ${iconHtml}
    <div class="result-content">
      <div class="result-title">${escapeHtml(item.title)}</div>
      ${sublineHtml}
    </div>
  `;

  el.addEventListener('click', () => {
    openResult(item);
  });

  return el;
};

const openResult = (item: ResultItem) => {
  if (item.type === 'tab' && item.tabId) {
    window.BrowserAPI.activateTab(window.BrowserAPI.appWindowId, item.tabId, true);
    window.BrowserAPI.hideCommandKOverlay(window.BrowserAPI.appWindowId);
  } else if (item.type === 'search') {
    window.BrowserAPI.getSearchUrl(item.title).then((searchUrl: string) => {
      window.BrowserAPI.createTab(window.BrowserAPI.appWindowId, searchUrl, true);
      window.BrowserAPI.hideCommandKOverlay(window.BrowserAPI.appWindowId);
    });
  } else {
    window.BrowserAPI.createTab(window.BrowserAPI.appWindowId, item.url, true);
    window.BrowserAPI.hideCommandKOverlay(window.BrowserAPI.appWindowId);
  }
};

const renderResults = (results: ResultItem[], query: string) => {
  currentResults = results;
  activeIndex = results.length > 0 ? 0 : -1;

  // Remove all dynamic result elements (keep empty-state and loading)
  const dynamicElements = resultsContainer.querySelectorAll(
    '.section-title, .result-item, .no-results'
  );
  dynamicElements.forEach((el) => el.remove());

  if (results.length === 0 && !query) {
    emptyState.style.display = 'flex';
    loadingIndicator.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  loadingIndicator.style.display = 'none';

  // Group results by type
  const tabs = results.filter((r) => r.type === 'tab');
  const bookmarks = results.filter((r) => r.type === 'bookmark');
  const history = results.filter((r) => r.type === 'history');
  const downloads = results.filter((r) => r.type === 'download');
  const searchItems = results.filter((r) => r.type === 'search');

  const fragment = document.createDocumentFragment();

  const addSection = (title: string, items: ResultItem[]) => {
    if (items.length === 0) return;
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'section-title';
    sectionTitle.textContent = title;
    fragment.appendChild(sectionTitle);

    items.forEach((item) => {
      const idx = results.indexOf(item);
      fragment.appendChild(createResultItemElement(item, idx));
    });
  };

  addSection('Open Tabs', tabs);
  addSection('Bookmarks', bookmarks);
  addSection('Browsing History', history);
  addSection('Downloads', downloads);

  // Search engine item at the end
  searchItems.forEach((item) => {
    const idx = results.indexOf(item);
    fragment.appendChild(createResultItemElement(item, idx));
  });

  resultsContainer.insertBefore(fragment, emptyState);

  // Re-initialize lucide icons for dynamically added elements
  createIcons({ icons });
};

const performSearch = async (query: string) => {
  if (!query.trim()) {
    // Show open tabs + recent history when no query
    try {
      const [openTabs, history] = await Promise.all([
        window.BrowserAPI.fetchOpenTabs(window.BrowserAPI.appWindowId),
        window.BrowserAPI.fetchBrowsingHistory(window.BrowserAPI.appWindowId, '', 10, 0),
      ]);
      const results: ResultItem[] = [];

      openTabs.forEach((tab: any) => {
        results.push({
          type: 'tab',
          title: tab.title || tab.url || 'New Tab',
          url: tab.url || '',
          faviconUrl: tab.faviconUrl,
          meta: 'Switch to tab',
          tabId: tab.id,
        });
      });

      history.forEach((record: any) => {
        results.push({
          type: 'history',
          title: record.title || record.url,
          url: record.url,
          faviconUrl: record.faviconUrl,
          meta: formatDate(record.createdDate),
        });
      });

      renderResults(results, '');
    } catch {
      renderResults([], '');
    }
    return;
  }

  loadingIndicator.style.display = 'block';
  emptyState.style.display = 'none';

  try {
    const results: ResultItem[] = [];
    const lowerQuery = query.toLowerCase();

    const [openTabs, bookmarks, history, downloads] = await Promise.all([
      window.BrowserAPI.fetchOpenTabs(window.BrowserAPI.appWindowId),
      window.BrowserAPI.fetchBookmarks(window.BrowserAPI.appWindowId, query, 5, 0),
      window.BrowserAPI.fetchBrowsingHistory(window.BrowserAPI.appWindowId, query, 5, 0),
      window.BrowserAPI.fetchDownloads(window.BrowserAPI.appWindowId, query, 5, 0),
    ]);

    // Filter tabs client-side by title and URL
    openTabs
      .filter((tab: any) => {
        const title = (tab.title || '').toLowerCase();
        const url = (tab.url || '').toLowerCase();
        return title.includes(lowerQuery) || url.includes(lowerQuery);
      })
      .forEach((tab: any) => {
        results.push({
          type: 'tab',
          title: tab.title || tab.url || 'New Tab',
          url: tab.url || '',
          faviconUrl: tab.faviconUrl,
          meta: 'Switch to tab',
          tabId: tab.id,
        });
      });

    bookmarks.forEach((record: any) => {
      results.push({
        type: 'bookmark',
        title: record.title || record.url,
        url: record.url,
        faviconUrl: record.faviconUrl,
        meta: formatDate(record.createdDate),
      });
    });

    history.forEach((record: any) => {
      results.push({
        type: 'history',
        title: record.title || record.url,
        url: record.url,
        faviconUrl: record.faviconUrl,
        meta: formatDate(record.createdDate),
      });
    });

    downloads.forEach((record: any) => {
      results.push({
        type: 'download',
        title: record.fileName || record.url,
        url: record.url,
        meta: `${record.fileExtension?.toUpperCase() || ''} ${formatFileSize(record.fileSize || 0)} - ${formatDate(record.createdDate)}`,
      });
    });

    // Always add a "Search the web" option at the end
    results.push({
      type: 'search',
      title: query,
      url: '',
      meta: 'Search with default search engine',
    });

    renderResults(results, query);
  } catch (error) {
    loadingIndicator.style.display = 'none';
    // On error, still show the search option
    renderResults(
      [
        {
          type: 'search',
          title: query,
          url: '',
          meta: 'Search with default search engine',
        },
      ],
      query
    );
  }
};

const navigateResults = (direction: number) => {
  if (currentResults.length === 0) return;

  const resultElements = resultsContainer.querySelectorAll<HTMLElement>('.result-item');
  resultElements.forEach((item) => item.classList.remove('active'));

  activeIndex = (activeIndex + direction) % currentResults.length;
  if (activeIndex < 0) activeIndex = currentResults.length - 1;

  resultElements[activeIndex]?.classList.add('active');
  resultElements[activeIndex]?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
  });
};

const handleKeydown = (e: KeyboardEvent) => {
  // Only handle events when this panel is visible
  if (containerEl.hasAttribute('hidden')) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      navigateResults(1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      navigateResults(-1);
      break;
    case 'Tab':
      e.preventDefault();
      if (e.shiftKey) {
        navigateResults(-1);
      } else {
        navigateResults(1);
      }
      break;
    case 'Enter': {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < currentResults.length) {
        openResult(currentResults[activeIndex]);
      } else {
        // No result selected - search the web with the query
        const query = searchInput.value.trim();
        if (query) {
          window.BrowserAPI.getSearchUrl(query).then((searchUrl: string) => {
            window.BrowserAPI.createTab(window.BrowserAPI.appWindowId, searchUrl, true);
            window.BrowserAPI.hideCommandKOverlay(window.BrowserAPI.appWindowId);
          });
        }
      }
      break;
    }
    case 'Escape':
      e.preventDefault();
      window.BrowserAPI.hideCommandKOverlay(window.BrowserAPI.appWindowId);
      break;
  }
};

const handleInput = () => {
  const query = searchInput.value;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performSearch(query);
  }, 200);
};

const handleDocumentClick = (e: Event) => {
  // Only handle events when this panel is visible
  if (containerEl.hasAttribute('hidden')) return;

  const target = e.target as HTMLElement;
  if (!target.closest('.command-container')) {
    window.BrowserAPI.hideCommandKOverlay(window.BrowserAPI.appWindowId);
  }
};

export function init(container: HTMLElement): void {
  containerEl = container;
  container.innerHTML = COMMAND_K_HTML;

  searchInput = container.querySelector('#cmdk-search-input') as HTMLInputElement;
  resultsContainer = container.querySelector('#cmdk-results-container') as HTMLElement;
  emptyState = container.querySelector('#cmdk-empty-state') as HTMLElement;
  loadingIndicator = container.querySelector('#cmdk-loading-indicator') as HTMLElement;

  // Listen at document level so Escape/Tab/arrows work regardless of focus
  document.addEventListener('keydown', handleKeydown);

  // Live search with debounce
  searchInput?.addEventListener('input', handleInput);

  // Click outside to close
  document.addEventListener('click', handleDocumentClick);
}

export function show(_data?: any): void {
  // Reset state
  activeIndex = -1;
  currentResults = [];
  if (debounceTimer) clearTimeout(debounceTimer);

  // Clear and focus search input
  if (searchInput) {
    searchInput.value = '';
    setTimeout(() => searchInput.focus(), 50);
  }

  // Load initial results (open tabs + recent history)
  performSearch('');
}

export function hide(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}
