import { ipcMain, session, shell } from "electron";
import { MainToRendererEventsForBrowserIPC, RendererToMainEventsForBrowserIPC } from "../../constants/app-constants";
import { DownloadRecord } from "../../types/download-record";
import { DatabaseManager } from "../database/database-manager";
import { AppWindowManager } from "./app-window-manager";
import { v4 as uuid } from "uuid";

export abstract class DownloadManager {

  // In-memory tracking of active downloads (keyed by downloadId = startTime_fileName)
  private static activeDownloads: Map<string, { fileName: string, receivedBytes: number, totalBytes: number, state: 'progressing' | 'paused', dbRecordId: string }> = new Map();

  // Store DownloadItem references so we can pause/resume/cancel
  private static downloadItems: Map<string, Electron.DownloadItem> = new Map();

  // Downloads being resumed from a previous session; maps downloadId → dbRecordId
  // so handleDownload can skip creating a duplicate DB record
  private static resumingDownloads: Map<string, string> = new Map();

  // Set to true when the app is shutting down, so the done handler doesn't
  // overwrite 'paused' status with 'cancelled'
  private static shuttingDown = false;

  // ── tracking helpers ──

  public static trackDownloadStarted(downloadId: string, fileName: string, totalBytes: number, dbRecordId: string): void {
    this.activeDownloads.set(downloadId, { fileName, receivedBytes: 0, totalBytes, state: 'progressing', dbRecordId });
  }

  public static trackDownloadProgress(downloadId: string, receivedBytes: number, totalBytes: number): void {
    const entry = this.activeDownloads.get(downloadId);
    if (entry) {
      entry.receivedBytes = receivedBytes;
      entry.totalBytes = totalBytes;
    }
  }

  public static trackDownloadCompleted(downloadId: string): void {
    this.activeDownloads.delete(downloadId);
    this.downloadItems.delete(downloadId);
  }

  public static getActiveDownloads(): Array<{ downloadId: string, fileName: string, receivedBytes: number, totalBytes: number, state: string, dbRecordId: string }> {
    return Array.from(this.activeDownloads.entries()).map(([downloadId, info]) => ({
      downloadId,
      ...info,
    }));
  }

  public static storeDownloadItem(downloadId: string, item: Electron.DownloadItem): void {
    this.downloadItems.set(downloadId, item);
  }

  // ── pause / resume / cancel ──

  public static pauseDownload(downloadId: string): boolean {
    const item = this.downloadItems.get(downloadId);
    if (!item || item.isPaused()) return false;
    item.pause();
    const entry = this.activeDownloads.get(downloadId);
    if (entry) {
      entry.state = 'paused';
      entry.receivedBytes = item.getReceivedBytes();
    }
    return true;
  }

  public static resumeDownload(downloadId: string): boolean {
    const item = this.downloadItems.get(downloadId);
    if (!item || !item.canResume()) return false;
    item.resume();
    const entry = this.activeDownloads.get(downloadId);
    if (entry) entry.state = 'progressing';
    return true;
  }

  public static cancelDownload(downloadId: string): void {
    const item = this.downloadItems.get(downloadId);
    if (item) item.cancel(); // triggers 'done' with state='cancelled'
  }

