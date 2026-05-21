import { HtmlUtils } from '../../../renderer/common/html-utils';
import './index.css';

import { createIcons, icons } from 'lucide';
import { FormatUtils } from '../../../renderer/common/format-utils';
import { DownloadRecord } from '../../../types/download-record';
import {
  TYPE_COLORS,
  getDisplayTypeFromExtension,
  hexToRgba,
  getFileIcon,
} from '../../../renderer/common/file-type-utils';
createIcons({ icons });

// ---------------------------------------------------------------------------
// Constants & state
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;
let currentOffset = 0;
let isLoading = false;
let hasMore = true;
let currentSearchTerm = '';
let selectedTypeFilter = 'all';
let selectedItemId: string | null = null;
let allLoadedItems: DownloadRecord[] = [];

// Track active downloads by fileName
const activeDownloads: Map<
  string,
  {
    receivedBytes: number;
    totalBytes: number;
    downloadId: string;
    dbRecordId: string;
    state: string;
  }
> = new Map();

const getDisplayType = (item: DownloadRecord): string => {
  return getDisplayTypeFromExtension(item.fileExtension);
};

// 24-hour HH:MM, matching the prototype's row time column.
const formatRowTime = (date: Date | string): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const downloadsPage = document.getElementById('downloads-page') as HTMLElement;
const downloadsListElement = document.getElementById('downloads-list') as HTMLElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const typeFiltersContainer = document.getElementById('type-filters') as HTMLElement;
const storageBar = document.getElementById('storage-bar') as HTMLElement;
const storageLegend = document.getElementById('storage-legend') as HTMLElement;
const storageMeta = document.getElementById('storage-meta') as HTMLElement;
const statsLabel = document.getElementById('downloads-stats') as HTMLElement;
const noDownloads = document.getElementById('no-downloads') as HTMLElement;
const deleteAllBtn = document.getElementById('delete-all') as HTMLElement;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  // Seed activeDownloads with any downloads already in progress
  const inProgress = await window.BrowserAPI.fetchActiveDownloads();
  for (const d of inProgress) {
    activeDownloads.set(d.fileName, {
      receivedBytes: d.receivedBytes,
      totalBytes: d.totalBytes,
      downloadId: d.downloadId,
      dbRecordId: d.dbRecordId,
      state: d.state,
    });
  }

  loadDownloadsPage();

  // Fade in
  setTimeout(() => downloadsPage.classList.add('loaded'), 80);

  // Clear all
  deleteAllBtn.addEventListener('click', async () => {
    await window.BrowserAPI.removeAllDownloads(window.BrowserAPI.appWindowId);
    downloadsListElement.innerHTML = '';
    allLoadedItems = [];
    selectedItemId = null;
    noDownloads.style.display = 'block';
    deleteAllBtn.style.display = 'none';
    updateStorageGauge();
    renderTypeFilters();
  });

  // Search with debounce
  const debouncedSearchHandler = HtmlUtils.debounce(() => {
    resetAndReload();
  }, 300);
  searchInput.addEventListener('input', debouncedSearchHandler);

  // Infinite scroll via page scroll
  window.addEventListener('scroll', () => {
    if (isLoading || !hasMore) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadDownloadsPage();
    }
  });

  // ---- Download lifecycle events ----

  window.BrowserAPI.onDownloadStarted((data) => {
    activeDownloads.set(data.fileName, {
      receivedBytes: 0,
      totalBytes: data.totalBytes,
      downloadId: data.downloadId,
      dbRecordId: data.dbRecordId,
      state: 'progressing',
    });
    resetAndReload();
  });

  window.BrowserAPI.onDownloadProgress((data) => {
    let matched = false;
    for (const [fileName, info] of activeDownloads) {
      if (data.downloadId.endsWith(fileName)) {
        info.receivedBytes = data.receivedBytes;
        info.totalBytes = data.totalBytes;
        updateProgressBar(fileName, data.receivedBytes, data.totalBytes);
        matched = true;
        break;
      }
    }
    if (!matched) {
      const rows = downloadsListElement.querySelectorAll('.download-item[data-file-name]');
      for (const row of rows) {
        const fileName = (row as HTMLElement).dataset.fileName;
        if (fileName && data.downloadId.endsWith(fileName)) {
          activeDownloads.set(fileName, {
            receivedBytes: data.receivedBytes,
            totalBytes: data.totalBytes,
            downloadId: data.downloadId,
            dbRecordId: '',
            state: 'progressing',
          });
          updateProgressBar(fileName, data.receivedBytes, data.totalBytes);
          break;
        }
      }
    }
  });

  window.BrowserAPI.onDownloadCompleted((data) => {
    activeDownloads.delete(data.fileName);
    removeProgressBar(data.fileName);
    if (data.state === 'cancelled') {
      const row = downloadsListElement.querySelector(
        `[data-file-name="${CSS.escape(data.fileName)}"]`
      );
      if (row) row.remove();
    }
  });

  window.BrowserAPI.onDownloadPaused((data) => {
    const info = activeDownloads.get(data.fileName);
    if (info) info.state = 'paused';
    setRowPaused(data.fileName);
  });

  window.BrowserAPI.onDownloadResumed((data) => {
    const info = activeDownloads.get(data.fileName);
    if (info) info.state = 'progressing';
    setRowResumed(data.fileName);
  });
});

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

