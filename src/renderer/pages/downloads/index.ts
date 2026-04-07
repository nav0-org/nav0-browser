
import { HtmlUtils } from '../../../renderer/common/html-utils';
import './index.css';

import { createIcons, icons } from 'lucide';
import { FormatUtils } from '../../../renderer/common/format-utils';
import { DownloadRecord } from '../../../types/download-record';
import { TYPE_COLORS, getDisplayTypeFromExtension, getTypeColor, hexToRgba } from '../../../renderer/common/file-type-utils';
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
const activeDownloads: Map<string, { receivedBytes: number; totalBytes: number; downloadId: string; dbRecordId: string; state: string }> = new Map();

const getDisplayType = (item: DownloadRecord): string => {
  return getDisplayTypeFromExtension(item.fileExtension);
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
const storageTotal = document.getElementById('storage-total') as HTMLElement;
const noDownloads = document.getElementById('no-downloads') as HTMLElement;
const deleteAllBtn = document.getElementById('delete-all') as HTMLElement;
const downloadsFooter = document.querySelector('.downloads-footer') as HTMLElement;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  // Seed activeDownloads with any downloads already in progress
  const inProgress = await window.BrowserAPI.fetchActiveDownloads();
  for (const d of inProgress) {
    activeDownloads.set(d.fileName, { receivedBytes: d.receivedBytes, totalBytes: d.totalBytes, downloadId: d.downloadId, dbRecordId: d.dbRecordId, state: d.state });
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
    downloadsFooter.style.display = 'none';
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
    activeDownloads.set(data.fileName, { receivedBytes: 0, totalBytes: data.totalBytes, downloadId: data.downloadId, dbRecordId: data.dbRecordId, state: 'progressing' });
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
          activeDownloads.set(fileName, { receivedBytes: data.receivedBytes, totalBytes: data.totalBytes, downloadId: data.downloadId, dbRecordId: '', state: 'progressing' });
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
      const row = downloadsListElement.querySelector(`[data-file-name="${CSS.escape(data.fileName)}"]`);
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
    window.BrowserAPI.appWindowId, currentSearchTerm, PAGE_SIZE, currentOffset
  );

  removeLoadingIndicator();

  if (downloadData.length < PAGE_SIZE) {
    hasMore = false;
  }

  if (currentOffset === 0 && downloadData.length === 0) {
    noDownloads.style.display = 'block';
    downloadsFooter.style.display = 'none';
    isLoading = false;
    updateStorageGauge();
    renderTypeFilters();
    return;
  } else {
    noDownloads.style.display = 'none';
    downloadsFooter.style.display = 'block';
  }

  allLoadedItems = allLoadedItems.concat(downloadData);
  currentOffset += downloadData.length;

  appendDownloadItems(downloadData);
  updateStorageGauge();
  renderTypeFilters();
  isLoading = false;
};

// ---------------------------------------------------------------------------
// Type filter pills
// ---------------------------------------------------------------------------

