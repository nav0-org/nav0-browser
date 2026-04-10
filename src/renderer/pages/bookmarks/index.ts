import { HtmlUtils } from '../../../renderer/common/html-utils';
import { BookmarkWithStats } from '../../../types/bookmark-record';
import { BOOKMARK_CATEGORY_MAP, BOOKMARK_CATEGORY_COLORS } from '../../../constants/app-constants';
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

// --- Category helpers ---

function getCategoryForUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    if (BOOKMARK_CATEGORY_MAP[hostname]) return BOOKMARK_CATEGORY_MAP[hostname];
    const parts = hostname.split('.');
    if (parts.length > 2) {
      const parent = parts.slice(1).join('.');
      if (BOOKMARK_CATEGORY_MAP[parent]) return BOOKMARK_CATEGORY_MAP[parent];
    }
    return 'other';
  } catch {
    return 'other';
  }
}

function getCategoryColor(category: string): string {
  return BOOKMARK_CATEGORY_COLORS[category] || BOOKMARK_CATEGORY_COLORS.other;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// --- Freshness / age helpers ---

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function freshnessOpacity(item: BookmarkWithStats): number {
  if (item.type === 'queue') {
    const days = daysSince(item.createdDate as unknown as string);
    if (days < 7) return 1;
    if (days < 30) return 0.85;
    if (days < 90) return 0.6;
    return 0.4;
  }
  const days = daysSince(item.lastVisited);
  if (days < 7) return 1;
  if (days < 30) return 0.85;
  if (days < 90) return 0.6;
  if (days < 180) return 0.45;
  return 0.3;
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
let selectedCategories: Set<string> = new Set();
let availableCategories: string[] = [];
let currentOffset = 0;
let isLoading = false;
let hasMore = true;
let allLoadedItems: BookmarkWithStats[] = [];
let maxVisits = 1;

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
const staleText = document.getElementById('stale-text') as HTMLElement;
const staleReviewBtn = document.getElementById('stale-review-btn') as HTMLButtonElement;
const staleReview = document.getElementById('stale-review') as HTMLElement;
const staleReviewList = document.getElementById('stale-review-list') as HTMLElement;
const staleDoneBtn = document.getElementById('stale-done-btn') as HTMLButtonElement;
const bookmarksFooter = document.getElementById('bookmarks-footer') as HTMLElement;
const deleteAllBtn = document.getElementById('delete-all') as HTMLButtonElement;

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
    window.BrowserAPI.appWindowId, 'queue', currentSearchTerm, 10000, 0
  );
  const refItems = await window.BrowserAPI.fetchBookmarksWithStats(
    window.BrowserAPI.appWindowId, 'reference', currentSearchTerm, 10000, 0
  );
  queueCountEl.textContent = String(queueItems.length);
  referenceCountEl.textContent = String(refItems.length);

  // Derive available categories from the full unfiltered result set for the active tab
  const sourceItems = activeTab === 'queue' ? queueItems : refItems;
  const cats = new Set<string>();
  sourceItems.forEach((b: BookmarkWithStats) => cats.add(getCategoryForUrl(b.url)));
  availableCategories = [...cats].sort();
  renderCategoryPills();

  // Show stale alert for reference tab
  if (activeTab === 'reference') {
    const staleItems = refItems.filter((b: BookmarkWithStats) => daysSince(b.lastVisited) > 180);
    if (staleItems.length > 0) {
      staleText.textContent = `${staleItems.length} bookmark${staleItems.length > 1 ? 's' : ''} not visited in 6+ months`;
      staleBar.style.display = 'block';
    } else {
      staleBar.style.display = 'none';
    }
  } else {
    staleBar.style.display = 'none';
  }
}

function switchTab(tab: 'queue' | 'reference'): void {
  activeTab = tab;
  tabQueueBtn.classList.toggle('active', tab === 'queue');
  tabReferenceBtn.classList.toggle('active', tab === 'reference');
  selectedCategories.clear();
  hideStaleReview();
  resetAndReload();
  updateCounts();
}

function resetAndReload(): void {
  currentOffset = 0;
  hasMore = true;
  allLoadedItems = [];
  maxVisits = 1;
  bookmarksList.innerHTML = '';
  loadBookmarks();
  updateCounts();
}

async function loadBookmarks(): Promise<void> {
  if (isLoading || !hasMore) return;
  isLoading = true;

  const items: BookmarkWithStats[] = await window.BrowserAPI.fetchBookmarksWithStats(
    window.BrowserAPI.appWindowId, activeTab, currentSearchTerm, PAGE_SIZE, currentOffset
  );

  if (items.length < PAGE_SIZE) hasMore = false;

  let filtered = items;
  if (selectedCategories.size > 0) {
    filtered = items.filter(b => selectedCategories.has(getCategoryForUrl(b.url)));
  }

  allLoadedItems = allLoadedItems.concat(filtered);
  currentOffset += items.length;

  for (const item of allLoadedItems) {
    if (item.visits > maxVisits) maxVisits = item.visits;
  }

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
    bookmarksFooter.style.display = 'none';
  } else {
    noBookmarks.style.display = 'none';
    bookmarksFooter.style.display = 'block';
  }
}