const resetAndReload = () => {
  currentOffset = 0;
  hasMore = true;
  allLoadedItems = [];
  selectedItemId = null;
  downloadsListElement.innerHTML = '';
  loadDownloadsPage();
};

const loadDownloadsPage = async (): Promise<void> => {
  if (isLoading || !hasMore) return;
  isLoading = true;
  currentSearchTerm = searchInput.value || '';

  showLoadingIndicator();

  const downloadData: Array<DownloadRecord> = await window.BrowserAPI.fetchDownloads(
    window.BrowserAPI.appWindowId,
    currentSearchTerm,
    PAGE_SIZE,
    currentOffset
  );

  removeLoadingIndicator();

  if (downloadData.length < PAGE_SIZE) {
    hasMore = false;
  }

  if (currentOffset === 0 && downloadData.length === 0) {
    noDownloads.style.display = 'block';
    deleteAllBtn.style.display = 'none';
    isLoading = false;
    updateStorageGauge();
    renderTypeFilters();
    return;
  } else {
    noDownloads.style.display = 'none';
    // Empty string clears the inline style so the CSS rule (inline-flex) applies.
    deleteAllBtn.style.display = '';
  }

  allLoadedItems = allLoadedItems.concat(downloadData);
  currentOffset += downloadData.length;

  // Re-render the full list each load so day-group headers stay accurate.
  rerenderList();
  updateStorageGauge();
  renderTypeFilters();
  isLoading = false;
};

// Group all loaded items by day and render headers + rows in order.
const rerenderList = (): void => {
  downloadsListElement.innerHTML = '';
  if (allLoadedItems.length === 0) return;
  const groups = groupByDay(allLoadedItems);
  for (const g of groups) {
    downloadsListElement.appendChild(renderDayHeader(g));
    appendDownloadItems(g.items);
  }
};

interface DayGroup {
  dateKey: string;
  label: string;
  items: DownloadRecord[];
}

const groupByDay = (items: DownloadRecord[]): DayGroup[] => {
  const byDay = new Map<string, DownloadRecord[]>();
  for (const item of items) {
    const d = new Date(item.createdDate);
    const key = d.toDateString();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(item);
  }
  const groups: DayGroup[] = [];
  for (const [key, list] of byDay) {
    list.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    const d = new Date(list[0].createdDate);
    groups.push({ dateKey: key, label: formatDayLabel(d), items: list });
  }
  // Reverse-chronological by most recent item in each group.
  groups.sort((a, b) => {
    const ad = new Date(a.items[0].createdDate).getTime();
    const bd = new Date(b.items[0].createdDate).getTime();
    return bd - ad;
  });
  return groups;
};

