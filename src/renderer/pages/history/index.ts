import { HtmlUtils } from '../../../renderer/common/html-utils';
import { FormatUtils } from '../../../renderer/common/format-utils';
import { BrowsingHistoryRecord } from '../../../types/browsing-history-record';
import { WEBSITE_CATEGORY_COLORS } from '../../../constants/app-constants';
import { WEBSITE_CATEGORY_MAP } from '../../../constants/data-constants';
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

// --- Constants ---
const PAGE_SIZE = 100;
// Grayscale ramp from the Nav0 design system — used for both the heatmap
// cells and the legend swatches.
const HEATMAP_LEVELS = ['#f5f5f5', '#e5e5e5', '#bdbdbd', '#6b7280', '#0a0a0a'];

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

function getCategoryForDomain(domain: string): string {
  if (WEBSITE_CATEGORY_MAP[domain]) return WEBSITE_CATEGORY_MAP[domain];
  for (const [d, cat] of Object.entries(WEBSITE_CATEGORY_MAP)) {
    if (domain.endsWith('.' + d)) return cat;
  }
  return 'other';
}

// --- State ---
let allEntries: BrowsingHistoryRecord[] = [];
let currentOffset = 0;
let isLoading = false;
let hasMore = true;
let currentSearchTerm = '';
let currentTimeRange = 'all';

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
    });
  });

  deleteAllBtn?.addEventListener('click', async () => {
    await window.BrowserAPI.removeAllBrowsingHistory(window.BrowserAPI.appWindowId);
    allEntries = [];
    renderAll();
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
  loadingEl.style.display = 'block';

  const data: BrowsingHistoryRecord[] = await window.BrowserAPI.fetchBrowsingHistory(
    window.BrowserAPI.appWindowId,
    currentSearchTerm,
    PAGE_SIZE,
    currentOffset
  );

  loadingEl.style.display = 'none';

  if (data.length < PAGE_SIZE) hasMore = false;

  const filtered = filterByTimeRange(data);
  allEntries = allEntries.concat(filtered);
  currentOffset += data.length;

  renderAll();
  isLoading = false;
}

function filterByTimeRange(entries: BrowsingHistoryRecord[]): BrowsingHistoryRecord[] {
  if (currentTimeRange === 'all') return entries;
  const now = Date.now();
  if (currentTimeRange === 'today') {
    const todayStart = new Date().setHours(0, 0, 0, 0);
    return entries.filter((e) => new Date(e.createdDate).getTime() >= todayStart);
  }
  if (currentTimeRange === 'week') {
    return entries.filter((e) => new Date(e.createdDate).getTime() >= now - 7 * 86400000);
  }
  return entries;
}

// --- Rendering ---
function renderAll(): void {
  renderHistoryList();
  renderDomainChart();
  renderCategoryChart();

  const hasEntries = allEntries.length > 0;
  noHistory.style.display = hasEntries ? 'none' : 'block';
  // Empty string clears the inline style so the CSS rule (inline-flex) applies.
  deleteAllBtn.style.display = hasEntries ? '' : 'none';
  if (historyFooter) historyFooter.style.display = hasEntries ? 'block' : 'none';
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
    dateLabel.className = 'date-group-label';
    const dayDate = new Date(dg.entries[0].createdDate);
    const daysAgo = Math.floor((Date.now() - dayDate.getTime()) / 86400000);
    // For today / yesterday / this-week, prepend the relative label to the
    // absolute date so it reads "Today · Wednesday, May 20".
    const absoluteDate = dayDate.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const dayLabelText = daysAgo < 7 ? `${dg.label} · ${absoluteDate}` : absoluteDate;
    dateLabel.innerHTML = `<span class="day-label">${dayLabelText}</span>`;
    historyList.appendChild(dateLabel);

    for (const entry of dg.entries) {
      historyList.appendChild(renderEntry(entry));
    }
  }

  createIcons({ icons });
}

