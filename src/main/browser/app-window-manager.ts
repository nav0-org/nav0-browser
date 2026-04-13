import { ClosedTabRecord, ClosedWindowRecord, RendererToMainEventsForBrowserIPC, MainToRendererEventsForBrowserIPC, DataStoreConstants } from "../../constants/app-constants";
import { AppMenuManager } from "./app-menu-manager";
import { AppWindow } from "./app-window";
import { app, dialog, ipcMain, Menu } from "electron";
import { Tab } from "./tab";
import { DatabaseManager } from "../database/database-manager";
import { DataStoreManager } from "../database/data-store-manager";
import { SessionManager } from "./session-manager";
import { SearchEngine } from "../web/search-engine";
import { BrowserSettings, DEFAULT_BROWSER_SETTINGS } from "../../types/settings-types";
import { PermissionManager, PermissionRequest } from "./permission-manager";
import { NotificationManager } from "./notification-manager";
import { PermissionPromptData } from "./app-window";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export abstract class AppWindowManager {
  private static windows: Map<string, AppWindow>;
  private static activeWindowId: string | null;
  private static readonly MAX_CLOSED_WINDOWS = 3;
  private static closedTabs: ClosedTabRecord[] = [];
  private static readonly MAX_CLOSED_TABS = 10;
  private static hibernationTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly HIBERNATION_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  private static readonly HIBERNATION_THRESHOLD_MS = 72 * 60 * 60 * 1000; // 72 hours

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
            tabId: request.tabId,
            origin: request.origin,
            permissions: request.permissions,
            isSecure: request.isSecure,
            isPrivate: request.isPrivate,
            faviconUrl: request.faviconUrl,
            isInsecureBlocked: request.isInsecureBlocked,
            isFloodBlocked: request.isFloodBlocked,
          };
          window.showPermissionPrompt(promptData);
        }
      },
      (appWindowId: string) => {
        const window = AppWindowManager.getWindowById(appWindowId);
        if (window) {
          window.hidePermissionPrompt();
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
    NotificationManager.init();
    NotificationManager.setCallbacks(
      (webContentsId: number) => {
        for (const window of AppWindowManager.windows.values()) {
          const tab = window.findTabByWebContentsId(webContentsId);
          if (tab) {
            return { appWindowId: window.id, tabId: tab.id, isPrivate: window.isPrivate };
          }
        }
        return null;
      },
      (appWindowId: string, tabId: string) => {
        const window = AppWindowManager.getWindowById(appWindowId);
        if (window) {
          const bw = window.getBrowserWindowInstance();
          if (bw) {
            if (bw.isMinimized()) bw.restore();
            bw.focus();
          }
          window.activateTab(tabId);
        }
      }
    );
    const sessionRestored = await SessionManager.restoreSession();
    if (!sessionRestored) {
      AppWindowManager.createWindow();
    }
    AppWindowManager.initIPCHandlers();
    AppMenuManager.init();
    AppWindowManager.startHibernationChecker();
    SessionManager.startPeriodicSave();
  }
  static createWindow(isPrivate = false): AppWindow {
    const window = new AppWindow(isPrivate, DatabaseManager.getDatabase(isPrivate));
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

  private static startHibernationChecker(): void {
    AppWindowManager.hibernationTimer = setInterval(() => {
      AppWindowManager.checkAndHibernateTabs();
    }, AppWindowManager.HIBERNATION_CHECK_INTERVAL_MS);
  }

  private static checkAndHibernateTabs(): void {
    const now = Date.now();
    for (const window of AppWindowManager.windows.values()) {
      const activeTabId = window.getActiveTabId();
      for (const tab of window.getTabs()) {
        if (tab.getId() === activeTabId) continue;
        if (tab.getIsSuspended()) continue;
        const url = tab.getUrl();
        if (!url || url === '' || url.startsWith('Nav0://')) continue;
        if (now - tab.getLastActivatedAt().getTime() > AppWindowManager.HIBERNATION_THRESHOLD_MS) {
          tab.suspend();
        }
      }
    }
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

      if (tab?.getWebContentsViewInstance()?.webContents.navigationHistory.canGoBack()) {
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

      if (tab?.getWebContentsViewInstance()?.webContents.navigationHistory.canGoForward()) {
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

      if (tab && tab.getWebContentsViewInstance()) {
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

      if (tab && tab.getWebContentsViewInstance()) {
        const webContents = tab.getWebContentsViewInstance().webContents;
        const session = webContents.session;

        // Fire cache clearing without awaiting — reloadIgnoringCache already
        // bypasses the HTTP cache at the network level. Awaiting these can hang
        // and prevent the reload from ever executing.
        const currentUrl = webContents.getURL();
        try {
          const origin = new URL(currentUrl).origin;
          session.clearStorageData({ origin }).catch(() => {});
        } catch (_) { /* origin may not be parseable */ }
        session.clearCache().catch(() => {});
        session.clearCodeCaches({}).catch(() => {});

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

    ipcMain.handle(RendererToMainEventsForBrowserIPC.MOVE_TAB_TO_WINDOW, async (event, sourceWindowId: string, tabId: string, targetWindowId: string) => {
      const sourceWindow = AppWindowManager.getWindowById(sourceWindowId);
      const targetWindow = AppWindowManager.getWindowById(targetWindowId);
      if (!sourceWindow || !targetWindow) return { success: false };
      if (sourceWindow.isPrivate || targetWindow.isPrivate) return { success: false };
      if (sourceWindowId === targetWindowId) return { success: false };

      const tab = sourceWindow.getTabs().find(t => t.getId() === tabId);
      if (!tab) return { success: false };

      const url = tab.getUrl();
      const closedRecord = sourceWindow.closeTab(tabId, true);
      if (closedRecord) {
        AppWindowManager.recordClosedTab(closedRecord);
      }
      await targetWindow.createTab(url, true);
      AppWindowManager.activateWindow(targetWindow.id);
      return { success: true };
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

    ipcMain.on(RendererToMainEventsForBrowserIPC.SHOW_SSL_INFO, async (event, appWindowId: string, data: { sslStatus: string; sslDetails: any; url: string }) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (window) {
        return window.showSSLInfoOverlay(data);
      }
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.HIDE_SSL_INFO, async (event, appWindowId: string) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (window) {
        return window.hideSSLInfoOverlay();
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

    ipcMain.handle(RendererToMainEventsForBrowserIPC.TOGGLE_READER_MODE, async (event, appWindowId: string, tabId: string) => {
      const window = AppWindowManager.getWindowById(appWindowId);
      if (window) {
        const tab = tabId ? window.getTabById(tabId) : window.getActiveTab();
        if (tab) {
          await tab.toggleReaderMode();
        }
      }
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.DOWNLOAD_CURRENT_PDF, async (event, appWindowId: string, tabId: string) => {
      const window = AppWindowManager.getWindowById(appWindowId);
      if (window) {
        const tab = tabId ? window.getTabById(tabId) : window.getActiveTab();
        if (tab) {
          tab.downloadCurrentPdf();
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
      const restoredUrls = closedWindow.tabs.filter(t => t.url && t.url !== '' && !t.url.startsWith('Nav0://'));
      if (restoredUrls.length === 0) return null;
      const newWindow = AppWindowManager.createWindow(false);
      // Wait for the window's renderer to load and its default New Tab to be created
      await newWindow.whenReady();
      // Navigate the default tab to the first restored URL instead of closing it
      const defaultTabs = newWindow.getTabs();
      if (defaultTabs.length > 0) {
        defaultTabs[0].navigate(restoredUrls[0].url);
      }
      // Create remaining tabs in suspended state — they load only when activated
      for (let i = 1; i < restoredUrls.length; i++) {
        newWindow.createSuspendedTab(restoredUrls[i].url, restoredUrls[i].title || 'Restored Tab');
      }
      return { ok: true };
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.FETCH_SESSION_STATE, async () => {
      const session = SessionManager.getSavedSession();
      if (!session) return null;
      return {
        windowCount: session.windows.length,
        totalTabCount: session.windows.reduce((sum, w) => sum + w.tabs.length, 0),
        savedAt: session.savedAt,
      };
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.RESTORE_PREVIOUS_SESSION, async () => {
      const restored = await SessionManager.restoreSession();
      return { ok: restored };
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.PRINT_PAGE, async (event, appWindowId: string) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (!window) return;
      const activeTab = window.getActiveTab();
      if (!activeTab || !activeTab.getWebContentsViewInstance()) return;
      activeTab.getWebContentsViewInstance().webContents.print();
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.TOGGLE_DEV_TOOLS, async (event, appWindowId: string) => {
      const settings = DataStoreManager.get(DataStoreConstants.BROWSER_SETTINGS) as BrowserSettings;
      const merged = { ...DEFAULT_BROWSER_SETTINGS, ...settings };
      if (!merged.devToolsEnabled) return;
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (!window) return;
      const activeTab = window.getActiveTab();
      if (!activeTab || !activeTab.getWebContentsViewInstance()) return;
      activeTab.getWebContentsViewInstance().webContents.toggleDevTools();
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.SHOW_TAB_CONTEXT_MENU, async (event, appWindowId: string, tabId: string, isPinned: boolean) => {
      const window = appWindowId ? AppWindowManager.getWindowById(appWindowId) : AppWindowManager.getActiveWindow();
      if (!window) return;
      const tab = window.getTabById(tabId);
      if (!tab) return;

      const view = tab.getWebContentsViewInstance();
      if (!view) return; // Tab is suspended
      const webContents = view.webContents;
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
          label: 'Hard Reload Tab',
          click: () => {
            const webSession = webContents.session;
            const currentUrl = webContents.getURL();
            try {
              const origin = new URL(currentUrl).origin;
              webSession.clearStorageData({ origin }).catch(() => {});
            } catch (_) { /* origin may not be parseable */ }
            webSession.clearCache().catch(() => {});
            webSession.clearCodeCaches({}).catch(() => {});
            webContents.reloadIgnoringCache();
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
              const newWindow = AppWindowManager.createWindow();
              await newWindow.whenReady();
              // Navigate the default tab to the moved tab's URL
              const defaultTabs = newWindow.getTabs();
              if (defaultTabs.length > 0) {
                defaultTabs[0].navigate(url);
              }
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