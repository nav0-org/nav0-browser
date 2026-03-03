
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

// Track active downloads by fileName for progress bars
const activeDownloads: Map<string, { receivedBytes: number, totalBytes: number }> = new Map();

const downloadsListElement = document.getElementById('downloads-list') as HTMLElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;

document.addEventListener('DOMContentLoaded', async() => {
  // Seed activeDownloads with any downloads already in progress before this page loaded
  const inProgress = await window.BrowserAPI.fetchActiveDownloads();
  for (const d of inProgress) {
    activeDownloads.set(d.fileName, { receivedBytes: d.receivedBytes, totalBytes: d.totalBytes });
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

  // Listen for download progress events
  window.BrowserAPI.onDownloadStarted((data) => {
    activeDownloads.set(data.fileName, { receivedBytes: 0, totalBytes: data.totalBytes });
    // Reload list to pick up the newly inserted DB record
    resetAndReload();
  });

  window.BrowserAPI.onDownloadProgress((data) => {
    // Try matching via activeDownloads map first
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
    // Fallback: match against rendered rows by checking downloadId suffix
    if (!matched) {
      const rows = downloadsListElement.querySelectorAll('.download-item[data-file-name]');
      for (const row of rows) {
        const fileName = (row as HTMLElement).dataset.fileName;
        if (fileName && data.downloadId.endsWith(fileName)) {
          activeDownloads.set(fileName, { receivedBytes: data.receivedBytes, totalBytes: data.totalBytes });
          updateProgressBar(fileName, data.receivedBytes, data.totalBytes);
          break;
        }
      }
    }
  });

  window.BrowserAPI.onDownloadCompleted((data) => {
    activeDownloads.delete(data.fileName);
    removeProgressBar(data.fileName);
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
    if (isActive) {
      downloadItem.classList.add('downloading');
    }
    const pct = isActive && activeInfo.totalBytes > 0
      ? Math.round((activeInfo.receivedBytes / activeInfo.totalBytes) * 100)
      : 0;

    downloadItem.innerHTML = `
      <div class="download-time">${FormatUtils.getFriendlyDateString(item.createdDate)}</div>
      <div><i data-lucide="${getFileIcon(item.fileExtension)}" class="download-icon"></i></div>
      <div class="download-content">
        <div class="download-filename" title="${item.fileName}">${item.fileName}</div>
        <div class="download-path">${item.fileLocation}</div>
      </div>
      <div>
        <button class="delete-button">
          <i data-lucide="x" width="14" height="14"></i>
        </button>
      </div>
      ${isActive ? `<div class="download-progress-bar"><div class="download-progress-bar-fill" style="width: ${pct}%"></div></div>` : ''}
    `;

    downloadItem.addEventListener('click', () => {
      if (!activeDownloads.has(item.fileName)) {
        window.BrowserAPI.openDownloadedFile(item.fileLocation);
      }
    });

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

    downloadsListElement.appendChild(downloadItem);
  });

  createIcons({ icons });
};

const updateProgressBar = (fileName: string, receivedBytes: number, totalBytes: number): void => {
  const row = downloadsListElement.querySelector(`[data-file-name="${CSS.escape(fileName)}"]`);
  if (!row) return;
  row.classList.add('downloading');
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
  row.classList.remove('downloading');
  row.querySelector('.download-progress-bar')?.remove();
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
