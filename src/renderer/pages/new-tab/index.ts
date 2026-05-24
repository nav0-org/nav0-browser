import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

const GREETINGS_BY_HOUR: { range: [number, number]; phrases: string[] }[] = [
  {
    range: [5, 8],
    phrases: [
      'Good morning',
      'Rise and shine',
      'Early bird',
      'Morning has broken',
      'Up with the sun',
      'Bright and early',
      'A fresh start',
      'The day is young',
      'First light',
      'Quiet mornings are the best',
    ],
  },
  {
    range: [8, 12],
    phrases: [
      'Good morning',
      'Morning',
      "Hope your morning's going well",
      'A fine morning to browse',
      'Hello, sunshine',
      "Let's make it a good one",
      'Fresh coffee somewhere?',
      'Off to a good start?',
      'Morning, friend',
      'Plenty of day ahead',
    ],
  },
  {
    range: [12, 14],
    phrases: [
      'Good afternoon',
      'Lunchtime already?',
      'Midday check-in',
      'Afternoon',
      'Halfway through the day',
      'High noon',
      'Take a breather',
      "Don't forget to eat",
      'Quick break?',
      'Sun is high',
    ],
  },
  {
    range: [14, 17],
    phrases: [
      'Good afternoon',
      'Afternoon',
      "Hope your day's going well",
      'Powering through?',
      'Keep it going',
      'Almost there',
      'Afternoon momentum',
      'Stay focused',
      'You got this',
      'A little further',
    ],
  },
  {
    range: [17, 21],
    phrases: [
      'Good evening',
      'Evening',
      'Winding down?',
      'Hope you had a good day',
      'Time to unwind',
      'Sun is setting',
      'Easy does it',
      'Evening, friend',
      'Done for the day?',
      'Slow it down',
    ],
  },
  {
    range: [21, 24],
    phrases: [
      'Good evening',
      'Getting late',
      "Evening's wrapping up",
      "Hope you're relaxing",
      'Almost bedtime',
      'Day is winding down',
      'Take it easy',
      'Cozy hours',
      'Quiet time',
      'A calm end to the day',
    ],
  },
  {
    range: [0, 5],
    phrases: [
      "It's a bit late",
      'Burning the midnight oil?',
      'Night owl mode',
      'Still up?',
      'Late night browsing',
      'The world is asleep',
      'Quiet hours',
      'Up past midnight',
      "Don't forget to rest",
      'The small hours',
    ],
  },
];

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  const bucket =
    GREETINGS_BY_HOUR.find(({ range: [start, end] }) => hour >= start && hour < end) ??
    GREETINGS_BY_HOUR[0];
  return bucket.phrases[Math.floor(Math.random() * bucket.phrases.length)];
}

const greetingEl = document.getElementById('greeting');
if (greetingEl) {
  greetingEl.textContent = getTimeBasedGreeting();
}

// ---------------------------------------------------------------------------
// Search input + Command-K styled inline results
// ---------------------------------------------------------------------------

type SearchResultItem = {
  type: 'tab' | 'bookmark' | 'history' | 'download' | 'search';
  title: string;
  url: string;
  faviconUrl?: string;
  meta?: string;
  tabId?: string;
};

const searchBar = document.getElementById('search-bar') as HTMLInputElement | null;
const searchResults = document.getElementById('search-results') as HTMLElement | null;
const searchResultsList = document.getElementById('search-results-list') as HTMLElement | null;
const searchResultsEmpty = document.getElementById('search-results-empty') as HTMLElement | null;
const bookmarksSection = document.getElementById('bookmarks-section') as HTMLElement | null;
const topSitesSection = document.getElementById('top-sites-section') as HTMLElement | null;

let searchActiveIndex = -1;
let searchCurrentResults: SearchResultItem[] = [];
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 0) return `Today, ${timeStr}`;
  if (diffDays === 1) return `Yesterday, ${timeStr}`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function faviconLetter(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '').charAt(0).toUpperCase();
  } catch {
    return (url || '?').charAt(0).toUpperCase();
  }
}

