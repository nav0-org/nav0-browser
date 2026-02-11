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
      removeBrowsingHistory: (appWindowId: string, historyId: string) => Promise<any>;
      removeAllBrowsingHistory: (appWindowId: string) => Promise<any>;
      fetchBrowsingHistory: (appWindowId: string, searchTerm: string, limit: number, offset: number) => Promise<any>;
      handleFileSelection: (appWindowId: string, tabId: string, extensions: string[]) => Promise<string[] | null>;
      

      updateBrowserViewBounds: (appWindowId: string, bounds: { x: number, y: number, width: number, height: number }) => Promise<any>;
      closeAppWindow: (appWindowId: string) => Promise<any>;
      createNewAppWindow: () => Promise<any>;
      createNewPrivateAppWindow: () => Promise<any>;

      showOptionsMenu: (appWindowId: string) => Promise<any>;
      hideOptionsMenu: (appWindowId: string) => Promise<any>;

      showCommandKOverlay: (appWindowId: string) => Promise<any>;
      hideCommandKOverlay: (appWindowId: string) => Promise<any>;
      
      // Event listeners
      onNewTabCreated: (callback: (tab: {id: string, url: string, title: string}) => void) => void;
      onTabActivated: (callback: (tab: {id: string, url: string}) => void) => void;
      onTabClosed: (callback: (data: { id: string }) => void) => void;
      onTabTitleUpdated: (callback: (data: { id: string, title: string }) => void) => void;
      onTabUrlUpdated: (callback: (data: { id: string, url: string, isBookmark: boolean, bookmarkId: string | null, canGoBack: boolean, canGoForward: boolean }) => void) => void;
      onTabFaviconUpdated: (callback: (data: { id: string, faviconUrl: string }) => void) => void;
      onNavigationFailed: (callback: (data: { id: string }) => void) => void;
    };
  }
}