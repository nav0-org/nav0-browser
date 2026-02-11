import { Tab } from "./tab";
import { InAppUrls } from "../../constants/app-constants";

export class BrowserTabManager {
  // DOM Elements
  private tabsContainer: HTMLElement;
  private browserViewContainer: HTMLElement;
  private newTabButton: HTMLButtonElement;
  private backButton: HTMLButtonElement;
  private forwardButton: HTMLButtonElement;
  private refreshButton: HTMLButtonElement;
  private commandKButton: HTMLButtonElement;
  private urlInput: HTMLInputElement;
  private optionsButton: HTMLButtonElement;
  private bookmarkButton: HTMLButtonElement;
  private unbookmarkButton: HTMLButtonElement;

  // State
  private tabs: Tab[] = [];
  private activeTabId: string | null = null;
  private appWindowId: string | null = null;
  private isPrivate = false;

  constructor() {
    this.appWindowId = window.BrowserAPI.appWindowId;
    this.isPrivate = window.BrowserAPI.isPrivate;

    if(!this.isPrivate){
      document.getElementById('private-window-identifier')?.remove();
    }

    document.addEventListener('DOMContentLoaded', () => {
      this.initializeDomElements();
      this.setupEventListeners();
      this.setupIpcListeners();
      
      //to handle resizing
      this.updateBrowserViewBounds();
      window.addEventListener('resize', () => this.updateBrowserViewBounds());
    });

  }

  public getTabById(tabId: string): Tab | undefined {
    return this.tabs.find(tab => tab.id === tabId);
  }

  private initializeDomElements(): void {
    this.tabsContainer = document.getElementById('tabs-container') as HTMLElement;
    this.browserViewContainer = document.getElementById('browser-view-container') as HTMLElement;
    this.newTabButton = document.getElementById('new-tab-button') as HTMLButtonElement;
    this.backButton = document.getElementById('back-button') as HTMLButtonElement;
    this.forwardButton = document.getElementById('forward-button') as HTMLButtonElement;
    this.refreshButton = document.getElementById('refresh-button') as HTMLButtonElement;
    this.commandKButton = document.getElementById('command-k-button') as HTMLButtonElement;
    this.urlInput = document.getElementById('url-input') as HTMLInputElement;
    this.optionsButton = document.getElementById('options-button') as HTMLButtonElement;
    this.bookmarkButton = document.getElementById('bookmark-button') as HTMLButtonElement;
    this.unbookmarkButton = document.getElementById('unbookmark-button') as HTMLButtonElement;
  }

