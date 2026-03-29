import './options-menu.css';
import { InAppUrls } from '../../../../constants/app-constants';

let containerEl: HTMLElement;
let optionsElement: HTMLElement | null = null;
let appWindowId: string;
let isPrivate: boolean;

const OPTIONS_MENU_HTML = `
  <div>
    <div class="options-dropdown" id="om-options-dropdown">
      <div class="dropdown-item" id="om-new-tab-option">
        <i data-lucide="file-plus-2" width="16" height="16"></i>
        <span class="dropdown-item-text">New Tab</span>
        <span id="om-new-tab-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="dropdown-item" id="om-new-window-option">
        <i data-lucide="app-window" width="16" height="16"></i>
        <span class="dropdown-item-text">New Window</span>
        <span id="om-new-window-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="dropdown-item" id="om-new-private-window-option">
        <i data-lucide="eye-off" width="16" height="16"></i>
        <span class="dropdown-item-text">New Private Window</span>
        <span id="om-new-private-window-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="dropdown-item" id="om-open-pdf-option">
        <i data-lucide="file-text" width="16" height="16"></i>
        <span class="dropdown-item-text">Open PDF File</span>
        <span class="keyboard-shortcut"></span>
      </div>

      <div class="divider"></div>

      <div class="dropdown-item" id="om-print-option">
        <i data-lucide="printer" width="16" height="16"></i>
        <span class="dropdown-item-text">Print</span>
        <span id="om-print-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="dropdown-item" id="om-find-in-page-option">
        <i data-lucide="text-search" width="16" height="16"></i>
        <span class="dropdown-item-text">Find in Page</span>
        <span id="om-find-in-page-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="divider"></div>

      <div class="dropdown-item" id="om-downloads-option">
        <i data-lucide="download" width="16" height="16"></i>
        <span class="dropdown-item-text">Downloads</span>
        <span id="om-downloads-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="dropdown-item has-submenu" id="om-history-submenu-container">
        <i data-lucide="clock" width="16" height="16"></i>
        <span class="dropdown-item-text">History</span>
        <span id="om-history-shortcut" class="keyboard-shortcut"></span>
        <i data-lucide="chevron-right" class="submenu-indicator" width="14" height="14"></i>

        <!-- History Submenu -->
        <div class="submenu history-submenu">
          <!-- Section 1: Show All History -->
          <div class="dropdown-item" id="om-history-option">
            <i data-lucide="clock" width="16" height="16"></i>
            <span class="dropdown-item-text">Show All History</span>
          </div>

          <div class="divider"></div>

          <!-- Section 2: Recently Closed Tabs -->
          <div class="submenu-section-label">Recently Closed</div>
          <div id="om-recently-closed-tabs-list">
            <div class="submenu-empty-state">No recently closed tabs</div>
          </div>

          <div class="divider"></div>

          <!-- Section 3: Recently Closed Windows -->
          <div class="submenu-section-label">Recently Closed Windows</div>
          <div id="om-recently-closed-windows-list">
            <div class="submenu-empty-state">No recently closed windows</div>
          </div>
        </div>
      </div>

      <div class="dropdown-item" id="om-bookmarks-option">
        <i data-lucide="album" width="16" height="16"></i>
        <span class="dropdown-item-text">Bookmarks</span>
        <span id="om-bookmarks-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="divider"></div>

      <div class="dropdown-item has-submenu">
        <i data-lucide="circle-help" width="16" height="16"></i>
        <span class="dropdown-item-text">Help</span>
        <i data-lucide="chevron-right" class="submenu-indicator" width="14" height="14"></i>

        <!-- options Submenu -->
        <div class="submenu">
          <div class="dropdown-item" id="om-about-Nav0-option">
            <i data-lucide="info" width="16" height="16"></i>
            <span class="dropdown-item-text">About Nav0</span>
          </div>
          <div class="dropdown-item" id="om-privacy-policy-option">
            <i data-lucide="shield-check" width="16" height="16"></i>
            <span class="dropdown-item-text">Privacy Policy</span>
          </div>
          <div class="dropdown-item" id="om-terms-of-use-option">
            <i data-lucide="scale" width="16" height="16"></i>
            <span class="dropdown-item-text">Terms of Use</span>
          </div>
          <div class="dropdown-item" id="om-disclaimer-option">
            <i data-lucide="triangle-alert" width="16" height="16"></i>
            <span class="dropdown-item-text">Disclaimer</span>
          </div>
          <div class="divider"></div>
          <div class="dropdown-item" id="om-report-issue-option">
            <i data-lucide="message-square-warning" width="16" height="16"></i>
            <span class="dropdown-item-text">Report an Issue</span>
          </div>
        </div>
      </div>

      <div class="dropdown-item" id="om-devtools-option">
        <i data-lucide="code" width="16" height="16"></i>
        <span class="dropdown-item-text">Developer Tools</span>
        <span id="om-devtools-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="divider"></div>

      <div class="dropdown-item" id="om-settings-option">
        <i data-lucide="settings" width="16" height="16"></i>
        <span class="dropdown-item-text">Settings</span>
        <span id="om-browser-settings-shortcut" class="keyboard-shortcut"></span>
      </div>

    </div>
  </div>
`;

