import { HtmlUtils } from '../../../renderer/common/html-utils';
import { FormatUtils } from '../../../renderer/common/format-utils';
import { BrowsingHistoryRecord } from '../../../types/browsing-history-record';
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

// --- Constants ---
const PAGE_SIZE = 100;
const SESSION_GAP_MS = 1800000; // 30 minutes
const HEATMAP_LEVELS = ['#f0f0f0', '#d4d4d4', '#a3a3a3', '#525252', '#171717'];

// --- State ---
let allEntries: BrowsingHistoryRecord[] = [];
let currentOffset = 0;
let isLoading = false;
let hasMore = true;
let currentSearchTerm = '';
let currentTimeRange = 'all';
const selectedIds = new Set<string>();

// --- DOM refs ---
const historyList = document.getElementById('history-list') as HTMLElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const searchClear = document.getElementById('search-clear') as HTMLElement;
const deleteSelectedBtn = document.getElementById('delete-selected') as HTMLElement;
const deleteSelectedCount = document.getElementById('delete-selected-count') as HTMLElement;
const deleteAllBtn = document.getElementById('delete-all') as HTMLElement;
const noHistory = document.getElementById('no-history') as HTMLElement;
const statsLabel = document.getElementById('history-stats') as HTMLElement;
const heatmapContainer = document.getElementById('heatmap-container') as HTMLElement;
const sparklineContainer = document.getElementById('sparkline-container') as HTMLElement;
const domainChartContainer = document.getElementById('domain-chart-container') as HTMLElement;

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  loadHistoryPage();
  loadAnalytics();

  searchInput?.addEventListener('input', HtmlUtils.debounce(() => {
    searchClear.style.display = searchInput.value ? 'flex' : 'none';
    resetAndReload();
  }, 300));

  searchClear?.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.style.display = 'none';
    resetAndReload();
  });

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
    selectedIds.clear();
    renderAll();
  });

  deleteSelectedBtn?.addEventListener('click', deleteSelected);

  historyList?.addEventListener('scroll', () => {
    if (isLoading || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = historyList;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadHistoryPage();
    }
  });
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
  selectedIds.clear();
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

  // Apply client-side time range filter
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
  renderSparkline();
  renderDomainChart();
  updateStats();
  updateSelectionUI();

  const hasEntries = allEntries.length > 0;
  noHistory.style.display = hasEntries ? 'none' : 'block';
  deleteAllBtn.style.display = hasEntries ? 'block' : 'none';
}

function updateStats(): void {
  const totalDomains = new Set(allEntries.map(e => e.topLevelDomain)).size;
  const totalActive = allEntries.reduce((a, e) => a + (e.activeDuration || 0), 0);
  statsLabel.textContent = `${allEntries.length.toLocaleString()} pages \u00b7 ${totalDomains} sites \u00b7 ${FormatUtils.formatDuration(totalActive)} active`;
}

function updateSelectionUI(): void {
  if (selectedIds.size > 0) {
    deleteSelectedBtn.style.display = 'inline-flex';
    deleteSelectedCount.textContent = `delete ${selectedIds.size} selected`;
  } else {
    deleteSelectedBtn.style.display = 'none';
  }
}

async function deleteSelected(): Promise<void> {
  const ids = Array.from(selectedIds);
  for (const id of ids) {
    await window.BrowserAPI.removeBrowsingHistory(window.BrowserAPI.appWindowId, id);
  }
  allEntries = allEntries.filter(e => !selectedIds.has(e.id));
  selectedIds.clear();
  renderAll();
}

// --- Session grouping ---
interface Session { entries: BrowsingHistoryRecord[] }
interface DateGroup { label: string; dateKey: string; sessions: Session[] }

