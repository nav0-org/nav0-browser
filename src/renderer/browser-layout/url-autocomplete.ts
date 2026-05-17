type SuggestionType = 'tab' | 'bookmark' | 'history' | 'search';

type Suggestion = {
  type: SuggestionType;
  title: string;
  url: string;
  faviconUrl?: string | null;
  meta?: string;
  tabId?: string;
  isBookmark?: boolean;
};

type TabRecord = { id: string; title: string; url: string; faviconUrl: string | null };
type HistoryRecord = {
  title: string | null;
  url: string;
  faviconUrl: string | null;
  createdDate: string;
};
type BookmarkRow = {
  title: string | null;
  url: string;
  faviconUrl: string | null;
  createdDate: string;
  type: 'reference' | 'queue';
};

const DEBOUNCE_MS = 120;
const MAX_PER_GROUP = 4;
const DROPDOWN_MAX_HEIGHT = 360;
const ITEM_HEIGHT = 44;

let urlInput: HTMLInputElement;
let appWindowId = '';
let getActiveTabId: () => string | null = () => null;
let onSelectionEnter: (url: string) => void = () => undefined;

let currentResults: Suggestion[] = [];
let activeIndex = -1;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isOpen = false;
let lastQueryAt = 0;
let suppressNextOpen = false;

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

const estimateDropdownHeight = (results: Suggestion[]): number => {
  if (results.length === 0) return 0;
  const padding = 16;
  return Math.min(DROPDOWN_MAX_HEIGHT, padding + results.length * ITEM_HEIGHT);
};

const dedupeHistoryByUrl = (history: HistoryRecord[]): HistoryRecord[] => {
  // Keep the entry with the latest createdDate per URL.
  const byUrl = new Map<string, HistoryRecord>();
  for (const record of history) {
    const existing = byUrl.get(record.url);
    if (!existing || new Date(record.createdDate) > new Date(existing.createdDate)) {
      byUrl.set(record.url, record);
    }
  }
  return Array.from(byUrl.values()).sort(
    (a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
  );
};

const computeBounds = () => {
  const addressBar = urlInput.closest('.address-bar') as HTMLElement | null;
  const rect = (addressBar ?? urlInput).getBoundingClientRect();
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.bottom + 4),
    width: Math.round(rect.width),
    height: estimateDropdownHeight(currentResults),
  };
};

const pushToOverlay = (showIfHidden: boolean) => {
  const payload = {
    results: currentResults,
    activeIndex,
  };
  if (!isOpen) {
    if (!showIfHidden || currentResults.length === 0) return;
    isOpen = true;
    window.BrowserAPI.showUrlAutocompleteOverlay(appWindowId, {
      bounds: computeBounds(),
      ...payload,
    });
    return;
  }
  // Already open — bounds may have changed if result count changed
  window.BrowserAPI.showUrlAutocompleteOverlay(appWindowId, {
    bounds: computeBounds(),
    ...payload,
  });
};

const closeDropdown = () => {
  if (!isOpen) return;
  isOpen = false;
  activeIndex = -1;
  currentResults = [];
  window.BrowserAPI.hideUrlAutocompleteOverlay(appWindowId);
};

const navigate = (direction: number) => {
  if (currentResults.length === 0) return;
  // From the unselected state (-1), ArrowDown lands on the first item and ArrowUp
  // lands on the last item.
  if (activeIndex < 0) {
    activeIndex = direction > 0 ? 0 : currentResults.length - 1;
  } else {
    activeIndex = (activeIndex + direction + currentResults.length) % currentResults.length;
  }
  pushToOverlay(false);
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
    const [openTabs, bookmarks, history] = await Promise.all([
      window.BrowserAPI.fetchOpenTabs(appWindowId),
      window.BrowserAPI.fetchBookmarks(appWindowId, trimmed, MAX_PER_GROUP * 3, 0),
      window.BrowserAPI.fetchBrowsingHistory(
        appWindowId,
        trimmed,
        trimmed ? MAX_PER_GROUP * 3 : 20,
        0
      ),
    ]);
    if (requestedAt !== lastQueryAt) return;

    const lower = trimmed.toLowerCase();
    const activeTabId = getActiveTabId();
    const results: Suggestion[] = [];

    // Reference bookmarks only — these are what surface as bookmarks in the dropdown
    // and what earn the bookmark icon on the right.
    const referenceBookmarks = (bookmarks as BookmarkRow[]).filter((b) => b.type === 'reference');
    const bookmarkedUrls = new Set(referenceBookmarks.map((b) => b.url));

    openTabs
      .filter((tab: TabRecord) => {
        if (tab.id === activeTabId) return false;
        if (!trimmed) return true;
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
          isBookmark: bookmarkedUrls.has(tab.url || ''),
        });
      });

    referenceBookmarks.slice(0, MAX_PER_GROUP).forEach((record) => {
      results.push({
        type: 'bookmark',
        title: record.title || record.url,
        url: record.url,
        faviconUrl: record.faviconUrl,
        isBookmark: true,
      });
    });

    // History: dedupe by URL (keep latest), drop entries already shown as bookmarks.
    const deduped = dedupeHistoryByUrl(history as HistoryRecord[]);
    deduped
      .filter((record) => !bookmarkedUrls.has(record.url))
      .slice(0, MAX_PER_GROUP)
      .forEach((record) => {
        results.push({
          type: 'history',
          title: record.title || record.url,
          url: record.url,
          faviconUrl: record.faviconUrl,
          meta: formatDate(record.createdDate),
        });
      });

    if (trimmed) {
      results.push({
        type: 'search',
        title: trimmed,
        url: '',
        meta: 'Search with default search engine',
      });
    }

    currentResults = results;
    // Leave no suggestion highlighted by default so pressing Enter navigates to
    // whatever the user typed. They can ArrowDown/ArrowUp to pick a suggestion.
    activeIndex = -1;
    if (results.length > 0) pushToOverlay(true);
    else closeDropdown();
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
    activeIndex = -1;
    pushToOverlay(true);
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
  // Defer slightly so result clicks (which fire mousedown) have time to execute first
  setTimeout(() => {
    if (document.activeElement !== urlInput) closeDropdown();
  }, 150);
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

export type UrlAutocompleteOptions = {
  appWindowId: string;
  urlInput: HTMLInputElement;
  getActiveTabId: () => string | null;
  onSelectionEnter: (url: string) => void;
};

export function initUrlAutocomplete(opts: UrlAutocompleteOptions): {
  hasOpenSuggestion: () => boolean;
  consumeActiveSuggestion: () => Suggestion | null;
  close: () => void;
} {
  appWindowId = opts.appWindowId;
  urlInput = opts.urlInput;
  getActiveTabId = opts.getActiveTabId;
  onSelectionEnter = opts.onSelectionEnter;

  urlInput.addEventListener('focus', handleFocus);
  urlInput.addEventListener('blur', handleBlur);
  urlInput.addEventListener('input', handleInput);
  urlInput.addEventListener('keydown', handleKeydown);

  // Reposition the overlay if the window resizes while open
  window.addEventListener('resize', () => {
    if (isOpen) pushToOverlay(false);
  });

  // Result clicked in the overlay panel — forwarded back to us
  window.BrowserAPI.onUrlAutocompleteResultForwarded(
    (data: { index: number; item: Suggestion }) => {
      if (!data?.item) return;
      selectSuggestion(data.item);
    }
  );

  return {
    hasOpenSuggestion: () => isOpen && activeIndex >= 0 && activeIndex < currentResults.length,
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
