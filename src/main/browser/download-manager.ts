import { ipcMain } from "electron";
import { RendererToMainEventsForBrowserIPC } from "../../constants/app-constants";
import { DownloadRecord } from "../../types/download-record";
import { DatabaseManager } from "../database/database-manager";
import { AppWindowManager } from "./app-window-manager";
import { v4 as uuid } from "uuid";

export abstract class DownloadManager {

  public static async initListeners(){
    ipcMain.handle(RendererToMainEventsForBrowserIPC.FETCH_DOWNLOAD, async (event, appWindowId: string, searchTerm?: string, limit?: number, offset?: number) => {
      return await DownloadManager.fetchRecords(appWindowId, searchTerm, limit, offset);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.REMOVE_DOWNLOAD, async (event, appWindowId: string, recordId: string) => {
      return await DownloadManager.removeRecord(appWindowId, recordId);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.REMOVE_ALL_DOWNLOADS, async (event, appWindowId: string) => {
      return await DownloadManager.removeAllRecords(appWindowId);
    });
  }

  public static async fetchRecords(appWindowId: string, searchTerm?: string, limit?: number, offset?: number): Promise<Array<DownloadRecord>>{
    searchTerm = searchTerm || "";
    limit = limit || 50;
    offset = offset || 0;
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("SELECT * FROM download WHERE url LIKE ? ORDER BY createdDate DESC LIMIT ? OFFSET ? ; ");
    const records = stmt.all(`%${searchTerm}%`, limit, offset) as Array<DownloadRecord>;
    return records;
  }

  public static async addRecord(appWindowId: string, url: string, fileName: string,  fileExtension: string, fileType: 'document' | 'image' | 'archive' | 'audio' | 'file' | 'executable' | 'other', fileSize: number, fileLocation: string): Promise<DownloadRecord>{
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("INSERT INTO download (id, url, createdDate, fileName, fileExtension, fileType, fileSize, fileLocation) VALUES (?, ?, ?, ?, ?, ?, ?, ?);");
    const result = await stmt.run(uuid(), url, new Date().toISOString(), fileName, fileExtension, fileType, fileSize, fileLocation);
    const newlyCreatedRecord: DownloadRecord = { id: uuid(), url, createdDate: new Date(), fileName, fileExtension, fileType, fileSize, fileLocation };
    return newlyCreatedRecord;
  }

  public static async removeRecord(appWindowId: string, recordId: string): Promise<boolean>{  
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("DELETE FROM download WHERE id = ?;");
    await stmt.run(recordId);
    return true;
  }

  public static async removeAllRecords(appWindowId: string): Promise<boolean>{
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("DELETE FROM download;");
    await stmt.run();
    return true;
  }
}