import { RendererToMainEventsForBrowserIPC } from "../../constants/app-constants";
import { AppMenuManager } from "./app-menu-manager";
import { AppWindow } from "./app-window";
import { ipcMain, Menu } from "electron";
import { Tab } from "./tab";
import { DatabaseManager } from "../database/database-manager";

export abstract class AppWindowManager {
  private static windows: Map<string, AppWindow>;
  private static activeWindowId: string | null;

  public static async init() {
    AppWindowManager.windows = new Map();
    AppWindowManager.activeWindowId = null;
    DatabaseManager.init();
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
        const newTab = window.createTab(url, activateNewTab);
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

    ipcMain.on(RendererToMainEventsForBrowserIPC.CREATE_NEW_APP_WINDOW, async (event) => {
      AppWindowManager.createWindow(false);
    });

    ipcMain.on(RendererToMainEventsForBrowserIPC.CREATE_NEW_PRIVATE_APP_WINDOW, async (event) => {
      AppWindowManager.createWindow(true);
    });

  }
}