function renderEntry(entry: BrowsingHistoryRecord): HTMLElement {
  const row = document.createElement('div');
  row.className = 'history-entry';

  const time = new Date(entry.createdDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const faviconUrl = entry.faviconUrl || `https://${entry.topLevelDomain}/favicon.ico`;
  const category = getCategoryForDomain(entry.topLevelDomain);
  const catColor = WEBSITE_CATEGORY_COLORS[category] || WEBSITE_CATEGORY_COLORS.other;
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
    <span class="entry-time">${time}</span>
    <div class="entry-favicon"><img src="${faviconUrl}" width="18" height="18" onerror="this.parentElement.innerHTML='<i data-lucide=\\'globe\\' width=\\'18\\' height=\\'18\\'></i>'"></div>
    <div class="entry-content">
      <span class="entry-title" title="${escapeHtml(entry.title)}">${escapeHtml(entry.title)}</span>
      <span class="entry-domain">${escapeHtml(entry.topLevelDomain)}</span>
    </div>
    <span class="entry-category-badge" style="background:${catColor}18;color:${catColor}"><i data-lucide="${catIcon}" width="12" height="12"></i>${category}</span>
    ${durationHtml}
    <button class="entry-delete-btn" title="Remove"><i data-lucide="x" width="14" height="14"></i></button>
  `;

  row.querySelector('.entry-title')?.addEventListener('click', () => {
    window.BrowserAPI.createTab(window.BrowserAPI.appWindowId, entry.url, true);
  });

  row.querySelector('.entry-delete-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    await window.BrowserAPI.removeBrowsingHistory(window.BrowserAPI.appWindowId, entry.id);
    allEntries = allEntries.filter((item) => item.id !== entry.id);
    row.remove();
    renderDomainChart();
    renderCategoryChart();
    if (allEntries.length === 0) {
      noHistory.style.display = 'block';
      deleteAllBtn.style.display = 'none';
    }
  });

  return row;
}

// --- Heatmap (responsive SVG via viewBox) ---
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
        weekIndex: weeks.length,
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

  const cellSize = 11;
  const cellGap = 2;
  const dayLabelW = 28;
  const topPad = 18;
  const gridW = weeks.length * (cellSize + cellGap);
  const gridH = 7 * (cellSize + cellGap);
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function getLevel(count: number): number {
    if (count === 0 || maxCount === 0) return 0;
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }

  let svgContent = '';

  // Month labels — skip labels that are too close together
  let lastLabelX = -Infinity;
  const minLabelGap = 30;
  for (const m of monthLabels) {
    const x = dayLabelW + m.weekIndex * (cellSize + cellGap);
    if (x - lastLabelX < minLabelGap) continue;
    svgContent += `<text x="${x}" y="12" font-size="9" fill="var(--text-secondary)">${m.month}</text>`;
    lastLabelX = x;
  }

  // Day labels — right-aligned next to the cell grid.
  for (let i = 0; i < dayLabels.length; i++) {
    svgContent += `<text x="${dayLabelW - 6}" y="${topPad + i * (cellSize + cellGap) + cellSize - 1}" font-size="8" text-anchor="end" fill="var(--text-secondary)">${dayLabels[i]}</text>`;
  }

  // Cells
  for (let wi = 0; wi < weeks.length; wi++) {
    for (const day of weeks[wi]) {
      const level = getLevel(day.count);
      const isToday = day.date.toDateString() === now.toDateString();
      const x = dayLabelW + wi * (cellSize + cellGap);
      const y = topPad + day.dow * (cellSize + cellGap);
      // Per Nav0 design system: today's cell is just the standard fill — no ring.
      void isToday;
      svgContent += `<rect class="heatmap-cell" x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${HEATMAP_LEVELS[level]}" data-label="${day.label}" data-count="${day.count}" data-active="${day.active}" />`;
    }
  }

  const svgW = dayLabelW + gridW + 4;
  const svgH = topPad + gridH + 4;

  heatmapContainer.innerHTML = `
    <div class="heatmap-header">
      <span class="heatmap-summary">${totalPages.toLocaleString()} pages visited in the last year</span>
    </div>
    <div class="heatmap-scroll-area">
      <svg viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMinYMid meet">${svgContent}</svg>
      <div class="heatmap-legend">
        <span class="heatmap-legend-label">less</span>
        ${HEATMAP_LEVELS.map((c) => `<div class="heatmap-legend-cell" style="background:${c}"></div>`).join('')}
        <span class="heatmap-legend-label" style="margin-left:4px">more</span>
      </div>
    </div>
  `;

  // Tooltip behavior
  const svgEl = heatmapContainer.querySelector('svg')!;
  const scrollArea = heatmapContainer.querySelector('.heatmap-scroll-area') as HTMLElement;
  let tooltip: HTMLElement | null = null;

  svgEl.addEventListener('mouseover', (e) => {
    const target = e.target as SVGElement;
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
    tooltip.style.left = `${rect.left - cr.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top - cr.top - 4}px`;
    tooltip.style.display = 'block';
  });

  svgEl.addEventListener('mouseout', (e) => {
    const target = e.target as SVGElement;
    if (target.classList.contains('heatmap-cell') && tooltip) {
      tooltip.style.display = 'none';
    }
  });
}

