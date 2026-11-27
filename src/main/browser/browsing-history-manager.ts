import { ipcMain } from 'electron';
import { RendererToMainEventsForBrowserIPC } from '../../constants/app-constants';
import { getCategoryForDomain } from '../../constants/data-constants';
import {
  BrowsingHistoryCategoryTotal,
  BrowsingHistoryRecord,
  BrowsingHistorySiteTotal,
  BrowsingHistorySummary,
} from '../../types/browsing-history-record';
import { DatabaseManager } from '../database/database-manager';
import { AppWindowManager } from './app-window-manager';
import { FaviconCache } from './favicon-cache';
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
      RendererToMainEventsForBrowserIPC.FETCH_BROWSING_HISTORY_SUMMARY,
      async (event, appWindowId: string, since?: string | null, limit?: number) => {
        return await BrowsingHistoryManager.fetchHistorySummary(appWindowId, since, limit);
      }
    );

    ipcMain.handle(
      RendererToMainEventsForBrowserIPC.FETCH_TOP_SITES,
      async (event, appWindowId: string, limit?: number) => {
        return await BrowsingHistoryManager.fetchTopSites(appWindowId, limit);
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
    return FaviconCache.attach(db, records);
  }

  /**
   * Inserts a new history record for a single visit. One row per visit —
   * revisiting the same URL always creates a new row so the history
   * timeline and per-visit time tracking are preserved. The row keeps no
   * favicon: the site's icon is in the favicon cache.
   */
  public static insertRecord(
    appWindowId: string,
    url: string,
    title: string,
    topLevelDomain: string
  ): BrowsingHistoryRecord | null {
    const db = BrowsingHistoryManager.getDb(appWindowId);
    if (!db) return null;
    const id = uuid();
    const createdDate = new Date();
    const stmt = db.prepare(
      'INSERT INTO browsingHistory (id, url, title, createdDate, topLevelDomain) VALUES (?, ?, ?, ?, ?);'
    );
    stmt.run(id, url, title, createdDate.toISOString(), topLevelDomain);
    return {
      id,
      url,
      title,
      createdDate,
      topLevelDomain,
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

  public static async removeRecord(appWindowId: string, recordId: string): Promise<boolean> {
    const db = BrowsingHistoryManager.getDb(appWindowId);
    if (!db) return false;
    const stmt = db.prepare('DELETE FROM browsingHistory WHERE id = ?;');
    await stmt.run(recordId);
    FaviconCache.prune(db);
    return true;
  }

  public static async removeAllRecords(appWindowId: string): Promise<boolean> {
    const db = BrowsingHistoryManager.getDb(appWindowId);
    if (!db) return false;
    const stmt = db.prepare('DELETE FROM browsingHistory;');
    await stmt.run();
    FaviconCache.prune(db);
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

  /**
   * Aggregates browsing history by URL and returns the most-visited sites,
   * with the latest title, the site's icon and the visit count. Skips
   * internal pages.
   */
  public static async fetchTopSites(
    appWindowId: string,
    limit?: number
  ): Promise<Array<{ url: string; title: string; faviconUrl: string; visits: number }>> {
    const db = BrowsingHistoryManager.getDb(appWindowId);
    if (!db) return [];
    const stmt = db.prepare(`
      SELECT url,
        COUNT(*) as visits,
        (SELECT title FROM browsingHistory WHERE url = h.url ORDER BY createdDate DESC LIMIT 1) as title
      FROM browsingHistory h
      WHERE url NOT LIKE 'Nav0://%' AND url NOT LIKE 'nav0://%'
      GROUP BY url
      ORDER BY visits DESC, MAX(createdDate) DESC
      LIMIT ?;
    `);
    const sites = stmt.all(limit || 8) as Array<{
      url: string;
      title: string;
      faviconUrl: string;
      visits: number;
    }>;
    return FaviconCache.attach(db, sites);
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

  /**
   * Totals the history since an ISO date (all of it when since is null) by
   * site and by category, in the window's own database, and returns the
   * leading few of each. Both rank by active time, or by visits when nothing
   * in the range has any.
   */
  public static async fetchHistorySummary(
    appWindowId: string,
    since?: string | null,
    limit?: number
  ): Promise<BrowsingHistorySummary> {
    limit = limit || 10;
    const db = BrowsingHistoryManager.getDb(appWindowId);
    if (!db) return { byActiveTime: false, sites: [], categories: [] };
    const hasStart = typeof since === 'string' && since !== '';
    const stmt = db.prepare(`
      SELECT topLevelDomain as domain, COUNT(*) as visits, COALESCE(SUM(activeDuration), 0) as activeDuration
      FROM browsingHistory
      ${hasStart ? 'WHERE createdDate >= ?' : ''}
      GROUP BY topLevelDomain;
    `);
    const sites = (hasStart ? stmt.all(since) : stmt.all()) as Array<BrowsingHistorySiteTotal>;

    const categoryTotals = new Map<string, BrowsingHistoryCategoryTotal>();
    for (const site of sites) {
      const category = getCategoryForDomain(site.domain);
      const total = categoryTotals.get(category) || { category, visits: 0, activeDuration: 0 };
      total.visits += site.visits;
      total.activeDuration += site.activeDuration;
      categoryTotals.set(category, total);
    }

    const byActiveTime = sites.some((site) => site.activeDuration > 0);
    const rank = (
      a: { visits: number; activeDuration: number },
      b: { visits: number; activeDuration: number }
    ) => (byActiveTime ? b.activeDuration - a.activeDuration : 0) || b.visits - a.visits;

    const topSites = sites.sort(rank).slice(0, limit);
    for (const site of topSites) {
      site.faviconUrl = site.domain ? FaviconCache.getForHost(db, site.domain) : null;
    }
    return {
      byActiveTime,
      sites: topSites,
      categories: Array.from(categoryTotals.values()).sort(rank).slice(0, limit),
    };
  }
}
