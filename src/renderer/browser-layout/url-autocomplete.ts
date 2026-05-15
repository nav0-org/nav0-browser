import { createIcons, icons } from 'lucide';

type SuggestionType = 'tab' | 'bookmark' | 'history' | 'search';

type Suggestion = {
  type: SuggestionType;
  title: string;
  url: string;
  faviconUrl?: string | null;
  meta?: string;
  tabId?: string;
};

type TabRecord = { id: string; title: string; url: string; faviconUrl: string | null };
type HistoryRecord = {
  title: string | null;
  url: string;
  faviconUrl: string | null;
  createdDate: string;
};
type BookmarkRecord = HistoryRecord;

const DEBOUNCE_MS = 120;
const MAX_PER_GROUP = 4;

let urlInput: HTMLInputElement;
let bar: HTMLElement;
let resultsContainer: HTMLElement;

let appWindowId = '';
let getActiveTabId: () => string | null = () => null;
let onSelectionEnter: ((url: string) => void) = () => undefined;

let currentResults: Suggestion[] = [];
let activeIndex = -1;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isOpen = false;
let lastQueryAt = 0;
let suppressNextOpen = false;

const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const getFaviconLetter = (url: string): string => {
  try {
    return new URL(url).hostname.replace('www.', '').charAt(0).toUpperCase() || '?';
  } catch {
    return url.charAt(0).toUpperCase() || '?';
  }
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const renderResults = () => {
  resultsContainer.innerHTML = '';

  if (currentResults.length === 0) {
    closeDropdown();
    return;
  }

  const fragment = document.createDocumentFragment();

  const addSection = (title: string, type: SuggestionType) => {
    const items = currentResults.filter((r) => r.type === type);
    if (items.length === 0) return;
    const heading = document.createElement('div');
    heading.className = 'url-ac-section-title';
    heading.textContent = title;
    fragment.appendChild(heading);
    items.forEach((item) => {
      const idx = currentResults.indexOf(item);
      fragment.appendChild(buildItemElement(item, idx));
    });
  };

  addSection('Open Tabs', 'tab');
  addSection('Bookmarks', 'bookmark');
  addSection('History', 'history');

  const searchItems = currentResults.filter((r) => r.type === 'search');
  searchItems.forEach((item) => {
    const idx = currentResults.indexOf(item);
    fragment.appendChild(buildItemElement(item, idx));
  });

  resultsContainer.appendChild(fragment);
  createIcons({ icons });
};

const buildItemElement = (item: Suggestion, index: number): HTMLElement => {
  const el = document.createElement('div');
  el.className = `url-ac-item${index === activeIndex ? ' active' : ''}${item.type === 'search' ? ' url-ac-search' : ''}`;
  el.dataset.index = String(index);

  let iconHtml = '';
  if (item.type === 'search') {
    iconHtml = `<div class="url-ac-icon"><i data-lucide="search" width="14" height="14"></i></div>`;
  } else if (item.faviconUrl) {
    iconHtml = `<div class="url-ac-favicon"><img src="${escapeHtml(item.faviconUrl)}" onerror="this.parentElement.textContent='${getFaviconLetter(item.url)}'"></div>`;
  } else if (item.type === 'tab') {
    iconHtml = `<div class="url-ac-icon"><i data-lucide="app-window" width="14" height="14"></i></div>`;
  } else if (item.type === 'bookmark') {
    iconHtml = `<div class="url-ac-icon"><i data-lucide="bookmark" width="14" height="14"></i></div>`;
  } else {
    iconHtml = `<div class="url-ac-favicon">${getFaviconLetter(item.url)}</div>`;
  }

  const subtitle = item.type === 'search' ? (item.meta || '') : item.url;

  el.innerHTML = `
    ${iconHtml}
    <div class="url-ac-content">
      <div class="url-ac-title">${escapeHtml(item.title)}</div>
      ${subtitle ? `<div class="url-ac-subtitle">${escapeHtml(subtitle)}</div>` : ''}
    </div>
    ${item.meta && item.type !== 'search' ? `<div class="url-ac-meta">${escapeHtml(item.meta)}</div>` : ''}
  `;

  el.addEventListener('mousedown', (e) => {
    e.preventDefault();
    selectSuggestion(item);
  });
  el.addEventListener('mouseenter', () => {
    setActiveIndex(index, false);
  });

  return el;
};

const setActiveIndex = (index: number, scroll: boolean) => {
  activeIndex = index;
  const items = resultsContainer.querySelectorAll<HTMLElement>('.url-ac-item');
  items.forEach((el) => {
    const i = parseInt(el.dataset.index || '-1', 10);
    el.classList.toggle('active', i === activeIndex);
    if (scroll && i === activeIndex) {
      el.scrollIntoView({ block: 'nearest' });
    }
  });
};

const navigate = (direction: number) => {
  if (currentResults.length === 0) return;
  const next = (activeIndex + direction + currentResults.length) % currentResults.length;
  setActiveIndex(next, true);
};

const openDropdown = () => {
  bar.style.display = 'flex';
  if (isOpen) {
    // Already open — just trigger a resize because content height may have changed
    window.dispatchEvent(new Event('resize'));
    return;
  }
  isOpen = true;
  window.dispatchEvent(new Event('resize'));
};

const closeDropdown = () => {
  if (!isOpen) return;
  isOpen = false;
  activeIndex = -1;
  currentResults = [];
  resultsContainer.innerHTML = '';
  bar.style.display = 'none';
  window.dispatchEvent(new Event('resize'));
};

const selectSuggestion = (item: Suggestion) => {
  if (item.type === 'tab' && item.tabId) {
    window.BrowserAPI.activateTab(appWindowId, item.tabId, true);
    closeDropdown();
    urlInput.blur();
    return;
  }
  if (item.type === 'search') {
    window.BrowserAPI.getSearchUrl(item.title).then((searchUrl: string) => {
      onSelectionEnter(searchUrl);
      closeDropdown();
      urlInput.blur();
    });
    return;
  }
  onSelectionEnter(item.url);
  closeDropdown();
  urlInput.blur();
};

const fetchSuggestions = async (query: string) => {
  const requestedAt = Date.now();
  lastQueryAt = requestedAt;
  const trimmed = query.trim();

  try {
    if (!trimmed) {
      const [openTabs, history] = await Promise.all([
        window.BrowserAPI.fetchOpenTabs(appWindowId),
        window.BrowserAPI.fetchBrowsingHistory(appWindowId, '', 6, 0),
      ]);
      if (requestedAt !== lastQueryAt) return;

      const results: Suggestion[] = [];
      const activeTabId = getActiveTabId();
      openTabs
        .filter((tab: TabRecord) => tab.id !== activeTabId)
        .slice(0, MAX_PER_GROUP)
        .forEach((tab: TabRecord) => {
          results.push({
            type: 'tab',
            title: tab.title || tab.url || 'New Tab',
            url: tab.url || '',
            faviconUrl: tab.faviconUrl,
            meta: 'Switch to tab',
            tabId: tab.id,
          });
        });
      history.forEach((record: HistoryRecord) => {
        results.push({
          type: 'history',
          title: record.title || record.url,
          url: record.url,
          faviconUrl: record.faviconUrl,
          meta: formatDate(record.createdDate),
        });
      });

      currentResults = results;
      activeIndex = results.length > 0 ? 0 : -1;
      renderResults();
      if (results.length > 0) openDropdown();
      else closeDropdown();
      return;
    }

    const [openTabs, bookmarks, history] = await Promise.all([
      window.BrowserAPI.fetchOpenTabs(appWindowId),
      window.BrowserAPI.fetchBookmarks(appWindowId, trimmed, MAX_PER_GROUP, 0),
      window.BrowserAPI.fetchBrowsingHistory(appWindowId, trimmed, MAX_PER_GROUP, 0),
    ]);
    if (requestedAt !== lastQueryAt) return;

    const lower = trimmed.toLowerCase();
    const activeTabId = getActiveTabId();
    const results: Suggestion[] = [];

    openTabs
      .filter((tab: TabRecord) => {
        if (tab.id === activeTabId) return false;
        const t = (tab.title || '').toLowerCase();
        const u = (tab.url || '').toLowerCase();
        return t.includes(lower) || u.includes(lower);
      })
      .slice(0, MAX_PER_GROUP)
      .forEach((tab: TabRecord) => {
        results.push({
          type: 'tab',
          title: tab.title || tab.url || 'New Tab',
          url: tab.url || '',
          faviconUrl: tab.faviconUrl,
          meta: 'Switch to tab',
          tabId: tab.id,
        });
      });

    bookmarks.forEach((record: BookmarkRecord) => {
      results.push({
        type: 'bookmark',
        title: record.title || record.url,
        url: record.url,
        faviconUrl: record.faviconUrl,
        meta: formatDate(record.createdDate),
      });
    });

    history.forEach((record: HistoryRecord) => {
      results.push({
        type: 'history',
        title: record.title || record.url,
        url: record.url,
        faviconUrl: record.faviconUrl,
        meta: formatDate(record.createdDate),
      });
    });

    results.push({
      type: 'search',
      title: trimmed,
      url: '',
      meta: 'Search with default search engine',
    });

    currentResults = results;
    activeIndex = results.length > 0 ? 0 : -1;
    renderResults();
    openDropdown();
  } catch {
    if (requestedAt !== lastQueryAt) return;
    currentResults = [
      {
        type: 'search',
        title: trimmed,
        url: '',
        meta: 'Search with default search engine',
      },
    ];
    activeIndex = 0;
    renderResults();
    openDropdown();
  }
};

const handleInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  const query = urlInput.value;
  debounceTimer = setTimeout(() => fetchSuggestions(query), DEBOUNCE_MS);
};