function buildResultIconHtml(item: SearchResultItem): string {
  const fallback = faviconLetter(item.url);
  if (item.type === 'search') {
    return `<div class="search-result-icon"><i data-lucide="search" width="16" height="16"></i></div>`;
  }
  if (item.type === 'download') {
    return `<div class="search-result-icon"><i data-lucide="download" width="16" height="16"></i></div>`;
  }
  if (item.faviconUrl) {
    const safeFavicon = escapeAttr(item.faviconUrl);
    return `<div class="search-result-favicon"><img src="${safeFavicon}" alt="" onerror="this.parentElement.textContent='${fallback}'"></div>`;
  }
  if (item.type === 'tab') {
    return `<div class="search-result-icon"><i data-lucide="app-window" width="16" height="16"></i></div>`;
  }
  return `<div class="search-result-favicon">${fallback}</div>`;
}

function buildResultRow(item: SearchResultItem, index: number): HTMLElement {
  const row = document.createElement('div');
  row.className = `search-result-item${index === searchActiveIndex ? ' active' : ''}${item.type === 'search' ? ' search-engine-item' : ''}`;
  row.dataset.index = String(index);

  const subParts: string[] = [];
  if (item.meta) subParts.push(`<span class="search-result-meta">${escapeText(item.meta)}</span>`);
  if (item.type !== 'search' && item.url) {
    subParts.push(`<span class="search-result-url">${escapeText(item.url)}</span>`);
  }
  const subline = subParts.length
    ? `<div class="search-result-subline">${subParts.join('')}</div>`
    : '';

  row.innerHTML = `
    ${buildResultIconHtml(item)}
    <div class="search-result-content">
      <span class="search-result-title">${escapeText(item.title)}</span>
      ${subline}
    </div>
  `;

  row.addEventListener('click', () => openSearchResult(item));
  return row;
}

function openSearchResult(item: SearchResultItem): void {
  if (item.type === 'tab' && item.tabId) {
    window.BrowserAPI.activateTab(window.BrowserAPI.appWindowId, item.tabId, true);
    return;
  }
  if (item.type === 'search') {
    window.BrowserAPI.getSearchUrl(item.title).then((searchUrl: string) => {
      window.BrowserAPI.navigate(window.BrowserAPI.appWindowId, window.BrowserAPI.tabId, searchUrl);
    });
    return;
  }
  window.BrowserAPI.navigate(window.BrowserAPI.appWindowId, window.BrowserAPI.tabId, item.url);
}

function setTilesVisible(visible: boolean): void {
  // Tile sections are also gated by their own data presence, so only flip
  // them when they were already populated. The `hidden` attribute is the
  // source of truth; we toggle a display override instead of clearing it.
  [bookmarksSection, topSitesSection].forEach((section) => {
    if (!section) return;
    if (section.hasAttribute('data-has-content')) {
      section.style.display = visible ? '' : 'none';
    }
  });
}

function renderSearchResults(results: SearchResultItem[], query: string): void {
  if (!searchResults || !searchResultsList || !searchResultsEmpty) return;

  searchCurrentResults = results;
  searchActiveIndex = results.length > 0 ? 0 : -1;
  searchResultsList.innerHTML = '';

  if (!query.trim()) {
    searchResults.hidden = true;
    setTilesVisible(true);
    return;
  }

  searchResults.hidden = false;
  setTilesVisible(false);

  if (results.length === 0) {
    searchResultsEmpty.hidden = false;
    searchResultsEmpty.textContent = 'No matches found';
    return;
  }
  searchResultsEmpty.hidden = true;

  const tabs = results.filter((r) => r.type === 'tab');
  const bookmarks = results.filter((r) => r.type === 'bookmark');
  const history = results.filter((r) => r.type === 'history');
  const downloads = results.filter((r) => r.type === 'download');
  const searchItems = results.filter((r) => r.type === 'search');

  const fragment = document.createDocumentFragment();
  const addSection = (title: string, items: SearchResultItem[]) => {
    if (items.length === 0) return;
    const titleEl = document.createElement('div');
    titleEl.className = 'search-section-title';
    titleEl.textContent = title;
    fragment.appendChild(titleEl);
    items.forEach((item) => fragment.appendChild(buildResultRow(item, results.indexOf(item))));
  };

  addSection('Open Tabs', tabs);
  addSection('Bookmarks', bookmarks);
  addSection('Browsing History', history);
  addSection('Downloads', downloads);
  searchItems.forEach((item) => fragment.appendChild(buildResultRow(item, results.indexOf(item))));

  searchResultsList.appendChild(fragment);
  createIcons({ icons });
}

