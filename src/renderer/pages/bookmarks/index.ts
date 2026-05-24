import { HtmlUtils } from '../../../renderer/common/html-utils';
import { BookmarkWithStats } from '../../../types/bookmark-record';
import { WEBSITE_CATEGORY_COLORS } from '../../../constants/app-constants';
import { WEBSITE_CATEGORY_MAP } from '../../../constants/data-constants';
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

// --- Category helpers ---

function getCategoryForUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    if (WEBSITE_CATEGORY_MAP[hostname]) return WEBSITE_CATEGORY_MAP[hostname];
    const parts = hostname.split('.');
    if (parts.length > 2) {
      const parent = parts.slice(1).join('.');
      if (WEBSITE_CATEGORY_MAP[parent]) return WEBSITE_CATEGORY_MAP[parent];
    }
    return 'other';
  } catch {
    return 'other';
  }
}

function getCategoryColor(category: string): string {
  return WEBSITE_CATEGORY_COLORS[category] || WEBSITE_CATEGORY_COLORS.other;
}

// Lucide icon name per category — same mapping used by the History page
// "By category" panel, surfaced here on the toolbar filter pills.
const CATEGORY_ICONS: Record<string, string> = {
  dev: 'code',
  news: 'newspaper',
  media: 'play-circle',
  social: 'users',
  productivity: 'layout-grid',
  tools: 'wrench',
  finance: 'dollar-sign',
  shopping: 'shopping-bag',
  reference: 'book-open',
  search: 'search',
  design: 'palette',
  health: 'heart-pulse',
  gaming: 'gamepad-2',
  travel: 'plane',
  education: 'graduation-cap',
  entertainment: 'sparkles',
  jobs: 'briefcase',
  lifestyle: 'coffee',
  other: 'globe',
};

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS.other;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getPath(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return path === '/' ? '' : path;
  } catch {
    return '';
  }
}

function formatSavedDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString([], opts);
}

// --- Freshness / age helpers ---

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function heatColor(visits: number): string {
  if (visits >= 200) return '#4338ca';
  if (visits >= 100) return '#6366f1';
  if (visits >= 50) return '#818cf8';
  if (visits >= 20) return '#a5b4fc';
  if (visits >= 10) return '#c7d2fe';
  return '#e0e7ff';
}