  private setupEventListeners(): void {
    // New tab button
    this.newTabButton.addEventListener('click', async () => {
      window.BrowserAPI.createTab(this.appWindowId, InAppUrls.NEW_TAB, true);
    });
    
    // Back button
    this.backButton.addEventListener('click', () => {
      window.BrowserAPI.goBack(this.appWindowId, this.activeTabId);
    });
    
    // Forward button
    this.forwardButton.addEventListener('click', () => {
      window.BrowserAPI.goForward(this.appWindowId, this.activeTabId);
    });
    
    // Refresh button
    this.refreshButton.addEventListener('click', () => {
      window.BrowserAPI.refreshTab(this.appWindowId, this.activeTabId);
    });

    this.commandKButton.addEventListener('click', () => {
      window.BrowserAPI.showCommandKOverlay(this.appWindowId);
    });

    this.bookmarkButton.addEventListener('click', async () => {
      const activeTab = this.getTabById(this.activeTabId);
      const record = await window.BrowserAPI.addBookmark(this.appWindowId,  activeTab.title, activeTab.url, activeTab.faviconUrl);
      activeTab.isBookmark = true;
      activeTab.bookmarkId = record.id;
      this.handleBookmark();
    });
    this.unbookmarkButton.addEventListener('click', async () => {
      const activeTab = this.getTabById(this.activeTabId);
      await window.BrowserAPI.removeBookmark(this.appWindowId,  activeTab.bookmarkId);
      activeTab.isBookmark = false;
      activeTab.bookmarkId = null;
      this.handleBookmark();
    });
    // URL input - navigate on Enter key
    this.urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.navigateToURL();
      }
    });

    this.optionsButton.addEventListener('click', async() => {
      await window.BrowserAPI.showOptionsMenu(this.appWindowId);
    });
  }

  private setupIpcListeners(): void {
    window.BrowserAPI.onNewTabCreated((tab: {id: string, url: string, title: string}) => {
      if(!this.getTabById(tab.id)){
        this.tabs.push(new Tab(tab.id, tab.url, tab.title));
        this.getTabById(tab.id)?.createTabElement(this.appWindowId);
        this.tabsContainer.appendChild(this.getTabById(tab.id)?.getTabElement());
      }
    });
    
    // Tab activated
    window.BrowserAPI.onTabActivated((data: {id: string, url: string}) => {
      const newActiveTab = this.getTabById(data.id);
      this.activeTabId = data.id;
      this.updateActiveTab();
      this.urlInput.value = newActiveTab.url;
      this.backButton.disabled = !newActiveTab.canGoBack;
      this.forwardButton.disabled = !newActiveTab.canGoForward;
      this.handleBookmark();
    });
    
    // Tab closed
    window.BrowserAPI.onTabClosed((data: { id: string }) => {
      let newActiveTabId;
      if(data.id === this.activeTabId){
        const oldTabIndex = this.tabs.findIndex(tab => tab.id === data.id);
        if(oldTabIndex === 0 && this.tabs.length > 1){
          newActiveTabId = this.tabs[1].id;
        } else if(oldTabIndex > 0){
          newActiveTabId = this.tabs[oldTabIndex - 1].id;
        }
      }

      this.removeTab(data.id);
      if(newActiveTabId){
        window.BrowserAPI.activateTab(this.appWindowId, newActiveTabId, true);
      } else if(this.tabs.length === 0){
        window.BrowserAPI.closeAppWindow(this.appWindowId);
      }
    });
    
    // Tab title updated
    window.BrowserAPI.onTabTitleUpdated((data: { id: string, title: string }) => {
      this.getTabById(data.id)?.updateTabTitle(data.title);
    });
    
    // Tab URL updated
    window.BrowserAPI.onTabUrlUpdated((data: { id: string, url: string, isBookmark: boolean, bookmarkId: string | null, canGoBack: boolean, canGoForward: boolean }) => {
      this.getTabById(data.id)?.handleUrlChange(data.url, data.isBookmark, data.bookmarkId, data.canGoBack, data.canGoForward);
      if (data.id === this.activeTabId) {
        this.urlInput.value = data.url;
        this.backButton.disabled = !data.canGoBack;
        this.forwardButton.disabled = !data.canGoForward;
        this.handleBookmark();
      }
    });

    window.BrowserAPI.onTabFaviconUpdated((data: { id: string, faviconUrl: string }) => {
      this.getTabById(data.id)?.updateTabFavicon(data.faviconUrl);
    });
  }

  private handleBookmark(): void {
    const activeTab = this.getTabById(this.activeTabId);
    if (activeTab) {
      if (activeTab.isBookmark) {
        this.bookmarkButton.style.display = 'none';
        this.unbookmarkButton.style.display = 'block';
      } else {
        this.bookmarkButton.style.display = 'block';
        this.unbookmarkButton.style.display = 'none';
      }
    }
  }

  private removeTab(tabId: string): void {
    const tabToBeClosed = this.getTabById(tabId);
    this.tabs = this.tabs.filter(tab => tab.id !== tabId);
    
    if (tabToBeClosed?.getTabElement()) {
      this.tabsContainer.removeChild(tabToBeClosed.getTabElement());
    }
    
    // if (tabId === this.activeTabId) {
    //   this.activeTabId = this.tabs.length > 0 ? this.tabs[0].id : null;
    //   this.updateActiveTab();
    // }
  }

  private updateActiveTab(): void {
    this.tabs.forEach(tab => {
      if (tab.id === this.activeTabId) {
        tab.activateTab();
      } else {
        tab.deactivateTab();
      }
    });
    
    if (this.activeTabId) {
      const activeTab = this.getTabById(this.activeTabId);
      if (activeTab) {
        this.urlInput.value = activeTab.url;
        this.handleBookmark();
        this.backButton.disabled = !activeTab.canGoBack;
        this.forwardButton.disabled = !activeTab.canGoForward;
      }
    }
  }

  private navigateToURL(): void {
    const url = this.urlInput.value.trim();
    if (url) {
      window.BrowserAPI.navigate(this.appWindowId, this.activeTabId, url);
    }
  }

  private updateBrowserViewBounds(): void {
    const rect = this.browserViewContainer.getBoundingClientRect();
    window.BrowserAPI.updateBrowserViewBounds(this.appWindowId,{
      x: 0,
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    });
  }
}