const formatDayLabel = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor((today.getTime() - target.getTime()) / 86400000);
  const absolute = date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  if (diff === 0) return `Today · ${absolute}`;
  if (diff === 1) return `Yesterday · ${absolute}`;
  if (diff < 7) return absolute;
  return absolute;
};

const renderDayHeader = (group: DayGroup): HTMLElement => {
  const header = document.createElement('div');
  header.className = 'date-group-label';
  const fileWord = group.items.length === 1 ? 'file' : 'files';
  const totalBytes = group.items.reduce((a, b) => a + (b.fileSize || 0), 0);
  const sizeStr = totalBytes > 0 ? ` · ${FormatUtils.formatFileSize(totalBytes)}` : '';
  header.innerHTML = `
    <span class="day-label">${group.label}</span>
    <span class="day-sub">${group.items.length} ${fileWord}${sizeStr}</span>
  `;
  return header;
};

// ---------------------------------------------------------------------------
// Type filter pills
// ---------------------------------------------------------------------------

const renderTypeFilters = (): void => {
  const typeCounts: Record<string, number> = {};
  allLoadedItems.forEach((d) => {
    const displayType = getDisplayType(d);
    typeCounts[displayType] = (typeCounts[displayType] || 0) + 1;
  });

  const types = Object.keys(typeCounts).sort();
  typeFiltersContainer.innerHTML = '';

  // "All" pill — solid black when active, neutral otherwise.
  const allPill = document.createElement('button');
  allPill.className = 'type-pill';
  allPill.dataset.type = 'all';
  allPill.innerHTML = `All <span class="type-pill-count">${allLoadedItems.length}</span>`;
  if (selectedTypeFilter === 'all') {
    allPill.style.background = 'var(--fg-1)';
    allPill.style.color = 'var(--bg-0)';
    allPill.style.borderColor = 'var(--fg-1)';
  }
  allPill.addEventListener('click', () => {
    selectedTypeFilter = 'all';
    applyTypeFilter();
    renderTypeFilters();
  });
  typeFiltersContainer.appendChild(allPill);

  types.forEach((type) => {
    const pill = document.createElement('button');
    pill.className = 'type-pill';
    pill.dataset.type = type;
    const color = TYPE_COLORS[type] || TYPE_COLORS.other;
    pill.innerHTML = `${type} <span class="type-pill-count">${typeCounts[type]}</span>`;
    // Per-type tint: soft tinted bg + accented border + colored label;
    // active state inverts to a solid fill.
    if (selectedTypeFilter === type) {
      pill.style.background = color;
      pill.style.color = '#fff';
      pill.style.borderColor = color;
    } else {
      pill.style.background = color + '0f';
      pill.style.color = color;
      pill.style.borderColor = color + '40';
    }
    pill.addEventListener('click', () => {
      selectedTypeFilter = type;
      applyTypeFilter();
      renderTypeFilters();
    });
    typeFiltersContainer.appendChild(pill);
  });
};

const applyTypeFilter = (): void => {
  const rows = downloadsListElement.querySelectorAll('.download-item-wrapper');
  rows.forEach((wrapper) => {
    const el = wrapper as HTMLElement;
    const fileType = el.dataset.fileType;
    if (selectedTypeFilter === 'all' || fileType === selectedTypeFilter) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });

  // Hide/show detail panels based on filter
  const details = downloadsListElement.querySelectorAll('.detail-panel');
  details.forEach((panel) => {
    const el = panel as HTMLElement;
    const fileType = el.dataset.fileType;
    if (selectedTypeFilter === 'all' || fileType === selectedTypeFilter) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });

  // Check if any visible
  const anyVisible = downloadsListElement.querySelector(
    '.download-item-wrapper:not([style*="display: none"])'
  );
  noDownloads.style.display = anyVisible ? 'none' : 'block';
};

// ---------------------------------------------------------------------------
// Storage gauge
// ---------------------------------------------------------------------------

