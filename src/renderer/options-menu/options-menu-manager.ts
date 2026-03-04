import { InAppUrls } from '../../constants/app-constants';

export class OptionsMenuManager {
  private optionsElement: HTMLElement | null = null;
  private appWindowId: string;
  private activeTabId: string | null = null;

  constructor() {
    this.appWindowId = window.BrowserAPI.appWindowId;
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
      document.getElementById('new-private-window-shortcut').textContent = '⌘+⇧+N';
      document.getElementById('find-in-page-shortcut').textContent = '⌘+F';
      document.getElementById('downloads-shortcut').textContent = '⌘+⇧+D';
      document.getElementById('history-shortcut').textContent = '⌘+⇧+H';
      document.getElementById('bookmarks-shortcut').textContent = '⌘+⇧+B';
      document.getElementById('browser-settings-shortcut').textContent = '⌘+⇧+,';
    } else {
      document.getElementById('new-tab-shortcut').textContent = 'Ctrl+T';
      document.getElementById('new-window-shortcut').textContent = 'Ctrl+N';
      document.getElementById('new-private-window-shortcut').textContent = 'Ctrl+⇧+N';
      document.getElementById('find-in-page-shortcut').textContent = 'Ctrl+F';
      document.getElementById('downloads-shortcut').textContent = 'Ctrl+⇧+D';
      document.getElementById('history-shortcut').textContent = 'Ctrl+⇧+H';
      document.getElementById('bookmarks-shortcut').textContent = 'Ctrl+⇧+B';
      document.getElementById('browser-settings-shortcut').textContent = 'Ctrl+⇧+,';
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

    this.optionsElement?.querySelector('#history-show-all-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.HISTORY, true);
    });

    // Populate history submenu on hover
    const historyMenuItem = this.optionsElement?.querySelector('#history-menu-item');
    historyMenuItem?.addEventListener('mouseenter', async () => {
      await this.populateRecentlyClosedTabs();
      await this.populateRecentlyClosedWindows();
    });

    this.optionsElement?.querySelector('#bookmarks-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.BOOKMARKS, true);
    });


    this.optionsElement?.querySelector('#settings-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.BROWSER_SETTINGS, true);
    });

    this.optionsElement?.querySelector('#about-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.showAboutPanel();
    });

  }

  private async populateRecentlyClosedTabs(): Promise<void> {
    const container = document.getElementById('recently-closed-tabs-container');
    const emptyState = document.getElementById('no-recently-closed-tabs');
    if (!container) return;

    // Clear existing dynamic entries
    container.querySelectorAll('.recently-closed-tab-item').forEach(el => el.remove());

    if (window.BrowserAPI.isPrivate) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    const closedTabs = await window.BrowserAPI.fetchRecentlyClosedTabs(this.appWindowId);

    if (!closedTabs || closedTabs.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    for (const tab of closedTabs) {
      const item = document.createElement('div');
      item.className = 'recently-closed-tab-item';

      if (tab.faviconUrl) {
        const favicon = document.createElement('img');
        favicon.className = 'tab-favicon';
        favicon.src = tab.faviconUrl;
        favicon.onerror = () => { favicon.style.display = 'none'; };
        item.appendChild(favicon);
      }

      const title = document.createElement('span');
      title.className = 'tab-title';
      title.textContent = tab.title || tab.url;
      title.title = tab.url;
      item.appendChild(title);

      item.addEventListener('click', async () => {
        await window.BrowserAPI.createTab(this.appWindowId, tab.url, true);
        await window.BrowserAPI.hideOptionsMenu(this.appWindowId);
      });

      container.appendChild(item);
    }
  }

  private async populateRecentlyClosedWindows(): Promise<void> {
    const container = document.getElementById('recently-closed-windows-container');
    const emptyState = document.getElementById('no-recently-closed-windows');
    if (!container) return;

    // Clear existing dynamic entries
    container.querySelectorAll('.recently-closed-window-item').forEach(el => el.remove());

    if (window.BrowserAPI.isPrivate) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    const closedWindows = await window.BrowserAPI.fetchRecentlyClosedWindows();

    if (!closedWindows || closedWindows.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    for (const win of closedWindows) {
      const item = document.createElement('div');
      item.className = 'recently-closed-window-item';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'window-icon';
      iconSpan.textContent = '🪟';
      item.appendChild(iconSpan);

      // Build display: show domains from tabs
      const domains = win.tabs
        .map((t: { url: string }) => { try { return new URL(t.url).hostname; } catch { return null; } })
        .filter(Boolean)
        .slice(0, 3);
      const displayText = domains.join(', ');

      const info = document.createElement('span');
      info.className = 'window-info';
      info.textContent = displayText || 'Window';
      info.title = win.tabs.map((t: { title: string }) => t.title).join(', ');
      item.appendChild(info);

      const count = document.createElement('span');
      count.className = 'tab-count';
      count.textContent = `${win.tabCount} tab${win.tabCount !== 1 ? 's' : ''}`;
      item.appendChild(count);

      item.addEventListener('click', async () => {
        await window.BrowserAPI.reopenClosedWindow(win.id);
        await window.BrowserAPI.hideOptionsMenu(this.appWindowId);
      });

      container.appendChild(item);
    }
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