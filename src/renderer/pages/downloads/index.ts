
import { HtmlUtils } from '../../../renderer/common/html-utils';
import './index.css';

import { createIcons, icons } from 'lucide';
import { FormatUtils } from '../../../renderer/common/format-utils';
import { DownloadRecord } from '../../../types/download-record';
createIcons({ icons });

const downloadsListElement = document.getElementById('downloads-list') as HTMLElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;

document.addEventListener('DOMContentLoaded', async() => {
  renderDownloadItems();
1
  document.getElementById('delete-all')?.addEventListener('click', async () => {
    await window.BrowserAPI.removeAllBrowsingHistory(window.BrowserAPI.appWindowId);
    downloadsListElement.innerHTML = '';
    document.getElementById('no-downloads').style.display = 'block';
    document.getElementById('delete-all').style.display = 'none';
  });

  const debouncedSearchHandler = HtmlUtils.debounce(renderDownloadItems, 300);
  document.getElementById('search-input')?.addEventListener('input', debouncedSearchHandler);
});

const renderDownloadItems = async (): Promise<void> => {
  const searchTerm = searchInput.value || '';
  const downloadData: Array<DownloadRecord> = await window.BrowserAPI.fetchDownloads(window.BrowserAPI.appWindowId, searchTerm, 100, 0);
  console.log(downloadData)
  downloadsListElement.innerHTML = '';
  if(downloadData.length === 0) {
    document.getElementById('no-downloads').style.display = 'block';
    document.getElementById('delete-all').style.display = 'none';
    return;
  } else { 
    document.getElementById('no-downloads').style.display = 'none';
    document.getElementById('delete-all').style.display = 'block';
  }
  
  downloadData.forEach(item => {
      const downloadItem = document.createElement('div');
      downloadItem.className = 'download-item';
      
      downloadItem.innerHTML = `
          <div class="download-time">${FormatUtils.getFriendlyDateString(item.createdDate)}</div>
          <div><i data-lucide="${getFileIcon(item.fileExtension)}" class="download-icon"></i></div>
          <div class="download-content">
            <div class="download-filename" title="${item.fileName}">${item.fileName}</div>
            <div class="download-path">${item.fileLocation}</div>
          </div>
          <div>
            <button class="delete-button">
              <i data-lucide="x" width="16" height="16"></i>
            </button>
          </div>
      `;

      downloadItem.querySelector('.delete-button')?.addEventListener('click', async (e: Event) => {
        e.stopPropagation(); // Prevent opening the URL
        await window.BrowserAPI.removeDownload(window.BrowserAPI.appWindowId, item.id);
        downloadItem.remove();
        downloadData.splice(downloadData.indexOf(item), 1);
        if(downloadData.length === 0) {
          document.getElementById('no-downloads').style.display = 'block';
          document.getElementById('delete-all').style.display = 'none';
        }
      });

      //@todo - initiate a file opener
      // downloadItem.querySelector('.download-content')?.addEventListener('click', async (e: Event) => {
      //   e.stopPropagation(); 
      //   await window.BrowserAPI.createTab(window.BrowserAPI.appWindowId, item.url, true);
      // });

      downloadsListElement.appendChild(downloadItem);
  });
  
  createIcons({ icons });
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