const updateStorageGauge = (): void => {
  const byType: Record<string, number> = {};
  allLoadedItems.forEach((d) => {
    const displayType = getDisplayType(d);
    byType[displayType] = (byType[displayType] || 0) + d.fileSize;
  });

  const total = Object.values(byType).reduce((a, b) => a + b, 0);
  const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const pausedCount = allLoadedItems.filter(
    (d) => d.status === 'paused' || activeDownloads.get(d.fileName)?.state === 'paused'
  ).length;
  const fileWord = allLoadedItems.length === 1 ? 'file' : 'files';

  // Panel header meta — "2.9 GB used · 5 files · 1 paused"
  const totalStr = FormatUtils.formatFileSize(total) || '0 B';
  const metaParts = [
    `<span><strong>${totalStr}</strong>used</span>`,
    `<span><strong>${allLoadedItems.length}</strong>${fileWord}</span>`,
  ];
  if (pausedCount > 0) {
    metaParts.push(`<span><strong>${pausedCount}</strong>paused</span>`);
  }
  storageMeta.innerHTML = metaParts.join('');

  // Top-of-page stats line — small mono right rail.
  statsLabel.textContent =
    allLoadedItems.length === 0
      ? 'nav0://downloads · empty · local'
      : `nav0://downloads · ${allLoadedItems.length} ${fileWord} · ${totalStr} · local`;

  // Bar segments — per-type colour via TYPE_COLORS.
  storageBar.innerHTML = '';
  sortedTypes.forEach(([type, size]) => {
    const segment = document.createElement('div');
    segment.className = 'storage-bar-segment';
    segment.style.width = total > 0 ? `${(size / total) * 100}%` : '0%';
    segment.style.background = TYPE_COLORS[type] || '#a1a1aa';
    storageBar.appendChild(segment);
  });

  // Legend — colored swatch + label + mono size.
  storageLegend.innerHTML = '';
  sortedTypes.forEach(([type, size]) => {
    const item = document.createElement('div');
    item.className = 'storage-legend-item';
    item.innerHTML = `
      <div class="storage-legend-dot" style="background: ${TYPE_COLORS[type] || '#a1a1aa'}"></div>
      <span class="storage-legend-text">
        <strong>${type}</strong>
        <span class="size">${FormatUtils.formatFileSize(size)}</span>
      </span>
    `;
    storageLegend.appendChild(item);
  });
};

// ---------------------------------------------------------------------------
// Download items rendering
// ---------------------------------------------------------------------------

