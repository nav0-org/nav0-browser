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
  dev: '#171717', social: '#404040', media: '#525252', news: '#737373',
  search: '#8a8a8a', productivity: '#a3a3a3', shopping: '#bdbdbd',
  reference: '#d4d4d4', design: '#e0e0e0', other: '#f0f0f0',
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
const searchClear = document.getElementById('search-clear') as HTMLElement;
const deleteAllBtn = document.getElementById('delete-all') as HTMLElement;
const noHistory = document.getElementById('no-history') as HTMLElement;
const statsLabel = document.getElementById('history-stats') as HTMLElement;
const heatmapContainer = document.getElementById('heatmap-container') as HTMLElement;
const sparklineContainer = document.getElementById('sparkline-container') as HTMLElement;
const domainChartContainer = document.getElementById('domain-chart-container') as HTMLElement;
const categoryContainer = document.getElementById('category-container') as HTMLElement;

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
  renderSparkline();
  renderDomainChart();
  renderCategoryChart();
  updateStats();

  const hasEntries = allEntries.length > 0;
  noHistory.style.display = hasEntries ? 'none' : 'block';
  deleteAllBtn.style.display = hasEntries ? 'block' : 'none';
}

function updateStats(): void {
  const totalDomains = new Set(allEntries.map(e => e.topLevelDomain)).size;
  const totalActive = allEntries.reduce((a, e) => a + (e.activeDuration || 0), 0);
  statsLabel.textContent = `${allEntries.length.toLocaleString()} pages \u00b7 ${totalDomains} sites \u00b7 ${FormatUtils.formatDuration(totalActive)} active`;
}

// --- Session grouping ---
interface Session { entries: BrowsingHistoryRecord[] }
interface DateGroup { label: string; dateKey: string; sessions: Session[] }

function groupIntoSessions(entries: BrowsingHistoryRecord[]): DateGroup[] {
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
    const dateLabel = document.createElement('div');
    dateLabel.className = 'date-group-label';
    dateLabel.textContent = dg.label;
    historyList.appendChild(dateLabel);

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

  const header = document.createElement('div');
  header.className = 'session-header';
  let expanded = true;

  const startTime = new Date(lastEntry.createdDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
    wrapper.remove();
    renderSparkline();
    renderDomainChart();
    renderCategoryChart();
    updateStats();
    if (allEntries.length === 0) {
      noHistory.style.display = 'block';
      deleteAllBtn.style.display = 'none';
    }
  });

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
  const hasDuration = (entry.activeDuration || 0) > 0 || (entry.totalDuration || 0) > 0;

  const durationHtml = hasDuration
    ? `<div class="entry-duration">
        <span class="entry-active-dur" title="active time">${FormatUtils.formatDuration(entry.activeDuration || 0)}</span>
        <span class="entry-total-dur" title="total time">${FormatUtils.formatDuration(entry.totalDuration || 0)}</span>
      </div>`
    : '';

  row.innerHTML = `
    <span class="entry-time">${time}</span>
    <span class="entry-favicon"><img src="${faviconUrl}" width="14" height="14" onerror="this.parentElement.innerHTML='<span class=\\'entry-favicon-fallback\\'>&#x1F310;</span>'"></span>
    <span class="entry-title" title="${escapeHtml(entry.title)}">${escapeHtml(entry.title)}</span>
    <span class="entry-domain">${escapeHtml(entry.topLevelDomain)}</span>
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
    renderSparkline();
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

// --- Sparkline (responsive, fills card) ---
function renderSparkline(): void {
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
    const label = i === 0 ? 'Today' : i === 1 ? 'Yday' : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    dailyData.push({ date: d, count, active, label });
  }

  // Use page count if all active durations are 0
  const hasActiveData = dailyData.some(d => d.active > 0);
  const values = dailyData.map(d => hasActiveData ? d.active : d.count);
  const maxVal = Math.max(...values, 1);

  const sparkLabel = document.getElementById('sparkline-label');
  if (sparkLabel) sparkLabel.textContent = hasActiveData ? 'active time \u00b7 14 days' : 'page visits \u00b7 14 days';

  // Use viewBox coordinates; actual size determined by CSS width:100%
  const vw = 300, vh = 80;
  const padTop = 8, padBot = 20, padX = 4;
  const chartH = vh - padTop - padBot;

  const points = dailyData.map((d, i) => ({
    x: padX + (i / (dailyData.length - 1)) * (vw - padX * 2),
    y: padTop + chartH - (values[i] / maxVal) * chartH,
    ...d,
  }));

  // Smooth curve
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const p = points[i];
    const cpx = (prev.x + p.x) / 2;
    pathD += ` C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
  }

  const fillPath = `${pathD} L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`;

  let dotsAndLabels = '';
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    dotsAndLabels += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--bg-light)" stroke="var(--primary-color)" stroke-width="1.5" />`;
    if (i === 0 || i === points.length - 1 || i === 7) {
      dotsAndLabels += `<text x="${p.x}" y="${vh - 2}" text-anchor="middle" font-size="9" fill="var(--text-secondary)">${p.label}</text>`;
    }
  }

  sparklineContainer.innerHTML = `
    <svg class="sparkline-svg" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--primary-color)" stop-opacity="0.1" />
          <stop offset="100%" stop-color="var(--primary-color)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path d="${fillPath}" fill="url(#spark-fill)" />
      <path d="${pathD}" fill="none" stroke="var(--primary-color)" stroke-width="1.5" />
      ${dotsAndLabels}
    </svg>
  `;
}

// --- Domain Chart ---
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
  if (label) label.textContent = useTime ? 'top sites \u00b7 active time' : 'top sites \u00b7 visits';

  const maxVal = Math.max(...sorted.map(d => useTime ? d.active : d.visits), 1);

  domainChartContainer.innerHTML = sorted.map(d => {
    const val = useTime ? d.active : d.visits;
    const valLabel = useTime ? FormatUtils.formatDuration(d.active) : `${d.visits}`;
    return `
    <div class="domain-row">
      <span class="domain-favicon"><img src="${d.faviconUrl}" width="14" height="14" onerror="this.parentElement.className='domain-favicon-fallback';this.parentElement.innerHTML='&#x1F310;'"></span>
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
  if (catLabel) catLabel.textContent = useDuration ? 'time by category' : 'visits by category';

  // SVG donut chart
  const radius = 32, circ = 2 * Math.PI * radius;
  let accum = 0;
  let slices = '';
  for (const c of cats) {
    const color = CATEGORY_COLORS[c.cat] || CATEGORY_COLORS.other;
    const dashLen = (c.pct / 100) * circ;
    const offset = -(accum / 100) * circ;
    slices += `<circle cx="40" cy="40" r="${radius}" fill="none" stroke="${color}" stroke-width="10" stroke-dasharray="${dashLen} ${circ}" stroke-dashoffset="${offset}" />`;
    accum += c.pct;
  }

  const legendHtml = cats.map(c => {
    const color = CATEGORY_COLORS[c.cat] || CATEGORY_COLORS.other;
    return `<div class="category-legend-item">
      <div class="category-legend-dot" style="background:${color}"></div>
      <span class="category-legend-name">${c.cat}</span>
      <span class="category-legend-pct">${Math.round(c.pct)}%</span>
    </div>`;
  }).join('');

  categoryContainer.innerHTML = `
    <div class="category-chart-wrapper">
      <svg width="80" height="80" viewBox="0 0 80 80">${slices}</svg>
      <div class="category-legend">${legendHtml}</div>
    </div>
  `;
}

// --- Helpers ---
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
