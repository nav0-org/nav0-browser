import { HtmlUtils } from '../../../renderer/common/html-utils';
import { BookmarkWithStats } from '../../../types/bookmark-record';
import { BOOKMARK_CATEGORY_MAP, BOOKMARK_CATEGORY_COLORS } from '../../../constants/app-constants';
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

function getCategoryForUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    if (BOOKMARK_CATEGORY_MAP[hostname]) return BOOKMARK_CATEGORY_MAP[hostname];
    // Check parent domains (e.g., blog.privacyguides.org → privacyguides.org)
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

// --- Freshness logic ---
function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const now = new Date();
  const then = new Date(dateStr);
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
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
  // Indigo scale matching downloads TYPE_COLORS.document (#6366f1)
  if (visits >= 200) return '#4338ca';
  if (visits >= 100) return '#6366f1';
  if (visits >= 50) return '#818cf8';
  if (visits >= 20) return '#a5b4fc';
  if (visits >= 10) return '#c7d2fe';
  return '#e0e7ff';
}

function queueAgeLabel(createdDate: string): { label: string; color: string } {
  const days = daysSince(createdDate);
  if (days < 7) return { label: 'this week', color: '#10b981' };   // green — matches downloads code type
  if (days < 30) return { label: `${Math.floor(days / 7)}w ago`, color: '#a1a1aa' };  // gray — matches downloads other type
  if (days < 90) return { label: `${Math.floor(days / 30)}mo ago`, color: '#f59e0b' }; // amber — matches downloads installer type
  return { label: `${Math.floor(days / 30)}mo — still reading this?`, color: '#e74c3c' }; // error-color from global.css
}

// --- State ---
const PAGE_SIZE = 50;
let activeTab: 'queue' | 'reference' = 'queue';
let currentSearchTerm = '';
let selectedCategory = '';
let currentOffset = 0;
let isLoading = false;
let hasMore = true;
let allLoadedItems: BookmarkWithStats[] = [];
let maxVisits = 1;

// --- DOM refs ---
const bookmarksList = document.getElementById('bookmarks-list') as HTMLElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const emptyState = document.getElementById('empty-state') as HTMLElement;
const loadingIndicator = document.getElementById('loading-indicator') as HTMLElement;
const queueCountEl = document.getElementById('queue-count') as HTMLElement;
const referenceCountEl = document.getElementById('reference-count') as HTMLElement;
const tabQueueBtn = document.getElementById('tab-queue') as HTMLButtonElement;
const tabReferenceBtn = document.getElementById('tab-reference') as HTMLButtonElement;
const categoriesContainer = document.getElementById('bk-categories') as HTMLElement;
const staleBar = document.getElementById('stale-bar') as HTMLElement;
const staleText = document.getElementById('stale-text') as HTMLElement;
const staleReviewBtn = document.getElementById('stale-review-btn') as HTMLButtonElement;
const staleReview = document.getElementById('stale-review') as HTMLElement;
const staleReviewList = document.getElementById('stale-review-list') as HTMLElement;
const staleDoneBtn = document.getElementById('stale-done-btn') as HTMLButtonElement;

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  await updateCounts();
  await loadBookmarks();

  // Tab switching
  tabQueueBtn.addEventListener('click', () => switchTab('queue'));
  tabReferenceBtn.addEventListener('click', () => switchTab('reference'));

  // Search
  const debouncedSearch = HtmlUtils.debounce(() => {
    currentSearchTerm = searchInput.value || '';
    resetAndReload();
  }, 300);
  searchInput.addEventListener('input', debouncedSearch);

  // Infinite scroll
  bookmarksList.addEventListener('scroll', () => {
    if (isLoading || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = bookmarksList;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadBookmarks();
    }
  });

  // Stale review
  staleReviewBtn.addEventListener('click', () => showStaleReview());
  staleDoneBtn.addEventListener('click', () => hideStaleReview());

  searchInput.focus();
});

// --- Functions ---