const appendDownloadItems = (items: DownloadRecord[]): void => {
  items.forEach((item) => {
    const displayType = getDisplayType(item);

    const wrapper = document.createElement('div');
    wrapper.className = 'download-item-wrapper';
    wrapper.dataset.fileType = displayType;
    wrapper.dataset.recordId = item.id;

    const downloadItem = document.createElement('div');
    downloadItem.className = 'download-item';
    downloadItem.dataset.fileName = item.fileName;
    downloadItem.dataset.recordId = item.id;

    const activeInfo = activeDownloads.get(item.fileName);
    const isActive = !!activeInfo;
    const isPausedFromDb = !isActive && item.status === 'paused';
    const isPaused = isActive ? activeInfo.state === 'paused' : isPausedFromDb;

    if (isActive || isPausedFromDb) {
      downloadItem.classList.add('downloading');
      if (isPaused) downloadItem.classList.add('paused');
    }

    const color = TYPE_COLORS[displayType] || '#a1a1aa';
    const iconName = getFileIcon(item.fileExtension);
    const sourceHost = extractHostname(item.url);

    // Progress values
    const pct =
      isActive && activeInfo.totalBytes > 0
        ? Math.round((activeInfo.receivedBytes / activeInfo.totalBytes) * 100)
        : 0;

    // Size display
    let sizeText = '';
    if (isActive && activeInfo.totalBytes > 0) {
      sizeText = `${FormatUtils.formatFileSize(activeInfo.receivedBytes)} / ${FormatUtils.formatFileSize(activeInfo.totalBytes)}`;
    } else if (isActive && activeInfo.totalBytes === 0) {
      sizeText =
        activeInfo.receivedBytes > 0 ? FormatUtils.formatFileSize(activeInfo.receivedBytes) : '';
    } else if (item.fileSize > 0) {
      sizeText = FormatUtils.formatFileSize(item.fileSize);
    }

    // Status pill — done / paused / progress
    let statusHtml = '';
    if (isPaused) {
      statusHtml =
        '<span class="download-status paused"><i data-lucide="pause" width="10" height="10"></i> paused</span>';
    } else if (isActive) {
      const pctLabel = activeInfo.totalBytes > 0 ? `${pct}%` : '…';
      statusHtml = `<span class="download-status progress"><i data-lucide="arrow-down" width="10" height="10"></i> <span class="pct-num">${pctLabel}</span></span>`;
    } else {
      statusHtml = '<span class="download-status done">complete</span>';
    }

    // Action buttons
    let actionsHtml = '';
    if (isActive) {
      const downloadId = activeInfo.downloadId;
      if (isPaused) {
        actionsHtml = `
          <button class="action-btn resume-btn" data-download-id="${downloadId}" title="Resume">
            <i data-lucide="play" width="14" height="14"></i>
          </button>`;
      } else {
        actionsHtml = `
          <button class="action-btn pause-btn" data-download-id="${downloadId}" title="Pause">
            <i data-lucide="pause" width="14" height="14"></i>
          </button>`;
      }
      actionsHtml += `
        <button class="action-btn cancel-btn" data-download-id="${downloadId}" title="Cancel">
          <i data-lucide="x" width="14" height="14"></i>
        </button>`;
    } else if (isPausedFromDb) {
      actionsHtml = `
        <button class="action-btn resume-db-btn" data-record-id="${item.id}" title="Resume">
          <i data-lucide="play" width="14" height="14"></i>
        </button>
        <button class="action-btn remove-btn delete-button" title="Remove">
          <i data-lucide="x" width="14" height="14"></i>
        </button>`;
    } else {
      actionsHtml = `
        <button class="action-btn remove-btn delete-button" title="Remove">
          <i data-lucide="x" width="14" height="14"></i>
        </button>`;
    }

    // Progress bar for active downloads — wrapped in .download-progress
    // which spans grid cols 3-6 on row 2 via CSS.
    let progressHtml = '';
    if (isActive) {
      const hasTotal = activeInfo.totalBytes > 0;
      const barWidth = hasTotal ? `${pct}%` : '30%';
      const barColor = isPaused ? 'var(--bg-3)' : color;
      const indeterminateClass = hasTotal ? '' : ' indeterminate';
      progressHtml = `
        <div class="download-progress${indeterminateClass}">
          <div class="download-progress-bar">
            <div class="download-progress-fill" style="width: ${barWidth}; background: ${barColor}"></div>
          </div>
        </div>`;
    }

    // Meta line — source host (accent) · file path. Falls back gracefully.
    const metaParts: string[] = [];
    if (sourceHost) metaParts.push(`<span class="from">${escapeHtml(sourceHost)}</span>`);
    if (item.fileLocation) {
      if (sourceHost) metaParts.push('<span class="dot">·</span>');
      metaParts.push(`<span class="path">${escapeHtml(item.fileLocation)}</span>`);
    }

    downloadItem.innerHTML = `
      <span class="download-time">${formatRowTime(item.createdDate)}</span>
      <span class="download-type-icon" style="background: ${color}14; border-color: ${color}40; color: ${color}">
        <i data-lucide="${iconName}" width="16" height="16"></i>
      </span>
      <div class="download-content">
        <span class="download-filename" title="${escapeHtml(item.fileName)}">${escapeHtml(item.fileName)}</span>
        <div class="download-meta">${metaParts.join('')}</div>
      </div>
      <span class="download-tag">${displayType}</span>
      ${statusHtml}
      <span class="download-size">${sizeText}</span>
      <div class="download-actions">${actionsHtml}</div>
      ${progressHtml}
    `;

    // Row click → toggle detail panel (only for completed downloads)
    downloadItem.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.action-btn')) return;
      if (activeDownloads.has(item.fileName) || item.status === 'paused') return;
      toggleDetailPanel(item, wrapper, sourceHost);
    });

    // Pause button
    downloadItem.querySelector('.pause-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const downloadId = (e.currentTarget as HTMLElement).dataset.downloadId;
      window.BrowserAPI.pauseDownload(downloadId, window.BrowserAPI.appWindowId);
    });

    // Resume button (in-session)
    downloadItem.querySelector('.resume-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const downloadId = (e.currentTarget as HTMLElement).dataset.downloadId;
      window.BrowserAPI.resumeDownload(downloadId, window.BrowserAPI.appWindowId);
    });

    // Resume button (cross-session, from DB)
    downloadItem.querySelector('.resume-db-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const recordId = (e.currentTarget as HTMLElement).dataset.recordId;
      window.BrowserAPI.resumeDownload(recordId, window.BrowserAPI.appWindowId);
    });

    // Cancel button
    downloadItem.querySelector('.cancel-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const downloadId = (e.currentTarget as HTMLElement).dataset.downloadId;
      window.BrowserAPI.cancelDownload(downloadId, window.BrowserAPI.appWindowId);
    });

    // Delete button (for completed or paused-from-db downloads)
    if (!isActive) {
      downloadItem.querySelector('.delete-button')?.addEventListener('click', async (e: Event) => {
        e.stopPropagation();
        await window.BrowserAPI.removeDownload(window.BrowserAPI.appWindowId, item.id);
        // Remove detail panel if open
        if (selectedItemId === item.id) {
          selectedItemId = null;
        }
        wrapper.remove();
        allLoadedItems.splice(allLoadedItems.indexOf(item), 1);
        if (allLoadedItems.length === 0) {
          noDownloads.style.display = 'block';
          deleteAllBtn.style.display = 'none';
        }
        updateStorageGauge();
        renderTypeFilters();
      });
    }

    wrapper.appendChild(downloadItem);
    downloadsListElement.appendChild(wrapper);
  });

  createIcons({ icons });
};

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------