function groupIntoSessions(entries: BrowsingHistoryRecord[]): DateGroup[] {
  if (entries.length === 0) return [];

  // Group by date first
  const dateMap = new Map<string, BrowsingHistoryRecord[]>();
  for (const entry of entries) {
    const d = new Date(entry.createdDate);
    const key = d.toDateString();
    if (!dateMap.has(key)) dateMap.set(key, []);
    dateMap.get(key)!.push(entry);
  }

  const dateGroups: DateGroup[] = [];
  for (const [dateKey, dayEntries] of dateMap) {
    // Sort descending within day
    dayEntries.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());

    // Group into sessions by 30-min gap
    const sessions: Session[] = [];
    let currentSession: BrowsingHistoryRecord[] = [dayEntries[0]];

    for (let i = 1; i < dayEntries.length; i++) {
      const gap = new Date(dayEntries[i - 1].createdDate).getTime() - new Date(dayEntries[i].createdDate).getTime();
      if (gap > SESSION_GAP_MS) {
        sessions.push({ entries: currentSession });
        currentSession = [dayEntries[i]];
      } else {
        currentSession.push(dayEntries[i]);
      }
    }
    if (currentSession.length) sessions.push({ entries: currentSession });

    dateGroups.push({
      label: FormatUtils.getRelativeDayLabel(new Date(dayEntries[0].createdDate)),
      dateKey,
      sessions,
    });
  }

  return dateGroups;
}

function renderHistoryList(): void {
  historyList.innerHTML = '';
  const dateGroups = groupIntoSessions(allEntries);

  for (const dg of dateGroups) {
    // Date label
    const dateLabel = document.createElement('div');
    dateLabel.className = 'date-group-label';
    dateLabel.textContent = dg.label;
    historyList.appendChild(dateLabel);

    // Sessions
    for (const session of dg.sessions) {
      renderSession(session, historyList);
    }
  }

  createIcons({ icons });
}

function renderSession(session: Session, container: HTMLElement): void {
  const wrapper = document.createElement('div');
  wrapper.style.marginBottom = '2px';

  const lastEntry = session.entries[session.entries.length - 1];
  const sessionActive = session.entries.reduce((a, e) => a + (e.activeDuration || 0), 0);
  const uniqueDomains = [...new Set(session.entries.map(e => e.topLevelDomain))];

  // Session header
  const header = document.createElement('div');
  header.className = 'session-header';
  let expanded = true;

  const startTime = new Date(lastEntry.createdDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Build domain badges HTML
  const domainBadgesHtml = uniqueDomains.slice(0, 6).map(domain => {
    const faviconUrl = `https://${domain}/favicon.ico`;
    return `<span class="session-domain-badge"><img src="${faviconUrl}" onerror="this.parentElement.innerHTML='&#x1F310;'" width="16" height="16"></span>`;
  }).join('');
  const moreHtml = uniqueDomains.length > 6 ? `<span class="session-domain-more">+${uniqueDomains.length - 6}</span>` : '';

  header.innerHTML = `
    <span class="session-expand-icon expanded">\u25B6</span>
    <span class="session-time">${startTime}</span>
    <span class="session-dash">\u2014</span>
    <span class="session-meta">${session.entries.length} pages \u00b7 ${FormatUtils.formatDuration(sessionActive)} active</span>
    <div class="session-domains">${domainBadgesHtml}${moreHtml}</div>
    <button class="session-delete-btn" title="delete session">\u2715</button>
  `;

  const entriesDiv = document.createElement('div');
  entriesDiv.className = 'session-entries';

  header.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('session-delete-btn')) return;
    expanded = !expanded;
    entriesDiv.style.display = expanded ? 'block' : 'none';
    header.querySelector('.session-expand-icon')!.classList.toggle('expanded', expanded);
  });

  header.querySelector('.session-delete-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    for (const entry of session.entries) {
      await window.BrowserAPI.removeBrowsingHistory(window.BrowserAPI.appWindowId, entry.id);
    }
    const ids = new Set(session.entries.map(e => e.id));
    allEntries = allEntries.filter(e => !ids.has(e.id));
    ids.forEach(id => selectedIds.delete(id));
    wrapper.remove();
    renderSparkline();
    renderDomainChart();
    updateStats();
    updateSelectionUI();
    if (allEntries.length === 0) {
      noHistory.style.display = 'block';
      deleteAllBtn.style.display = 'none';
    }
  });

  // Render entries
  for (const entry of session.entries) {
    entriesDiv.appendChild(renderEntry(entry));
  }

  wrapper.appendChild(header);
  wrapper.appendChild(entriesDiv);
  container.appendChild(wrapper);
}