  public static isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  /** Pause every in-progress download and persist its state to the DB. Called before window close. */
  public static pauseAllDownloads(): void {
    if (this.shuttingDown) return; // already handled
    this.shuttingDown = true;

    for (const [downloadId, item] of this.downloadItems) {
      try {
        const entry = this.activeDownloads.get(downloadId);
        if (!entry) continue;
        if (!item.isPaused()) item.pause();
        // Persist resume metadata to DB
        const receivedBytes = item.getReceivedBytes();
        const urlChain = JSON.stringify(item.getURLChain());
        const eTag = item.getETag();
        const lastModified = item.getLastModifiedTime();
        const startTime = item.getStartTime();
        // Update both private and non-private DBs (we don't track which here, so update both)
        for (const isPrivate of [false, true]) {
          try {
            const db = DatabaseManager.getDatabase(isPrivate);
            db.prepare("UPDATE download SET status = 'paused', receivedBytes = ?, urlChain = ?, eTag = ?, lastModified = ?, startTime = ? WHERE id = ?;")
              .run(receivedBytes, urlChain, eTag, lastModified, startTime, entry.dbRecordId);
          } catch (_) { /* record may not exist in this DB */ }
        }
      } catch (_) { /* best-effort */ }
    }

    // Fallback: mark any remaining in_progress records as paused in DB
    // (in case DownloadItems were already destroyed before we could read them)
    for (const isPrivate of [false, true]) {
      try {
        const db = DatabaseManager.getDatabase(isPrivate);
        db.prepare("UPDATE download SET status = 'paused' WHERE status = 'in_progress';").run();
      } catch (_) { /* DB may not be initialized */ }
    }
  }

  /** Resume a download that was persisted as 'paused' in the DB from a previous session. */
  public static resumeDownloadFromDb(recordId: string, isPrivate: boolean): boolean {
    const db = DatabaseManager.getDatabase(isPrivate);
    const record = db.prepare("SELECT * FROM download WHERE id = ? AND status = 'paused';").get(recordId) as DownloadRecord | undefined;
    if (!record) return false;

    const urlChain: string[] = JSON.parse(record.urlChain || '[]');
    if (urlChain.length === 0) urlChain.push(record.url);
    const partition = isPrivate ? 'persist:private' : 'persist:browsertabs';
    const ses = session.fromPartition(partition);

    // Build the expected downloadId so handleDownload can detect the resume
    const expectedDownloadId = record.startTime.toString() + '_' + record.fileName;
    this.resumingDownloads.set(expectedDownloadId, recordId);

    ses.createInterruptedDownload({
      path: record.fileLocation,
      urlChain,
      offset: record.receivedBytes,
      length: record.fileSize,
      lastModified: record.lastModified || undefined,
      eTag: record.eTag || undefined,
      startTime: record.startTime || undefined,
    });
    return true;
  }

  /** Check if a downloadId corresponds to a cross-session resume. */
  public static checkResuming(downloadId: string): string | null {
    const dbRecordId = this.resumingDownloads.get(downloadId) ?? null;
    if (dbRecordId) this.resumingDownloads.delete(downloadId);
    return dbRecordId;
  }

  // ── DB helpers ──

