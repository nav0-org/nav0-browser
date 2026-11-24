import { HtmlUtils } from '../../../renderer/common/html-utils';
import { FormatUtils } from '../../../renderer/common/format-utils';
import { FaviconTile } from '../../../renderer/common/favicon-tile';
import {
  BrowsingHistoryRecord,
  BrowsingHistorySummary,
} from '../../../types/browsing-history-record';
import { getCategoryForDomain } from '../../../constants/data-constants';
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

// --- Constants ---
const PAGE_SIZE = 100;
// Rows in the Top sites and By category panels.
const SUMMARY_ROWS = 10;
// Activity-map steps 0–4. Each step maps to a `.heat-N` class in index.css
// (the --n-data-0…4 ramp), used by both the map cells and the legend swatches.
const HEATMAP_LEVELS = [0, 1, 2, 3, 4];

// Per-category lucide icon for the "By category" panel rows.
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

// A site without an icon in the favicon cache shows the favicon fallback tile,
// as does an icon that fails to load (FaviconTile.attachFallback: the page CSP
// blocks inline onerror handlers).
function faviconHtml(faviconUrl: string | null | undefined, site: string, size: number): string {
  return faviconUrl
    ? `<img src="${escapeHtml(faviconUrl)}" width="${size}" height="${size}" alt="">`
    : FaviconTile.html(site);
}

// --- State ---
let allEntries: BrowsingHistoryRecord[] = [];
let currentOffset = 0;
let isLoading = false;
let hasMore = true;
let currentSearchTerm = '';
let currentTimeRange = 'all';
let summaryRequest = 0;

// --- DOM refs ---
const historyList = document.getElementById('history-list') as HTMLElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const deleteAllBtn = document.getElementById('delete-all') as HTMLElement;
const historyFooter = document.getElementById('history-footer') as HTMLElement;
const noHistory = document.getElementById('no-history') as HTMLElement;
const heatmapContainer = document.getElementById('heatmap-container') as HTMLElement;
const domainChartContainer = document.getElementById('domain-chart-container') as HTMLElement;
const categoryContainer = document.getElementById('category-container') as HTMLElement;

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  loadHistoryPage();
  loadAnalytics();
  loadSummary();

  searchInput?.addEventListener(
    'input',
    HtmlUtils.debounce(() => {
      resetAndReload();
    }, 300)
  );

  document.querySelectorAll('.time-range-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-range-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentTimeRange = (btn as HTMLElement).dataset.range || 'all';
      resetAndReload();
      loadSummary();
    });
  });

  deleteAllBtn?.addEventListener('click', async () => {
    await window.BrowserAPI.removeAllBrowsingHistory(window.BrowserAPI.appWindowId);
    allEntries = [];
    renderAll();
    loadSummary();
  });

  // Infinite scroll via IntersectionObserver on sentinel element
  const sentinel = document.getElementById('scroll-sentinel');
  if (sentinel) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore) {
          loadHistoryPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
  }
});

// --- Data loading ---
async function loadAnalytics(): Promise<void> {
  const stats: Array<{ date: string; count: number; activeDuration: number }> =
    await window.BrowserAPI.fetchBrowsingHistoryStats(window.BrowserAPI.appWindowId);
  renderHeatmap(stats);
}

// Top sites and By category total the whole range in the database, not just the
// rows the list has loaded so far.
async function loadSummary(): Promise<void> {
  const request = ++summaryRequest;
  const start = rangeStart();
  const summary = await window.BrowserAPI.fetchBrowsingHistorySummary(
    window.BrowserAPI.appWindowId,
    start === null ? null : new Date(start).toISOString(),
    SUMMARY_ROWS
  );
  // A later range, or a deletion, has asked again since.
  if (request !== summaryRequest) return;
  renderDomainChart(summary);
  renderCategoryChart(summary);
}

function resetAndReload(): void {
  currentOffset = 0;
  hasMore = true;
  allEntries = [];
  loadHistoryPage();
}

async function loadHistoryPage(): Promise<void> {
  if (isLoading || !hasMore) return;
  isLoading = true;
  currentSearchTerm = searchInput.value || '';

  const loadingEl = document.getElementById('loading-indicator') as HTMLElement;
  loadingEl.hidden = false;

  const data: BrowsingHistoryRecord[] = await window.BrowserAPI.fetchBrowsingHistory(
    window.BrowserAPI.appWindowId,
    currentSearchTerm,
    PAGE_SIZE,
    currentOffset
  );

  loadingEl.hidden = true;

  if (data.length < PAGE_SIZE) hasMore = false;

  const filtered = filterByTimeRange(data);
  allEntries = allEntries.concat(filtered);
  currentOffset += data.length;

  renderAll();
  isLoading = false;
}