function renderEntry(entry: BrowsingHistoryRecord): HTMLElement {
  const row = document.createElement('div');
  row.className = 'history-entry';

  const time = new Date(entry.createdDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const faviconUrl = entry.faviconUrl || `https://${entry.topLevelDomain}/favicon.ico`;

  row.innerHTML = `
    <input type="checkbox" ${selectedIds.has(entry.id) ? 'checked' : ''} />
    <span class="entry-time">${time}</span>
    <span class="entry-favicon"><img src="${faviconUrl}" width="14" height="14" onerror="this.parentElement.innerHTML='<span class=\\'entry-favicon-fallback\\'>&#x1F310;</span>'"></span>
    <span class="entry-title" title="${escapeHtml(entry.title)}">${escapeHtml(entry.title)}</span>
    <span class="entry-domain">${escapeHtml(entry.topLevelDomain)}</span>
    <div class="entry-duration">
      <span class="entry-active-dur" title="active time">${FormatUtils.formatDuration(entry.activeDuration || 0)}</span>
      <span class="entry-total-dur" title="total time">${FormatUtils.formatDuration(entry.totalDuration || 0)}</span>
    </div>
    <button class="entry-delete-btn"><i data-lucide="x" width="12" height="12"></i></button>
  `;

  row.querySelector('input[type="checkbox"]')?.addEventListener('change', () => {
    if (selectedIds.has(entry.id)) selectedIds.delete(entry.id);
    else selectedIds.add(entry.id);
    updateSelectionUI();
  });

  row.querySelector('.entry-title')?.addEventListener('click', () => {
    window.BrowserAPI.createTab(window.BrowserAPI.appWindowId, entry.url, true);
  });

  row.querySelector('.entry-delete-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    await window.BrowserAPI.removeBrowsingHistory(window.BrowserAPI.appWindowId, entry.id);
    allEntries = allEntries.filter(item => item.id !== entry.id);
    selectedIds.delete(entry.id);
    row.remove();
    renderSparkline();
    renderDomainChart();
    updateStats();
    updateSelectionUI();
    if (allEntries.length === 0) {
      noHistory.style.display = 'block';
      deleteAllBtn.style.display = 'none';
    }
  });

  return row;
}

