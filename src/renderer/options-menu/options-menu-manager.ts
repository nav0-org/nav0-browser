import { InAppUrls } from '../../constants/app-constants';

export class OptionsMenuManager {
  private optionsElement: HTMLElement | null = null;
  private appWindowId: string;
  private activeTabId: string | null = null;
  private isPrivate: boolean;

  constructor() {
    this.appWindowId = window.BrowserAPI.appWindowId;
    this.isPrivate = window.BrowserAPI.isPrivate;
    this.setupEventListeners();

    document.addEventListener('DOMContentLoaded', () => {
      this.initializeDomElements();
      this.setupEventListeners();
    });
  }

  private initializeDomElements(): void {
    this.optionsElement = document.getElementById('options-dropdown') as HTMLElement;
    if(window.BrowserAPI.platform === 'darwin'){
      document.getElementById('new-tab-shortcut').textContent = '⌘+T';
      document.getElementById('new-window-shortcut').textContent = '⌘+N';
      document.getElementById('new-private-window-shortcut').textContent = '⌘+⇧+T';
      document.getElementById('find-in-page-shortcut').textContent = '⌘+F';
      document.getElementById('downloads-shortcut').textContent = '⌘+⇧+D';
      document.getElementById('history-shortcut').textContent = '⌘+⇧+H';
      document.getElementById('bookmarks-shortcut').textContent = '⌘+⇧+B';
      document.getElementById('browser-settings-shortcut').textContent = '⌘+⇧+,';
    } else {
      document.getElementById('new-tab-shortcut').textContent = 'Ctrl+T';
      document.getElementById('new-window-shortcut').textContent = 'Ctrl+N';
      document.getElementById('new-private-window-shortcut').textContent = 'Ctrl+⇧+T';
      document.getElementById('find-in-page-shortcut').textContent = 'Ctrl+F';
      document.getElementById('downloads-shortcut').textContent = 'Ctrl+⇧+D';
      document.getElementById('history-shortcut').textContent = 'Ctrl+⇧+H';
      document.getElementById('bookmarks-shortcut').textContent = 'Ctrl+⇧+B';
      document.getElementById('browser-settings-shortcut').textContent = 'Ctrl+⇧+,';
    }

    // Populate history submenu when hovering
    const historyContainer = document.getElementById('history-submenu-container');
    if (historyContainer) {
      historyContainer.addEventListener('mouseenter', () => this.populateHistorySubmenu());
    }
  }

  private async populateHistorySubmenu(): Promise<void> {
    // Populate recently closed tabs (not in private mode)
    const tabsList = document.getElementById('recently-closed-tabs-list');
    if (tabsList && !this.isPrivate) {
      const closedTabs = await window.BrowserAPI.fetchRecentlyClosedTabs(this.appWindowId);
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
            await window.BrowserAPI.restoreClosedTabByIndex(this.appWindowId, index);
            await window.BrowserAPI.hideOptionsMenu(this.appWindowId);
          });

          tabsList.appendChild(item);
        }
      } else {
        tabsList.innerHTML = '<div class="submenu-empty-state">No recently closed tabs</div>';
      }
    } else if (tabsList && this.isPrivate) {
      tabsList.innerHTML = '<div class="submenu-empty-state">Not available in private mode</div>';
    }

    // Populate recently closed windows
    const windowsList = document.getElementById('recently-closed-windows-list');
    if (windowsList && !this.isPrivate) {
      const closedWindows = await window.BrowserAPI.fetchClosedWindows();
      windowsList.innerHTML = '';
      if (closedWindows && closedWindows.length > 0) {
        for (let i = 0; i < closedWindows.length; i++) {
          const win = closedWindows[i];
          const item = document.createElement('div');
          item.className = 'closed-window-item';

          const title = document.createElement('span');
          title.className = 'closed-window-title';
          // Show the first tab's title as the window label
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
            await window.BrowserAPI.hideOptionsMenu(this.appWindowId);
          });

          windowsList.appendChild(item);
        }
      } else {
        windowsList.innerHTML = '<div class="submenu-empty-state">No recently closed windows</div>';
      }
    } else if (windowsList && this.isPrivate) {
      windowsList.innerHTML = '<div class="submenu-empty-state">Not available in private mode</div>';
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('click', async(event: MouseEvent)=> {
      await window.BrowserAPI.hideOptionsMenu(this.appWindowId);
    });

    this.optionsElement?.querySelector('#new-tab-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.NEW_TAB, true);
    });

    this.optionsElement?.querySelector('#new-window-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createNewAppWindow();
    });

    this.optionsElement?.querySelector('#new-private-window-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createNewPrivateAppWindow();
    });

    this.optionsElement?.querySelector('#open-pdf-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.openPdfFile(this.appWindowId);
    });

    this.optionsElement?.querySelector('#find-in-page-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.showFindInPage(this.appWindowId);
    });

    this.optionsElement?.querySelector('#downloads-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.DOWNLOADS, true);
    });

    this.optionsElement?.querySelector('#history-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.HISTORY, true);
    });

    this.optionsElement?.querySelector('#bookmarks-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.BOOKMARKS, true);
    });


    this.optionsElement?.querySelector('#settings-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.BROWSER_SETTINGS, true);
    });

    this.optionsElement?.querySelector('#about-nav0-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.ABOUT, true);
    });

    this.optionsElement?.querySelector('#about-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.showAboutPanel();
    });

    this.optionsElement?.querySelector('#philosophy-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, 'https://nav0.org/guide/philosophy', true);
      await window.BrowserAPI.hideOptionsMenu(this.appWindowId);
    });

    this.optionsElement?.querySelector('#terms-of-use-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, 'https://nav0.org/guide/terms-of-use', true);
      await window.BrowserAPI.hideOptionsMenu(this.appWindowId);
    });

    this.optionsElement?.querySelector('#disclaimer-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, 'https://nav0.org/guide/disclaimer', true);
      await window.BrowserAPI.hideOptionsMenu(this.appWindowId);
    });

  }
  public toggleOptionsVisibility(): void {
    this.optionsElement?.classList.toggle('show');
  }

  public getOptionsElement(): HTMLElement | null {
    return this.optionsElement;
  }

  public setActiveTabId(tabId: string): void {
    this.activeTabId = tabId;
  }
}
