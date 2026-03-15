import { contextBridge, ipcRenderer } from 'electron';
import { MainToRendererEventsForBrowserIPC, RendererToMainEventsForBrowserIPC, RendererToMainEventsForDataStoreIPC } from '../constants/app-constants';

export function init(){
  const appWindowId = process.argv.find(arg => arg.startsWith('--app-window-id='))?.split('=')[1];
  const tabId = process.argv.find(arg => arg.startsWith('--tab-id='))?.split('=')[1];
  const isPrivate = process.argv.find(arg => arg.startsWith('--is-private='))?.split('=')[1] === 'true' || false;
  const platform = process.platform;

  contextBridge.exposeInMainWorld('DataStoreAPI', {
    appWindowId: appWindowId,
    isPrivate,
    platform,
    get: (storeName: string): Promise<any> => {
      return ipcRenderer.invoke(RendererToMainEventsForDataStoreIPC.STORE_GET, storeName);
    },
    set: async (storeName: string, value: any): Promise<any> => {
      return ipcRenderer.invoke(RendererToMainEventsForDataStoreIPC.STORE_SET, storeName, value);
    },
  });

  contextBridge.exposeInMainWorld('BrowserAPI', {
    appWindowId: appWindowId,
    isPrivate,
    platform,
    tabId: tabId,
    createTab: async (appWindowId: string, url: string, activateNewTab: boolean) => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.CREATE_TAB, appWindowId, url, activateNewTab);
    },
    activateTab: async (appWindowId: string, tabId: string, isUserInitiated: boolean) => { 
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.ACTIVATE_TAB, appWindowId, tabId, isUserInitiated);
    },
    closeTab: async (appWindowId: string, tabId: string, isUserInitiated: boolean) => { 
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.CLOSE_TAB, appWindowId, tabId, isUserInitiated);
    },
    getActiveAppWindowId: async () => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.GET_ACTIVE_APP_WINDOW_ID);
    },
    navigate: async (appWindowId: string, tabId: string, url: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.NAVIGATE, appWindowId, tabId, url);
    },
    goBack: async (appWindowId: string, tabId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.GO_BACK, appWindowId, tabId);
    },
    goForward: async (appWindowId: string, tabId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.GO_FORWARD, appWindowId, tabId);
    },
    refreshTab: async (appWindowId: string, tabId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.REFRESH, appWindowId, tabId);
    },
    hardReloadTab: async (appWindowId: string, tabId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.HARD_RELOAD, appWindowId, tabId);
    },
    addBookmark: async (appWindowId: string, title: string, url: string, faviconUrl: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.ADD_BOOKMARK, appWindowId, title, url, faviconUrl);
    },
    removeBookmark: async (appWindowId: string, bookmarkId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.REMOVE_BOOKMARK,appWindowId, bookmarkId);
    },
    removeAllBookmarks: async (appWindowId: string, ) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.REMOVE_ALL_BOOKMARKS, appWindowId);
    },
    fetchBookmarks: async (appWindowId: string, searchTerm: string, limit: number, offset: number) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.FETCH_BOOKMARK, appWindowId, searchTerm, limit, offset);
    },
    removeDownload: async (appWindowId: string, downloadId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.REMOVE_DOWNLOAD, appWindowId, downloadId);
    },
    removeAllDownloads: async (appWindowId: string, ) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.REMOVE_ALL_DOWNLOADS, appWindowId);
    },
    fetchDownloads: async (appWindowId: string, searchTerm: string, limit: number, offset: number) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.FETCH_DOWNLOAD, appWindowId, searchTerm, limit, offset);
    },
    fetchActiveDownloads: async () => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.FETCH_ACTIVE_DOWNLOADS);
    },
    pauseDownload: async (downloadId: string, appWindowId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.PAUSE_DOWNLOAD, downloadId, appWindowId);
    },
    resumeDownload: async (downloadId: string, appWindowId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.RESUME_DOWNLOAD, downloadId, appWindowId);
    },
    cancelDownload: async (downloadId: string, appWindowId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.CANCEL_DOWNLOAD, downloadId, appWindowId);
    },
    openDownloadedFile: async (filePath: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.OPEN_DOWNLOADED_FILE, filePath);
    },
    removeBrowsingHistory: async (appWindowId: string, historyId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.REMOVE_BROWSING_HISTORY, appWindowId, historyId);
    },
    removeAllBrowsingHistory: async (appWindowId: string, ) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.REMOVE_ALL_BROWSING_HISTORY, appWindowId);
    },
    fetchBrowsingHistory: async (appWindowId: string, searchTerm: string, limit: number, offset: number) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.FETCH_BROWSING_HISTORY, appWindowId, searchTerm, limit, offset);
    },
    fetchBrowsingHistoryByDate: async (appWindowId: string, dateString: string, searchTerm: string, limit: number, offset: number) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.FETCH_BROWSING_HISTORY_BY_DATE, appWindowId, dateString, searchTerm, limit, offset);
    },
    handleFileSelection: async (appWindowId: string, tabId: string, extensions: string[]) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.HANDLE_FILE_SELECTION, appWindowId, tabId, extensions);
    },
    openPdfFile: async (appWindowId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.OPEN_PDF_FILE, appWindowId);
    },
    updateBrowserViewBounds: async (appWindowId: string, bounds: { x: number, y: number, width: number, height: number }) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.UPDATE_BROWSER_VIEW_BOUNDS, appWindowId, bounds);
    },
    closeAppWindow: async (appWindowId: string) => { 
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.CLOSE_WINDOW, appWindowId);
    },
    showOptionsMenu: async (appWindowId: string) => { 
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.SHOW_OPTIONS_MENU, appWindowId);
    },
    hideOptionsMenu: async (appWindowId: string) => { 
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.HIDE_OPTIONS_MENU, appWindowId);
    },
    showCommandKOverlay: async (appWindowId: string) => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.SHOW_COMMAND_K_OVERLAY, appWindowId);
    },
    hideCommandKOverlay: async (appWindowId: string) => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.HIDE_COMMAND_K_OVERLAY, appWindowId);
    },
    showCommandOOverlay: async (appWindowId: string) => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.SHOW_COMMAND_O_OVERLAY, appWindowId);
    },
    hideCommandOOverlay: async (appWindowId: string) => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.HIDE_COMMAND_O_OVERLAY, appWindowId);
    },
    fetchAllWindowsTabs: async (isPrivate: boolean) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.FETCH_ALL_WINDOWS_TABS, isPrivate);
    },
    showFindInPage: async (appWindowId: string) => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.SHOW_FIND_IN_PAGE, appWindowId);
    },
    hideFindInPage: async (appWindowId: string) => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.HIDE_FIND_IN_PAGE, appWindowId);
    },
    findInPage: async (appWindowId: string, text: string, options?: { matchCase?: boolean }) => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.FIND_IN_PAGE, appWindowId, text, options);
    },
    findInPageNext: async (appWindowId: string, text: string, options?: { matchCase?: boolean }) => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.FIND_IN_PAGE_NEXT, appWindowId, text, options);
    },
    findInPagePrevious: async (appWindowId: string, text: string, options?: { matchCase?: boolean }) => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.FIND_IN_PAGE_PREVIOUS, appWindowId, text, options);
    },
    stopFindInPage: async (appWindowId: string) => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.STOP_FIND_IN_PAGE, appWindowId);
    },
    createNewAppWindow: async () => { 
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.CREATE_NEW_APP_WINDOW, {});
    },
    createNewPrivateAppWindow: async () => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.CREATE_NEW_PRIVATE_APP_WINDOW, {});
    },
    printPage: async (appWindowId: string) => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.PRINT_PAGE, appWindowId);
    },
    showTabContextMenu: (appWindowId: string, tabId: string, isPinned: boolean) => {
      ipcRenderer.send(RendererToMainEventsForBrowserIPC.SHOW_TAB_CONTEXT_MENU, appWindowId, tabId, isPinned);
    },
    showAboutPanel: async () => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.SHOW_ABOUT_PANEL);
    },
    getAboutInfo: async () => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.GET_ABOUT_INFO);
    },
    getSearchUrl: async (searchTerm: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.GET_SEARCH_URL, searchTerm);
    },
    fetchOpenTabs: async (appWindowId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.FETCH_OPEN_TABS, appWindowId);
    },
    fetchRecentlyClosedTabs: async (appWindowId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.FETCH_RECENTLY_CLOSED_TABS, appWindowId);
    },
    restoreClosedTab: async (appWindowId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.RESTORE_CLOSED_TAB, appWindowId);
    },
    restoreClosedTabByIndex: async (appWindowId: string, index: number) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.RESTORE_CLOSED_TAB_BY_INDEX, appWindowId, index);
    },
    fetchClosedWindows: async () => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.FETCH_CLOSED_WINDOWS);
    },
    restoreClosedWindow: async (index: number) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.RESTORE_CLOSED_WINDOW, index);
    },
    toggleReaderMode: async (appWindowId: string, tabId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.TOGGLE_READER_MODE, appWindowId, tabId);
    },
    setDarkMode: (appWindowId: string, enabled: boolean) => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.SET_DARK_MODE, appWindowId, enabled);
    },
    applySettings: async () => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.APPLY_SETTINGS);
    },
    clearBrowsingData: async (options: any) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.CLEAR_BROWSING_DATA, options);
    },
    getCookieCount: async () => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.GET_COOKIE_COUNT);
    },
    getStorageEstimate: async () => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.GET_STORAGE_ESTIMATE);
    },

    // Event listeners
    onNewTabCreated: (callback: (tab: {id: string, url: string, title: string}) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.NEW_TAB_CREATED, (_event, tab) => callback(tab));
    },
    onTabActivated: (callback: (tab: {id: string, url: string}) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.TAB_ACTIVATED, (_event, tab) => callback(tab));
    },
    onTabClosed: (callback: (data: { id: string }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.TAB_CLOSED, (_event, data) => callback(data));
    },
    onTabTitleUpdated: (callback: (data: { id: string, title: string }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.TAB_TITLE_UPDATED, (_event, data) => callback(data));
    },
    onTabFaviconUpdated: (callback: (data: { id: string, faviconUrl: string }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.TAB_FAVICON_UPDATED, (_event, data) => callback(data));
    },
    onTabUrlUpdated: (callback: (data: { id: string, url: string, isBookmark: boolean, bookmarkId: string | null, canGoBack: boolean, canGoForward: boolean }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.TAB_URL_UPDATED, (_event, data) => callback(data));
    },
    onNavigationFailed: (callback: (data: { id: string }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.NAVIGATION_FAILED, (_event, data) => callback(data));
    },
    onDownloadStarted: (callback: (data: { downloadId: string, dbRecordId: string, fileName: string, totalBytes: number }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.DOWNLOAD_STARTED, (_event, data) => callback(data));
    },
    onDownloadProgress: (callback: (data: { downloadId: string, receivedBytes: number, totalBytes: number }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.DOWNLOAD_PROGRESS, (_event, data) => callback(data));
    },
    onDownloadCompleted: (callback: (data: { downloadId: string, state: string, fileName: string, dbRecordId: string }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.DOWNLOAD_COMPLETED, (_event, data) => callback(data));
    },
    onDownloadPaused: (callback: (data: { downloadId: string, fileName: string }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.DOWNLOAD_PAUSED, (_event, data) => callback(data));
    },
    onDownloadResumed: (callback: (data: { downloadId: string, fileName: string }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.DOWNLOAD_RESUMED, (_event, data) => callback(data));
    },
    onReaderModeAvailabilityChanged: (callback: (data: { id: string, isEligible: boolean }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.READER_MODE_AVAILABILITY_CHANGED, (_event, data) => callback(data));
    },
    onReaderModeStateChanged: (callback: (data: { id: string, isActive: boolean }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.READER_MODE_STATE_CHANGED, (_event, data) => callback(data));
    },
    onFindInPageResult: (callback: (data: { activeMatchOrdinal: number, matches: number, finalUpdate: boolean }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.FIND_IN_PAGE_RESULT, (_event, data) => callback(data));
    },
    onTabLoadingChanged: (callback: (data: { id: string, isLoading: boolean }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.TAB_LOADING_CHANGED, (_event, data) => callback(data));
    },
    onTabPinned: (callback: (data: { id: string }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.TAB_PINNED, (_event, data) => callback(data));
    },
    onTabUnpinned: (callback: (data: { id: string }) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.TAB_UNPINNED, (_event, data) => callback(data));
    },

    // Permission system
    respondToPermissionPrompt: (appWindowId: string, requestId: string, decision: string) => {
      ipcRenderer.send(RendererToMainEventsForBrowserIPC.PERMISSION_PROMPT_RESPONSE, appWindowId, requestId, decision);
    },
    onPermissionPromptShow: (callback: (data: any) => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.SHOW_PERMISSION_PROMPT, (_event, data) => callback(data));
    },
    signalPermissionPromptReady: () => {
      ipcRenderer.send(RendererToMainEventsForBrowserIPC.PERMISSION_PROMPT_READY);
    },
    onPermissionPromptHide: (callback: () => void) => {
      ipcRenderer.on(MainToRendererEventsForBrowserIPC.HIDE_PERMISSION_PROMPT, () => callback());
    },
    fetchPermissions: async (searchTerm?: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.FETCH_PERMISSIONS, searchTerm);
    },
    removePermission: async (permissionId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.REMOVE_PERMISSION, permissionId);
    },
    removeAllPermissionsForOrigin: async (origin: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.REMOVE_ALL_PERMISSIONS_FOR_ORIGIN, origin);
    },
    clearAllPermissions: async () => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.CLEAR_ALL_PERMISSIONS);
    },

    // Issue report
    showIssueReport: async (appWindowId: string) => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.SHOW_ISSUE_REPORT, appWindowId);
    },
    hideIssueReport: async (appWindowId: string) => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.HIDE_ISSUE_REPORT, appWindowId);
    },
  });
}


init();