// --- Heatmap ---
function renderHeatmap(stats: Array<{ date: string; count: number; activeDuration: number }>): void {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentDow = todayStart.getDay();
  const startDate = new Date(todayStart);
  startDate.setDate(startDate.getDate() - (52 * 7 + currentDow));

  // Build day map from stats
  const dayMap = new Map<string, { count: number; active: number }>();
  for (const s of stats) {
    dayMap.set(s.date, { count: s.count, active: s.activeDuration });
  }

  // Build weeks
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
        month: cursor.toLocaleDateString([], { month: 'short' }).toLowerCase(),
        weekIndex: weeks.length,
      });
      lastMonth = m;
    }

    currentWeek.push({
      date: new Date(cursor),
      dow: cursor.getDay(),
      count: data.count,
      active: data.active,
      label: cursor.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }).toLowerCase(),
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
  const dayLabelW = 24;
  const topPad = 18;
  const gridW = weeks.length * (cellSize + cellGap);
  const gridH = 7 * (cellSize + cellGap);
  const dayLabels = ['', 'mon', '', 'wed', '', 'fri', ''];

  function getLevel(count: number): number {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }

  // Build HTML
  let svgContent = '';

  // Month labels
  for (const m of monthLabels) {
    svgContent += `<text x="${dayLabelW + m.weekIndex * (cellSize + cellGap)}" y="12" font-size="9" fill="var(--text-secondary)">${m.month}</text>`;
  }

  // Day labels
  for (let i = 0; i < dayLabels.length; i++) {
    if (dayLabels[i]) {
      svgContent += `<text x="0" y="${topPad + i * (cellSize + cellGap) + cellSize - 1}" font-size="8" fill="var(--text-secondary)">${dayLabels[i]}</text>`;
    }
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

  const svgW = dayLabelW + gridW + 8;
  const svgH = topPad + gridH + 4;

  heatmapContainer.innerHTML = `
    <div class="heatmap-header">
      <span class="heatmap-summary">${totalPages.toLocaleString()} pages visited in the last year</span>
      <div class="heatmap-stats">
        <span><span class="stat-value">${activeDays}</span> active days</span>
        <span><span class="stat-value">${FormatUtils.formatDuration(totalActive)}</span> active time</span>
      </div>
    </div>
    <div style="position:relative;overflow-x:auto;overflow-y:visible;">
      <svg width="${svgW}" height="${svgH}" style="display:block;">${svgContent}</svg>
      <div class="heatmap-legend">
        <span class="heatmap-legend-label">less</span>
        ${HEATMAP_LEVELS.map(c => `<div class="heatmap-legend-cell" style="background:${c}"></div>`).join('')}
        <span class="heatmap-legend-label" style="margin-left:4px">more</span>
      </div>
    </div>
  `;

  // Tooltip behavior
  const svgEl = heatmapContainer.querySelector('svg')!;
  const tooltipContainer = heatmapContainer.querySelector('div[style*="position:relative"]') as HTMLElement;
  let tooltip: HTMLElement | null = null;

  svgEl.addEventListener('mouseover', (e) => {
    const target = e.target as SVGElement;
    if (!target.classList.contains('heatmap-cell')) return;
    const label = target.getAttribute('data-label') || '';
    const count = parseInt(target.getAttribute('data-count') || '0');
    const active = parseInt(target.getAttribute('data-active') || '0');
    const rect = target.getBoundingClientRect();
    const cr = tooltipContainer.getBoundingClientRect();

    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'heatmap-tooltip';
      tooltipContainer.appendChild(tooltip);
    }
    tooltip.innerHTML = `<div class="heatmap-tooltip-title">${label}</div><div class="heatmap-tooltip-sub">${count === 0 ? 'no activity' : `${count} pages \u00b7 ${FormatUtils.formatDuration(active)} active`}</div>`;
    tooltip.style.left = `${rect.left - cr.left + cellSize / 2}px`;
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

// --- Sparkline ---
function renderSparkline(): void {
  // Compute daily page counts for last 14 days
  const dailyData: { date: Date; count: number; active: number; label: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 86400000;
    let count = 0;
    let active = 0;
    for (const e of allEntries) {
      const ts = new Date(e.createdDate).getTime();
      if (ts >= dayStart && ts < dayEnd) {
        count++;
        active += e.activeDuration || 0;
      }
    }
    const label = i === 0 ? 'today' : i === 1 ? 'yday' : d.toLocaleDateString([], { month: 'short', day: 'numeric' }).toLowerCase();
    dailyData.push({ date: d, count, active, label });
  }

  const maxActive = Math.max(...dailyData.map(d => d.active), 1);
  const w = 280, h = 48;

  const points = dailyData.map((d, i) => ({
    x: (i / (dailyData.length - 1)) * w,
    y: h - (d.active / maxActive) * (h - 8) - 4,
    ...d,
  }));

  // Build smooth curve
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const p = points[i];
    const cpx = (prev.x + p.x) / 2;
    pathD += ` C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
  }

  let dotsAndLabels = '';
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    dotsAndLabels += `<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="var(--bg-light)" stroke="var(--primary-color)" stroke-width="1.5" />`;
    if (i === 0 || i === points.length - 1 || i === 7) {
      dotsAndLabels += `<text x="${p.x}" y="${h + 14}" text-anchor="middle" font-size="8" fill="var(--text-secondary)">${p.label}</text>`;
    }
  }

  sparklineContainer.innerHTML = `
    <svg class="sparkline-svg" width="${w}" height="${h + 16}" viewBox="0 0 ${w} ${h + 16}" style="overflow:visible">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--primary-color)" stop-opacity="0.1" />
          <stop offset="100%" stop-color="var(--primary-color)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path d="${pathD} L ${w} ${h + 4} L 0 ${h + 4} Z" fill="url(#spark-fill)" />
      <path d="${pathD}" fill="none" stroke="var(--primary-color)" stroke-width="1.5" />
      ${dotsAndLabels}
    </svg>
  `;
}

// --- Domain Chart ---
function renderDomainChart(): void {
  // Aggregate by domain
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

  const sorted = Array.from(map.values())
    .sort((a, b) => b.active - a.active)
    .slice(0, 8);

  const maxActive = Math.max(...sorted.map(d => d.active), 1);

  domainChartContainer.innerHTML = sorted.map(d => `
    <div class="domain-row">
      <span class="domain-favicon"><img src="${d.faviconUrl}" width="14" height="14" onerror="this.parentElement.className='domain-favicon-fallback';this.parentElement.innerHTML='&#x1F310;'"></span>
      <span class="domain-name">${escapeHtml(d.domain)}</span>
      <div class="domain-bar-track">
        <div class="domain-bar-fill" style="width:${(d.active / maxActive) * 100}%"></div>
      </div>
      <span class="domain-duration">${FormatUtils.formatDuration(d.active)}</span>
    </div>
  `).join('');
}

// --- Helpers ---
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