function initializeDomElements(): void {
  optionsElement = containerEl.querySelector('#om-options-dropdown') as HTMLElement;
  const modKey = window.BrowserAPI.platform === 'darwin' ? 'Cmd' : 'Ctrl';
  const setShortcut = (id: string, keys: string[]) => {
    const el = containerEl.querySelector(`#${id}`) as HTMLElement;
    if (el) el.innerHTML = keys.map(k => `<span class="keycap">${k}</span>`).join('');
  };

  setShortcut('om-new-tab-shortcut', [modKey, 'T']);
  setShortcut('om-new-window-shortcut', [modKey, 'N']);
  setShortcut('om-new-private-window-shortcut', [modKey, 'Shift', 'T']);
  setShortcut('om-print-shortcut', [modKey, 'P']);
  setShortcut('om-find-in-page-shortcut', [modKey, 'F']);
  setShortcut('om-downloads-shortcut', [modKey, 'Shift', 'D']);
  setShortcut('om-history-shortcut', [modKey, 'Shift', 'H']);
  setShortcut('om-bookmarks-shortcut', [modKey, 'Shift', 'B']);
  setShortcut('om-browser-settings-shortcut', [modKey, 'Shift', ',']);
  setShortcut('om-devtools-shortcut', ['F12']);

  // Populate history submenu when hovering
  const historyContainer = containerEl.querySelector('#om-history-submenu-container');
  if (historyContainer) {
    historyContainer.addEventListener('mouseenter', () => populateHistorySubmenu());
  }
}

async function populateHistorySubmenu(): Promise<void> {
  // Populate recently closed tabs (not in private mode)
  const tabsList = containerEl.querySelector('#om-recently-closed-tabs-list') as HTMLElement;
  if (tabsList && !isPrivate) {
    const closedTabs = await window.BrowserAPI.fetchRecentlyClosedTabs(appWindowId);
    tabsList.innerHTML = '';
    if (closedTabs && closedTabs.length > 0) {
      for (let i = 0; i < closedTabs.length; i++) {
        const tab = closedTabs[i];
        const item = document.createElement('div');
        item.className = 'closed-tab-item';

        if (tab.faviconUrl) {
          const favicon = document.createElement('img');
          favicon.className = 'closed-tab-favicon';
          favicon.src = tab.faviconUrl;
          favicon.onerror = () => { favicon.style.display = 'none'; };
          item.appendChild(favicon);
        }

        const title = document.createElement('span');
        title.className = 'closed-tab-title';
        title.textContent = tab.title || tab.url;
        title.title = tab.url;
        item.appendChild(title);

        const index = i;
        item.addEventListener('click', async (e) => {
          e.stopPropagation();
          await window.BrowserAPI.restoreClosedTabByIndex(appWindowId, index);
          await window.BrowserAPI.hideOptionsMenu(appWindowId);
        });

        tabsList.appendChild(item);
      }
    } else {
      tabsList.innerHTML = '<div class="submenu-empty-state">No recently closed tabs</div>';
    }
  } else if (tabsList && isPrivate) {
    tabsList.innerHTML = '<div class="submenu-empty-state">Not available in private mode</div>';
  }

  // Populate recently closed windows
  const windowsList = containerEl.querySelector('#om-recently-closed-windows-list') as HTMLElement;
  if (windowsList && !isPrivate) {
    const closedWindows = await window.BrowserAPI.fetchClosedWindows();
    windowsList.innerHTML = '';
    if (closedWindows && closedWindows.length > 0) {
      for (let i = 0; i < closedWindows.length; i++) {
        const win = closedWindows[i];
        const item = document.createElement('div');
        item.className = 'closed-window-item';

        const title = document.createElement('span');
        title.className = 'closed-window-title';
        const firstTab = win.tabs && win.tabs.length > 0 ? win.tabs[0] : null;
        title.textContent = firstTab ? firstTab.title || firstTab.url : 'Window';
        item.appendChild(title);

        const count = document.createElement('span');
        count.className = 'closed-window-tab-count';
        count.textContent = `${win.tabCount} tab${win.tabCount !== 1 ? 's' : ''}`;
        item.appendChild(count);

        const index = i;
        item.addEventListener('click', async (e) => {
          e.stopPropagation();
          await window.BrowserAPI.restoreClosedWindow(index);
          await window.BrowserAPI.hideOptionsMenu(appWindowId);
        });

        windowsList.appendChild(item);
      }
    } else {
      windowsList.innerHTML = '<div class="submenu-empty-state">No recently closed windows</div>';
    }
  } else if (windowsList && isPrivate) {
    windowsList.innerHTML = '<div class="submenu-empty-state">Not available in private mode</div>';
  }
}