// The start of the selected range in ms, or null for All.
function rangeStart(): number | null {
  if (currentTimeRange === 'today') return new Date().setHours(0, 0, 0, 0);
  if (currentTimeRange === 'week') return Date.now() - 7 * 86400000;
  return null;
}

function filterByTimeRange(entries: BrowsingHistoryRecord[]): BrowsingHistoryRecord[] {
  const start = rangeStart();
  if (start === null) return entries;
  return entries.filter((e) => new Date(e.createdDate).getTime() >= start);
}

// --- Rendering ---
function renderAll(): void {
  renderHistoryList();

  const hasEntries = allEntries.length > 0;
  noHistory.hidden = hasEntries;
  deleteAllBtn.hidden = !hasEntries;
  if (historyFooter) historyFooter.hidden = !hasEntries;
}

// --- Day grouping (flat, no sessions) ---
interface DateGroup {
  label: string;
  dateKey: string;
  entries: BrowsingHistoryRecord[];
}

function groupByDay(entries: BrowsingHistoryRecord[]): DateGroup[] {
  if (entries.length === 0) return [];

  const dateMap = new Map<string, BrowsingHistoryRecord[]>();
  for (const entry of entries) {
    const d = new Date(entry.createdDate);
    const key = d.toDateString();
    if (!dateMap.has(key)) dateMap.set(key, []);
    dateMap.get(key)!.push(entry);
  }

  const dateGroups: DateGroup[] = [];
  for (const [dateKey, dayEntries] of dateMap) {
    dayEntries.sort(
      (a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );
    dateGroups.push({
      label: FormatUtils.getRelativeDayLabel(new Date(dayEntries[0].createdDate)),
      dateKey,
      entries: dayEntries,
    });
  }

  return dateGroups;
}

function renderHistoryList(): void {
  historyList.innerHTML = '';
  const dateGroups = groupByDay(allEntries);

  for (const dg of dateGroups) {
    const dateLabel = document.createElement('div');
    dateLabel.className = 'list-group-header';
    const dayDate = new Date(dg.entries[0].createdDate);
    const daysAgo = Math.floor((Date.now() - dayDate.getTime()) / 86400000);
    // For today / yesterday / this-week, prepend the relative label to the
    // absolute date so it reads "Today · Wednesday, May 20". The relative day is
    // the heading; the date after it is secondary text (DESIGN.md §4.2).
    const absoluteDate = dayDate.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    dateLabel.innerHTML =
      daysAgo < 7
        ? `<span class="list-group-title">${dg.label}</span> <span class="list-group-date">· ${absoluteDate}</span>`
        : `<span class="list-group-title">${absoluteDate}</span>`;
    historyList.appendChild(dateLabel);

    for (const entry of dg.entries) {
      historyList.appendChild(renderEntry(entry));
    }
  }

  createIcons({ icons });
}

function renderEntry(entry: BrowsingHistoryRecord): HTMLElement {
  const row = document.createElement('div');
  row.className = 'list-row history-entry';

  const time = new Date(entry.createdDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const category = getCategoryForDomain(entry.topLevelDomain);
  const catIcon = CATEGORY_ICONS[category] || CATEGORY_ICONS.other;

  const activeStr =
    (entry.activeDuration || 0) > 0 ? FormatUtils.formatDuration(entry.activeDuration || 0) : '0s';
  const totalStr =
    (entry.totalDuration || 0) > 0 ? FormatUtils.formatDuration(entry.totalDuration || 0) : '0s';
  const durationHtml = `<div class="entry-duration" title="active · total">
        <span class="entry-active-dur">${activeStr}</span>
        <span class="entry-total-dur">${totalStr}</span>
      </div>`;

  row.innerHTML = `
    <span class="list-row-lead">${time}</span>
    <div class="list-row-well entry-favicon">${faviconHtml(entry.faviconUrl, entry.url, 18)}</div>
    <div class="list-row-content">
      <span class="list-row-title entry-title" title="${escapeHtml(entry.title)}">${escapeHtml(entry.title)}</span>
      <span class="list-row-meta">${escapeHtml(entry.topLevelDomain)}</span>
    </div>
    <span class="badge"><i data-lucide="${catIcon}" width="12" height="12"></i>${category}</span>
    ${durationHtml}
    <div class="list-row-actions">
      <button class="list-row-action entry-delete-btn" title="Remove"><i data-lucide="x" width="14" height="14"></i></button>
    </div>
  `;
  FaviconTile.attachFallback(row.querySelector('.entry-favicon img'), entry.url);

  row.querySelector('.entry-title')?.addEventListener('click', () => {
    window.BrowserAPI.createTab(window.BrowserAPI.appWindowId, entry.url, true);
  });

  row.querySelector('.entry-delete-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    await window.BrowserAPI.removeBrowsingHistory(window.BrowserAPI.appWindowId, entry.id);
    allEntries = allEntries.filter((item) => item.id !== entry.id);
    row.remove();
    loadSummary();
    if (allEntries.length === 0) {
      noHistory.hidden = false;
      deleteAllBtn.hidden = true;
    }
  });

  return row;
}

// --- Heatmap (cell grid, natural size; scrolls sideways if the page is narrow) ---
function renderHeatmap(
  stats: Array<{ date: string; count: number; activeDuration: number }>
): void {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentDow = todayStart.getDay();
  const startDate = new Date(todayStart);
  startDate.setDate(startDate.getDate() - (52 * 7 + currentDow));

  const dayMap = new Map<string, { count: number; active: number }>();
  for (const s of stats) {
    dayMap.set(s.date, { count: s.count, active: s.activeDuration });
  }

  type DayCell = { date: Date; dow: number; count: number; active: number; label: string };
  const weeks: DayCell[][] = [];
  let currentWeek: DayCell[] = [];
  let maxCount = 0;
  let totalPages = 0;

  interface MonthLabel {
    month: string;
    weekIndex: number;
  }
  const monthLabels: MonthLabel[] = [];
  let lastMonth = -1;

  const cursor = new Date(startDate);
  while (cursor <= todayStart) {
    const dateStr = cursor.toISOString().split('T')[0];
    const data = dayMap.get(dateStr) || { count: 0, active: 0 };
    if (data.count > maxCount) maxCount = data.count;
    totalPages += data.count;

    const m = cursor.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({
        month: cursor.toLocaleDateString([], { month: 'short' }),
        // Label the month's first full week (the column starting on its first
        // Sunday), so a label never sits over the tail of the previous month.
        weekIndex: cursor.getDay() === 0 ? weeks.length : weeks.length + 1,
      });
      lastMonth = m;
    }

    currentWeek.push({
      date: new Date(cursor),
      dow: cursor.getDay(),
      count: data.count,
      active: data.active,
      label: cursor.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
    });

    if (cursor.getDay() === 6 || cursor.getTime() === todayStart.getTime()) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (currentWeek.length) weeks.push(currentWeek);

  // Cell size, gaps and label type live in index.css (.heatmap-*): 11 px cells,
  // 3 px gaps. The 14 px week pitch is only needed here to space month labels.
  const weekPitch = 14;
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function getLevel(count: number): number {
    if (count === 0 || maxCount === 0) return 0;
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }

  // Month labels — one slot per week column; each label sits over its month's
  // first full week. Skip labels that are too close together.
  const monthSlots: string[] = weeks.map(() => '');
  let lastLabelX = -Infinity;
  const minLabelGap = 30;
  for (const m of monthLabels) {
    const x = m.weekIndex * weekPitch;
    // A month that began in the current, partial week has no full week yet.
    if (m.weekIndex >= weeks.length || x - lastLabelX < minLabelGap) continue;
    monthSlots[m.weekIndex] = m.month;
    lastLabelX = x;
  }

  // Cells — the grid fills column by column (Sun to Sat), one column per week.
  // Today's cell is the standard fill; only the hovered cell gets a ring.
  let cellsHtml = '';
  for (const week of weeks) {
    for (const day of week) {
      cellsHtml += `<span class="heatmap-cell heat-${getLevel(day.count)}" data-label="${day.label}" data-count="${day.count}" data-active="${day.active}"></span>`;
    }
  }

  heatmapContainer.innerHTML = `
    <div class="panel-head">
      <span class="panel-title">${totalPages.toLocaleString()} pages visited in the last year</span>
    </div>
    <div class="heatmap-scroll-area">
      <div class="heatmap-chart">
        <div class="heatmap-months">${monthSlots.map((m) => `<span>${m}</span>`).join('')}</div>
        <div class="heatmap-body">
          <div class="heatmap-days">${dayLabels.map((d) => `<span>${d}</span>`).join('')}</div>
          <div class="heatmap-cells">${cellsHtml}</div>
        </div>
      </div>
      <div class="heatmap-legend">
        <span class="heatmap-legend-label">less</span>
        ${HEATMAP_LEVELS.map((l) => `<span class="heatmap-legend-cell heat-${l}"></span>`).join('')}
        <span class="heatmap-legend-label">more</span>
      </div>
    </div>
  `;

  // Tooltip behavior
  const cellsEl = heatmapContainer.querySelector('.heatmap-cells') as HTMLElement;
  let tooltip: HTMLElement | null = null;

  cellsEl.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('heatmap-cell')) return;
    const label = target.getAttribute('data-label') || '';
    const count = parseInt(target.getAttribute('data-count') || '0');
    const active = parseInt(target.getAttribute('data-active') || '0');
    const rect = target.getBoundingClientRect();
    const cr = heatmapContainer.getBoundingClientRect();

    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'heatmap-tooltip';
      heatmapContainer.appendChild(tooltip);
    }
    tooltip.innerHTML = `<div class="heatmap-tooltip-title">${label}</div><div class="heatmap-tooltip-sub">${count === 0 ? 'no activity' : `${count} pages \u00b7 ${FormatUtils.formatDuration(active)} active`}</div>`;
    // Centred above the hovered cell with 8 px clear (computed position).
    tooltip.style.left = `${rect.left - cr.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top - cr.top - 8}px`;
    tooltip.hidden = false;
  });

  cellsEl.addEventListener('mouseout', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('heatmap-cell') && tooltip) {
      tooltip.hidden = true;
    }
  });
}