function queueAgeText(createdDate: string): { text: string; color: string } {
  const days = daysSince(createdDate);
  if (days < 7) return { text: 'This week', color: '#10b981' };
  if (days < 30) return { text: `${Math.floor(days / 7)}w ago`, color: '#a1a1aa' };
  if (days < 90) return { text: `${Math.floor(days / 30)}mo ago`, color: '#f59e0b' };
  return { text: `${Math.floor(days / 30)}mo ago`, color: '#e74c3c' };
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- State ---

const PAGE_SIZE = 50;
let activeTab: 'queue' | 'reference' = 'queue';
let currentSearchTerm = '';
// Active category filter. 'all' means show every category — only one
// category can be selected at a time, matching the Downloads pill behaviour.
let selectedCategory: string = 'all';
let availableCategories: string[] = [];
const categoryCounts: Map<string, number> = new Map();
let activeTabTotal = 0;
let currentOffset = 0;
let isLoading = false;
let hasMore = true;
let allLoadedItems: BookmarkWithStats[] = [];

// --- DOM refs ---

const page = document.getElementById('bookmarks-page') as HTMLElement;
const bookmarksList = document.getElementById('bookmarks-list') as HTMLElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const noBookmarks = document.getElementById('no-bookmarks') as HTMLElement;
const queueCountEl = document.getElementById('queue-count') as HTMLElement;
const referenceCountEl = document.getElementById('reference-count') as HTMLElement;
const tabQueueBtn = document.getElementById('tab-queue') as HTMLButtonElement;
const tabReferenceBtn = document.getElementById('tab-reference') as HTMLButtonElement;
const categoryFilters = document.getElementById('category-filters') as HTMLElement;
const staleBar = document.getElementById('stale-bar') as HTMLElement;
const staleReviewBtn = document.getElementById('stale-review-btn') as HTMLButtonElement;
const staleReview = document.getElementById('stale-review') as HTMLElement;
const staleReviewList = document.getElementById('stale-review-list') as HTMLElement;
const staleDoneBtn = document.getElementById('stale-done-btn') as HTMLButtonElement;
const bookmarksFooter = document.getElementById('bookmarks-footer') as HTMLElement;
const deleteAllBtn = document.getElementById('delete-all') as HTMLButtonElement;
const folderName = document.getElementById('folder-name') as HTMLElement;
const folderIcon = document.getElementById('folder-icon') as HTMLElement;
const folderSub = document.getElementById('folder-sub') as HTMLElement;

// --- Init ---

document.addEventListener('DOMContentLoaded', async () => {
  await updateCounts();
  await loadBookmarks();

  // Fade in (matches downloads page pattern)
  requestAnimationFrame(() => page.classList.add('loaded'));

  // Tab switching
  tabQueueBtn.addEventListener('click', () => switchTab('queue'));
  tabReferenceBtn.addEventListener('click', () => switchTab('reference'));

  // Search
  const debouncedSearch = HtmlUtils.debounce(() => {
    currentSearchTerm = searchInput.value || '';
    resetAndReload();
  }, 300);
  searchInput.addEventListener('input', debouncedSearch);

  // Stale review
  staleReviewBtn.addEventListener('click', () => showStaleReview());
  staleDoneBtn.addEventListener('click', () => hideStaleReview());

  // Clear all
  deleteAllBtn.addEventListener('click', async () => {
    await window.BrowserAPI.removeAllBookmarks(window.BrowserAPI.appWindowId);
    allLoadedItems = [];
    bookmarksList.innerHTML = '';
    updateVisibility();
    updateCounts();
  });
});

// --- Core functions ---

async function updateCounts(): Promise<void> {
  const queueItems = await window.BrowserAPI.fetchBookmarksWithStats(
    window.BrowserAPI.appWindowId,
    'queue',
    currentSearchTerm,
    10000,
    0
  );
  const refItems = await window.BrowserAPI.fetchBookmarksWithStats(
    window.BrowserAPI.appWindowId,
    'reference',
    currentSearchTerm,
    10000,
    0
  );
  queueCountEl.textContent = String(queueItems.length);
  referenceCountEl.textContent = String(refItems.length);
  // Clear All wipes both tabs in one go, so its visibility tracks the
  // combined total — not just the active tab's items.
  deleteAllBtn.style.display = queueItems.length + refItems.length > 0 ? '' : 'none';

  // Derive available categories + per-category counts from the active tab's
  // full unfiltered result set, so chip ordering and counts react to tab/search.
  const sourceItems = activeTab === 'queue' ? queueItems : refItems;
  activeTabTotal = sourceItems.length;
  categoryCounts.clear();
  sourceItems.forEach((b: BookmarkWithStats) => {
    const c = getCategoryForUrl(b.url);
    categoryCounts.set(c, (categoryCounts.get(c) || 0) + 1);
  });
  availableCategories = [...categoryCounts.keys()].sort();
  renderCategoryPills();

  // Folder section header subtitle ("N saved").
  folderSub.textContent = `${activeTabTotal} saved`;

  // Stale-bookmark alert removed — bar stays hidden permanently.
  staleBar.style.display = 'none';
}

function switchTab(tab: 'queue' | 'reference'): void {
  activeTab = tab;
  tabQueueBtn.classList.toggle('active', tab === 'queue');
  tabReferenceBtn.classList.toggle('active', tab === 'reference');
  // Mirror the seg button label/icon into the folder section header below the chip row.
  folderName.textContent = tab === 'queue' ? 'Reading queue' : 'Reference';
  folderIcon.setAttribute('data-lucide', tab === 'queue' ? 'book-open' : 'bookmark');
  createIcons({ icons });
  selectedCategory = 'all';
  hideStaleReview();
  resetAndReload();
  updateCounts();
}

function resetAndReload(): void {
  currentOffset = 0;
  hasMore = true;
  allLoadedItems = [];
  bookmarksList.innerHTML = '';
  loadBookmarks();
  updateCounts();
}

async function loadBookmarks(): Promise<void> {
  if (isLoading || !hasMore) return;
  isLoading = true;

  const items: BookmarkWithStats[] = await window.BrowserAPI.fetchBookmarksWithStats(
    window.BrowserAPI.appWindowId,
    activeTab,
    currentSearchTerm,
    PAGE_SIZE,
    currentOffset
  );

  if (items.length < PAGE_SIZE) hasMore = false;

  let filtered = items;
  if (selectedCategory !== 'all') {
    filtered = items.filter((b) => getCategoryForUrl(b.url) === selectedCategory);
  }

  allLoadedItems = allLoadedItems.concat(filtered);
  currentOffset += items.length;

  updateVisibility();
  renderBookmarkItems(filtered);
  isLoading = false;
}

function updateVisibility(): void {
  if (allLoadedItems.length === 0) {
    noBookmarks.style.display = 'block';
    noBookmarks.textContent = currentSearchTerm
      ? `No bookmarks matching "${currentSearchTerm}".`
      : 'No bookmarks saved yet.';
  } else {
    noBookmarks.style.display = 'none';
  }
  // Clear All button visibility is driven by updateCounts (totals across
  // both tabs) — Clear wipes both, so its presence shouldn't depend on the
  // active tab being non-empty.
  // Footer is no longer used as a wrapper for Clear; kept as an empty spacer.
  if (bookmarksFooter) bookmarksFooter.style.display = 'block';
}

function renderCategoryPills(): void {
  categoryFilters.innerHTML = '';

  // "All" chip — solid black when no individual category is selected.
  const allPill = document.createElement('button');
  allPill.className = 'cat-pill';
  allPill.innerHTML = `<i data-lucide="layers" width="13" height="13"></i> All`;
  if (selectedCategory === 'all') {
    allPill.style.background = 'var(--fg-1)';
    allPill.style.color = 'var(--bg-0)';
    allPill.style.borderColor = 'var(--fg-1)';
  }
  allPill.addEventListener('click', () => {
    selectedCategory = 'all';
    renderCategoryPills();
    resetAndReload();
  });
  categoryFilters.appendChild(allPill);

  for (const cat of availableCategories) {
    const pill = document.createElement('button');
    const catColor = getCategoryColor(cat);
    const isActive = selectedCategory === cat;
    const iconName = getCategoryIcon(cat);
    pill.className = 'cat-pill';
    pill.innerHTML = `<i data-lucide="${iconName}" width="13" height="13"></i> ${cat}`;
    // Per-category tint: soft tinted bg + accented border + colored label.
    // Active state inverts to a solid fill, matching the prototype.
    if (isActive) {
      pill.style.background = catColor;
      pill.style.color = '#fff';
      pill.style.borderColor = catColor;
    } else {
      pill.style.background = catColor + '0f';
      pill.style.color = catColor;
      pill.style.borderColor = catColor + '40';
    }
    pill.addEventListener('click', () => {
      // Single-select: clicking replaces the active filter (clicking the
      // currently active pill clears it back to "All").
      selectedCategory = isActive ? 'all' : cat;
      renderCategoryPills();
      resetAndReload();
    });
    categoryFilters.appendChild(pill);
  }

  // Hydrate the lucide placeholders that were just inserted.
  createIcons({ icons });
}

// --- Render bookmark rows ---

function renderBookmarkItems(items: BookmarkWithStats[]): void {
  items.forEach((item) => {
    const row = document.createElement('li');
    row.className = 'bookmark-item';

    const domain = getDomain(item.url);
    const path = getPath(item.url);
    const category = getCategoryForUrl(item.url);
    const catColor = getCategoryColor(category);
    const savedDate = formatSavedDate(item.createdDate as unknown as string);

    // Favicon (rendered inside a 24px tile via CSS)
    const faviconHtml = item.faviconUrl
      ? `<img src="${item.faviconUrl}" alt="" onerror="this.parentElement.innerHTML='<i data-lucide=\\'globe\\' width=\\'14\\' height=\\'14\\'></i>'">`
      : `<i data-lucide="globe" width="14" height="14"></i>`;

    // Meta line: host (accent) + path + queue age / visits (reference)
    const metaParts: string[] = [`<span class="host">${escapeHtml(domain)}</span>`];
    if (path) {
      metaParts.push('<span class="dot">·</span>');
      metaParts.push(`<span>${escapeHtml(path)}</span>`);
    }
    if (item.type === 'queue') {
      const age = queueAgeText(item.createdDate as unknown as string);
      metaParts.push('<span class="dot">·</span>');
      metaParts.push(`<span style="color: ${age.color}">${age.text}</span>`);
    }
    if (item.type === 'reference') {
      metaParts.push('<span class="dot">·</span>');
      metaParts.push(
        `<span class="bookmark-visits" style="color: ${heatColor(item.visits)}">${item.visits} visits</span>`
      );
    }

    // Badges cell — category only (dormant badge removed). Matches the
    // toolbar filter pill: icon + capitalized label with per-category tint.
    const categoryIcon = getCategoryIcon(category);
    const badgesHtml = `<span class="badge-category" style="background: ${catColor}0f; color: ${catColor}; border-color: ${catColor}40"><i data-lucide="${categoryIcon}" width="12" height="12"></i> ${category}</span>`;

    // Move action tooltip + icon depend on which folder the item lives in.
    const moveTitle = item.type === 'queue' ? 'Move to Reference' : 'Move to Queue';
    const moveIcon = item.type === 'queue' ? 'bookmark' : 'book-open';

    row.innerHTML = `
      <span class="bookmark-date">${savedDate}</span>
      <span class="bk-favicon">${faviconHtml}</span>
      <div class="bookmark-content">
        <div class="bookmark-title">${escapeHtml(item.title)}</div>
        <div class="bookmark-meta">${metaParts.join('')}</div>
      </div>
      <div class="bookmark-badges">${badgesHtml}</div>
      <div class="bookmark-actions">
        <button class="action-btn move-btn" title="${moveTitle}" data-action="move">
          <i data-lucide="${moveIcon}" width="14" height="14"></i>
        </button>
        <button class="action-btn remove-btn" title="Remove" data-action="remove">
          <i data-lucide="x" width="14" height="14"></i>
        </button>
      </div>
    `;

    // Click content → open
    row.querySelector('.bookmark-content')?.addEventListener('click', () => {
      window.BrowserAPI.createTab(window.BrowserAPI.appWindowId, item.url, true);
    });

    // Move
    row.querySelector('[data-action="move"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const newType = item.type === 'queue' ? 'reference' : 'queue';
      await window.BrowserAPI.updateBookmarkType(window.BrowserAPI.appWindowId, item.id, newType);
      row.remove();
      allLoadedItems = allLoadedItems.filter((b) => b.id !== item.id);
      updateVisibility();
      updateCounts();
    });

    // Remove
    row.querySelector('[data-action="remove"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.BrowserAPI.removeBookmark(window.BrowserAPI.appWindowId, item.id);
      row.remove();
      allLoadedItems = allLoadedItems.filter((b) => b.id !== item.id);
      updateVisibility();
      updateCounts();
    });

    bookmarksList.appendChild(row);
  });

  createIcons({ icons });
}

