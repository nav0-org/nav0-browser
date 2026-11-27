import { HtmlUtils } from '../../../renderer/common/html-utils';
import { FaviconTile } from '../../../renderer/common/favicon-tile';
import { FormatUtils } from '../../../renderer/common/format-utils';
import { ChipRow } from '../../../renderer/common/chip-row';
import { BookmarkWithStats } from '../../../types/bookmark-record';
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
  return dateStr ? FormatUtils.formatDate(dateStr) : '';
}

// --- Freshness / age helpers ---

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  // innerHTML leaves quotes alone: escape them so the result is also safe
  // inside a quoted attribute (title="…", src="…").
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// --- Favicons ---

// The page CSP has no 'unsafe-inline', so an inline onerror="…" never runs
// and a favicon that fails to load leaves a broken-image glyph. Attach the
// fallback (the favicon fallback tile) from script before the image starts
// loading.
function loadFavicon(img: HTMLImageElement | null, url: string, siteUrl: string): void {
  if (!img) return;
  FaviconTile.attachFallback(img, siteUrl);
  img.src = url;
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
ChipRow.attach(categoryFilters);
const staleBar = document.getElementById('stale-bar') as HTMLElement;
const staleReviewBtn = document.getElementById('stale-review-btn') as HTMLButtonElement;
const staleReview = document.getElementById('stale-review') as HTMLElement;
const staleReviewList = document.getElementById('stale-review-list') as HTMLElement;
const staleDoneBtn = document.getElementById('stale-done-btn') as HTMLButtonElement;
const bookmarksFooter = document.getElementById('bookmarks-footer') as HTMLElement;
const deleteAllBtn = document.getElementById('delete-all') as HTMLButtonElement;
const folderName = document.getElementById('folder-name') as HTMLElement;
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
  deleteAllBtn.classList.toggle('d-none', queueItems.length + refItems.length === 0);

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
  staleBar.classList.add('d-none');
}

function switchTab(tab: 'queue' | 'reference'): void {
  activeTab = tab;
  tabQueueBtn.classList.toggle('active', tab === 'queue');
  tabReferenceBtn.classList.toggle('active', tab === 'reference');
  // Mirror the seg button label/icon into the folder section header below the chip row.
  folderName.textContent = tab === 'queue' ? 'Reading Queue' : 'Reference';
  // Look the icon up each time: createIcons() replaces it with a new <svg>
  // on every call, so a reference kept from page load goes stale.
  document
    .getElementById('folder-icon')
    ?.setAttribute('data-lucide', tab === 'queue' ? 'book-open' : 'bookmark');
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
    noBookmarks.classList.remove('d-none');
    noBookmarks.textContent = currentSearchTerm
      ? `No bookmarks matching "${currentSearchTerm}".`
      : 'No bookmarks saved yet.';
  } else {
    noBookmarks.classList.add('d-none');
  }
  // Clear All button visibility is driven by updateCounts (totals across
  // both tabs) — Clear wipes both, so its presence shouldn't depend on the
  // active tab being non-empty.
  // The footer is an empty placeholder (Clear moved to the toolbar); it adds no space while empty.
  if (bookmarksFooter) bookmarksFooter.classList.remove('d-none');
}

function renderCategoryPills(): void {
  categoryFilters.innerHTML = '';

  // "All" chip — selection style when no individual category is selected.
  const allPill = document.createElement('button');
  allPill.className = 'chip';
  allPill.innerHTML = `<i data-lucide="layers" width="14" height="14"></i> All`;
  if (selectedCategory === 'all') {
    allPill.classList.add('active');
  }
  allPill.addEventListener('click', () => {
    selectedCategory = 'all';
    renderCategoryPills();
    resetAndReload();
  });
  categoryFilters.appendChild(allPill);

  for (const cat of availableCategories) {
    const pill = document.createElement('button');
    const isActive = selectedCategory === cat;
    const iconName = getCategoryIcon(cat);
    pill.className = 'chip';
    pill.innerHTML = `<i data-lucide="${iconName}" width="14" height="14"></i> ${cat}`;
    // Neutral chip: --n-fill at rest, selection style (--n-accent-soft)
    // when active. No per-category colour.
    if (isActive) {
      pill.classList.add('active');
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
    row.className = 'list-row bookmark-item';

    const domain = getDomain(item.url);
    const path = getPath(item.url);
    const category = getCategoryForUrl(item.url);
    const savedDate = formatSavedDate(item.createdDate as unknown as string);

    // Favicon (16 px inside a 28 px well via CSS), or the favicon fallback
    // tile. The image source is set by loadFavicon() below, after its
    // fallback is attached.
    const faviconHtml = item.faviconUrl ? '<img alt="">' : FaviconTile.html(item.url);

    // Meta line: domain · path. The path truncates, the domain never does;
    // the saved date has its own column.
    const metaParts: string[] = [`<span class="meta-host">${escapeHtml(domain)}</span>`];
    if (path) {
      metaParts.push('<span class="dot">·</span>');
      metaParts.push(`<span class="meta-path">${escapeHtml(path)}</span>`);
    }

    // Badges cell — category only (dormant badge removed). Neutral badge:
    // identical --n-fill / --n-text-2 styling for every category.
    const categoryIcon = getCategoryIcon(category);
    const badgesHtml = `<span class="badge"><i data-lucide="${categoryIcon}" width="12" height="12"></i> ${category}</span>`;

    // Move action tooltip + icon depend on which folder the item lives in.
    const moveTitle = item.type === 'queue' ? 'Move to Reference' : 'Move to Queue';
    const moveIcon = item.type === 'queue' ? 'bookmark' : 'book-open';

    row.innerHTML = `
      <span class="list-row-lead">${savedDate}</span>
      <span class="list-row-well bk-favicon">${faviconHtml}</span>
      <div class="list-row-content bookmark-content">
        <div class="list-row-title">${escapeHtml(item.title)}</div>
        <div class="list-row-meta">${metaParts.join('')}</div>
      </div>
      ${badgesHtml}
      <div class="list-row-actions">
        <button class="list-row-action" title="${moveTitle}" data-action="move">
          <i data-lucide="${moveIcon}" width="14" height="14"></i>
        </button>
        <button class="list-row-action" title="Remove" data-action="remove">
          <i data-lucide="x" width="14" height="14"></i>
        </button>
      </div>
    `;

    if (item.faviconUrl) {
      loadFavicon(
        row.querySelector<HTMLImageElement>('.bk-favicon img'),
        item.faviconUrl,
        item.url
      );
    }

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
  staleBar.classList.add('d-none');
  staleReview.classList.remove('d-none');
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
        ${item.faviconUrl ? '<img alt="">' : FaviconTile.html(item.url)}
      </div>
      <div class="stale-review-content">
        <div class="stale-review-title">${escapeHtml(item.title)}</div>
        <div class="stale-review-meta">${escapeHtml(domain)} · ${item.visits} visits · last visited ${daysAgo === Infinity ? 'never' : daysAgo + ' days ago'}</div>
      </div>
      <div class="stale-review-actions">
        <button class="list-row-action" title="Keep" data-action="keep">
          <i data-lucide="check" width="12" height="12"></i>
        </button>
        <button class="list-row-action" title="Remove" data-action="remove">
          <i data-lucide="x" width="12" height="12"></i>
        </button>
      </div>
    `;

    // Same tile as the no-favicon case if the icon fails to load.
    if (item.faviconUrl) {
      loadFavicon(el.querySelector<HTMLImageElement>('.bk-favicon img'), item.faviconUrl, item.url);
    }

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
  staleReview.classList.add('d-none');
}