// --- Domain Chart (heat bar) ---
function renderDomainChart(summary: BrowsingHistorySummary): void {
  const useTime = summary.byActiveTime;
  const sites = summary.sites;

  const label = document.getElementById('domain-chart-label');
  if (label) label.textContent = useTime ? 'Top sites by active time' : 'Top sites by visits';

  const maxVal = Math.max(...sites.map((d) => (useTime ? d.activeDuration : d.visits)), 1);

  domainChartContainer.innerHTML = sites
    .map((d) => {
      const val = useTime ? d.activeDuration : d.visits;
      const valLabel = useTime ? FormatUtils.formatDuration(d.activeDuration) : `${d.visits}`;
      return `
    <div class="domain-row">
      <span class="domain-favicon">${faviconHtml(d.faviconUrl, d.domain, 16)}</span>
      <span class="domain-name">${escapeHtml(d.domain)}</span>
      <span class="domain-duration">${valLabel}</span>
      <div class="domain-bar-track">
        <div class="domain-bar-fill" style="width:${(val / maxVal) * 100}%"></div>
      </div>
    </div>`;
    })
    .join('');
  domainChartContainer.querySelectorAll('.domain-row').forEach((row, i) => {
    FaviconTile.attachFallback(row.querySelector('.domain-favicon img'), sites[i].domain);
  });
  createIcons({ icons });
}

