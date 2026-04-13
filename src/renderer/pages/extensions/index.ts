import { HtmlUtils } from '../../../renderer/common/html-utils';
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

// Declared by Electron Forge webpack preload
declare const BrowserAPI: any;

interface ExtensionRecord {
  id: string;
  name: string;
  version: string;
  description: string;
  path: string;
  enabled: boolean;
  allowedInPrivate: boolean;
  installedAt: number;
  iconDataUrl?: string;
  manifestVersion: number;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let extensionsList: ExtensionRecord[] = [];

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------
const getPage = () => document.getElementById('extensions-page');
const getList = () => document.getElementById('extensions-list');
const getEmpty = () => document.getElementById('no-extensions');
const getInstallBtn = () => document.getElementById('install-extension');

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function renderExtensions(): void {
  const list = getList();
  const empty = getEmpty();
  if (!list || !empty) return;

  if (extensionsList.length === 0) {
    list.innerHTML = '';
    empty.classList.add('visible');
    return;
  }

  empty.classList.remove('visible');

  list.innerHTML = extensionsList.map((ext) => {
    const iconHtml = ext.iconDataUrl
      ? `<img src="${HtmlUtils.escapeHtml(ext.iconDataUrl)}" alt="">`
      : `<i data-lucide="puzzle" class="icon-placeholder" width="24" height="24"></i>`;

    return `
      <div class="extension-card${ext.enabled ? '' : ' disabled'}" data-id="${HtmlUtils.escapeHtml(ext.id)}">
        <div class="extension-icon">${iconHtml}</div>
        <div class="extension-info">
          <div class="extension-name">
            ${HtmlUtils.escapeHtml(ext.name)}
            <span class="extension-version">v${HtmlUtils.escapeHtml(ext.version)}</span>
            <span class="extension-mv-badge">MV${ext.manifestVersion}</span>
          </div>
          <p class="extension-description">${HtmlUtils.escapeHtml(ext.description || 'No description')}</p>
          <p class="extension-path">${HtmlUtils.escapeHtml(ext.path)}</p>
          <div class="extension-controls">
            <label class="extension-toggle">
              <input type="checkbox" class="toggle-enabled" data-id="${HtmlUtils.escapeHtml(ext.id)}" ${ext.enabled ? 'checked' : ''}>
              Enabled
            </label>
            <label class="extension-toggle">
              <input type="checkbox" class="toggle-private" data-id="${HtmlUtils.escapeHtml(ext.id)}" ${ext.allowedInPrivate ? 'checked' : ''}>
              Allow in Private
            </label>
            <button class="btn-remove" data-id="${HtmlUtils.escapeHtml(ext.id)}">
              <i data-lucide="trash-2" width="12" height="12"></i>
              Remove
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Re-create lucide icons for dynamically added elements
  createIcons({ icons });

  // Attach event listeners
  list.querySelectorAll('.toggle-enabled').forEach((el) => {
    el.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const id = target.dataset.id;
      if (!id) return;
      if (target.checked) {
        const result = await BrowserAPI.enableExtension(id);
        if (!result.success) {
          showToast(result.error || 'Failed to enable extension');
          target.checked = false;
        }
      } else {
        const result = await BrowserAPI.disableExtension(id);
        if (!result.success) {
          showToast(result.error || 'Failed to disable extension');
          target.checked = true;
        }
      }
    });
  });

  list.querySelectorAll('.toggle-private').forEach((el) => {
    el.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const id = target.dataset.id;
      if (!id) return;
      const result = await BrowserAPI.toggleExtensionPrivate(id);
      if (!result.success) {
        showToast(result.error || 'Failed to toggle private mode');
        target.checked = !target.checked;
      }
    });
  });

  list.querySelectorAll('.btn-remove').forEach((el) => {
    el.addEventListener('click', async (e) => {
      const target = (e.currentTarget as HTMLElement);
      const id = target.dataset.id;
      if (!id) return;
      const result = await BrowserAPI.uninstallExtension(id);
      if (!result.success) {
        showToast(result.error || 'Failed to remove extension');
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string): void {
  let toast = document.querySelector('.extensions-toast') as HTMLElement;
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'extensions-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, 3000);
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
async function init(): Promise<void> {
  const page = getPage();

  // Load extensions
  try {
    extensionsList = await BrowserAPI.fetchExtensions();
  } catch {
    extensionsList = [];
  }

  renderExtensions();

  // Install button
  const installBtn = getInstallBtn();
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      const appWindowId = BrowserAPI.appWindowId;
      const result = await BrowserAPI.installExtension(appWindowId);
      if (result && !result.success && result.error && result.error !== 'No directory selected.') {
        showToast(result.error);
      }
    });
  }

  // Listen for extension changes
  BrowserAPI.onExtensionsUpdated((data: ExtensionRecord[]) => {
    extensionsList = data;
    renderExtensions();
  });

  BrowserAPI.onExtensionInstalled(() => {
    // Will be followed by EXTENSIONS_UPDATED which triggers re-render
  });

  BrowserAPI.onExtensionUninstalled(() => {
    // Will be followed by EXTENSIONS_UPDATED which triggers re-render
  });

  BrowserAPI.onExtensionStateChanged(() => {
    // Will be followed by EXTENSIONS_UPDATED for full re-render,
    // but we can also do targeted updates from STATE_CHANGED
  });

  // Reveal page
  if (page) {
    page.classList.add('loaded');
  }
}

document.addEventListener('DOMContentLoaded', init);
