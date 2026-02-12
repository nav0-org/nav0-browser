import { app, ipcMain } from "electron";
import { RendererToMainEventsForBrowserIPC } from "../../constants/app-constants";
import { BookmarkRecord } from "../../types/bookmark-record";
import { DatabaseManager } from "../database/database-manager";
import { AppWindowManager } from "./app-window-manager";
import { v4 as uuid } from "uuid";

export abstract class BookmarkManager {

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

    ipcMain.handle(RendererToMainEventsForBrowserIPC.ADD_BOOKMARK, async (event, appWindowId: string,title: string,  url: string, faviconUrl: string) => {
      return await BookmarkManager.addRecord(appWindowId, title, url, faviconUrl);
    });
  }

  public static async fetchRecords(appWindowId: string, searchTerm?: string, limit?: number, offset?: number): Promise<Array<BookmarkRecord>>{
    searchTerm = searchTerm || "";
    limit = limit || 50;
    offset = offset || 0;
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("SELECT * FROM bookmark WHERE (url LIKE ? OR title LIKE ?) ORDER BY createdDate DESC LIMIT ? OFFSET ? ; ");
    const records = stmt.all(`%${searchTerm}%`, `%${searchTerm}%`, limit, offset) as Array<BookmarkRecord>;
    return records;
  }

  public static async addRecord(appWindowId: string, title: string, url: string, faviconUrl: string): Promise<BookmarkRecord>{
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("INSERT INTO bookmark (id, title, url, createdDate, faviconUrl) VALUES (?, ?, ?, ?, ?);");
    const id = uuid();
    const result = await stmt.run(id, title, url, new Date().toISOString(), faviconUrl);
    const newlyCreatedRecord: BookmarkRecord = { id: id, title, url, createdDate: new Date(), faviconUrl: faviconUrl };
    return newlyCreatedRecord;
  }

  public static async removeRecord(appWindowId: string, recordId: string): Promise<boolean>{
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("DELETE FROM bookmark WHERE id = ?;");
    await stmt.run(recordId);
    return true;
  }

  public static async removeAllRecords(appWindowId: string): Promise<boolean>{
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("DELETE FROM bookmark;");
    await stmt.run();
    return true;
  }

  public static async isBookmark(appWindowId: string, url: string): Promise<BookmarkRecord | null>{
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("SELECT * FROM bookmark WHERE url = ?;");
    const records = stmt.all(url) as Array<BookmarkRecord>;
    if(records.length > 0){
      return records[0];
    }
    return null;
  }
}