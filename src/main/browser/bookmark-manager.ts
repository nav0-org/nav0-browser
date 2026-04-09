import { app, ipcMain } from "electron";
import { RendererToMainEventsForBrowserIPC } from "../../constants/app-constants";
import { BookmarkRecord, BookmarkWithStats } from "../../types/bookmark-record";
import { DatabaseManager } from "../database/database-manager";
import { AppWindowManager } from "./app-window-manager";
import { v4 as uuid } from "uuid";

export abstract class BookmarkManager {

  private static getDb(appWindowId: string) {
    const window = AppWindowManager.getWindowById(appWindowId);
    if (!window) return null;
    return DatabaseManager.getDatabase(window.isPrivate);
  }

  public static async initListeners(){
    ipcMain.handle(RendererToMainEventsForBrowserIPC.FETCH_BOOKMARK, async (event, appWindowId: string, searchTerm?: string, limit?: number, offset?: number) => {
      return await BookmarkManager.fetchRecords(appWindowId, searchTerm, limit, offset);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.REMOVE_BOOKMARK, async (event, appWindowId: string, recordId: string) => {
      return await BookmarkManager.removeRecord(appWindowId, recordId);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.REMOVE_ALL_BOOKMARKS, async (event, appWindowId: string) => {
      return await BookmarkManager.removeAllRecords(appWindowId);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.ADD_BOOKMARK, async (event, appWindowId: string, title: string, url: string, faviconUrl: string, type?: string) => {
      return await BookmarkManager.addRecord(appWindowId, title, url, faviconUrl, type as 'reference' | 'queue');
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.UPDATE_BOOKMARK_TYPE, async (event, appWindowId: string, bookmarkId: string, type: string) => {
      return await BookmarkManager.updateBookmarkType(appWindowId, bookmarkId, type as 'reference' | 'queue');
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.FETCH_BOOKMARKS_WITH_STATS, async (event, appWindowId: string, type: string, searchTerm?: string, limit?: number, offset?: number) => {
      return await BookmarkManager.fetchBookmarksWithStats(appWindowId, type as 'reference' | 'queue', searchTerm, limit, offset);
    });
  }

  public static async fetchRecords(appWindowId: string, searchTerm?: string, limit?: number, offset?: number): Promise<Array<BookmarkRecord>>{
    searchTerm = searchTerm || "";
    limit = limit || 50;
    offset = offset || 0;
    const db = BookmarkManager.getDb(appWindowId);
    if (!db) return [];
    const stmt = db.prepare("SELECT * FROM bookmark WHERE (url LIKE ? OR title LIKE ?) ORDER BY createdDate DESC LIMIT ? OFFSET ? ; ");
    const records = stmt.all(`%${searchTerm}%`, `%${searchTerm}%`, limit, offset) as Array<BookmarkRecord>;
    return records;
  }

  public static async fetchBookmarksWithStats(appWindowId: string, type: 'reference' | 'queue', searchTerm?: string, limit?: number, offset?: number): Promise<Array<BookmarkWithStats>>{
    searchTerm = searchTerm || "";
    limit = limit || 50;
    offset = offset || 0;
    const db = BookmarkManager.getDb(appWindowId);
    if (!db) return [];

    const orderBy = type === 'queue' ? 'b.createdDate DESC' : 'visits DESC, b.createdDate DESC';

    const stmt = db.prepare(`
      SELECT b.*,
        COALESCE(h.visitCount, 0) as visits,
        h.createdDate as lastVisited
      FROM bookmark b
      LEFT JOIN browsingHistory h ON b.url = h.url
      WHERE b.type = ? AND (b.url LIKE ? OR b.title LIKE ?)
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?;
    `);
    const records = stmt.all(type, `%${searchTerm}%`, `%${searchTerm}%`, limit, offset) as Array<BookmarkWithStats>;
    return records;
  }

  public static async getCountByType(appWindowId: string): Promise<{ queue: number, reference: number }> {
    const db = BookmarkManager.getDb(appWindowId);
    if (!db) return { queue: 0, reference: 0 };
    const stmt = db.prepare("SELECT type, COUNT(*) as count FROM bookmark GROUP BY type;");
    const rows = stmt.all() as Array<{ type: string, count: number }>;
    const counts = { queue: 0, reference: 0 };
    for (const row of rows) {
      if (row.type === 'queue') counts.queue = row.count;
      else counts.reference = row.count;
    }
    return counts;
  }

  public static async addRecord(appWindowId: string, title: string, url: string, faviconUrl: string, type?: 'reference' | 'queue'): Promise<BookmarkRecord | null>{
    const db = BookmarkManager.getDb(appWindowId);
    if (!db) return null;
    const bookmarkType = type || 'reference';
    const stmt = db.prepare("INSERT INTO bookmark (id, title, url, createdDate, faviconUrl, type) VALUES (?, ?, ?, ?, ?, ?);");
    const id = uuid();
    stmt.run(id, title, url, new Date().toISOString(), faviconUrl, bookmarkType);
    const newlyCreatedRecord: BookmarkRecord = { id, title, url, createdDate: new Date(), faviconUrl, type: bookmarkType };
    return newlyCreatedRecord;
  }

  public static async updateBookmarkType(appWindowId: string, bookmarkId: string, type: 'reference' | 'queue'): Promise<BookmarkRecord | null>{
    const db = BookmarkManager.getDb(appWindowId);
    if (!db) return null;
    const updateStmt = db.prepare("UPDATE bookmark SET type = ? WHERE id = ?;");
    updateStmt.run(type, bookmarkId);
    const selectStmt = db.prepare("SELECT * FROM bookmark WHERE id = ?;");
    const record = selectStmt.get(bookmarkId) as BookmarkRecord | undefined;
    return record || null;
  }

  public static async removeRecord(appWindowId: string, recordId: string): Promise<boolean>{
    const db = BookmarkManager.getDb(appWindowId);
    if (!db) return false;
    const stmt = db.prepare("DELETE FROM bookmark WHERE id = ?;");
    stmt.run(recordId);
    return true;
  }

  public static async removeAllRecords(appWindowId: string): Promise<boolean>{
    const db = BookmarkManager.getDb(appWindowId);
    if (!db) return false;
    const stmt = db.prepare("DELETE FROM bookmark;");
    stmt.run();
    return true;
  }

  public static async isBookmark(appWindowId: string, url: string): Promise<BookmarkRecord | null>{
    const db = BookmarkManager.getDb(appWindowId);
    if (!db) return null;
    const stmt = db.prepare("SELECT * FROM bookmark WHERE url = ?;");
    const records = stmt.all(url) as Array<BookmarkRecord>;
    if(records.length > 0){
      return records[0];
    }
    return null;
  }
}