// --- Stale review ---

async function showStaleReview(): Promise<void> {
  staleBar.style.display = 'none';
  staleReview.style.display = 'block';
  staleReviewList.innerHTML = '';

  const refItems: BookmarkWithStats[] = await window.BrowserAPI.fetchBookmarksWithStats(
    window.BrowserAPI.appWindowId,
    'reference',
    '',
    10000,
    0
  );
  const staleItems = refItems.filter((b) => daysSince(b.lastVisited) > 180);

  for (const item of staleItems) {
    const domain = getDomain(item.url);
    const daysAgo = daysSince(item.lastVisited);
    const el = document.createElement('div');
    el.className = 'stale-review-item';
    el.innerHTML = `
      <div class="bk-favicon">
        ${
          item.faviconUrl
            ? `<img src="${item.faviconUrl}" alt="" style="width:16px;height:16px" onerror="this.parentElement.textContent='🌐'">`
            : '<i data-lucide="globe" width="16" height="16"></i>'
        }
      </div>
      <div class="stale-review-content">
        <div class="stale-review-title">${escapeHtml(item.title)}</div>
        <div class="stale-review-meta">${domain} · ${item.visits} visits · last visited ${daysAgo === Infinity ? 'never' : daysAgo + ' days ago'}</div>
      </div>
      <div class="stale-review-actions">
        <button class="action-btn" title="Keep" data-action="keep">
          <i data-lucide="check" width="12" height="12"></i>
        </button>
        <button class="action-btn" title="Remove" data-action="remove">
          <i data-lucide="x" width="12" height="12"></i>
        </button>
      </div>
    `;

    el.querySelector('[data-action="keep"]')?.addEventListener('click', () => {
      el.remove();
      if (staleReviewList.children.length === 0) hideStaleReview();
    });

    el.querySelector('[data-action="remove"]')?.addEventListener('click', async () => {
      await window.BrowserAPI.removeBookmark(window.BrowserAPI.appWindowId, item.id);
      el.remove();
      allLoadedItems = allLoadedItems.filter((b) => b.id !== item.id);
      updateVisibility();
      updateCounts();
      if (staleReviewList.children.length === 0) hideStaleReview();
    });

    staleReviewList.appendChild(el);
  }

  createIcons({ icons });
}

function hideStaleReview(): void {
  staleReview.style.display = 'none';
}
