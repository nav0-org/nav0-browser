import { DataStoreConstants, InAppUrls, SessionState, SessionWindowRecord } from "../../constants/app-constants";
import { DataStoreManager } from "../database/data-store-manager";
import { AppWindowManager } from "./app-window-manager";

export abstract class SessionManager {
  private static periodicSaveTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly PERIODIC_SAVE_INTERVAL_MS = 60 * 1000; // 60 seconds

  public static startPeriodicSave(): void {
    if (SessionManager.periodicSaveTimer) return;
    SessionManager.periodicSaveTimer = setInterval(() => {
      SessionManager.saveCurrentSession();
    }, SessionManager.PERIODIC_SAVE_INTERVAL_MS);
  }

  public static stopPeriodicSave(): void {
    if (SessionManager.periodicSaveTimer) {
      clearInterval(SessionManager.periodicSaveTimer);
      SessionManager.periodicSaveTimer = null;
    }
  }

  public static saveCurrentSession(): void {
    const windows = AppWindowManager.getWindows();
    const sessionWindows: SessionWindowRecord[] = [];

    for (const win of windows) {
      if (win.isPrivate) continue;

      const tabs = win.getTabs();
      const activeTabId = win.getActiveTabId();

      const filteredTabs: { url: string; title: string; faviconUrl: string | null; isActive: boolean }[] = [];
      for (const tab of tabs) {
        const url = tab.getUrl();
        if (!url || url === '' || url.startsWith(InAppUrls.PREFIX)) continue;
        filteredTabs.push({
          url,
          title: tab.getTitle(),
          faviconUrl: tab.getFaviconUrl(),
          isActive: tab.getId() === activeTabId,
        });
      }

      if (filteredTabs.length === 0) continue;

      let activeTabIndex = filteredTabs.findIndex(t => t.isActive);
      if (activeTabIndex === -1) activeTabIndex = 0;

      sessionWindows.push({
        tabs: filteredTabs.map(t => ({ url: t.url, title: t.title, faviconUrl: t.faviconUrl })),
        activeTabIndex,
      });
    }

    if (sessionWindows.length === 0) {
      SessionManager.clearSession();
      return;
    }

    const sessionState: SessionState = {
      windows: sessionWindows,
      savedAt: Date.now(),
      restored: false,
    };

    DataStoreManager.set(DataStoreConstants.SESSION_STATE, sessionState);
  }

  public static getSavedSession(): SessionState | null {
    const data = DataStoreManager.get(DataStoreConstants.SESSION_STATE);
    if (!data || data.restored || !data.windows || data.windows.length === 0) {
      return null;
    }
    return data as SessionState;
  }

  public static markSessionRestored(): void {
    const data = DataStoreManager.get(DataStoreConstants.SESSION_STATE);
    if (data) {
      data.restored = true;
      DataStoreManager.set(DataStoreConstants.SESSION_STATE, data);
    }
  }

  public static clearSession(): void {
    DataStoreManager.set(DataStoreConstants.SESSION_STATE, null);
  }

  public static async restoreSession(): Promise<boolean> {
    const session = SessionManager.getSavedSession();
    if (!session) return false;

    for (const windowRecord of session.windows) {
      if (windowRecord.tabs.length === 0) continue;

      const newWindow = AppWindowManager.createWindow(false);
      await newWindow.whenReady();

      // Navigate the default tab to the first restored URL
      const defaultTabs = newWindow.getTabs();
      if (defaultTabs.length > 0) {
        defaultTabs[0].navigate(windowRecord.tabs[0].url);
      }

      // Create remaining tabs — active tab loads, others are suspended
      for (let i = 1; i < windowRecord.tabs.length; i++) {
        const tabRecord = windowRecord.tabs[i];
        if (i === windowRecord.activeTabIndex) {
          await newWindow.createTab(tabRecord.url, false);
        } else {
          newWindow.createSuspendedTab(tabRecord.url, tabRecord.title || 'Restored Tab');
        }
      }

      // Activate the correct tab
      const allTabs = newWindow.getTabs();
      if (windowRecord.activeTabIndex < allTabs.length) {
        newWindow.activateTab(allTabs[windowRecord.activeTabIndex].getId());
      }
    }

    SessionManager.markSessionRestored();
    return true;
  }
}
