import { Tab } from "./tab";
import { InAppUrls } from "../../constants/app-constants";

export class BrowserTabManager {
  // DOM Elements
  private tabsContainer: HTMLElement;
  private tabScrollLeftButton: HTMLButtonElement;
  private tabScrollRightButton: HTMLButtonElement;
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
  private downloadsButton: HTMLButtonElement;
  private downloadProgressRing: SVGElement;
  private downloadProgressFill: SVGCircleElement;
  private readerModeButton: HTMLButtonElement;
  private darkModeButton: HTMLButtonElement;
  private darkModeIconMoon: HTMLElement;
  private darkModeIconSun: HTMLElement;
  private sslIndicator: HTMLButtonElement;

  // State
  private tabs: Tab[] = [];
  private activeDownloads: Map<string, { receivedBytes: number, totalBytes: number }> = new Map();
  private activeTabId: string | null = null;
  private appWindowId: string | null = null;
  private isPrivate = false;

  constructor() {
    this.appWindowId = window.BrowserAPI.appWindowId;
    this.isPrivate = window.BrowserAPI.isPrivate;

    if(this.isPrivate){
      document.body.classList.add('is-private');
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
    this.tabScrollLeftButton = document.getElementById('tab-scroll-left') as HTMLButtonElement;
    this.tabScrollRightButton = document.getElementById('tab-scroll-right') as HTMLButtonElement;
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
    this.downloadsButton = document.getElementById('downloads-button') as HTMLButtonElement;
    this.downloadProgressRing = document.getElementById('download-progress-ring') as unknown as SVGElement;
    this.downloadProgressFill = document.querySelector('.download-progress-ring-fill') as unknown as SVGCircleElement;
    this.readerModeButton = document.getElementById('reader-mode-button') as HTMLButtonElement;
    this.darkModeButton = document.getElementById('dark-mode-button') as HTMLButtonElement;
    this.darkModeIconMoon = document.getElementById('dark-mode-icon-moon') as HTMLElement;
    this.darkModeIconSun = document.getElementById('dark-mode-icon-sun') as HTMLElement;
    this.sslIndicator = document.getElementById('ssl-indicator') as HTMLButtonElement;

    this.initDarkMode();
    this.setupSSLIndicator();
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

    // Reader mode button
    this.readerModeButton.addEventListener('click', () => {
      window.BrowserAPI.toggleReaderMode(this.appWindowId, this.activeTabId);
    });

    // URL input - navigate on Enter key
    this.urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.navigateToURL();
      }
    });

    this.downloadsButton.addEventListener('click', () => {
      window.BrowserAPI.createTab(this.appWindowId, InAppUrls.DOWNLOADS, true);
    });

    this.darkModeButton.addEventListener('click', () => {
      this.toggleDarkMode();
    });

    this.optionsButton.addEventListener('click', async() => {
      await window.BrowserAPI.showOptionsMenu(this.appWindowId);
    });

    // Tab scroll buttons
    this.tabScrollLeftButton.addEventListener('click', () => {
      this.tabsContainer.scrollBy({ left: -200, behavior: 'smooth' });
    });

    this.tabScrollRightButton.addEventListener('click', () => {
      this.tabsContainer.scrollBy({ left: 200, behavior: 'smooth' });
    });

    // Update scroll arrow visibility on scroll and resize
    this.tabsContainer.addEventListener('scroll', () => this.updateTabScrollButtons());
    new ResizeObserver(() => this.updateTabScrollButtons()).observe(this.tabsContainer);
  }

  private setupIpcListeners(): void {
    window.BrowserAPI.onNewTabCreated((tab: {id: string, url: string, title: string}) => {
      if(!this.getTabById(tab.id)){
        this.tabs.push(new Tab(tab.id, tab.url, tab.title));
        this.getTabById(tab.id)?.createTabElement(this.appWindowId);
        this.tabsContainer.appendChild(this.getTabById(tab.id)?.getTabElement());
        this.updateTabScrollButtons();
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
      this.updateReaderModeButton();
      this.updateSSLIndicator();
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
    window.BrowserAPI.onTabUrlUpdated((data: { id: string, url: string, isBookmark: boolean, bookmarkId: string | null, canGoBack: boolean, canGoForward: boolean, sslStatus?: string, sslDetails?: { issuer: string; validFrom: string; validTo: string; subjectName: string } | null }) => {
      const tab = this.getTabById(data.id);
      if (tab) {
        tab.handleUrlChange(data.url, data.isBookmark, data.bookmarkId, data.canGoBack, data.canGoForward);
        tab.sslStatus = (data.sslStatus as 'secure' | 'insecure' | 'internal') || 'internal';
        tab.sslDetails = data.sslDetails || null;
      }
      if (data.id === this.activeTabId) {
        this.urlInput.value = data.url;
        this.backButton.disabled = !data.canGoBack;
        this.forwardButton.disabled = !data.canGoForward;
        this.handleBookmark();
        this.updateSSLIndicator();
      }
    });

    window.BrowserAPI.onTabFaviconUpdated((data: { id: string, faviconUrl: string }) => {
      this.getTabById(data.id)?.updateTabFavicon(data.faviconUrl);
    });

    // Tab loading state changed
    window.BrowserAPI.onTabLoadingChanged((data: { id: string, isLoading: boolean }) => {
      this.getTabById(data.id)?.setLoading(data.isLoading);
    });

    // Download progress tracking
    window.BrowserAPI.onDownloadStarted((data: { downloadId: string, fileName: string, totalBytes: number }) => {
      this.activeDownloads.set(data.downloadId, { receivedBytes: 0, totalBytes: data.totalBytes });
      this.updateDownloadProgress();
    });

    window.BrowserAPI.onDownloadProgress((data: { downloadId: string, receivedBytes: number, totalBytes: number }) => {
      const download = this.activeDownloads.get(data.downloadId);
      if (download) {
        download.receivedBytes = data.receivedBytes;
        download.totalBytes = data.totalBytes;
      }
      this.updateDownloadProgress();
    });

    window.BrowserAPI.onDownloadCompleted((data: { downloadId: string }) => {
      this.activeDownloads.delete(data.downloadId);
      this.updateDownloadProgress();
    });

    // Reader mode availability changed
    window.BrowserAPI.onReaderModeAvailabilityChanged((data: { id: string, isEligible: boolean }) => {
      const tab = this.getTabById(data.id);
      if (tab) {
        tab.isReaderModeEligible = data.isEligible;
        if (data.id === this.activeTabId) {
          this.updateReaderModeButton();
        }
      }
    });

    // Tab pinned
    window.BrowserAPI.onTabPinned((data: { id: string }) => {
      const tab = this.getTabById(data.id);
      if (tab) {
        tab.pinTab();
        this.reorderPinnedTabs();
      }
    });

    // Tab unpinned
    window.BrowserAPI.onTabUnpinned((data: { id: string }) => {
      const tab = this.getTabById(data.id);
      if (tab) {
        tab.unpinTab();
        this.reorderPinnedTabs();
      }
    });

    // Reader mode state changed
    window.BrowserAPI.onReaderModeStateChanged((data: { id: string, isActive: boolean }) => {
      const tab = this.getTabById(data.id);
      if (tab) {
        tab.isReaderModeActive = data.isActive;
        if (data.id === this.activeTabId) {
          this.updateReaderModeButton();
        }
      }
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

  private updateReaderModeButton(): void {
    const activeTab = this.getTabById(this.activeTabId);
    if (!activeTab || !activeTab.isReaderModeEligible) {
      this.readerModeButton.style.display = 'none';
      return;
    }
    this.readerModeButton.style.display = 'block';
    if (activeTab.isReaderModeActive) {
      this.readerModeButton.classList.add('active');
      this.readerModeButton.title = 'Exit Reader Mode';
    } else {
      this.readerModeButton.classList.remove('active');
      this.readerModeButton.title = 'Reader Mode';
    }
  }

  private removeTab(tabId: string): void {
    const tabToBeClosed = this.getTabById(tabId);
    this.tabs = this.tabs.filter(tab => tab.id !== tabId);

    if (tabToBeClosed?.getTabElement()) {
      this.tabsContainer.removeChild(tabToBeClosed.getTabElement());
    }

    this.updateTabScrollButtons();

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

    this.scrollActiveTabIntoView();
  }

  private navigateToURL(): void {
    const url = this.urlInput.value.trim();
    if (url) {
      window.BrowserAPI.navigate(this.appWindowId, this.activeTabId, url);
    }
  }

  private updateDownloadProgress(): void {
    if (this.activeDownloads.size === 0) {
      this.downloadProgressRing.style.display = 'none';
      return;
    }

    this.downloadProgressRing.style.display = 'block';

    let totalReceived = 0;
    let totalSize = 0;
    this.activeDownloads.forEach((dl) => {
      totalReceived += dl.receivedBytes;
      totalSize += dl.totalBytes;
    });

    const progress = totalSize > 0 ? totalReceived / totalSize : 0.5;
    const circumference = 2 * Math.PI * 14; // 87.9646
    const offset = circumference * (1 - progress);
    this.downloadProgressFill.style.strokeDashoffset = offset.toString();
  }

  private initDarkMode(): void {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      this.darkModeIconMoon.style.display = 'none';
      this.darkModeIconSun.style.display = 'block';
      // Sync dark mode state to main process for web page injection
      window.BrowserAPI.setDarkMode(this.appWindowId, true);
    }
  }

  private toggleDarkMode(): void {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      this.darkModeIconMoon.style.display = 'block';
      this.darkModeIconSun.style.display = 'none';
      window.BrowserAPI.setDarkMode(this.appWindowId, false);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      this.darkModeIconMoon.style.display = 'none';
      this.darkModeIconSun.style.display = 'block';
      window.BrowserAPI.setDarkMode(this.appWindowId, true);
    }
  }

  private updateTabScrollButtons(): void {
    const { scrollLeft, scrollWidth, clientWidth } = this.tabsContainer;
    const canScrollLeft = scrollLeft > 0;
    const canScrollRight = scrollLeft + clientWidth < scrollWidth - 1;

    this.tabScrollLeftButton.classList.toggle('visible', canScrollLeft);
    this.tabScrollRightButton.classList.toggle('visible', canScrollRight);
  }

  private reorderPinnedTabs(): void {
    const pinnedTabs = this.tabs.filter(t => t.isPinned);
    const unpinnedTabs = this.tabs.filter(t => !t.isPinned);
    this.tabs = [...pinnedTabs, ...unpinnedTabs];

    // Reorder DOM elements
    for (const tab of this.tabs) {
      const el = tab.getTabElement();
      if (el) {
        this.tabsContainer.appendChild(el);
      }
    }
  }

  private scrollActiveTabIntoView(): void {
    if (!this.activeTabId) return;
    const activeTab = this.getTabById(this.activeTabId);
    const el = activeTab?.getTabElement();
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }

  // Inline SVG strings for SSL indicator icons (avoids Lucide element replacement issues)
  private static readonly SSL_ICON_SEARCH = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
  private static readonly SSL_ICON_SECURE = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  private static readonly SSL_ICON_INSECURE = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

  private setupSSLIndicator(): void {
    this.sslIndicator.addEventListener('click', () => {
      const activeTab = this.getTabById(this.activeTabId);
      if (!activeTab) return;
      const url = activeTab.url;
      const isNewTab = !url || url === '' || url.startsWith('Nav0://');
      if (isNewTab) return;
      window.BrowserAPI.showSSLInfo(this.appWindowId, {
        sslStatus: activeTab.sslStatus,
        sslDetails: activeTab.sslDetails,
        url: activeTab.url,
      });
    });
  }

  private updateSSLIndicator(): void {
    const activeTab = this.getTabById(this.activeTabId);
    if (!activeTab) return;

    const url = activeTab.url;
    const isNewTab = !url || url === '' || url.startsWith('Nav0://');
    const sslStatus = activeTab.sslStatus || 'internal';

    // Remove all state classes
    this.sslIndicator.classList.remove('ssl-search', 'ssl-secure', 'ssl-insecure');

    if (isNewTab) {
      this.sslIndicator.innerHTML = BrowserTabManager.SSL_ICON_SEARCH;
      this.sslIndicator.classList.add('ssl-search');
      this.sslIndicator.title = 'Search';
    } else if (sslStatus === 'secure') {
      this.sslIndicator.innerHTML = BrowserTabManager.SSL_ICON_SECURE;
      this.sslIndicator.classList.add('ssl-secure');
      this.sslIndicator.title = 'Connection is secure';
    } else if (sslStatus === 'insecure') {
      this.sslIndicator.innerHTML = BrowserTabManager.SSL_ICON_INSECURE;
      this.sslIndicator.classList.add('ssl-insecure');
      this.sslIndicator.title = 'Connection is not secure';
    } else {
      // Internal pages - show lock (these are local safe pages)
      this.sslIndicator.innerHTML = BrowserTabManager.SSL_ICON_SECURE;
      this.sslIndicator.classList.add('ssl-search');
      this.sslIndicator.title = 'Internal page';
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