const toggleDetailPanel = (
  item: DownloadRecord,
  wrapper: HTMLElement,
  sourceHost: string
): void => {
  // If already selected, close it
  if (selectedItemId === item.id) {
    selectedItemId = null;
    const existingPanel = wrapper.querySelector('.detail-panel');
    if (existingPanel) existingPanel.remove();
    wrapper.querySelector('.download-item')?.classList.remove('selected');
    return;
  }

  // Close any previously open panel
  const prevPanel = downloadsListElement.querySelector('.detail-panel');
  if (prevPanel) prevPanel.remove();
  downloadsListElement
    .querySelectorAll('.download-item.selected')
    .forEach((el) => el.classList.remove('selected'));

  selectedItemId = item.id;
  wrapper.querySelector('.download-item')?.classList.add('selected');

  const displayType = getDisplayType(item);
  const color = TYPE_COLORS[displayType] || '#a1a1aa';
  const iconName = getFileIcon(item.fileExtension);

  const panel = document.createElement('div');
  panel.className = 'detail-panel';
  panel.dataset.fileType = displayType;

  panel.innerHTML = `
    <div class="detail-inner">
      <div class="detail-preview" style="background: linear-gradient(135deg, ${hexToRgba(color, 0.07)}, ${hexToRgba(color, 0.16)}); border: 1px solid ${hexToRgba(color, 0.09)}">
        <i data-lucide="${iconName}" style="color: ${color}" width="32" height="32"></i>
      </div>
      <div class="detail-metadata">
        <div class="detail-field">
          <span class="detail-field-label">File</span>
          <span class="detail-field-value">${item.fileName}</span>
        </div>
        <div class="detail-field">
          <span class="detail-field-label">Type</span>
          <span class="detail-field-value">${displayType}</span>
        </div>
        <div class="detail-field">
          <span class="detail-field-label">Size</span>
          <span class="detail-field-value">${FormatUtils.formatFileSize(item.fileSize) || 'Unknown'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-field-label">Source</span>
          <span class="detail-field-value">${sourceHost || item.url}</span>
        </div>
        <div class="detail-field">
          <span class="detail-field-label">Downloaded</span>
          <span class="detail-field-value">${new Date(item.createdDate).toLocaleString()}</span>
        </div>
        <div class="detail-field full-width">
          <span class="detail-field-label">Path</span>
          <span class="detail-field-value">${item.fileLocation}</span>
        </div>
      </div>
      <div class="detail-actions">
        <button class="detail-btn-primary detail-open-file">Open File</button>
        <button class="detail-btn-secondary detail-show-folder">Show in Folder</button>
        <button class="detail-btn-ghost detail-close">Close</button>
      </div>
    </div>
  `;

  // Open file
  panel.querySelector('.detail-open-file')?.addEventListener('click', () => {
    window.BrowserAPI.openDownloadedFile(item.fileLocation);
  });

  // Show in folder (opens the system file manager with the file selected)
  panel.querySelector('.detail-show-folder')?.addEventListener('click', () => {
    window.BrowserAPI.showItemInFolder(item.fileLocation);
  });

  // Close panel
  panel.querySelector('.detail-close')?.addEventListener('click', () => {
    selectedItemId = null;
    panel.remove();
    wrapper.querySelector('.download-item')?.classList.remove('selected');
  });

  wrapper.appendChild(panel);
  createIcons({ icons });
};