function renderCategoryPills(): void {
  categoryFilters.innerHTML = '';
  for (const cat of availableCategories) {
    const pill = document.createElement('button');
    const catColor = getCategoryColor(cat);
    const isActive = selectedCategories.has(cat);
    pill.className = 'cat-pill' + (isActive ? ' active' : '');
    pill.textContent = cat;
    // Always show category color — active: white on color, inactive: color on tinted bg
    if (isActive) {
      pill.style.background = catColor;
      pill.style.color = '#fff';
    } else {
      pill.style.background = catColor + '15';
      pill.style.color = catColor;
    }
    pill.addEventListener('click', () => {
      if (selectedCategories.has(cat)) {
        selectedCategories.delete(cat);
      } else {
        selectedCategories.add(cat);
      }
      renderCategoryPills();
      resetAndReload();
    });
    categoryFilters.appendChild(pill);
  }
}

// --- Render bookmark rows ---

function renderBookmarkItems(items: BookmarkWithStats[]): void {
  items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'bookmark-item';
    row.style.transitionDelay = `${i * 0.03}s`;

    const opacity = freshnessOpacity(item);
    const domain = getDomain(item.url);
    const category = getCategoryForUrl(item.url);
    const catColor = getCategoryColor(category);

    // Favicon
    const faviconHtml = item.faviconUrl
      ? `<img src="${item.faviconUrl}" alt="" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'">`
      : `<i data-lucide="globe" width="16" height="16"></i>`;

    // Title row badges
    let badgesHtml = '';
    if (item.type === 'queue') {
      const age = queueAgeText(item.createdDate as unknown as string);
      badgesHtml += `<span class="badge badge-queue-age" style="background: ${age.color}20; color: ${age.color}">${age.text}</span>`;
    }
    if (item.type === 'reference') {
      const daysAgo = daysSince(item.lastVisited);
      if (daysAgo >= 90) {
        const months = Math.floor(daysAgo / 30);
        badgesHtml += `<span class="badge badge-stale">${months}mo dormant</span>`;
      }
    }
    badgesHtml += `<span class="badge badge-category" style="background: ${catColor}18; color: ${catColor}">${category}</span>`;

    // Visit count (reference only)
    const visitsHtml = item.type === 'reference'
      ? `<span class="bookmark-visits" style="color: ${heatColor(item.visits)}">${item.visits} visits</span>`
      : '';

    // Heat bar (reference only)
    const heatWidth = item.type === 'reference'
      ? Math.max(4, (item.visits / maxVisits) * 100)
      : 0;
    const heatBarHtml = item.type === 'reference'
      ? `<div class="bookmark-heat-bar" style="width: ${heatWidth}%"></div>`
      : '';

    // Move tooltip
    const moveTitle = item.type === 'queue' ? 'Move to Reference' : 'Move to Queue';
    const moveIcon = item.type === 'queue' ? 'archive' : 'book-open';

    row.innerHTML = `
      <div class="bk-favicon" style="opacity: ${opacity}">
        ${faviconHtml}
      </div>
      <div class="bookmark-content" style="opacity: ${opacity}">
        <div class="bookmark-title-row">
          <span class="bookmark-title">${escapeHtml(item.title)}</span>
          ${badgesHtml}
        </div>
        <div class="bookmark-meta">${domain}</div>
      </div>
      ${visitsHtml}
      <div class="bookmark-actions">
        <button class="action-btn move-btn" title="${moveTitle}" data-action="move">
          <i data-lucide="${moveIcon}" width="12" height="12"></i>
        </button>
        <button class="action-btn remove-btn" title="Remove" data-action="remove">
          <i data-lucide="x" width="12" height="12"></i>
        </button>
      </div>
      ${heatBarHtml}
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
      allLoadedItems = allLoadedItems.filter(b => b.id !== item.id);
      updateVisibility();
      updateCounts();
    });

    // Remove
    row.querySelector('[data-action="remove"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.BrowserAPI.removeBookmark(window.BrowserAPI.appWindowId, item.id);
      row.remove();
      allLoadedItems = allLoadedItems.filter(b => b.id !== item.id);
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
    window.BrowserAPI.appWindowId, 'reference', '', 10000, 0
  );
  const staleItems = refItems.filter(b => daysSince(b.lastVisited) > 180);

  for (const item of staleItems) {
    const domain = getDomain(item.url);
    const daysAgo = daysSince(item.lastVisited);
    const el = document.createElement('div');
    el.className = 'stale-review-item';
    el.innerHTML = `
      <div class="bk-favicon">
        ${item.faviconUrl
          ? `<img src="${item.faviconUrl}" alt="" style="width:16px;height:16px" onerror="this.parentElement.textContent='🌐'">`
          : '<i data-lucide="globe" width="16" height="16"></i>'}
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
      allLoadedItems = allLoadedItems.filter(b => b.id !== item.id);
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