const handleFocus = () => {
  if (suppressNextOpen) {
    suppressNextOpen = false;
    return;
  }
  urlInput.select();
  fetchSuggestions(urlInput.value);
};

const handleBlur = () => {
  // Delay so click on a result can fire first
  setTimeout(() => {
    if (document.activeElement !== urlInput) closeDropdown();
  }, 100);
};

const handleKeydown = (e: KeyboardEvent) => {
  if (!isOpen) return;
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      navigate(1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      navigate(-1);
      break;
    case 'Escape':
      e.preventDefault();
      closeDropdown();
      break;
    case 'Tab':
      closeDropdown();
      break;
    default:
      break;
  }
};

const handleDocumentMouseDown = (e: MouseEvent) => {
  if (!isOpen) return;
  const target = e.target as HTMLElement;
  if (target.closest('#url-autocomplete-bar') || target === urlInput) return;
  closeDropdown();
};

export type UrlAutocompleteOptions = {
  appWindowId: string;
  urlInput: HTMLInputElement;
  getActiveTabId: () => string | null;
  onSelectionEnter: (url: string) => void;
};

export function initUrlAutocomplete(opts: UrlAutocompleteOptions): {
  hasOpenSuggestion: () => boolean;
  getActiveSuggestionUrl: () => string | null;
  consumeActiveSuggestion: () => Suggestion | null;
  close: () => void;
} {
  appWindowId = opts.appWindowId;
  urlInput = opts.urlInput;
  getActiveTabId = opts.getActiveTabId;
  onSelectionEnter = opts.onSelectionEnter;

  bar = document.getElementById('url-autocomplete-bar') as HTMLElement;
  resultsContainer = document.getElementById('url-autocomplete-results') as HTMLElement;

  urlInput.addEventListener('focus', handleFocus);
  urlInput.addEventListener('blur', handleBlur);
  urlInput.addEventListener('input', handleInput);
  urlInput.addEventListener('keydown', handleKeydown);
  document.addEventListener('mousedown', handleDocumentMouseDown);

  return {
    hasOpenSuggestion: () => isOpen && activeIndex >= 0 && activeIndex < currentResults.length,
    getActiveSuggestionUrl: () => {
      if (activeIndex < 0 || activeIndex >= currentResults.length) return null;
      return currentResults[activeIndex].url || null;
    },
    consumeActiveSuggestion: () => {
      if (activeIndex < 0 || activeIndex >= currentResults.length) return null;
      const item = currentResults[activeIndex];
      selectSuggestion(item);
      return item;
    },
    close: () => {
      suppressNextOpen = true;
      closeDropdown();
    },
  };
}
