export {};

declare global {
  interface Window {
    DataStoreAPI: {
      get: (storeName: string) => Promise<any>;
      set: (storeName: string, value: any) => Promise<boolean>;
    };
  }
}

declare global {
  interface Window {
    BrowserAPI: {
      appWindowId: string;
      isPrivate: boolean;
      platform: string;
      tabId: string;
      createTab: (appWindowId: string, url: string, activateNewTab: boolean) => any;
      activateTab: (appWindowId: string, tabId: string, isUserInitiated: boolean) => any;
      closeTab: (appWindowId: string, tabId: string, isUserInitiated: boolean) => any;
      getActiveAppWindowId: () => Promise<string>;
      navigate: (appWindowId: string, tabId: string, url: string) => Promise<any>;
      goBack: (appWindowId: string, tabId: string) => Promise<any>;
      goForward: (appWindowId: string, tabId: string) => Promise<any>;
      refreshTab: (appWindowId: string, tabId: string) => Promise<any>;
      addBookmark: (appWindowId: string, title: string, url: string, faviconUrl: string) => Promise<any>;
      removeBookmark: (appWindowId: string, bookmarkId: string) => Promise<any>;
      removeAllBookmarks: (appWindowId: string) => Promise<any>;
      fetchBookmarks: (appWindowId: string, searchTerm: string, limit: number, offset: number) => Promise<any>;
      removeDownload: (appWindowId: string, downloadId: string) => Promise<any>;
      removeAllDownloads: (appWindowId: string) => Promise<any>;
      fetchDownloads: (appWindowId: string, searchTerm: string, limit: number, offset: number) => Promise<any>;
      fetchActiveDownloads: () => Promise<Array<{ downloadId: string, fileName: string, receivedBytes: number, totalBytes: number, state: string, dbRecordId: string }>>;
      pauseDownload: (downloadId: string, appWindowId: string) => Promise<boolean>;
      resumeDownload: (downloadId: string, appWindowId: string) => Promise<boolean>;
      cancelDownload: (downloadId: string, appWindowId: string) => Promise<boolean>;
      openDownloadedFile: (filePath: string) => Promise<string>;
      removeBrowsingHistory: (appWindowId: string, historyId: string) => Promise<any>;
      removeAllBrowsingHistory: (appWindowId: string) => Promise<any>;
      fetchBrowsingHistory: (appWindowId: string, searchTerm: string, limit: number, offset: number) => Promise<any>;
      handleFileSelection: (appWindowId: string, tabId: string, extensions: string[]) => Promise<string[] | null>;
      openPdfFile: (appWindowId: string) => Promise<string | null>;

      updateBrowserViewBounds: (appWindowId: string, bounds: { x: number, y: number, width: number, height: number }) => Promise<any>;
      closeAppWindow: (appWindowId: string) => Promise<any>;
      createNewAppWindow: () => Promise<any>;
      createNewPrivateAppWindow: () => Promise<any>;

      showOptionsMenu: (appWindowId: string) => Promise<any>;
      hideOptionsMenu: (appWindowId: string) => Promise<any>;

      showCommandKOverlay: (appWindowId: string) => Promise<any>;
      hideCommandKOverlay: (appWindowId: string) => Promise<any>;
      showFindInPage: (appWindowId: string) => Promise<any>;
      hideFindInPage: (appWindowId: string) => Promise<any>;
      findInPage: (appWindowId: string, text: string, options?: { matchCase?: boolean }) => Promise<any>;
      findInPageNext: (appWindowId: string, text: string, options?: { matchCase?: boolean }) => Promise<any>;
      findInPagePrevious: (appWindowId: string, text: string, options?: { matchCase?: boolean }) => Promise<any>;
      stopFindInPage: (appWindowId: string) => Promise<any>;
      printPage: (appWindowId: string) => Promise<any>;
      showTabContextMenu: (appWindowId: string, tabId: string, isPinned: boolean) => void;
      showAboutPanel: () => Promise<any>;
      getSearchUrl: (searchTerm: string) => Promise<string>;
      fetchOpenTabs: (appWindowId: string) => Promise<Array<{id: string, title: string, url: string, faviconUrl: string | null}>>;
      fetchRecentlyClosedTabs: (appWindowId: string) => Promise<Array<{url: string, title: string, faviconUrl: string | null, closedAt: number}>>;
      restoreClosedTab: (appWindowId: string) => Promise<{id: string, title: string, url: string} | null>;
      restoreClosedTabByIndex: (appWindowId: string, index: number) => Promise<{id: string, title: string, url: string} | null>;
      fetchClosedWindows: () => Promise<Array<{tabCount: number, tabs: Array<{url: string, title: string}>, closedAt: number}>>;
      restoreClosedWindow: (index: number) => Promise<{ok: boolean} | null>;
      toggleReaderMode: (appWindowId: string, tabId: string) => Promise<any>;
      setDarkMode: (appWindowId: string, enabled: boolean) => void;

      // Event listeners
      onNewTabCreated: (callback: (tab: {id: string, url: string, title: string}) => void) => void;
      onTabActivated: (callback: (tab: {id: string, url: string}) => void) => void;
      onTabClosed: (callback: (data: { id: string }) => void) => void;
      onTabTitleUpdated: (callback: (data: { id: string, title: string }) => void) => void;
      onTabUrlUpdated: (callback: (data: { id: string, url: string, isBookmark: boolean, bookmarkId: string | null, canGoBack: boolean, canGoForward: boolean }) => void) => void;
      onTabFaviconUpdated: (callback: (data: { id: string, faviconUrl: string }) => void) => void;
      onNavigationFailed: (callback: (data: { id: string }) => void) => void;
      onDownloadStarted: (callback: (data: { downloadId: string, dbRecordId: string, fileName: string, totalBytes: number }) => void) => void;
      onDownloadProgress: (callback: (data: { downloadId: string, receivedBytes: number, totalBytes: number }) => void) => void;
      onDownloadCompleted: (callback: (data: { downloadId: string, state: string, fileName: string, dbRecordId: string }) => void) => void;
      onDownloadPaused: (callback: (data: { downloadId: string, fileName: string }) => void) => void;
      onDownloadResumed: (callback: (data: { downloadId: string, fileName: string }) => void) => void;
      onReaderModeAvailabilityChanged: (callback: (data: { id: string, isEligible: boolean }) => void) => void;
      onReaderModeStateChanged: (callback: (data: { id: string, isActive: boolean }) => void) => void;
      onFindInPageResult: (callback: (data: { activeMatchOrdinal: number, matches: number, finalUpdate: boolean }) => void) => void;
      onTabLoadingChanged: (callback: (data: { id: string, isLoading: boolean }) => void) => void;
      onTabPinned: (callback: (data: { id: string }) => void) => void;
      onTabUnpinned: (callback: (data: { id: string }) => void) => void;
    };
  }
}