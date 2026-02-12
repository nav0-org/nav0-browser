
import './index.css';
import { createIcons, icons } from 'lucide';

type ResultItem = {
  type: 'bookmark' | 'history' | 'download' | 'search';
  title: string;
  url: string;
  faviconUrl?: string;
  meta?: string;
};

let activeFilter: 'all' | 'bookmarks' | 'history' | 'downloads' = 'all';
let activeIndex = -1;
let currentResults: ResultItem[] = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const init = () => {
  document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const resultsContainer = document.getElementById('results-container') as HTMLElement;
    const emptyState = document.getElementById('empty-state') as HTMLElement;
    const loadingIndicator = document.getElementById('loading-indicator') as HTMLElement;
    const actionButtons = document.querySelectorAll<HTMLButtonElement>('.action-btn');

    createIcons({ icons });

    searchInput?.focus();

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
      } else if (item.faviconUrl) {
        iconHtml = `<div class="result-favicon"><img src="${item.faviconUrl}" onerror="this.parentElement.textContent='${getFaviconLetter(item.url)}'"></div>`;
      } else {
        iconHtml = `<div class="result-favicon">${getFaviconLetter(item.url)}</div>`;
      }

      let metaHtml = '';
      if (item.meta) {
        metaHtml = `<div class="result-meta"><span>${item.meta}</span></div>`;
      }

      let urlHtml = '';
      if (item.type !== 'search') {
        urlHtml = `<div class="result-url">${item.url}</div>`;
      }

      el.innerHTML = `
        ${iconHtml}
        <div class="result-content">
          <div class="result-title">${item.title}</div>
          ${urlHtml}
          ${metaHtml}
        </div>
        <div class="keyboard-shortcut">
          ${index < 9 ? `<span class="key">${index + 1}</span>` : ''}
        </div>
      `;

      el.addEventListener('click', () => {
        openResult(item);
      });

      return el;
    };

    const openResult = (item: ResultItem) => {
      if (item.type === 'search') {
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
      const dynamicElements = resultsContainer.querySelectorAll('.section-title, .result-item, .no-results');
      dynamicElements.forEach(el => el.remove());

      if (results.length === 0 && !query) {
        emptyState.style.display = 'flex';
        loadingIndicator.style.display = 'none';
        return;
      }

      emptyState.style.display = 'none';
      loadingIndicator.style.display = 'none';

      // Group results by type
      const bookmarks = results.filter(r => r.type === 'bookmark');
      const history = results.filter(r => r.type === 'history');
      const downloads = results.filter(r => r.type === 'download');
      const searchItems = results.filter(r => r.type === 'search');

      const fragment = document.createDocumentFragment();
      let globalIndex = 0;

      const addSection = (title: string, items: ResultItem[]) => {
        if (items.length === 0) return;
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'section-title';
        sectionTitle.textContent = title;
        fragment.appendChild(sectionTitle);

        items.forEach(item => {
          const idx = results.indexOf(item);
          fragment.appendChild(createResultItemElement(item, idx));
          globalIndex++;
        });
      };

      addSection('Bookmarks', bookmarks);
      addSection('Browsing History', history);
      addSection('Downloads', downloads);

      // Search engine item at the end
      searchItems.forEach(item => {
        const idx = results.indexOf(item);
        fragment.appendChild(createResultItemElement(item, idx));
      });

      resultsContainer.insertBefore(fragment, emptyState);

      // Re-initialize lucide icons for dynamically added elements
      createIcons({ icons });
    };

    const performSearch = async (query: string) => {
      if (!query.trim()) {
        // Show recent history when no query
        try {
          const history = await window.BrowserAPI.fetchBrowsingHistory(window.BrowserAPI.appWindowId, '', 10, 0);
          const results: ResultItem[] = history.map((record: any) => ({
            type: 'history' as const,
            title: record.title || record.url,
            url: record.url,
            faviconUrl: record.faviconUrl,
            meta: formatDate(record.createdDate),
          }));
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

        // Fetch data based on active filter
        const fetchBookmarks = (activeFilter === 'all' || activeFilter === 'bookmarks')
          ? window.BrowserAPI.fetchBookmarks(window.BrowserAPI.appWindowId, query, 5, 0)
          : Promise.resolve([]);

        const fetchHistory = (activeFilter === 'all' || activeFilter === 'history')
          ? window.BrowserAPI.fetchBrowsingHistory(window.BrowserAPI.appWindowId, query, 5, 0)
          : Promise.resolve([]);

        const fetchDownloads = (activeFilter === 'all' || activeFilter === 'downloads')
          ? window.BrowserAPI.fetchDownloads(window.BrowserAPI.appWindowId, query, 5, 0)
          : Promise.resolve([]);

        const [bookmarks, history, downloads] = await Promise.all([
          fetchBookmarks,
          fetchHistory,
          fetchDownloads,
        ]);

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
        renderResults([{
          type: 'search',
          title: query,
          url: '',
          meta: 'Search with default search engine',
        }], query);
      }
    };

    // Filter button handling
    actionButtons.forEach(button => {
      button.addEventListener('click', () => {
        actionButtons.forEach(b => b.classList.remove('primary'));
        button.classList.add('primary');
        activeFilter = (button.dataset.filter as typeof activeFilter) || 'all';
        // Re-run search with current query
        const query = searchInput.value;
        performSearch(query);
      });
    });

    // Keyboard navigation
    const navigateResults = (direction: number) => {
      if (currentResults.length === 0) return;

      const resultElements = resultsContainer.querySelectorAll<HTMLElement>('.result-item');
      resultElements.forEach(item => item.classList.remove('active'));

      activeIndex = (activeIndex + direction) % currentResults.length;
      if (activeIndex < 0) activeIndex = currentResults.length - 1;

      resultElements[activeIndex]?.classList.add('active');
      resultElements[activeIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.metaKey) {
        window.BrowserAPI.hideCommandKOverlay(window.BrowserAPI.appWindowId);
        return;
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          navigateResults(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          navigateResults(-1);
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
        default:
          // For number keys 1-9, select the corresponding result
          if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            const index = parseInt(e.key) - 1;
            if (index < currentResults.length) {
              e.preventDefault();
              openResult(currentResults[index]);
            }
          }
          break;
      }
    };

    searchInput?.addEventListener('keydown', handleKeydown);

    // Live search with debounce
    const handleInput = () => {
      const query = searchInput.value;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        performSearch(query);
      }, 200);
    };

    searchInput?.addEventListener('input', handleInput);

    // Click outside to close
    const handleDocumentClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.command-container')) {
        window.BrowserAPI.hideCommandKOverlay(window.BrowserAPI.appWindowId);
      }
    };

    document.addEventListener('click', handleDocumentClick);

    // Load initial results (recent history)
    performSearch('');
  });
};

init();