  public static updateRecordStatus(appWindowId: string, recordId: string, status: string, receivedBytes?: number): void {
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId)?.isPrivate ?? false);
    if (receivedBytes !== undefined) {
      db.prepare("UPDATE download SET status = ?, receivedBytes = ? WHERE id = ?;").run(status, receivedBytes, recordId);
    } else {
      db.prepare("UPDATE download SET status = ? WHERE id = ?;").run(status, recordId);
    }
  }

  public static updateRecordResumeMetadata(appWindowId: string, recordId: string, urlChain: string, eTag: string, lastModified: string, startTime: number): void {
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId)?.isPrivate ?? false);
    db.prepare("UPDATE download SET urlChain = ?, eTag = ?, lastModified = ?, startTime = ? WHERE id = ?;")
      .run(urlChain, eTag, lastModified, startTime, recordId);
  }

  // ── IPC listeners ──

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

    ipcMain.handle(RendererToMainEventsForBrowserIPC.FETCH_ACTIVE_DOWNLOADS, async () => {
      return DownloadManager.getActiveDownloads();
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.PAUSE_DOWNLOAD, async (_event, downloadId: string, appWindowId: string) => {
      const ok = DownloadManager.pauseDownload(downloadId);
      if (ok) {
        const entry = DownloadManager.activeDownloads.get(downloadId);
        if (entry) {
          DownloadManager.updateRecordStatus(appWindowId, entry.dbRecordId, 'paused', entry.receivedBytes);
          // Broadcast paused state
          DownloadManager.broadcastToAll(MainToRendererEventsForBrowserIPC.DOWNLOAD_PAUSED, { downloadId, fileName: entry.fileName });
        }
      }
      return ok;
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.RESUME_DOWNLOAD, async (_event, downloadId: string, appWindowId: string) => {
      // Try in-session resume first (DownloadItem still exists)
      const item = DownloadManager.downloadItems.get(downloadId);
      if (item) {
        const ok = DownloadManager.resumeDownload(downloadId);
        if (ok) {
          const entry = DownloadManager.activeDownloads.get(downloadId);
          if (entry) {
            DownloadManager.updateRecordStatus(appWindowId, entry.dbRecordId, 'in_progress');
            DownloadManager.broadcastToAll(MainToRendererEventsForBrowserIPC.DOWNLOAD_RESUMED, { downloadId, fileName: entry.fileName });
          }
        }
        return ok;
      }
      // Cross-session resume: downloadId is actually the DB record ID
      const isPrivate = AppWindowManager.getWindowById(appWindowId)?.isPrivate ?? false;
      return DownloadManager.resumeDownloadFromDb(downloadId, isPrivate);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.CANCEL_DOWNLOAD, async (_event, downloadId: string, appWindowId: string) => {
      DownloadManager.cancelDownload(downloadId);
      // The 'done' handler in tab.ts will remove tracking and broadcast DOWNLOAD_COMPLETED
      return true;
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.OPEN_DOWNLOADED_FILE, async (event, filePath: string) => {
      return await shell.openPath(filePath);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.SHOW_ITEM_IN_FOLDER, (event, filePath: string) => {
      shell.showItemInFolder(filePath);
    });
  }

  /** Broadcast an event to all browser windows and their tabs. */
  private static broadcastToAll(channel: string, data: any): void {
    for (const window of AppWindowManager.getWindows()) {
      try {
        window.getBrowserWindowInstance()?.webContents?.send(channel, data);
        window.broadcastToTabs(channel, data);
      } catch (_) { /* window may be closing */ }
    }
  }

  // ── CRUD ──

  public static async fetchRecords(appWindowId: string, searchTerm?: string, limit?: number, offset?: number): Promise<Array<DownloadRecord>>{
    searchTerm = searchTerm || "";
    limit = limit || 50;
    offset = offset || 0;
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const stmt = db.prepare("SELECT * FROM download WHERE status != 'cancelled' AND (url LIKE ? OR fileName LIKE ?) ORDER BY createdDate DESC LIMIT ? OFFSET ? ; ");
    const records = stmt.all(`%${searchTerm}%`, `%${searchTerm}%`, limit, offset) as Array<DownloadRecord>;
    return records;
  }

  public static async addRecord(appWindowId: string, url: string, fileName: string, fileExtension: string, fileType: 'document' | 'image' | 'archive' | 'audio' | 'file' | 'executable' | 'other', fileSize: number, fileLocation: string): Promise<DownloadRecord>{
    const db = DatabaseManager.getDatabase(AppWindowManager.getWindowById(appWindowId).isPrivate);
    const id = uuid();
    const createdDate = new Date().toISOString();
    const stmt = db.prepare("INSERT INTO download (id, url, createdDate, fileName, fileExtension, fileType, fileSize, fileLocation, status, receivedBytes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', 0);");
    await stmt.run(id, url, createdDate, fileName, fileExtension, fileType, fileSize, fileLocation);
    const newlyCreatedRecord: DownloadRecord = { id, url, createdDate: new Date(createdDate), fileName, fileExtension, fileType, fileSize, fileLocation, status: 'in_progress', receivedBytes: 0, urlChain: '[]', eTag: '', lastModified: '', startTime: 0 };
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