async function updateCounts(): Promise<void> {
  // Fetch small batch from each type to get total counts
  // We'll use a large limit to count, but the real count comes from fetching all
  // Actually, we need a proper count. Let's fetch one item per type to check emptiness,
  // then use the counts from fetchBookmarksWithStats pagination behavior.
  // For a proper count, we'll do two fetches with limit=1 and check if results come back.
  // Better: fetch both types with large limit to count... but that's wasteful.
  // The cleanest approach: fetch a COUNT from the DB. But we don't have that IPC.
  // Use the existing fetchBookmarks and count results...
  // Actually, let's fetch all with a large limit just for counts. This is on a local SQLite DB, so it's fast.
  const queueItems = await window.BrowserAPI.fetchBookmarksWithStats(
    window.BrowserAPI.appWindowId, 'queue', '', 10000, 0
  );
  const refItems = await window.BrowserAPI.fetchBookmarksWithStats(
    window.BrowserAPI.appWindowId, 'reference', '', 10000, 0
  );
  queueCountEl.textContent = String(queueItems.length);
  referenceCountEl.textContent = String(refItems.length);

  // Check for stale bookmarks (reference items not visited in 6+ months)
  if (activeTab === 'reference') {
    const staleItems = refItems.filter((b: BookmarkWithStats) => daysSince(b.lastVisited) > 180);
    if (staleItems.length > 0) {
      staleText.textContent = `${staleItems.length} bookmark${staleItems.length > 1 ? 's' : ''} you haven't visited in 6+ months`;
      staleBar.style.display = 'flex';
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
  selectedCategory = '';
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
}

async function loadBookmarks(): Promise<void> {
  if (isLoading || !hasMore) return;
  isLoading = true;
  loadingIndicator.style.display = 'block';

  const items: BookmarkWithStats[] = await window.BrowserAPI.fetchBookmarksWithStats(
    window.BrowserAPI.appWindowId, activeTab, currentSearchTerm, PAGE_SIZE, currentOffset
  );

  loadingIndicator.style.display = 'none';

  if (items.length < PAGE_SIZE) {
    hasMore = false;
  }

  // Filter by category client-side
  let filtered = items;
  if (selectedCategory) {
    filtered = items.filter(b => getCategoryForUrl(b.url) === selectedCategory);
  }

  allLoadedItems = allLoadedItems.concat(filtered);
  currentOffset += items.length;

  // Update max visits for heat bar scaling
  for (const item of allLoadedItems) {
    if (item.visits > maxVisits) maxVisits = item.visits;
  }

  if (allLoadedItems.length === 0 && currentOffset > 0 || (currentOffset === 0 && items.length === 0)) {
    emptyState.style.display = 'block';
    emptyState.textContent = currentSearchTerm ? `no bookmarks matching "${currentSearchTerm}"` : 'nothing here yet';
  } else {
    emptyState.style.display = 'none';
  }

  renderBookmarkItems(filtered);
  updateCategories();
  isLoading = false;
}

function updateCategories(): void {
  const cats = new Set<string>();
  allLoadedItems.forEach(b => cats.add(getCategoryForUrl(b.url)));
  const sorted = [...cats].sort();

  categoriesContainer.innerHTML = '';
  for (const cat of sorted) {
    const pill = document.createElement('button');
    pill.className = 'bk-cat-pill' + (selectedCategory === cat ? ' active' : '');
    pill.textContent = cat;
    pill.addEventListener('click', () => {
      selectedCategory = selectedCategory === cat ? '' : cat;
      resetAndReload();
    });
    categoriesContainer.appendChild(pill);
  }
}

function renderBookmarkItems(items: BookmarkWithStats[]): void {
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'bk-row';
    const opacity = freshnessOpacity(item);
    row.style.opacity = String(opacity);

    const domain = getDomain(item.url);
    const category = getCategoryForUrl(item.url);

    // Favicon
    const faviconHtml = item.faviconUrl
      ? `<img src="${item.faviconUrl}" alt="" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'">`
      : `<i data-lucide="globe" width="16" height="16"></i>`;

    // Meta line
    let metaHtml = `<span class="bk-row-domain">${domain}</span>`;

    if (item.type === 'queue') {
      const age = queueAgeLabel(item.createdDate as unknown as string);
      metaHtml += `<span class="bk-queue-age" style="color: ${age.color}">saved ${age.label}</span>`;
    }

    if (item.type === 'reference') {
      const daysAgo = daysSince(item.lastVisited);
      if (daysAgo >= 90) {
        const months = Math.floor(daysAgo / 30);
        metaHtml += `<span class="bk-stale-indicator">${months}mo dormant</span>`;
      }
    }

    const catColor = getCategoryColor(category);
    metaHtml += `<span class="bk-cat-tag" style="color: ${catColor}; border-color: ${catColor}">${category}</span>`;

    // Actions
    const moveLabel = item.type === 'queue' ? '→ move to reference' : '→ move to queue';
    const actionsHtml = `
      <div class="bk-row-actions">
        <button class="bk-action-btn move" data-action="move">${moveLabel}</button>
        <button class="bk-action-btn remove" data-action="remove">remove</button>
      </div>
    `;

    // Visit count (reference only)
    const visitHtml = item.type === 'reference'
      ? `<span class="bk-visit-count" style="color: ${heatColor(item.visits)}">${item.visits} visits</span>`
      : '';

    // Heat bar (reference only)
    const heatBarWidth = item.type === 'reference'
      ? Math.max(4, (item.visits / maxVisits) * 100)
      : 0;
    const heatBarHtml = item.type === 'reference'
      ? `<div class="bk-heat-bar" style="width: ${heatBarWidth}%"></div>`
      : '';

    row.innerHTML = `
      <div class="bk-favicon">${faviconHtml}</div>
      <div class="bk-row-content">
        <div class="bk-row-title">${escapeHtml(item.title)}</div>
        <div class="bk-row-meta">${metaHtml}</div>
        ${actionsHtml}
      </div>
      ${visitHtml}
      ${heatBarHtml}
    `;

    // Event: click content to open
    row.querySelector('.bk-row-content')?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.bk-action-btn')) return;
      window.BrowserAPI.createTab(window.BrowserAPI.appWindowId, item.url, true);
    });

    // Event: move
    row.querySelector('[data-action="move"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const newType = item.type === 'queue' ? 'reference' : 'queue';
      await window.BrowserAPI.updateBookmarkType(window.BrowserAPI.appWindowId, item.id, newType);
      row.remove();
      allLoadedItems = allLoadedItems.filter(b => b.id !== item.id);
      updateEmptyState();
      updateCounts();
    });

    // Event: remove
    row.querySelector('[data-action="remove"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.BrowserAPI.removeBookmark(window.BrowserAPI.appWindowId, item.id);
      row.remove();
      allLoadedItems = allLoadedItems.filter(b => b.id !== item.id);
      updateEmptyState();
      updateCounts();
    });

    bookmarksList.appendChild(row);
  }

  createIcons({ icons });
}

