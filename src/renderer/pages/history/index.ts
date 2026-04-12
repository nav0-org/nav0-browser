import { HtmlUtils } from '../../../renderer/common/html-utils';
import { FormatUtils } from '../../../renderer/common/format-utils';
import { BrowsingHistoryRecord } from '../../../types/browsing-history-record';
import { BOOKMARK_CATEGORY_COLORS } from '../../../constants/app-constants';
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

// --- Constants ---
const PAGE_SIZE = 100;
const HEATMAP_LEVELS = ['#f0f0f0', '#d4d4d4', '#a3a3a3', '#525252', '#171717'];

// Domain-to-category mapping for the pie chart
const DOMAIN_CATEGORIES: Record<string, string> = {
  'github.com': 'dev', 'gitlab.com': 'dev', 'stackoverflow.com': 'dev',
  'npmjs.com': 'dev', 'developer.mozilla.org': 'dev', 'docs.python.org': 'dev',
  'crates.io': 'dev', 'pkg.go.dev': 'dev', 'pypi.org': 'dev',
  'vercel.com': 'dev', 'netlify.com': 'dev', 'heroku.com': 'dev',
  'linear.app': 'dev', 'jira.atlassian.com': 'dev', 'bitbucket.org': 'dev',
  'twitter.com': 'social', 'x.com': 'social', 'facebook.com': 'social',
  'reddit.com': 'social', 'instagram.com': 'social', 'linkedin.com': 'social',
  'threads.net': 'social', 'mastodon.social': 'social', 'discord.com': 'social',
  'youtube.com': 'media', 'twitch.tv': 'media', 'vimeo.com': 'media',
  'netflix.com': 'media', 'spotify.com': 'media', 'soundcloud.com': 'media',
  'news.ycombinator.com': 'news', 'techcrunch.com': 'news', 'medium.com': 'news',
  'bbc.com': 'news', 'nytimes.com': 'news', 'theguardian.com': 'news',
  'cnn.com': 'news', 'reuters.com': 'news', 'arstechnica.com': 'news',
  'google.com': 'search', 'bing.com': 'search', 'duckduckgo.com': 'search',
  'gmail.com': 'productivity', 'outlook.com': 'productivity', 'notion.so': 'productivity',
  'calendar.google.com': 'productivity', 'docs.google.com': 'productivity',
  'drive.google.com': 'productivity', 'slack.com': 'productivity',
  'amazon.com': 'shopping', 'ebay.com': 'shopping', 'etsy.com': 'shopping',
  'wikipedia.org': 'reference', 'arxiv.org': 'reference', 'mdn.io': 'reference',
  'figma.com': 'design', 'dribbble.com': 'design', 'behance.net': 'design',
};

const CATEGORY_COLORS: Record<string, string> = {
  dev: BOOKMARK_CATEGORY_COLORS.dev || '#6366f1',
  social: BOOKMARK_CATEGORY_COLORS.social || '#8b5cf6',
  media: BOOKMARK_CATEGORY_COLORS.media || '#ec4899',
  news: BOOKMARK_CATEGORY_COLORS.news || '#06b6d4',
  search: '#a1a1aa',
  productivity: BOOKMARK_CATEGORY_COLORS.tools || '#f59e0b',
  shopping: BOOKMARK_CATEGORY_COLORS.shopping || '#f97316',
  reference: BOOKMARK_CATEGORY_COLORS.reference || '#6366f1',
  design: '#8b5cf6',
  other: BOOKMARK_CATEGORY_COLORS.other || '#a1a1aa',
};

function getCategoryForDomain(domain: string): string {
  if (DOMAIN_CATEGORIES[domain]) return DOMAIN_CATEGORIES[domain];
  // Check if any key is a suffix match (e.g. "sub.github.com" → "github.com")
  for (const [d, cat] of Object.entries(DOMAIN_CATEGORIES)) {
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
const statsLabel = document.getElementById('history-stats') as HTMLElement;
const heatmapContainer = document.getElementById('heatmap-container') as HTMLElement;
const domainChartContainer = document.getElementById('domain-chart-container') as HTMLElement;
const categoryContainer = document.getElementById('category-container') as HTMLElement;

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  loadHistoryPage();
  loadAnalytics();

  searchInput?.addEventListener('input', HtmlUtils.debounce(() => {
    resetAndReload();
  }, 300));

  document.querySelectorAll('.time-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-range-btn').forEach(b => b.classList.remove('active'));
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
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isLoading && hasMore) {
        loadHistoryPage();
      }
    }, { rootMargin: '200px' });
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
  historyList.innerHTML = '';
  loadHistoryPage();
}

