import { ClosedWindowRecord, RendererToMainEventsForBrowserIPC, DataStoreConstants } from "../../constants/app-constants";
import { AppMenuManager } from "./app-menu-manager";
import { AppWindow } from "./app-window";
import { app, dialog, ipcMain, Menu } from "electron";
import { Tab } from "./tab";
import { DatabaseManager } from "../database/database-manager";
import { DataStoreManager } from "../database/data-store-manager";
import { SearchEngine } from "../web/search-engine";
import { PermissionManager, PermissionRequest } from "./permission-manager";
import { PermissionPromptData } from "./permission-prompt-overlay-manager";

export abstract class AppWindowManager {
  private static windows: Map<string, AppWindow>;
  private static activeWindowId: string | null;
  private static readonly MAX_CLOSED_WINDOWS = 3;

  public static async init() {
    AppWindowManager.windows = new Map();
    AppWindowManager.activeWindowId = null;
    DatabaseManager.init();
    PermissionManager.init(DatabaseManager.getDatabase(false));
    PermissionManager.setCallbacks(
      (appWindowId: string, request: PermissionRequest) => {
        const window = AppWindowManager.getWindowById(appWindowId);
        if (window) {
          const promptData: PermissionPromptData = {
            requestId: request.id,
            origin: request.origin,
            permissions: request.permissions,
            isSecure: request.isSecure,
            isPrivate: request.isPrivate,
            faviconUrl: request.faviconUrl,
            isInsecureBlocked: request.isInsecureBlocked,
            isFloodBlocked: request.isFloodBlocked,
          };
          window.showPermissionPromptOverlay(promptData);
        }
      },
      (appWindowId: string) => {
        const window = AppWindowManager.getWindowById(appWindowId);
        if (window) {
          window.hidePermissionPromptOverlay();
        }
      },
      (webContentsId: number) => {
        for (const window of AppWindowManager.windows.values()) {
          const tab = window.findTabByWebContentsId(webContentsId);
          if (tab) {
            return { appWindowId: window.id, tabId: tab.id, isPrivate: window.isPrivate };
          }
        }
        return null;
      }
    );
    AppWindowManager.createWindow();
    AppWindowManager.initIPCHandlers();
    AppMenuManager.init();
  }
  static createWindow(isPrivate = false): AppWindow {
    const window = new AppWindow(isPrivate, DatabaseManager.getDatabase(isPrivate));
    AppWindowManager.windows.set(window.id, window);
    AppWindowManager.activateWindow(window.id);
    return window;
  }
  static closeWindow(id: string): void {
    let window: AppWindow | null = null;
    let clearSession = false;
    if (id) {
      window = AppWindowManager.getWindowById(id);
    } else {
      window = AppWindowManager.getActiveWindow();
    }
    if (window) {
      // Track closed window data (not private windows)
      if (!window.isPrivate) {
        const tabCount = window.getTabCount();
        const tabs = window.getTabSummaries();
        if (tabCount > 0) {
          AppWindowManager.recordClosedWindow({ tabCount, tabs, closedAt: Date.now() });
        }
      }
      const remainingPrivateWindows: Array<AppWindow> = [];
      AppWindowManager.windows.forEach(element => {
        if(element.isPrivate && element.id != id){
          remainingPrivateWindows.push(element);
        }
      });
      if(window.isPrivate && remainingPrivateWindows.length === 0){
        clearSession = true;
      }
      window.closeWindow(clearSession);
    }
    AppWindowManager.windows.delete(id);
    if (AppWindowManager.activeWindowId === id) {
      AppWindowManager.activeWindowId = null;
    }
  }

  private static recordClosedWindow(record: ClosedWindowRecord): void {
    let closedWindows = AppWindowManager.getClosedWindows();
    closedWindows.push(record);
    if (closedWindows.length > AppWindowManager.MAX_CLOSED_WINDOWS) {
      closedWindows = closedWindows.slice(-AppWindowManager.MAX_CLOSED_WINDOWS);
    }
    DataStoreManager.set(DataStoreConstants.CLOSED_WINDOWS, closedWindows);
  }

  static getClosedWindows(): ClosedWindowRecord[] {
    const data = DataStoreManager.get(DataStoreConstants.CLOSED_WINDOWS);
    if (Array.isArray(data)) return data;
    return [];
  }
  static activateWindow(id: string): void {
    if (AppWindowManager.windows.has(id)) {
      AppWindowManager.activeWindowId = id;
    }
    AppWindowManager.getWindowById(id).getBrowserWindowInstance().focus();
  }
  static getActiveWindow(): AppWindow | null {
    if (AppWindowManager.activeWindowId) {
      return AppWindowManager.windows.get(AppWindowManager.activeWindowId) || null;
    }
    return null;
  }
  static getWindows(): AppWindow[] {
    return Array.from(AppWindowManager.windows.values());
  }
  static getActiveWindowId(): string | null {
    return AppWindowManager.activeWindowId;
  }
  static setActiveWindowId(id: string): void {
    if (AppWindowManager.windows.has(id)) {
      AppWindowManager.activeWindowId = id;
    }
  }