function updateEmptyState(): void {
  if (allLoadedItems.length === 0) {
    emptyState.style.display = 'block';
    emptyState.textContent = currentSearchTerm ? `no bookmarks matching "${currentSearchTerm}"` : 'nothing here yet';
  } else {
    emptyState.style.display = 'none';
  }
}

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
    el.className = 'bk-stale-item';
    el.innerHTML = `
      <div class="bk-stale-item-left">
        <div class="bk-favicon">
          ${item.faviconUrl
            ? `<img src="${item.faviconUrl}" alt="" style="width:16px;height:16px" onerror="this.parentElement.textContent='🌐'">`
            : '<span>🌐</span>'}
        </div>
        <div class="bk-stale-item-info">
          <div class="bk-stale-item-title">${escapeHtml(item.title)}</div>
          <div class="bk-stale-item-meta">${domain} · ${item.visits} visits · last visited ${daysAgo === Infinity ? 'never' : daysAgo + ' days ago'}</div>
        </div>
      </div>
      <div class="bk-stale-item-actions">
        <button class="bk-action-btn keep" data-action="keep">keep</button>
        <button class="bk-action-btn remove" data-action="remove">remove</button>
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
      updateEmptyState();
      updateCounts();
      if (staleReviewList.children.length === 0) hideStaleReview();
    });

    staleReviewList.appendChild(el);
  }
}

function hideStaleReview(): void {
  staleReview.style.display = 'none';
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