async function loadHistoryPage(): Promise<void> {
  if (isLoading || !hasMore) return;
  isLoading = true;
  currentSearchTerm = searchInput.value || '';

  const loadingEl = document.getElementById('loading-indicator') as HTMLElement;
  loadingEl.style.display = 'block';

  const data: BrowsingHistoryRecord[] = await window.BrowserAPI.fetchBrowsingHistory(
    window.BrowserAPI.appWindowId, currentSearchTerm, PAGE_SIZE, currentOffset
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
    return entries.filter(e => new Date(e.createdDate).getTime() >= todayStart);
  }
  if (currentTimeRange === 'week') {
    return entries.filter(e => new Date(e.createdDate).getTime() >= now - 7 * 86400000);
  }
  return entries;
}

// --- Rendering ---
function renderAll(): void {
  renderHistoryList();
  renderDomainChart();
  renderCategoryChart();
  updateStats();

  const hasEntries = allEntries.length > 0;
  noHistory.style.display = hasEntries ? 'none' : 'block';
  deleteAllBtn.style.display = hasEntries ? 'inline-block' : 'none';
  if (historyFooter) historyFooter.style.display = hasEntries ? 'block' : 'none';
}

function updateStats(): void {
  const totalDomains = new Set(allEntries.map(e => e.topLevelDomain)).size;
  const totalActive = allEntries.reduce((a, e) => a + (e.activeDuration || 0), 0);
  statsLabel.textContent = `${allEntries.length.toLocaleString()} pages \u00b7 ${totalDomains} sites \u00b7 ${FormatUtils.formatDuration(totalActive)} active`;
}

// --- Day grouping (flat, no sessions) ---
interface DateGroup { label: string; dateKey: string; entries: BrowsingHistoryRecord[] }

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
    dayEntries.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
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
    dateLabel.textContent = dg.label;
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

  const time = new Date(entry.createdDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const faviconUrl = entry.faviconUrl || `https://${entry.topLevelDomain}/favicon.ico`;
  const hasDuration = (entry.activeDuration || 0) > 0 || (entry.totalDuration || 0) > 0;

  const durationHtml = hasDuration
    ? `<div class="entry-duration">
        <span class="entry-active-dur" title="active time">${FormatUtils.formatDuration(entry.activeDuration || 0)}</span>
        <span class="entry-total-dur" title="total time">${FormatUtils.formatDuration(entry.totalDuration || 0)}</span>
      </div>`
    : '';

  row.innerHTML = `
    <span class="entry-time">${time}</span>
    <div class="entry-favicon"><img src="${faviconUrl}" width="16" height="16" onerror="this.parentElement.innerHTML='<i data-lucide=\\'globe\\' width=\\'16\\' height=\\'16\\'></i>'"></div>
    <div class="entry-content">
      <span class="entry-title" title="${escapeHtml(entry.title)}">${escapeHtml(entry.title)}</span>
      <span class="entry-domain">${escapeHtml(entry.topLevelDomain)}</span>
    </div>
    ${durationHtml}
    <button class="entry-delete-btn"><i data-lucide="x" width="12" height="12"></i></button>
  `;

  row.querySelector('.entry-title')?.addEventListener('click', () => {
    window.BrowserAPI.createTab(window.BrowserAPI.appWindowId, entry.url, true);
  });

  row.querySelector('.entry-delete-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    await window.BrowserAPI.removeBrowsingHistory(window.BrowserAPI.appWindowId, entry.id);
    allEntries = allEntries.filter(item => item.id !== entry.id);
    row.remove();
    renderDomainChart();
    renderCategoryChart();
    updateStats();
    if (allEntries.length === 0) {
      noHistory.style.display = 'block';
      deleteAllBtn.style.display = 'none';
    }
  });

  return row;
}

