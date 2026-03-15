import { ClosedTabRecord, ClosedWindowRecord, RendererToMainEventsForBrowserIPC, MainToRendererEventsForBrowserIPC, DataStoreConstants } from "../../constants/app-constants";
import { AppMenuManager } from "./app-menu-manager";
import { AppWindow } from "./app-window";
import { app, dialog, ipcMain, Menu } from "electron";
import { Tab } from "./tab";
import { DatabaseManager } from "../database/database-manager";
import { DataStoreManager } from "../database/data-store-manager";
import { SearchEngine } from "../web/search-engine";
import { PermissionManager, PermissionRequest } from "./permission-manager";
import { PermissionPromptData } from "./permission-prompt-overlay-manager";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export abstract class AppWindowManager {
  private static windows: Map<string, AppWindow>;
  private static activeWindowId: string | null;
  private static readonly MAX_CLOSED_WINDOWS = 3;
  private static closedTabs: ClosedTabRecord[] = [];
  private static readonly MAX_CLOSED_TABS = 10;

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
  static createWindow(isPrivate = false, initialUrls?: string[]): AppWindow {
    const window = new AppWindow(isPrivate, DatabaseManager.getDatabase(isPrivate), initialUrls);
    AppWindowManager.windows.set(window.id, window);
    AppWindowManager.activateWindow(window.id);

    // Record tabs when the native window close event fires (OS close button, Alt+F4, etc.)
    const browserWindow = window.getBrowserWindowInstance();
    if (browserWindow) {
      browserWindow.on('focus', () => {
        AppWindowManager.setActiveWindowId(window.id);
      });
      browserWindow.on('close', () => {
        AppWindowManager.recordWindowTabs(window);
        // Clear pending timers on all tabs to prevent callbacks after window removal
        for (const tab of window.getTabs()) {
          tab.clearPendingTimers();
        }
      });
      browserWindow.on('closed', () => {
        AppWindowManager.windows.delete(window.id);
        if (AppWindowManager.activeWindowId === window.id) {
          AppWindowManager.activeWindowId = null;
        }
      });
    }

    return window;
  }

  private static recordWindowTabs(window: AppWindow): void {
    if (window.isPrivate) return;
    // Avoid double-recording if already recorded
    if ((window as any)._tabsRecorded) return;
    (window as any)._tabsRecorded = true;

    const tabCount = window.getTabCount();
    const tabs = window.getTabSummaries();
    if (tabCount > 0) {
      AppWindowManager.recordClosedWindow({ tabCount, tabs, closedAt: Date.now() });
    }
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
      // Record tabs before closing (the 'close' event handler will also try,
      // but the _tabsRecorded flag prevents double-recording)
      AppWindowManager.recordWindowTabs(window);

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

  static removeClosedWindowByIndex(reverseIndex: number): ClosedWindowRecord | null {
    const closedWindows = AppWindowManager.getClosedWindows();
    // The list is displayed reversed (most-recent-first), so convert index
    const actualIndex = closedWindows.length - 1 - reverseIndex;
    if (actualIndex < 0 || actualIndex >= closedWindows.length) return null;
    const removed = closedWindows.splice(actualIndex, 1)[0];
    DataStoreManager.set(DataStoreConstants.CLOSED_WINDOWS, closedWindows);
    return removed || null;
  }

  static recordClosedTab(record: ClosedTabRecord): void {
    AppWindowManager.closedTabs.push(record);
    if (AppWindowManager.closedTabs.length > AppWindowManager.MAX_CLOSED_TABS) {
      AppWindowManager.closedTabs = AppWindowManager.closedTabs.slice(-AppWindowManager.MAX_CLOSED_TABS);
    }
  }

  static getRecentlyClosedTabs(): ClosedTabRecord[] {
    return [...AppWindowManager.closedTabs].reverse();
  }

  static popLastClosedTab(): ClosedTabRecord | null {
    return AppWindowManager.closedTabs.pop() || null;
  }

  static removeClosedTabByIndex(reverseIndex: number): ClosedTabRecord | null {
    // reverseIndex is the index in the reversed (most-recent-first) list
    const actualIndex = AppWindowManager.closedTabs.length - 1 - reverseIndex;
    if (actualIndex < 0 || actualIndex >= AppWindowManager.closedTabs.length) return null;
    return AppWindowManager.closedTabs.splice(actualIndex, 1)[0] || null;
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
        const closedRecord = window.closeTab(tabId, isUserInitiated);
        if (closedRecord) {
          AppWindowManager.recordClosedTab(closedRecord);
        }
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

    ipcMain.handle(RendererToMainEventsForBrowserIPC.HARD_RELOAD, async (event, appWindowId: string, tabId: string) => {
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
        const webContents = tab.getWebContentsViewInstance().webContents;
        const session = webContents.session;
        const currentUrl = webContents.getURL();

        try {
          // Extract origin from the current URL for site-specific clearing
          const origin = new URL(currentUrl).origin;

          // Clear all storage data (cookies, localStorage, sessionStorage, indexedDB, service workers, cache storage) for this origin
          await session.clearStorageData({ origin });

          // Clear HTTP cache and code caches globally (Electron doesn't support per-origin HTTP cache clearing)
          await session.clearCache();
          await session.clearCodeCaches({});
        } catch (e) {
          // If URL parsing fails (e.g. about: pages), clear all caches
          await session.clearCache();
          await session.clearCodeCaches({});
        }

        // Reload ignoring any remaining in-memory cache
        return webContents.reloadIgnoringCache();
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

    ipcMain.on(RendererToMainEventsForBrowserIPC.SHOW_COMMAND_O_OVERLAY, async (event, appWindowId: string) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (window) {
        return window.showCommandOOverlay();
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.HIDE_COMMAND_O_OVERLAY, async (event, appWindowId: string) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (window) {
        return window.hideCommandOOverlay();
      }
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.FETCH_ALL_WINDOWS_TABS, async (event, isPrivate: boolean) => {
      const result: Array<{ windowId: string; windowName: string; isPrivate: boolean; tabs: Array<{ id: string; title: string; url: string; faviconUrl: string | null; isActive: boolean }> }> = [];
      let windowIndex = 0;
      for (const window of AppWindowManager.windows.values()) {
        if (window.isPrivate !== isPrivate) continue;
        const activeTabId = window.getActiveTabId();
        const tabs = window.getTabs().map(tab => ({
          id: tab.getId(),
          title: tab.getTitle(),
          url: tab.getUrl(),
          faviconUrl: tab.getFaviconUrl(),
          isActive: tab.getId() === activeTabId,
        }));
        const label = window.isPrivate ? `Private Window ${windowIndex + 1}` : `Window ${windowIndex + 1}`;
        result.push({
          windowId: window.id,
          windowName: label,
          isPrivate: window.isPrivate,
          tabs,
        });
        windowIndex++;
      }
      return result;
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

    ipcMain.on(RendererToMainEventsForBrowserIPC.SHOW_ISSUE_REPORT, async (event, appWindowId: string) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (window) {
        return window.showIssueReportOverlay();
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.HIDE_ISSUE_REPORT, async (event, appWindowId: string) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (window) {
        return window.hideIssueReportOverlay();
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.SHOW_ABOUT_PANEL, async () => {
      app.showAboutPanel();
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.GET_ABOUT_INFO, async () => {
      let executableChecksum = '';
      try {
        const execPath = app.getPath('exe');
        const fileBuffer = fs.readFileSync(execPath);
        executableChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      } catch {
        executableChecksum = 'unavailable';
      }

      let asarChecksum = '';
      try {
        const asarPath = path.join(path.dirname(app.getAppPath()), 'app.asar');
        if (fs.existsSync(asarPath)) {
          const asarBuffer = fs.readFileSync(asarPath);
          asarChecksum = crypto.createHash('sha256').update(asarBuffer).digest('hex');
        } else {
          asarChecksum = 'not packaged (dev mode)';
        }
      } catch {
        asarChecksum = 'unavailable';
      }

      return {
        appVersion: app.getVersion(),
        electronVersion: process.versions.electron,
        chromiumVersion: process.versions.chrome,
        nodeVersion: process.versions.node,
        v8Version: process.versions.v8,
        platform: process.platform,
        arch: process.arch,
        osVersion: process.getSystemVersion(),
        appPath: app.getAppPath(),
        executableChecksum,
        asarChecksum,
      };
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
      if (!window || window.isPrivate) return [];
      return AppWindowManager.getRecentlyClosedTabs();
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.RESTORE_CLOSED_TAB, async (event, appWindowId: string) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (!window || window.isPrivate) return null;
      const closedTab = AppWindowManager.popLastClosedTab();
      if (!closedTab) return null;
      const tab = await window.createTab(closedTab.url, true);
      return { id: tab.getId(), title: tab.getTitle(), url: tab.getUrl() };
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.RESTORE_CLOSED_TAB_BY_INDEX, async (event, appWindowId: string, index: number) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (!window || window.isPrivate) return null;
      const closedTab = AppWindowManager.removeClosedTabByIndex(index);
      if (!closedTab) return null;
      const tab = await window.createTab(closedTab.url, true);
      return { id: tab.getId(), title: tab.getTitle(), url: tab.getUrl() };
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.FETCH_CLOSED_WINDOWS, async () => {
      return AppWindowManager.getClosedWindows().reverse();
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.RESTORE_CLOSED_WINDOW, async (event, index: number) => {
      const closedWindow = AppWindowManager.removeClosedWindowByIndex(index);
      if (!closedWindow || !closedWindow.tabs || closedWindow.tabs.length === 0) return null;
      const restoredUrls = closedWindow.tabs.filter(t => t.url && t.url !== '' && !t.url.startsWith('nav0://'));
      if (restoredUrls.length === 0) return null;
      // Pass URLs directly so the window creates the right tabs from the start
      // (avoids issues with navigating or closing the default new-tab)
      const newWindow = AppWindowManager.createWindow(false, restoredUrls.map(t => t.url));
      await newWindow.whenReady();
      return { ok: true };
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.PRINT_PAGE, async (event, appWindowId: string) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (!window) return;
      const activeTab = window.getActiveTab();
      if (!activeTab) return;
      activeTab.getWebContentsViewInstance().webContents.print();
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.SHOW_TAB_CONTEXT_MENU, async (event, appWindowId: string, tabId: string, isPinned: boolean) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (!window) return;
      const tab = window.getTabById(tabId);
      if (!tab) return;

      const webContents = tab.getWebContentsViewInstance().webContents;
      const isMuted = webContents.isAudioMuted();

      const template: Electron.MenuItemConstructorOptions[] = [
        {
          label: isPinned ? 'Unpin Tab' : 'Pin Tab',
          click: () => {
            if (isPinned) {
              window.getBrowserWindowInstance()?.webContents.send(MainToRendererEventsForBrowserIPC.TAB_UNPINNED, { id: tabId });
            } else {
              window.getBrowserWindowInstance()?.webContents.send(MainToRendererEventsForBrowserIPC.TAB_PINNED, { id: tabId });
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Reload Tab',
          click: () => {
            webContents.reload();
          },
        },
        {
          label: 'Duplicate Tab',
          click: () => {
            const url = tab.getUrl();
            window.createTab(url, true);
          },
        },
        {
          label: 'Print...',
          click: () => {
            webContents.print();
          },
        },
        { type: 'separator' },
        {
          label: isMuted ? 'Unmute Site' : 'Mute Site',
          click: () => {
            webContents.setAudioMuted(!isMuted);
          },
        },
        { type: 'separator' },
        {
          label: 'Close Tab',
          click: () => {
            const closedRecord = window.closeTab(tabId, true);
            if (closedRecord) {
              AppWindowManager.recordClosedTab(closedRecord);
            }
          },
        },
        {
          label: 'Close Other Tabs',
          enabled: window.getTabs().length > 1,
          click: () => {
            const allTabs = window.getTabs();
            for (const t of allTabs) {
              if (t.getId() !== tabId) {
                const closedRecord = window.closeTab(t.getId(), true);
                if (closedRecord) {
                  AppWindowManager.recordClosedTab(closedRecord);
                }
              }
            }
          },
        },
      ];

      // "Move to Another Window" submenu — only for non-private windows
      if (!window.isPrivate) {
        const otherWindows = AppWindowManager.getWindows().filter(
          (w) => w.id !== window.id && !w.isPrivate
        );

        const moveSubmenu: Electron.MenuItemConstructorOptions[] = [
          {
            label: 'New Window',
            click: async () => {
              const url = tab.getUrl();
              const closedRecord = window.closeTab(tabId, true);
              if (closedRecord) {
                AppWindowManager.recordClosedTab(closedRecord);
              }
              const newWindow = AppWindowManager.createWindow(false, [url]);
              await newWindow.whenReady();
              AppWindowManager.activateWindow(newWindow.id);
            },
          },
        ];

        if (otherWindows.length > 0) {
          moveSubmenu.push({ type: 'separator' });
          for (let index = 0; index < otherWindows.length; index++) {
            const targetWindow = otherWindows[index];
            const activeTab = targetWindow.getActiveTab();
            const label = activeTab ? activeTab.getTitle() || `Window ${index + 1}` : `Window ${index + 1}`;
            moveSubmenu.push({
              label,
              click: async () => {
                const url = tab.getUrl();
                const closedRecord = window.closeTab(tabId, true);
                if (closedRecord) {
                  AppWindowManager.recordClosedTab(closedRecord);
                }
                await targetWindow.createTab(url, true);
                AppWindowManager.activateWindow(targetWindow.id);
              },
            });
          }
        }

        template.splice(-2, 0, {
          label: 'Move to Another Window',
          submenu: moveSubmenu,
        });
      }

      const menu = Menu.buildFromTemplate(template);
      menu.popup({ window: window.getBrowserWindowInstance() });
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