  static getWindowById(id: string): AppWindow | null {
    return AppWindowManager.windows.get(id) || null;
  }

  static initIPCHandlers(): void {
    ipcMain.on(RendererToMainEventsForBrowserIPC.CREATE_TAB, async (event, appWindowId: string, url: string, activateNewTab: boolean) => {
      let window: AppWindow | null = null;
      if (appWindowId) {
        window = AppWindowManager.getWindowById(appWindowId);
      } else {
        window = AppWindowManager.getActiveWindow();
      }
      if (window) {
        const newTab = await window.createTab(url, activateNewTab);
        return { id : newTab.id, title: newTab.getTitle(), url: newTab.getUrl() };
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.ACTIVATE_TAB, async (event, appWindowId: string, tabId: string, isUserInitiated: boolean) => {
      const window = AppWindowManager.getWindowById(appWindowId);
      if (window) {
        window.activateTab(tabId, isUserInitiated);
        return { };
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.CLOSE_TAB, async (event, appWindowId: string, tabId: string, isUserInitiated: boolean) => {
      const window = AppWindowManager.getWindowById(appWindowId);
      if (window) {
        window.closeTab(tabId, isUserInitiated);
        return { };
      }
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.GET_ACTIVE_APP_WINDOW_ID, async (event) => {
      return { activeWindowId: AppWindowManager.activeWindowId };
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.NAVIGATE, async (event, appWindowId: string | null, tabId: string | null, url: string) => {
      let appWindow: AppWindow;
      let tab: Tab;
      if(appWindowId){
        appWindow = AppWindowManager.getWindowById(appWindowId)
      } else {
        appWindow = AppWindowManager.getActiveWindow();
      }
      if(appWindow && tabId){
        tab = AppWindowManager.getWindowById(appWindowId).getTabById(tabId);
      } else if (appWindow){
        tab = appWindow.getActiveTab(); 
      }
      if (tab) {
        return tab.navigate(url);
      }
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.GO_BACK, async (event, appWindowId: string, tabId: string) => {
      let appWindow: AppWindow;
      let tab: Tab;
      if(appWindowId){
        appWindow = AppWindowManager.getWindowById(appWindowId)
      } else {
        appWindow = AppWindowManager.getActiveWindow();
      }
      if(appWindow && tabId){
        tab = AppWindowManager.getWindowById(appWindowId).getTabById(tabId);
      } else if (appWindow){
        tab = appWindow.getActiveTab(); 
      }

      if (tab?.getWebContentsViewInstance().webContents.navigationHistory.canGoBack()) {
        return tab.getWebContentsViewInstance().webContents.navigationHistory.goBack();
      }
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.GO_FORWARD, async (event, appWindowId: string, tabId: string) => {
      let appWindow: AppWindow;
      let tab: Tab;
      if(appWindowId){
        appWindow = AppWindowManager.getWindowById(appWindowId)
      } else {
        appWindow = AppWindowManager.getActiveWindow();
      }
      if(appWindow && tabId){
        tab = AppWindowManager.getWindowById(appWindowId).getTabById(tabId);
      } else if (appWindow){
        tab = appWindow.getActiveTab(); 
      }
      
      if (tab?.getWebContentsViewInstance().webContents.navigationHistory.canGoForward()) {
        return tab.getWebContentsViewInstance().webContents.navigationHistory.goForward();
      }
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.REFRESH, async (event, appWindowId: string, tabId: string) => {
      let appWindow: AppWindow;
      let tab: Tab;
      if(appWindowId){
        appWindow = AppWindowManager.getWindowById(appWindowId)
      } else {
        appWindow = AppWindowManager.getActiveWindow();
      }
      if(appWindow && tabId){
        tab = AppWindowManager.getWindowById(appWindowId).getTabById(tabId);
      } else if (appWindow){
        tab = appWindow.getActiveTab(); 
      }

      if (tab) {
        return tab.getWebContentsViewInstance().webContents.reload();
      }
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.UPDATE_BROWSER_VIEW_BOUNDS, async (event, appWindowId: string, bounds: { x: number, y: number, width: number, height: number }) => {
      let window: AppWindow | null = null;
      if (appWindowId) {
        window = AppWindowManager.getWindowById(appWindowId);
      } else {
        window = AppWindowManager.getActiveWindow();
      }
      if (window) {
        return window.updateViewBounds(bounds);
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.CLOSE_WINDOW, async (event, appWindowId: string) => {
      AppWindowManager.closeWindow(appWindowId);
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.SHOW_OPTIONS_MENU, async (event, appWindowId: string) => {
      let window: AppWindow | null = null;
      if (appWindowId) {
        window = AppWindowManager.getWindowById(appWindowId);
      } else {
        window = AppWindowManager.getActiveWindow();
      }
      if (window) {
        return window.showOptionsMenuOverlay();
      }
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.HANDLE_FILE_SELECTION, async (event, appWindowId: string, tabId: string, extensions: string[]): Promise<string[] | null> => {
      let window: AppWindow | null = null;
      if (appWindowId) {
        window = AppWindowManager.getWindowById(appWindowId);
      } else {
        window = AppWindowManager.getActiveWindow();
      }
      if (tabId) {
        return window.getTabById(tabId).handleFileSelection(extensions)
      } else {
        return window.getActiveTab().handleFileSelection(extensions)
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.HIDE_OPTIONS_MENU, async (event, appWindowId: string) => {
      let window: AppWindow | null = null;
      if (appWindowId) {
        window = AppWindowManager.getWindowById(appWindowId);
      } else {
        window = AppWindowManager.getActiveWindow();
      }
      if (window) {
        return window.hideOptionsMenuOverlay();
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.SHOW_COMMAND_K_OVERLAY, async (event, appWindowId: string) => {
      let window: AppWindow | null = null;
      if (appWindowId) {
        window = AppWindowManager.getWindowById(appWindowId);
      } else {
        window = AppWindowManager.getActiveWindow();
      }
      if (window) {
        return window.showCommandKOverlay();
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.HIDE_COMMAND_K_OVERLAY, async (event, appWindowId: string) => {
      let window: AppWindow | null = null;
      if (appWindowId) {
        window = AppWindowManager.getWindowById(appWindowId);
      } else {
        window = AppWindowManager.getActiveWindow();
      }
      if (window) {
        return window.hideCommandKOverlay();
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.SHOW_FIND_IN_PAGE, async (event, appWindowId: string) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (window) {
        return window.showFindInPage();
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.HIDE_FIND_IN_PAGE, async (event, appWindowId: string) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (window) {
        return window.hideFindInPage();
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.FIND_IN_PAGE, async (event, appWindowId: string, text: string, options?: { matchCase?: boolean }) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (window) {
        window.findInPage(text, options);
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.FIND_IN_PAGE_NEXT, async (event, appWindowId: string, text: string, options?: { matchCase?: boolean }) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (window) {
        window.findInPageNext(text, options);
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.FIND_IN_PAGE_PREVIOUS, async (event, appWindowId: string, text: string, options?: { matchCase?: boolean }) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (window) {
        window.findInPagePrevious(text, options);
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.STOP_FIND_IN_PAGE, async (event, appWindowId: string) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (window) {
        window.stopFindInPage();
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.SHOW_ABOUT_PANEL, async () => {
      app.showAboutPanel();
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.CREATE_NEW_APP_WINDOW, async (event) => {
      AppWindowManager.createWindow(false);
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.CREATE_NEW_PRIVATE_APP_WINDOW, async (event) => {
      AppWindowManager.createWindow(true);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.GET_SEARCH_URL, async (event, searchTerm: string) => {
      return await SearchEngine.getSearchUrl(searchTerm);
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.SET_DARK_MODE, async (event, appWindowId: string, enabled: boolean) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (window) {
        await window.setDarkMode(enabled);
      }
      // Also apply to all other windows
      for (const w of AppWindowManager.windows.values()) {
        if (w.id !== window?.id) {
          await w.setDarkMode(enabled);
        }
      }
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.TOGGLE_READER_MODE, async (event, appWindowId: string, tabId: string) => {
      const window = AppWindowManager.getWindowById(appWindowId);
      if (window) {
        const tab = tabId ? window.getTabById(tabId) : window.getActiveTab();
        if (tab) {
          await tab.toggleReaderMode();
        }
      }
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.FETCH_OPEN_TABS, async (event, appWindowId: string) => {
      let window: AppWindow | null = null;
      if (appWindowId) {
        window = AppWindowManager.getWindowById(appWindowId);
      } else {
        window = AppWindowManager.getActiveWindow();
      }
      if (window) {
        return window.getTabs().map(tab => ({
          id: tab.getId(),
          title: tab.getTitle(),
          url: tab.getUrl(),
          faviconUrl: tab.getFaviconUrl(),
        }));
      }
      return [];
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.FETCH_RECENTLY_CLOSED_TABS, async (event, appWindowId: string) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (window) {
        return window.getRecentlyClosedTabs();
      }
      return [];
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.RESTORE_CLOSED_TAB, async (event, appWindowId: string) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (window) {
        const tab = await window.restoreLastClosedTab();
        if (tab) {
          return { id: tab.getId(), title: tab.getTitle(), url: tab.getUrl() };
        }
      }
      return null;
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.FETCH_CLOSED_WINDOWS, async () => {
      return AppWindowManager.getClosedWindows().reverse();
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.OPEN_PDF_FILE, async (event, appWindowId: string) => {
      let window: AppWindow | null = null;
      if (appWindowId) {
        window = AppWindowManager.getWindowById(appWindowId);
      } else {
        window = AppWindowManager.getActiveWindow();
      }
      if (!window) return null;

      const result = await dialog.showOpenDialog(window.getBrowserWindowInstance(), {
        properties: ['openFile'],
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      });

      if (result.canceled || result.filePaths.length === 0) return null;

      const filePath = result.filePaths[0];
      const fileUrl = `file://${filePath}`;
      await window.createTab(fileUrl, true);
      return fileUrl;
    });

  }
}