// ---------------------------------------------------------------------------
// Progress bar management
// ---------------------------------------------------------------------------

const updateProgressBar = (fileName: string, receivedBytes: number, totalBytes: number): void => {
  const row = downloadsListElement.querySelector(
    `.download-item[data-file-name="${CSS.escape(fileName)}"]`
  );
  if (!row) return;
  row.classList.add('downloading');
  row.classList.remove('paused');

  const progressEl = row.querySelector('.download-progress') as HTMLElement;
  let bar = row.querySelector('.download-progress-fill') as HTMLElement;
  if (!bar) {
    const newProgressEl = document.createElement('div');
    newProgressEl.className = 'download-progress';
    newProgressEl.innerHTML =
      '<div class="download-progress-bar"><div class="download-progress-fill" style="width: 0%"></div></div>';
    row.appendChild(newProgressEl);
    bar = newProgressEl.querySelector('.download-progress-fill') as HTMLElement;
  }

  // Get the type color for this row
  const fileType = row.closest('.download-item-wrapper')?.getAttribute('data-file-type') || 'other';
  const color = TYPE_COLORS[fileType] || '#a1a1aa';
  bar.style.background = color;

  let pct = 0;
  if (totalBytes > 0) {
    // Determinate: show actual percentage
    pct = Math.round((receivedBytes / totalBytes) * 100);
    bar.style.width = `${pct}%`;
    if (progressEl) progressEl.classList.remove('indeterminate');
  } else {
    // Indeterminate: animate a sliding bar when total size is unknown
    bar.style.width = '30%';
    if (progressEl) progressEl.classList.add('indeterminate');
  }

  // Update status pill (percentage)
  const pctNum = row.querySelector('.download-status.progress .pct-num') as HTMLElement;
  if (pctNum) pctNum.textContent = totalBytes > 0 ? `${pct}%` : '…';

  // Update file size display
  const sizeEl = row.querySelector('.download-size') as HTMLElement;
  if (sizeEl) {
    if (totalBytes > 0) {
      sizeEl.textContent = `${FormatUtils.formatFileSize(receivedBytes)} / ${FormatUtils.formatFileSize(totalBytes)}`;
    } else if (receivedBytes > 0) {
      sizeEl.textContent = FormatUtils.formatFileSize(receivedBytes);
    }
  }
};

