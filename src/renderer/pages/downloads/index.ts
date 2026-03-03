
import { HtmlUtils } from '../../../renderer/common/html-utils';
import './index.css';

import { createIcons, icons } from 'lucide';
import { FormatUtils } from '../../../renderer/common/format-utils';
import { DownloadRecord } from '../../../types/download-record';
createIcons({ icons });

const PAGE_SIZE = 50;
let currentOffset = 0;
let isLoading = false;
let hasMore = true;
let currentSearchTerm = '';
let allLoadedItems: DownloadRecord[] = [];

// Track active downloads by fileName
// state: 'progressing' | 'paused'
const activeDownloads: Map<string, { receivedBytes: number, totalBytes: number, downloadId: string, dbRecordId: string, state: string }> = new Map();

const downloadsListElement = document.getElementById('downloads-list') as HTMLElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;

document.addEventListener('DOMContentLoaded', async() => {
  // Seed activeDownloads with any downloads already in progress before this page loaded
  const inProgress = await window.BrowserAPI.fetchActiveDownloads();
  for (const d of inProgress) {
    activeDownloads.set(d.fileName, { receivedBytes: d.receivedBytes, totalBytes: d.totalBytes, downloadId: d.downloadId, dbRecordId: d.dbRecordId, state: d.state });
  }

  loadDownloadsPage();

  document.getElementById('delete-all')?.addEventListener('click', async () => {
    await window.BrowserAPI.removeAllDownloads(window.BrowserAPI.appWindowId);
    downloadsListElement.innerHTML = '';
    allLoadedItems = [];
    document.getElementById('no-downloads').style.display = 'block';
    document.getElementById('delete-all').style.display = 'none';
  });

  const debouncedSearchHandler = HtmlUtils.debounce(() => {
    resetAndReload();
  }, 300);
  document.getElementById('search-input')?.addEventListener('input', debouncedSearchHandler);

  downloadsListElement.addEventListener('scroll', () => {
    if (isLoading || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = downloadsListElement;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadDownloadsPage();
    }
  });

  // Listen for download lifecycle events
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
      // Remove the row for cancelled downloads
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

const resetAndReload = () => {
  currentOffset = 0;
  hasMore = true;
  allLoadedItems = [];
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
    document.getElementById('no-downloads').style.display = 'block';
    document.getElementById('delete-all').style.display = 'none';
    isLoading = false;
    return;
  } else {
    document.getElementById('no-downloads').style.display = 'none';
    document.getElementById('delete-all').style.display = 'block';
  }

  allLoadedItems = allLoadedItems.concat(downloadData);
  currentOffset += downloadData.length;

  appendDownloadItems(downloadData);
  isLoading = false;
};

const appendDownloadItems = (items: DownloadRecord[]): void => {
  items.forEach(item => {
    const downloadItem = document.createElement('div');
    downloadItem.className = 'download-item';
    downloadItem.dataset.fileName = item.fileName;

    const activeInfo = activeDownloads.get(item.fileName);
    const isActive = !!activeInfo;
    const isPausedFromDb = !isActive && item.status === 'paused';
    const isPaused = isActive ? activeInfo.state === 'paused' : isPausedFromDb;

    if (isActive || isPausedFromDb) {
      downloadItem.classList.add('downloading');
      if (isPaused) downloadItem.classList.add('paused');
    }

    const pct = isActive && activeInfo.totalBytes > 0
      ? Math.round((activeInfo.receivedBytes / activeInfo.totalBytes) * 100)
      : 0;

    // Build control buttons for active/paused downloads
    let controlsHtml = '';
    if (isActive) {
      const downloadId = activeInfo.downloadId;
      if (isPaused) {
        controlsHtml = `
          <div class="download-controls">
            <button class="control-btn resume-btn" data-download-id="${downloadId}" title="Resume">
              <i data-lucide="play" width="14" height="14"></i>
            </button>
            <button class="control-btn cancel-btn" data-download-id="${downloadId}" title="Cancel">
              <i data-lucide="x" width="14" height="14"></i>
            </button>
          </div>`;
      } else {
        controlsHtml = `
          <div class="download-controls">
            <button class="control-btn pause-btn" data-download-id="${downloadId}" title="Pause">
              <i data-lucide="pause" width="14" height="14"></i>
            </button>
            <button class="control-btn cancel-btn" data-download-id="${downloadId}" title="Cancel">
              <i data-lucide="x" width="14" height="14"></i>
            </button>
          </div>`;
      }
    } else if (isPausedFromDb) {
      // Paused from previous session – use DB record id for resume
      controlsHtml = `
        <div class="download-controls">
          <button class="control-btn resume-db-btn" data-record-id="${item.id}" title="Resume">
            <i data-lucide="play" width="14" height="14"></i>
          </button>
          <button class="delete-button" title="Remove">
            <i data-lucide="x" width="14" height="14"></i>
          </button>
        </div>`;
    }

    downloadItem.innerHTML = `
      <div class="download-time">${FormatUtils.getFriendlyDateString(item.createdDate)}</div>
      <div><i data-lucide="${getFileIcon(item.fileExtension)}" class="download-icon"></i></div>
      <div class="download-content">
        <div class="download-filename" title="${item.fileName}">${item.fileName}</div>
        <div class="download-path">${isPausedFromDb ? 'Paused' : item.fileLocation}</div>
      </div>
      <div>
        ${controlsHtml || `<button class="delete-button"><i data-lucide="x" width="14" height="14"></i></button>`}
      </div>
      ${(isActive && !isPaused) ? `<div class="download-progress-bar"><div class="download-progress-bar-fill" style="width: ${pct}%"></div></div>` : ''}
    `;

    // Row click → open file (only for completed downloads)
    downloadItem.addEventListener('click', (e) => {
      if (activeDownloads.has(item.fileName) || item.status === 'paused') return;
      // Don't trigger when clicking controls
      if ((e.target as HTMLElement).closest('.download-controls, .delete-button, .control-btn')) return;
      window.BrowserAPI.openDownloadedFile(item.fileLocation);
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
    if (!isActive && !isPausedFromDb) {
      downloadItem.querySelector('.delete-button')?.addEventListener('click', async (e: Event) => {
        e.stopPropagation();
        await window.BrowserAPI.removeDownload(window.BrowserAPI.appWindowId, item.id);
        downloadItem.remove();
        allLoadedItems.splice(allLoadedItems.indexOf(item), 1);
        if (allLoadedItems.length === 0) {
          document.getElementById('no-downloads').style.display = 'block';
          document.getElementById('delete-all').style.display = 'none';
        }
      });
    }
    // Delete button for paused-from-db
    if (isPausedFromDb) {
      downloadItem.querySelector('.delete-button')?.addEventListener('click', async (e: Event) => {
        e.stopPropagation();
        await window.BrowserAPI.removeDownload(window.BrowserAPI.appWindowId, item.id);
        downloadItem.remove();
      });
    }

    downloadsListElement.appendChild(downloadItem);
  });

  createIcons({ icons });
};

const updateProgressBar = (fileName: string, receivedBytes: number, totalBytes: number): void => {
  const row = downloadsListElement.querySelector(`[data-file-name="${CSS.escape(fileName)}"]`);
  if (!row) return;
  row.classList.add('downloading');
  row.classList.remove('paused');
  let bar = row.querySelector('.download-progress-bar-fill') as HTMLElement;
  if (!bar) {
    const progressEl = document.createElement('div');
    progressEl.className = 'download-progress-bar';
    progressEl.innerHTML = '<div class="download-progress-bar-fill" style="width: 0%"></div>';
    row.appendChild(progressEl);
    bar = progressEl.querySelector('.download-progress-bar-fill') as HTMLElement;
  }
  const pct = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0;
  bar.style.width = `${pct}%`;
};

const removeProgressBar = (fileName: string): void => {
  const row = downloadsListElement.querySelector(`[data-file-name="${CSS.escape(fileName)}"]`);
  if (!row) return;
  row.classList.remove('downloading', 'paused');
  row.querySelector('.download-progress-bar')?.remove();
  row.querySelector('.download-controls')?.remove();
};

const setRowPaused = (fileName: string): void => {
  const row = downloadsListElement.querySelector(`[data-file-name="${CSS.escape(fileName)}"]`) as HTMLElement;
  if (!row) return;
  row.classList.add('paused');
  // Swap pause button to resume button
  const pauseBtn = row.querySelector('.pause-btn');
  if (pauseBtn) {
    pauseBtn.classList.remove('pause-btn');
    pauseBtn.classList.add('resume-btn');
    pauseBtn.setAttribute('title', 'Resume');
    pauseBtn.innerHTML = '<i data-lucide="play" width="14" height="14"></i>';
    // Re-bind click
    const downloadId = (pauseBtn as HTMLElement).dataset.downloadId;
    pauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.BrowserAPI.resumeDownload(downloadId, window.BrowserAPI.appWindowId);
    });
    createIcons({ icons });
  }
};

const setRowResumed = (fileName: string): void => {
  const row = downloadsListElement.querySelector(`[data-file-name="${CSS.escape(fileName)}"]`) as HTMLElement;
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
};

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

// Get appropriate icon based on file type
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

  // Return the icon for the given file type, or a default icon if not found
  return iconMap[extension.toLowerCase()] || 'file';
};
