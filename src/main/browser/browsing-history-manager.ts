import { ipcMain } from "electron";
import { RendererToMainEventsForBrowserIPC } from "../../constants/app-constants";
import { BrowsingHistoryRecord } from "../../types/browsing-history-record";
import { DatabaseManager } from "../database/database-manager";
import { AppWindowManager } from "./app-window-manager";
import { v4 as uuid } from "uuid";

export abstract class BrowsingHistoryManager {

  public static async initListeners(){
    ipcMain.handle(RendererToMainEventsForBrowserIPC.FETCH_BROWSING_HISTORY, async (event, appWindowId: string, searchTerm?: string, limit?: number, offset?: number) => {
      return await BrowsingHistoryManager.fetchRecords(appWindowId, searchTerm, limit, offset);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.REMOVE_BROWSING_HISTORY, async (event, appWindowId: string, recordId: string) => {
      return await BrowsingHistoryManager.removeRecord(appWindowId, recordId);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.REMOVE_ALL_BROWSING_HISTORY, async (event, appWindowId: string) => {
      return await BrowsingHistoryManager.removeAllRecords(appWindowId);
    });
  }

  public static async fetchRecords(appWindowId: string, searchTerm?: string, limit?: number, offset?: number): Promise<Array<BrowsingHistoryRecord>>{
    searchTerm = searchTerm || "";
    limit = limit || 50;
    offset = offset || 0;
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("SELECT * FROM browsingHistory WHERE (url LIKE ? or title LIKE ?) ORDER BY createdDate DESC LIMIT ? OFFSET ? ; ");
    const records = stmt.all(`%${searchTerm}%`,`%${searchTerm}%`, limit, offset) as Array<BrowsingHistoryRecord>;
    return records;
  }

  public static async addRecord(appWindowId: string, url: string, title: string, topLevelDomain: string, faviconUrl: string): Promise<BrowsingHistoryRecord>{
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("INSERT INTO browsingHistory (id, url, title, createdDate, topLevelDomain, faviconUrl) VALUES (?, ?, ?, ?, ?, ?);");
    const id = uuid();
    const result = await stmt.run(id, url, title, new Date().toISOString(), topLevelDomain, faviconUrl);
    const newlyCreatedRecord: BrowsingHistoryRecord = { id: id, url, title, createdDate: new Date(), topLevelDomain, faviconUrl };
    return newlyCreatedRecord;
  }

  public static async updateRecordTitle(appWindowId: string, recordId: string, title: string): Promise<void>{
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("UPDATE browsingHistory SET title = ? WHERE id = ?;");
    await stmt.run(title, recordId);
  }

  public static async updateRecordFavicon(appWindowId: string, recordId: string, faviconUrl: string): Promise<void>{
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("UPDATE browsingHistory SET faviconUrl = ? WHERE id = ?;");
    await stmt.run(faviconUrl, recordId);
  }

  public static async findLastRecordByUrl(appWindowId: string, url: string): Promise<BrowsingHistoryRecord | null>{
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("SELECT * FROM browsingHistory WHERE url = ? ORDER BY createdDate DESC LIMIT 1;");
    const record = stmt.get(url) as BrowsingHistoryRecord | undefined;
    return record || null;
  }

  public static async updateRecordTimestamp(appWindowId: string, recordId: string): Promise<void>{
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("UPDATE browsingHistory SET createdDate = ? WHERE id = ?;");
    await stmt.run(new Date().toISOString(), recordId);
  }

  public static async removeRecord(appWindowId: string, recordId: string): Promise<boolean>{
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("DELETE FROM browsingHistory WHERE id = ?;");
    await stmt.run(recordId);
    return true;
  }

  public static async removeAllRecords(appWindowId: string): Promise<boolean>{
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("DELETE FROM browsingHistory;");
    await stmt.run();
    return true;
  }
}