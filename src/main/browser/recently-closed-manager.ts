import { v4 as uuid } from "uuid";
import { DataStoreConstants } from "../../constants/app-constants";
import { DataStoreManager } from "../database/data-store-manager";
import { ClosedTabRecord, ClosedWindowRecord, ClosedWindowTabInfo } from "../../types/recently-closed-types";

export abstract class RecentlyClosedManager {
  private static readonly MAX_CLOSED_WINDOWS = 3;
  private static readonly MAX_GLOBAL_CLOSED_TABS = 10;

  private static globalRecentlyClosedTabs: ClosedTabRecord[] = [];

  public static addClosedTab(tab: ClosedTabRecord): void {
    RecentlyClosedManager.globalRecentlyClosedTabs.unshift(tab);
    if (RecentlyClosedManager.globalRecentlyClosedTabs.length > RecentlyClosedManager.MAX_GLOBAL_CLOSED_TABS) {
      RecentlyClosedManager.globalRecentlyClosedTabs.pop();
    }
  }

  public static getGlobalRecentlyClosedTabs(): ClosedTabRecord[] {
    return RecentlyClosedManager.globalRecentlyClosedTabs.slice(0, RecentlyClosedManager.MAX_GLOBAL_CLOSED_TABS);
  }

  public static recordClosedWindow(tabs: ClosedWindowTabInfo[], isPrivate: boolean): void {
    if (isPrivate) return;

    const validTabs = tabs.filter(t => t.url && !t.url.startsWith('nav0://') && t.url !== '');
    if (validTabs.length === 0) return;

    const record: ClosedWindowRecord = {
      id: uuid(),
      tabs: validTabs,
      tabCount: validTabs.length,
      closedAt: Date.now(),
    };

    const existing = RecentlyClosedManager.getClosedWindows();
    existing.unshift(record);
    const trimmed = existing.slice(0, RecentlyClosedManager.MAX_CLOSED_WINDOWS);

    DataStoreManager.set(DataStoreConstants.RECENTLY_CLOSED_WINDOWS, trimmed);
  }

  public static getClosedWindows(): ClosedWindowRecord[] {
    const data = DataStoreManager.get(DataStoreConstants.RECENTLY_CLOSED_WINDOWS);
    return Array.isArray(data) ? data : [];
  }

  public static removeClosedWindow(id: string): void {
    const existing = RecentlyClosedManager.getClosedWindows();
    const filtered = existing.filter(w => w.id !== id);
    DataStoreManager.set(DataStoreConstants.RECENTLY_CLOSED_WINDOWS, filtered);
  }
}
