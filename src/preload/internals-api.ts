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
    removeBrowsingHistory: async (appWindowId: string, historyId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.REMOVE_BROWSING_HISTORY, appWindowId, historyId);
    },
    removeAllBrowsingHistory: async (appWindowId: string, ) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.REMOVE_ALL_BROWSING_HISTORY, appWindowId);
    },
    fetchBrowsingHistory: async (appWindowId: string, searchTerm: string, limit: number, offset: number) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.FETCH_BROWSING_HISTORY, appWindowId, searchTerm, limit, offset);
    },
    handleFileSelection: async (appWindowId: string, tabId: string, extensions: string[]) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.HANDLE_FILE_SELECTION, appWindowId, tabId, extensions);
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
    createNewAppWindow: async () => { 
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.CREATE_NEW_APP_WINDOW, {});
    },
    createNewPrivateAppWindow: async () => {
      return ipcRenderer.send(RendererToMainEventsForBrowserIPC.CREATE_NEW_PRIVATE_APP_WINDOW, {});
    },
    getSearchUrl: async (searchTerm: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.GET_SEARCH_URL, searchTerm);
    },
    fetchOpenTabs: async (appWindowId: string) => {
      return ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.FETCH_OPEN_TABS, appWindowId);
    },
    // executeJavaScript: (code: string) => ipcRenderer.invoke('execute-javascript', code),
    // captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
    // saveScreenshot: (dataUrl: string) => ipcRenderer.invoke('save-screenshot', dataUrl),
    
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
  });
}


init();