async function performSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) {
    renderSearchResults([], '');
    return;
  }

  try {
    const lowerQuery = trimmed.toLowerCase();
    const [openTabs, bookmarks, history, downloads] = await Promise.all([
      window.BrowserAPI.fetchOpenTabs(window.BrowserAPI.appWindowId),
      window.BrowserAPI.fetchBookmarks(window.BrowserAPI.appWindowId, trimmed, 5, 0),
      window.BrowserAPI.fetchBrowsingHistory(window.BrowserAPI.appWindowId, trimmed, 5, 0),
      window.BrowserAPI.fetchDownloads(window.BrowserAPI.appWindowId, trimmed, 5, 0),
    ]);

    const results: SearchResultItem[] = [];

    (openTabs || [])
      .filter((tab: { title?: string; url?: string }) => {
        const title = (tab.title || '').toLowerCase();
        const url = (tab.url || '').toLowerCase();
        return title.includes(lowerQuery) || url.includes(lowerQuery);
      })
      .forEach((tab: { id: string; title?: string; url?: string; faviconUrl?: string }) => {
        results.push({
          type: 'tab',
          title: tab.title || tab.url || 'New Tab',
          url: tab.url || '',
          faviconUrl: tab.faviconUrl,
          meta: 'Switch to tab',
          tabId: tab.id,
        });
      });

    (bookmarks || []).forEach(
      (record: { title?: string; url: string; faviconUrl?: string; createdDate: string }) => {
        results.push({
          type: 'bookmark',
          title: record.title || record.url,
          url: record.url,
          faviconUrl: record.faviconUrl,
          meta: formatRelativeDate(record.createdDate),
        });
      }
    );

    (history || []).forEach(
      (record: { title?: string; url: string; faviconUrl?: string; createdDate: string }) => {
        results.push({
          type: 'history',
          title: record.title || record.url,
          url: record.url,
          faviconUrl: record.faviconUrl,
          meta: formatRelativeDate(record.createdDate),
        });
      }
    );

    (downloads || []).forEach(
      (record: {
        fileName?: string;
        url: string;
        fileExtension?: string;
        fileSize?: number;
        createdDate: string;
      }) => {
        results.push({
          type: 'download',
          title: record.fileName || record.url,
          url: record.url,
          meta: `${(record.fileExtension || '').toUpperCase()} ${formatFileSize(record.fileSize || 0)} · ${formatRelativeDate(record.createdDate)}`,
        });
      }
    );

    results.push({
      type: 'search',
      title: trimmed,
      url: '',
      meta: 'Search with default search engine',
    });

    renderSearchResults(results, trimmed);
  } catch {
    renderSearchResults(
      [
        {
          type: 'search',
          title: trimmed,
          url: '',
          meta: 'Search with default search engine',
        },
      ],
      trimmed
    );
  }
}

function moveSearchSelection(direction: number): void {
  if (!searchResultsList || searchCurrentResults.length === 0) return;
  const rows = searchResultsList.querySelectorAll<HTMLElement>('.search-result-item');
  rows.forEach((row) => row.classList.remove('active'));
  searchActiveIndex = (searchActiveIndex + direction) % searchCurrentResults.length;
  if (searchActiveIndex < 0) searchActiveIndex = searchCurrentResults.length - 1;
  rows[searchActiveIndex]?.classList.add('active');
  rows[searchActiveIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

if (searchBar) {
  searchBar.focus();

  searchBar.addEventListener('input', () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    const query = searchBar.value;
    searchDebounceTimer = setTimeout(() => performSearch(query), 180);
  });

  searchBar.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveSearchSelection(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveSearchSelection(-1);
    } else if (e.key === 'Tab' && searchCurrentResults.length > 0) {
      e.preventDefault();
      moveSearchSelection(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchActiveIndex >= 0 && searchActiveIndex < searchCurrentResults.length) {
        openSearchResult(searchCurrentResults[searchActiveIndex]);
      } else {
        const query = searchBar.value.trim();
        if (query) {
          window.BrowserAPI.navigate(window.BrowserAPI.appWindowId, window.BrowserAPI.tabId, query);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSearchResults();
    }
  });

  // Re-focus search bar when the page gains focus (e.g. tab switched back).
  window.addEventListener('focus', () => {
    searchBar.focus();
  });

  // Click outside the search shell/results closes the popup.
  document.addEventListener('mousedown', (e) => {
    if (!searchResults || searchResults.hidden) return;
    const target = e.target as Node | null;
    if (!target) return;
    const searchItem = searchBar.closest('.search-item');
    if (searchItem && !searchItem.contains(target)) {
      closeSearchResults();
    }
  });
}

function closeSearchResults(): void {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
  if (searchBar) searchBar.value = '';
  renderSearchResults([], '');
}

// ---------------------------------------------------------------------------
// Bookmarks + Frequently visited tile rows
// ---------------------------------------------------------------------------

const TILE_LIMIT = 8;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function deriveDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return rawUrl;
  }
}