// --- Heatmap (responsive SVG via viewBox) ---
function renderHeatmap(stats: Array<{ date: string; count: number; activeDuration: number }>): void {
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
  let totalActive = 0;
  let totalPages = 0;
  let activeDays = 0;

  interface MonthLabel { month: string; weekIndex: number }
  const monthLabels: MonthLabel[] = [];
  let lastMonth = -1;

  const cursor = new Date(startDate);
  while (cursor <= todayStart) {
    const dateStr = cursor.toISOString().split('T')[0];
    const data = dayMap.get(dateStr) || { count: 0, active: 0 };
    if (data.count > maxCount) maxCount = data.count;
    totalActive += data.active;
    totalPages += data.count;
    if (data.count > 0) activeDays++;

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

  // Day labels — show all 7 days
  for (let i = 0; i < dayLabels.length; i++) {
    svgContent += `<text x="0" y="${topPad + i * (cellSize + cellGap) + cellSize - 1}" font-size="8" fill="var(--text-secondary)">${dayLabels[i]}</text>`;
  }

  // Cells
  for (let wi = 0; wi < weeks.length; wi++) {
    for (const day of weeks[wi]) {
      const level = getLevel(day.count);
      const isToday = day.date.toDateString() === now.toDateString();
      const x = dayLabelW + wi * (cellSize + cellGap);
      const y = topPad + day.dow * (cellSize + cellGap);
      svgContent += `<rect class="heatmap-cell" x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${HEATMAP_LEVELS[level]}" ${isToday ? `stroke="var(--primary-color)" stroke-width="1.5"` : ''} data-label="${day.label}" data-count="${day.count}" data-active="${day.active}" />`;
    }
  }

  const svgW = dayLabelW + gridW + 4;
  const svgH = topPad + gridH + 4;

  heatmapContainer.innerHTML = `
    <div class="heatmap-header">
      <span class="heatmap-summary">${totalPages.toLocaleString()} pages visited in the last year</span>
      <div class="heatmap-stats">
        <span><span class="stat-value">${activeDays}</span> active days</span>
        <span><span class="stat-value">${FormatUtils.formatDuration(totalActive)}</span> active time</span>
      </div>
    </div>
    <div class="heatmap-scroll-area">
      <svg viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMinYMid meet">${svgContent}</svg>
      <div class="heatmap-legend">
        <span class="heatmap-legend-label">less</span>
        ${HEATMAP_LEVELS.map(c => `<div class="heatmap-legend-cell" style="background:${c}"></div>`).join('')}
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
    const cr = scrollArea.getBoundingClientRect();

    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'heatmap-tooltip';
      scrollArea.appendChild(tooltip);
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
  const map = new Map<string, { domain: string; visits: number; active: number; faviconUrl: string }>();
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
    .sort((a, b) => useTime ? b.active - a.active : b.visits - a.visits)
    .slice(0, 8);

  const label = document.getElementById('domain-chart-label');
  if (label) label.textContent = useTime ? 'Top sites by active time' : 'Top sites by visits';

  const maxVal = Math.max(...sorted.map(d => useTime ? d.active : d.visits), 1);

  domainChartContainer.innerHTML = sorted.map(d => {
    const val = useTime ? d.active : d.visits;
    const valLabel = useTime ? FormatUtils.formatDuration(d.active) : `${d.visits}`;
    return `
    <div class="domain-row">
      <span class="domain-name">${escapeHtml(d.domain)}</span>
      <div class="domain-bar-track">
        <div class="domain-bar-fill" style="width:${(val / maxVal) * 100}%"></div>
      </div>
      <span class="domain-duration">${valLabel}</span>
    </div>`;
  }).join('');
}

// --- Category Pie Chart ---
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
  const total = Array.from(catMap.values()).reduce((a, b) => a + b, 0) || 1;
  const cats = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat, val]) => ({ cat, dur: val, pct: (val / total) * 100 }));

  const catLabel = document.getElementById('category-label');
  if (catLabel) catLabel.textContent = useDuration ? 'Time spent by category' : 'Visits by category';

  // SVG donut chart — larger, no legend
  const radius = 56, circ = 2 * Math.PI * radius;
  let accum = 0;
  let slices = '';
  for (const c of cats) {
    const color = CATEGORY_COLORS[c.cat] || CATEGORY_COLORS.other;
    const dashLen = (c.pct / 100) * circ;
    const offset = -(accum / 100) * circ;
    slices += `<circle class="category-slice" cx="70" cy="70" r="${radius}" fill="none" stroke="${color}" stroke-width="16" stroke-dasharray="${dashLen} ${circ}" stroke-dashoffset="${offset}" data-cat="${c.cat}" data-pct="${Math.round(c.pct)}" style="cursor:pointer" />`;
    accum += c.pct;
  }

  categoryContainer.innerHTML = `
    <div class="category-chart-wrapper">
      <svg width="140" height="140" viewBox="0 0 140 140">${slices}</svg>
      <div class="category-tooltip" id="category-tooltip"></div>
    </div>
  `;

  // Tooltip behavior on hover
  const svg = categoryContainer.querySelector('svg')!;
  const tooltip = document.getElementById('category-tooltip')!;

  svg.addEventListener('mouseover', (e) => {
    const target = e.target as SVGElement;
    if (!target.classList.contains('category-slice')) return;
    const cat = target.getAttribute('data-cat') || '';
    const pct = target.getAttribute('data-pct') || '0';
    tooltip.textContent = `${cat} \u00b7 ${pct}%`;
    tooltip.classList.add('visible');
    tooltip.style.left = '50%';
    tooltip.style.top = '-4px';
  });

  svg.addEventListener('mouseout', (e) => {
    const target = e.target as SVGElement;
    if (target.classList.contains('category-slice')) {
      tooltip.classList.remove('visible');
    }
  });
}

// --- Helpers ---
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