// --- Category Chart (line bars) ---
function renderCategoryChart(summary: BrowsingHistorySummary): void {
  // By active time; by visit count when nothing in the range has any.
  const useDuration = summary.byActiveTime;
  const cats = summary.categories.map((c): [string, number] => [
    c.category,
    useDuration ? c.activeDuration : c.visits,
  ]);

  const catLabel = document.getElementById('category-label');
  if (catLabel)
    catLabel.textContent = useDuration ? 'Time spent by category' : 'Visits by category';

  const maxVal = Math.max(...cats.map(([, val]) => val), 1);

  categoryContainer.innerHTML = cats
    .map(([cat, val]) => {
      const iconName = CATEGORY_ICONS[cat] || CATEGORY_ICONS.other;
      const valLabel = useDuration ? FormatUtils.formatDuration(val) : `${val}`;
      return `
    <div class="category-row">
      <span class="category-icon"><i data-lucide="${iconName}" width="14" height="14"></i></span>
      <span class="category-name">${cat}</span>
      <span class="category-duration">${valLabel}</span>
      <div class="category-bar-track">
        <div class="category-bar-fill" style="width:${(val / maxVal) * 100}%"></div>
      </div>
    </div>`;
    })
    .join('');
  createIcons({ icons });
}

// --- Helpers ---
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  // innerHTML leaves quotes alone: escape them so the result is also safe
  // inside a quoted attribute (title="…", src="…").
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