function deriveTitle(rawTitle: string, url: string): string {
  if (rawTitle && rawTitle.trim()) return rawTitle.trim();
  return deriveDomain(url);
}

function buildFaviconFallback(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/favicon.ico`;
  } catch {
    return '';
  }
}

function renderTile(item: {
  url: string;
  title: string;
  faviconUrl?: string;
  visits?: number;
}): string {
  const domain = deriveDomain(item.url);
  const title = deriveTitle(item.title, item.url);
  const favicon = item.faviconUrl || buildFaviconFallback(item.url);
  const safeUrl = escapeAttr(item.url);
  const safeFavicon = escapeAttr(favicon);
  return `
    <a class="tile" href="${safeUrl}" data-url="${safeUrl}" title="${escapeAttr(title)}">
      <span class="tile-icon">
        ${
          safeFavicon
            ? `<img src="${safeFavicon}" alt="" onerror="this.parentElement.innerHTML='<i data-lucide=\\'globe\\' width=\\'18\\' height=\\'18\\'></i>'">`
            : `<i data-lucide="globe" width="18" height="18"></i>`
        }
      </span>
      <span class="tile-text">
        <span class="tile-title">${escapeText(title)}</span>
        <span class="tile-domain">${escapeText(domain)}</span>
      </span>
    </a>
  `;
}

function attachTileNavigation(row: HTMLElement): void {
  row.querySelectorAll<HTMLAnchorElement>('.tile').forEach((tile) => {
    tile.addEventListener('click', (e) => {
      e.preventDefault();
      const url = tile.dataset.url;
      if (url) {
        window.BrowserAPI.navigate(window.BrowserAPI.appWindowId, window.BrowserAPI.tabId, url);
      }
    });
  });
}

async function loadTileRows(): Promise<void> {
  const appWindowId = window.BrowserAPI.appWindowId;

  // Bookmarks — combined queue + reference, sorted by visits desc.
  const bookmarksRow = document.getElementById('bookmarks-row') as HTMLElement | null;
  if (bookmarksSection && bookmarksRow) {
    try {
      const [queue, reference] = await Promise.all([
        window.BrowserAPI.fetchBookmarksWithStats(appWindowId, 'queue', '', 100, 0),
        window.BrowserAPI.fetchBookmarksWithStats(appWindowId, 'reference', '', 100, 0),
      ]);
      const merged = [...(queue || []), ...(reference || [])] as Array<{
        url: string;
        title: string;
        faviconUrl?: string;
        visits: number;
      }>;
      const top = merged.sort((a, b) => (b.visits || 0) - (a.visits || 0)).slice(0, TILE_LIMIT);
      if (top.length > 0) {
        bookmarksRow.innerHTML = top.map(renderTile).join('');
        attachTileNavigation(bookmarksRow);
        bookmarksSection.hidden = false;
        bookmarksSection.setAttribute('data-has-content', 'true');
      }
    } catch {
      /* leave row hidden on failure */
    }
  }

  // Frequently visited — top URLs by visit count from browsing history.
  const topSitesRow = document.getElementById('top-sites-row') as HTMLElement | null;
  if (topSitesSection && topSitesRow) {
    try {
      const sites = await window.BrowserAPI.fetchTopSites(appWindowId, TILE_LIMIT);
      if (sites && sites.length > 0) {
        topSitesRow.innerHTML = sites.map(renderTile).join('');
        attachTileNavigation(topSitesRow);
        topSitesSection.hidden = false;
        topSitesSection.setAttribute('data-has-content', 'true');
      }
    } catch {
      /* leave row hidden on failure */
    }
  }

  createIcons({ icons });
}

loadTileRows();
