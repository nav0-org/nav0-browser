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
      document.getElementById('new-private-window-shortcut').textContent = '⌘+⇧+T';
      document.getElementById('ai-summary-shortcut').textContent = '⌘+⇧+A+I';
      document.getElementById('add-to-knowledge-hub-shortcut').textContent = '⌘+⇧+=';
      document.getElementById('find-in-page-shortcut').textContent = '⌘+F';
      document.getElementById('downloads-shortcut').textContent = '⌘+⇧+D';
      document.getElementById('history-shortcut').textContent = '⌘+⇧+H';
      document.getElementById('bookmarks-shortcut').textContent = '⌘+⇧+B';
      document.getElementById('browser-settings-shortcut').textContent = '⌘+⇧+,';
      document.getElementById('ai-settings-shortcut').textContent = '⌘+⇧+.';
    } else {
      document.getElementById('new-tab-shortcut').textContent = 'Ctrl+T';
      document.getElementById('new-window-shortcut').textContent = 'Ctrl+N';
      document.getElementById('new-private-window-shortcut').textContent = 'Ctrl+⇧+T';
      document.getElementById('ai-summary-shortcut').textContent = 'Ctrl+⇧+A+I';
      document.getElementById('add-to-knowledge-hub-shortcut').textContent = 'Ctrl+⇧+=';
      document.getElementById('find-in-page-shortcut').textContent = 'Ctrl+F';
      document.getElementById('downloads-shortcut').textContent = 'Ctrl+⇧+D';
      document.getElementById('history-shortcut').textContent = 'Ctrl+⇧+H';
      document.getElementById('bookmarks-shortcut').textContent = 'Ctrl+⇧+B';
      document.getElementById('browser-settings-shortcut').textContent = 'Ctrl+⇧+,';
      document.getElementById('ai-settings-shortcut').textContent = 'Ctrl+⇧+.';
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

    this.optionsElement?.querySelector('#ai-summary-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.generateAISummary(this.appWindowId, this.activeTabId, '');
    });

    this.optionsElement?.querySelector('#add-to-knowledge-hub-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.addToKnowledgeHub(this.appWindowId, this.activeTabId);
    });

    this.optionsElement?.querySelector('#find-in-page-option')?.addEventListener('click', async () => {
      //@todo: implement this
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

    this.optionsElement?.querySelector('#about-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.ABOUT, true);
    });

    this.optionsElement?.querySelector('#privacy-policy-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.PRIVACY_POLICY, true);
    });

    this.optionsElement?.querySelector('#terms-of-service-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.EULA, true);
    });

    this.optionsElement?.querySelector('#help-center-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.HELP_CENTER, true);
    });

    this.optionsElement?.querySelector('#report-issue-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.REPORT_ISSUE, true);
    });

    this.optionsElement?.querySelector('#settings-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.BROWSER_SETTINGS, true);
    });

    this.optionsElement?.querySelector('#ai-settings-option')?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(this.appWindowId, InAppUrls.AI_SETTINGS, true);
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