const renderTypeFilters = (): void => {
  const typeCounts: Record<string, number> = {};
  allLoadedItems.forEach(d => {
    const displayType = getDisplayType(d);
    typeCounts[displayType] = (typeCounts[displayType] || 0) + 1;
  });

  const types = Object.keys(typeCounts).sort();
  typeFiltersContainer.innerHTML = '';

  // "All" pill
  const allPill = document.createElement('button');
  allPill.className = `type-pill${selectedTypeFilter === 'all' ? ' active' : ''}`;
  allPill.dataset.type = 'all';
  allPill.textContent = `All (${allLoadedItems.length})`;
  allPill.addEventListener('click', () => {
    selectedTypeFilter = 'all';
    applyTypeFilter();
    renderTypeFilters();
  });
  typeFiltersContainer.appendChild(allPill);

  types.forEach(type => {
    const pill = document.createElement('button');
    pill.className = `type-pill${selectedTypeFilter === type ? ' active' : ''}`;
    pill.dataset.type = type;
    pill.textContent = `${capitalize(type)} (${typeCounts[type]})`;
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
  rows.forEach(wrapper => {
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
  details.forEach(panel => {
    const el = panel as HTMLElement;
    const fileType = el.dataset.fileType;
    if (selectedTypeFilter === 'all' || fileType === selectedTypeFilter) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });

  // Check if any visible
  const anyVisible = downloadsListElement.querySelector('.download-item-wrapper:not([style*="display: none"])');
  noDownloads.style.display = anyVisible ? 'none' : 'block';
};

// ---------------------------------------------------------------------------
// Storage gauge
// ---------------------------------------------------------------------------

const updateStorageGauge = (): void => {
  const byType: Record<string, number> = {};
  allLoadedItems.forEach(d => {
    const displayType = getDisplayType(d);
    byType[displayType] = (byType[displayType] || 0) + d.fileSize;
  });

  const total = Object.values(byType).reduce((a, b) => a + b, 0);
  const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]);

  storageTotal.textContent = FormatUtils.formatFileSize(total) || '0 B';

  // Bar segments
  storageBar.innerHTML = '';
  sortedTypes.forEach(([type, size]) => {
    const segment = document.createElement('div');
    segment.className = 'storage-bar-segment';
    segment.style.width = total > 0 ? `${(size / total) * 100}%` : '0%';
    segment.style.background = TYPE_COLORS[type] || '#a1a1aa';
    storageBar.appendChild(segment);
  });

  // Legend
  storageLegend.innerHTML = '';
  sortedTypes.forEach(([type, size]) => {
    const item = document.createElement('div');
    item.className = 'storage-legend-item';
    item.innerHTML = `
      <div class="storage-legend-dot" style="background: ${TYPE_COLORS[type] || '#a1a1aa'}"></div>
      <span class="storage-legend-text">${type} · ${FormatUtils.formatFileSize(size)}</span>
    `;
    storageLegend.appendChild(item);
  });
};

// ---------------------------------------------------------------------------
// Download items rendering
// ---------------------------------------------------------------------------

const appendDownloadItems = (items: DownloadRecord[]): void => {
  items.forEach((item, index) => {
    const displayType = getDisplayType(item);

    const wrapper = document.createElement('div');
    wrapper.className = 'download-item-wrapper';
    wrapper.dataset.fileType = displayType;
    wrapper.dataset.recordId = item.id;

    const downloadItem = document.createElement('div');
    downloadItem.className = 'download-item';
    downloadItem.dataset.fileName = item.fileName;
    downloadItem.dataset.recordId = item.id;

    // Stagger animation delay
    downloadItem.style.transitionDelay = `${index * 0.03}s`;

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
    const pct = isActive && activeInfo.totalBytes > 0
      ? Math.round((activeInfo.receivedBytes / activeInfo.totalBytes) * 100)
      : 0;

    // Size display
    let sizeText = '';
    if (isActive && activeInfo.totalBytes > 0) {
      sizeText = `${FormatUtils.formatFileSize(activeInfo.receivedBytes)} / ${FormatUtils.formatFileSize(activeInfo.totalBytes)}`;
    } else if (isActive && activeInfo.totalBytes === 0) {
      sizeText = activeInfo.receivedBytes > 0 ? FormatUtils.formatFileSize(activeInfo.receivedBytes) : '';
    } else if (item.fileSize > 0) {
      sizeText = FormatUtils.formatFileSize(item.fileSize);
    }

    // Badges
    let badgesHtml = '';
    if (isPaused) {
      badgesHtml += '<span class="badge badge-paused">paused</span>';
    }

    // Action buttons
    let actionsHtml = '';
    if (isActive) {
      const downloadId = activeInfo.downloadId;
      if (isPaused) {
        actionsHtml = `
          <button class="action-btn resume-btn" data-download-id="${downloadId}" title="Resume">
            <i data-lucide="play" width="12" height="12"></i>
          </button>`;
      } else {
        actionsHtml = `
          <button class="action-btn pause-btn" data-download-id="${downloadId}" title="Pause">
            <i data-lucide="pause" width="12" height="12"></i>
          </button>`;
      }
      actionsHtml += `
        <button class="action-btn remove-btn cancel-btn" data-download-id="${downloadId}" title="Cancel">
          <i data-lucide="x" width="12" height="12"></i>
        </button>`;
    } else if (isPausedFromDb) {
      actionsHtml = `
        <button class="action-btn resume-db-btn" data-record-id="${item.id}" title="Resume">
          <i data-lucide="play" width="12" height="12"></i>
        </button>
        <button class="action-btn remove-btn delete-button" title="Remove">
          <i data-lucide="x" width="12" height="12"></i>
        </button>`;
    } else {
      actionsHtml = `
        <button class="action-btn remove-btn delete-button" title="Remove">
          <i data-lucide="x" width="12" height="12"></i>
        </button>`;
    }

    // Progress bar for active downloads
    let progressHtml = '';
    if (isActive) {
      const hasTotal = activeInfo.totalBytes > 0;
      const barWidth = hasTotal ? `${pct}%` : '30%';
      const barColor = isPaused ? '#d4d4d8' : color;
      const indeterminateClass = hasTotal ? '' : ' indeterminate';
      progressHtml = `
        <div class="download-progress${indeterminateClass}">
          <div class="download-progress-fill" style="width: ${barWidth}; background: ${barColor}"></div>
        </div>`;
    }

    downloadItem.innerHTML = `
      <div class="download-time">${FormatUtils.getFriendlyDateString(item.createdDate)}</div>
      <div class="download-type-icon" style="background: ${hexToRgba(color, 0.08)}">
        <i data-lucide="${iconName}" style="color: ${color}" width="16" height="16"></i>
      </div>
      <div class="download-content">
        <div class="download-filename-row">
          <span class="download-filename" title="${item.fileName}">${item.fileName}</span>
          ${badgesHtml}
        </div>
        <div class="download-path">${isPausedFromDb ? 'Paused' : item.fileLocation}</div>
        ${progressHtml}
      </div>
      <div class="download-size">${sizeText}</div>
      <div class="download-actions">${actionsHtml}</div>
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
          downloadsFooter.style.display = 'none';
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

const toggleDetailPanel = (item: DownloadRecord, wrapper: HTMLElement, sourceHost: string): void => {
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
  downloadsListElement.querySelectorAll('.download-item.selected').forEach(el => el.classList.remove('selected'));

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
  const row = downloadsListElement.querySelector(`.download-item[data-file-name="${CSS.escape(fileName)}"]`);
  if (!row) return;
  row.classList.add('downloading');
  row.classList.remove('paused');

  const progressEl = row.querySelector('.download-progress') as HTMLElement;
  let bar = row.querySelector('.download-progress-fill') as HTMLElement;
  if (!bar) {
    const newProgressEl = document.createElement('div');
    newProgressEl.className = 'download-progress';
    newProgressEl.innerHTML = '<div class="download-progress-fill" style="width: 0%"></div>';
    row.querySelector('.download-content')?.appendChild(newProgressEl);
    bar = newProgressEl.querySelector('.download-progress-fill') as HTMLElement;
  }

  // Get the type color for this row
  const fileType = row.closest('.download-item-wrapper')?.getAttribute('data-file-type') || 'other';
  const color = TYPE_COLORS[fileType] || '#a1a1aa';
  bar.style.background = color;

  if (totalBytes > 0) {
    // Determinate: show actual percentage
    const pct = Math.round((receivedBytes / totalBytes) * 100);
    bar.style.width = `${pct}%`;
    if (progressEl) progressEl.classList.remove('indeterminate');
  } else {
    // Indeterminate: animate a sliding bar when total size is unknown
    bar.style.width = '30%';
    if (progressEl) progressEl.classList.add('indeterminate');
  }

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
  const row = downloadsListElement.querySelector(`.download-item[data-file-name="${CSS.escape(fileName)}"]`);
  if (!row) return;
  row.classList.remove('downloading', 'paused');
  row.querySelector('.download-progress')?.remove();
  // Replace action buttons with just the delete button
  const actionsEl = row.querySelector('.download-actions');
  if (actionsEl) {
    actionsEl.innerHTML = `
      <button class="action-btn remove-btn delete-button" title="Remove">
        <i data-lucide="x" width="12" height="12"></i>
      </button>`;
    createIcons({ icons });
  }
};

const setRowPaused = (fileName: string): void => {
  const row = downloadsListElement.querySelector(`.download-item[data-file-name="${CSS.escape(fileName)}"]`) as HTMLElement;
  if (!row) return;
  row.classList.add('paused');

  // Swap pause button to resume button
  const pauseBtn = row.querySelector('.pause-btn');
  if (pauseBtn) {
    pauseBtn.classList.remove('pause-btn');
    pauseBtn.classList.add('resume-btn');
    pauseBtn.setAttribute('title', 'Resume');
    pauseBtn.innerHTML = '<i data-lucide="play" width="12" height="12"></i>';
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
    progressFill.style.background = '#d4d4d8';
  }

  // Add paused badge if not present
  const filenameRow = row.querySelector('.download-filename-row');
  if (filenameRow && !filenameRow.querySelector('.badge-paused')) {
    const badge = document.createElement('span');
    badge.className = 'badge badge-paused';
    badge.textContent = 'paused';
    filenameRow.appendChild(badge);
  }
};

const setRowResumed = (fileName: string): void => {
  const row = downloadsListElement.querySelector(`.download-item[data-file-name="${CSS.escape(fileName)}"]`) as HTMLElement;
  if (!row) return;
  row.classList.remove('paused');

  // Swap resume button to pause button
  const resumeBtn = row.querySelector('.resume-btn');
  if (resumeBtn) {
    resumeBtn.classList.remove('resume-btn');
    resumeBtn.classList.add('pause-btn');
    resumeBtn.setAttribute('title', 'Pause');
    resumeBtn.innerHTML = '<i data-lucide="pause" width="12" height="12"></i>';
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
    const fileType = row.closest('.download-item-wrapper')?.getAttribute('data-file-type') || 'other';
    progressFill.style.background = TYPE_COLORS[fileType] || '#a1a1aa';
  }

  // Remove paused badge
  row.querySelector('.badge-paused')?.remove();
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

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const extractHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

// Get appropriate icon based on file extension (keeping existing lucide icons)
const getFileIcon = (fileType: string): string => {
  const extension = fileType.startsWith('.') ? fileType.slice(1) : fileType;
  const iconMap: Record<string, string> = {
    // Documents - Text
    'pdf': 'file-text',
    'doc': 'file-text',
    'docx': 'file-text',
    'txt': 'file-text',
    'rtf': 'file-text',
    'odt': 'file-text',
    'md': 'file-text',
    'pages': 'file-text',

    // Spreadsheets
    'csv': 'file-spreadsheet',
    'xlsx': 'file-spreadsheet',
    'xls': 'file-spreadsheet',
    'ods': 'file-spreadsheet',
    'numbers': 'file-spreadsheet',

    // Presentations
    'ppt': 'file-presentation',
    'pptx': 'file-presentation',
    'odp': 'file-presentation',

    // Images
    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'gif': 'image',
    'svg': 'image',
    'bmp': 'image',
    'webp': 'image',
    'tiff': 'image',
    'ico': 'image',
    'psd': 'image',
    'ai': 'image',

    // Audio files
    'mp3': 'music',
    'wav': 'music',
    'ogg': 'music',
    'flac': 'music',
    'aac': 'music',
    'm4a': 'music',
    'wma': 'music',
    'aiff': 'music',
    'opus': 'music',

    // Video files
    'mp4': 'video',
    'mov': 'video',
    'avi': 'video',
    'mkv': 'video',
    'wmv': 'video',
    'flv': 'video',
    'webm': 'video',

    // Archives
    'zip': 'file-archive',
    'rar': 'file-archive',
    '7z': 'file-archive',
    'tar': 'file-archive',
    'gz': 'file-archive',
    'bz2': 'file-archive',
    'xz': 'file-archive',
    'iso': 'file-archive',

    // Executable/installable
    'exe': 'download',
    'dmg': 'download',
    'msi': 'download',
    'app': 'download',
    'sh': 'terminal',
    'bat': 'terminal',
    'cmd': 'terminal',
    'com': 'download',
    'gadget': 'download',
    'jar': 'download',
    'deb': 'download',
    'rpm': 'download',
    'pkg': 'download',

    // Programming/scripts
    'py': 'code',
    'js': 'code',

    // General data files
    'json': 'file-code',
    'xml': 'file-code',
    'yaml': 'file-code',
    'toml': 'file-code',
    'ini': 'settings',
    'cfg': 'settings',
    'conf': 'settings',
    'log': 'file-text',
    'sql': 'database',
    'dat': 'file'
  };

  return iconMap[extension.toLowerCase()] || 'file';
};