// --- Domain Chart (heat bar) ---
function renderDomainChart(): void {
  const map = new Map<
    string,
    { domain: string; visits: number; active: number; faviconUrl: string }
  >();
  for (const e of allEntries) {
    const existing = map.get(e.topLevelDomain);
    if (existing) {
      existing.visits++;
      existing.active += e.activeDuration || 0;
    } else {
      map.set(e.topLevelDomain, {
        domain: e.topLevelDomain,
        visits: 1,
        active: e.activeDuration || 0,
        faviconUrl: e.faviconUrl || `https://${e.topLevelDomain}/favicon.ico`,
      });
    }
  }

  const totalActive = Array.from(map.values()).reduce((a, d) => a + d.active, 0);
  const useTime = totalActive > 0;

  const sorted = Array.from(map.values())
    .sort((a, b) => (useTime ? b.active - a.active : b.visits - a.visits))
    .slice(0, 10);

  const label = document.getElementById('domain-chart-label');
  if (label) label.textContent = useTime ? 'Top sites by active time' : 'Top sites by visits';

  const maxVal = Math.max(...sorted.map((d) => (useTime ? d.active : d.visits)), 1);

  domainChartContainer.innerHTML = sorted
    .map((d) => {
      const val = useTime ? d.active : d.visits;
      const valLabel = useTime ? FormatUtils.formatDuration(d.active) : `${d.visits}`;
      return `
    <div class="domain-row">
      <span class="domain-favicon"><img src="${d.faviconUrl}" width="16" height="16" onerror="this.parentElement.innerHTML='<i data-lucide=\\'globe\\' width=\\'14\\' height=\\'14\\'></i>'" /></span>
      <span class="domain-name">${escapeHtml(d.domain)}</span>
      <span class="domain-duration">${valLabel}</span>
      <div class="domain-bar-track">
        <div class="domain-bar-fill" style="width:${(val / maxVal) * 100}%"></div>
      </div>
    </div>`;
    })
    .join('');
  createIcons({ icons });
}

// --- Category Chart (line bars) ---
function renderCategoryChart(): void {
  if (allEntries.length === 0) {
    categoryContainer.innerHTML = '';
    return;
  }

  // Aggregate by active duration; fall back to visit count if all durations are 0
  const durationMap = new Map<string, number>();
  const countMap = new Map<string, number>();
  for (const e of allEntries) {
    const cat = getCategoryForDomain(e.topLevelDomain);
    durationMap.set(cat, (durationMap.get(cat) || 0) + (e.activeDuration || 0));
    countMap.set(cat, (countMap.get(cat) || 0) + 1);
  }

  const totalDuration = Array.from(durationMap.values()).reduce((a, b) => a + b, 0);
  const useDuration = totalDuration > 0;
  const catMap = useDuration ? durationMap : countMap;
  const cats = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const catLabel = document.getElementById('category-label');
  if (catLabel)
    catLabel.textContent = useDuration ? 'Time spent by category' : 'Visits by category';

  const maxVal = Math.max(...cats.map(([, val]) => val), 1);

  categoryContainer.innerHTML = cats
    .map(([cat, val]) => {
      const color = WEBSITE_CATEGORY_COLORS[cat] || WEBSITE_CATEGORY_COLORS.other;
      const iconName = CATEGORY_ICONS[cat] || CATEGORY_ICONS.other;
      const valLabel = useDuration ? FormatUtils.formatDuration(val) : `${val}`;
      return `
    <div class="category-row">
      <span class="category-icon" style="color:${color}"><i data-lucide="${iconName}" width="14" height="14"></i></span>
      <span class="category-name">${cat}</span>
      <span class="category-duration">${valLabel}</span>
      <div class="category-bar-track">
        <div class="category-bar-fill" style="width:${(val / maxVal) * 100}%;background:${color}"></div>
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
  return div.innerHTML;
}