function setupEventListeners(): void {
  // Click on the overlay background (not the dropdown) to close
  containerEl.addEventListener('click', async (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.options-dropdown')) {
      await window.BrowserAPI.hideOptionsMenu(appWindowId);
    }
  });

  optionsElement?.querySelector('#om-new-tab-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, InAppUrls.NEW_TAB, true);
  });

  optionsElement?.querySelector('#om-new-window-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createNewAppWindow();
  });

  optionsElement?.querySelector('#om-new-private-window-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createNewPrivateAppWindow();
  });

  optionsElement?.querySelector('#om-open-pdf-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.openPdfFile(appWindowId);
  });

  optionsElement?.querySelector('#om-print-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.printPage(appWindowId);
  });

  optionsElement?.querySelector('#om-find-in-page-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.showFindInPage(appWindowId);
  });

  optionsElement?.querySelector('#om-downloads-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, InAppUrls.DOWNLOADS, true);
  });

  optionsElement?.querySelector('#om-history-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, InAppUrls.HISTORY, true);
  });

  optionsElement?.querySelector('#om-bookmarks-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, InAppUrls.BOOKMARKS, true);
  });

  optionsElement?.querySelector('#om-devtools-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.toggleDevTools(appWindowId);
    await window.BrowserAPI.hideOptionsMenu(appWindowId);
  });

  optionsElement?.querySelector('#om-settings-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, InAppUrls.BROWSER_SETTINGS, true);
  });

  optionsElement?.querySelector('#om-about-Nav0-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, InAppUrls.ABOUT, true);
  });

  optionsElement?.querySelector('#om-privacy-policy-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, 'https://nav0.org/privacy-policy', true);
  });

  optionsElement?.querySelector('#om-terms-of-use-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, 'https://nav0.org/terms-of-use', true);
    await window.BrowserAPI.hideOptionsMenu(appWindowId);
  });

  optionsElement?.querySelector('#om-disclaimer-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, 'https://nav0.org/disclaimer', true);
    await window.BrowserAPI.hideOptionsMenu(appWindowId);
  });

  optionsElement?.querySelector('#om-report-issue-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.hideOptionsMenu(appWindowId);
    await window.BrowserAPI.showIssueReport(appWindowId);
  });
}

export function init(container: HTMLElement): void {
  containerEl = container;
  appWindowId = window.BrowserAPI.appWindowId;
  isPrivate = window.BrowserAPI.isPrivate;

  container.innerHTML = OPTIONS_MENU_HTML;
  initializeDomElements();
  setupEventListeners();

  // Escape key to close
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !containerEl.hasAttribute('hidden')) {
      e.preventDefault();
      window.BrowserAPI.hideOptionsMenu(window.BrowserAPI.appWindowId);
    }
  });
}

export function show(_data?: any): void {
  // Nothing special needed on show - the dropdown is already rendered
}

export function hide(): void {
  // Nothing special needed on hide
}