const removeProgressBar = (fileName: string): void => {
  const row = downloadsListElement.querySelector(
    `.download-item[data-file-name="${CSS.escape(fileName)}"]`
  );
  if (!row) return;
  row.classList.remove('downloading', 'paused');
  row.querySelector('.download-progress')?.remove();
  // Swap status pill from "progress" to "done"
  const statusEl = row.querySelector('.download-status');
  if (statusEl) {
    statusEl.className = 'download-status done';
    statusEl.textContent = 'complete';
  }
  // Replace action buttons with just the delete button
  const actionsEl = row.querySelector('.download-actions');
  if (actionsEl) {
    actionsEl.innerHTML = `
      <button class="action-btn remove-btn delete-button" title="Remove">
        <i data-lucide="x" width="14" height="14"></i>
      </button>`;
    createIcons({ icons });
  }
};

const setRowPaused = (fileName: string): void => {
  const row = downloadsListElement.querySelector(
    `.download-item[data-file-name="${CSS.escape(fileName)}"]`
  ) as HTMLElement;
  if (!row) return;
  row.classList.add('paused');

  // Swap pause button to resume button
  const pauseBtn = row.querySelector('.pause-btn');
  if (pauseBtn) {
    pauseBtn.classList.remove('pause-btn');
    pauseBtn.classList.add('resume-btn');
    pauseBtn.setAttribute('title', 'Resume');
    pauseBtn.innerHTML = '<i data-lucide="play" width="14" height="14"></i>';
    const downloadId = (pauseBtn as HTMLElement).dataset.downloadId;
    pauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.BrowserAPI.resumeDownload(downloadId, window.BrowserAPI.appWindowId);
    });
    createIcons({ icons });
  }

  // Update progress bar color
  const progressFill = row.querySelector('.download-progress-fill') as HTMLElement;
  if (progressFill) {
    progressFill.style.background = 'var(--bg-3)';
  }

  // Swap status pill to paused
  const statusEl = row.querySelector('.download-status') as HTMLElement;
  if (statusEl) {
    statusEl.className = 'download-status paused';
    statusEl.innerHTML = '<i data-lucide="pause" width="10" height="10"></i> paused';
    createIcons({ icons });
  }
};

const setRowResumed = (fileName: string): void => {
  const row = downloadsListElement.querySelector(
    `.download-item[data-file-name="${CSS.escape(fileName)}"]`
  ) as HTMLElement;
  if (!row) return;
  row.classList.remove('paused');

  // Swap resume button to pause button
  const resumeBtn = row.querySelector('.resume-btn');
  if (resumeBtn) {
    resumeBtn.classList.remove('resume-btn');
    resumeBtn.classList.add('pause-btn');
    resumeBtn.setAttribute('title', 'Pause');
    resumeBtn.innerHTML = '<i data-lucide="pause" width="14" height="14"></i>';
    const downloadId = (resumeBtn as HTMLElement).dataset.downloadId;
    resumeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.BrowserAPI.pauseDownload(downloadId, window.BrowserAPI.appWindowId);
    });
    createIcons({ icons });
  }

  // Restore progress bar color
  const progressFill = row.querySelector('.download-progress-fill') as HTMLElement;
  if (progressFill) {
    const fileType =
      row.closest('.download-item-wrapper')?.getAttribute('data-file-type') || 'other';
    progressFill.style.background = TYPE_COLORS[fileType] || '#a1a1aa';
  }

  // Swap status pill back to in-progress
  const statusEl = row.querySelector('.download-status') as HTMLElement;
  if (statusEl) {
    statusEl.className = 'download-status progress';
    statusEl.innerHTML =
      '<i data-lucide="arrow-down" width="10" height="10"></i> <span class="pct-num">…</span>';
    createIcons({ icons });
  }
};

// ---------------------------------------------------------------------------
// Loading indicator
// ---------------------------------------------------------------------------

const showLoadingIndicator = (): void => {
  const loader = document.createElement('div');
  loader.id = 'loading-indicator';
  loader.className = 'loading-indicator';
  loader.textContent = 'Loading...';
  downloadsListElement.appendChild(loader);
};

const removeLoadingIndicator = (): void => {
  document.getElementById('loading-indicator')?.remove();
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const extractHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};
