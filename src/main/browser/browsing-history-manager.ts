import { ipcMain } from 'electron';
import { RendererToMainEventsForBrowserIPC } from '../../constants/app-constants';
import { BrowsingHistoryRecord } from '../../types/browsing-history-record';
import { DatabaseManager } from '../database/database-manager';
import { AppWindowManager } from './app-window-manager';
import { v4 as uuid } from 'uuid';

export abstract class BrowsingHistoryManager {
  private static getDb(appWindowId: string) {
    const window = AppWindowManager.getWindowById(appWindowId);
    if (!window) return null;
    return DatabaseManager.getDatabase(window.isPrivate);
  }

  public static async initListeners() {
    ipcMain.handle(
      RendererToMainEventsForBrowserIPC.FETCH_BROWSING_HISTORY,
      async (event, appWindowId: string, searchTerm?: string, limit?: number, offset?: number) => {
        return await BrowsingHistoryManager.fetchRecords(appWindowId, searchTerm, limit, offset);
      }
    );

    ipcMain.handle(
      RendererToMainEventsForBrowserIPC.FETCH_BROWSING_HISTORY_STATS,
      async (event, appWindowId: string) => {
        return await BrowsingHistoryManager.fetchHistoryStats(appWindowId);
      }
    );

    ipcMain.handle(
      RendererToMainEventsForBrowserIPC.REMOVE_BROWSING_HISTORY,
      async (event, appWindowId: string, recordId: string) => {
        return await BrowsingHistoryManager.removeRecord(appWindowId, recordId);
      }
    );

    ipcMain.handle(
      RendererToMainEventsForBrowserIPC.REMOVE_ALL_BROWSING_HISTORY,
      async (event, appWindowId: string) => {
        return await BrowsingHistoryManager.removeAllRecords(appWindowId);
      }
    );
  }

  public static async fetchRecords(
    appWindowId: string,
    searchTerm?: string,
    limit?: number,
    offset?: number
  ): Promise<Array<BrowsingHistoryRecord>> {
    searchTerm = searchTerm || '';
    limit = limit || 50;
    offset = offset || 0;
    const db = BrowsingHistoryManager.getDb(appWindowId);
    if (!db) return [];
    const stmt = db.prepare(
      'SELECT * FROM browsingHistory WHERE (url LIKE ? or title LIKE ?) ORDER BY createdDate DESC LIMIT ? OFFSET ? ; '
    );
    const records = stmt.all(
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      limit,
      offset
    ) as Array<BrowsingHistoryRecord>;
    return records;
  }

  /**
   * Inserts a new history record for a single visit. One row per visit —
   * revisiting the same URL always creates a new row so the history
   * timeline and per-visit time tracking are preserved.
   */
  public static insertRecord(
    appWindowId: string,
    url: string,
    title: string,
    topLevelDomain: string,
    faviconUrl: string
  ): BrowsingHistoryRecord | null {
    const db = BrowsingHistoryManager.getDb(appWindowId);
    if (!db) return null;
    const id = uuid();
    const createdDate = new Date();
    const stmt = db.prepare(
      'INSERT INTO browsingHistory (id, url, title, createdDate, topLevelDomain, faviconUrl) VALUES (?, ?, ?, ?, ?, ?);'
    );
    stmt.run(id, url, title, createdDate.toISOString(), topLevelDomain, faviconUrl);
    return {
      id,
      url,
      title,
      createdDate,
      topLevelDomain,
      faviconUrl,
      totalDuration: 0,
      activeDuration: 0,
    };
  }

  public static async updateRecordTitle(
    appWindowId: string,
    recordId: string,
    title: string
  ): Promise<void> {
    const db = BrowsingHistoryManager.getDb(appWindowId);
    if (!db) return;
    const stmt = db.prepare('UPDATE browsingHistory SET title = ? WHERE id = ?;');
    await stmt.run(title, recordId);
  }

  public static async updateRecordFavicon(
    appWindowId: string,
    recordId: string,
    faviconUrl: string
  ): Promise<void> {
    const db = BrowsingHistoryManager.getDb(appWindowId);
    if (!db) return;
    const stmt = db.prepare('UPDATE browsingHistory SET faviconUrl = ? WHERE id = ?;');
    await stmt.run(faviconUrl, recordId);
  }

  public static async removeRecord(appWindowId: string, recordId: string): Promise<boolean> {
    const db = BrowsingHistoryManager.getDb(appWindowId);
    if (!db) return false;
    const stmt = db.prepare('DELETE FROM browsingHistory WHERE id = ?;');
    await stmt.run(recordId);
    return true;
  }

  public static async removeAllRecords(appWindowId: string): Promise<boolean> {
    const db = BrowsingHistoryManager.getDb(appWindowId);
    if (!db) return false;
    const stmt = db.prepare('DELETE FROM browsingHistory;');
    await stmt.run();
    return true;
  }

  public static updateRecordTimeTracking(
    appWindowId: string,
    recordId: string,
    totalDuration: number,
    activeDuration: number,
    outTimestamp: string
  ): void {
    const db = BrowsingHistoryManager.getDb(appWindowId);
    if (!db) return;
    const stmt = db.prepare(
      'UPDATE browsingHistory SET totalDuration = ?, activeDuration = ?, outTimestamp = ? WHERE id = ?;'
    );
    stmt.run(totalDuration, activeDuration, outTimestamp, recordId);
  }

  public static async fetchHistoryStats(
    appWindowId: string
  ): Promise<Array<{ date: string; count: number; activeDuration: number }>> {
    const db = BrowsingHistoryManager.getDb(appWindowId);
    if (!db) return [];
    const stmt = db.prepare(`
      SELECT DATE(createdDate) as date, COUNT(*) as count, COALESCE(SUM(activeDuration), 0) as activeDuration
      FROM browsingHistory
      WHERE createdDate >= DATE('now', '-365 days')
      GROUP BY DATE(createdDate)
      ORDER BY date ASC;
    `);
    return stmt.all() as Array<{ date: string; count: number; activeDuration: number }>;
  }
}
