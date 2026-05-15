import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { SchemaManager } from './schema-manager';
import { BookmarkManager } from '../browser/bookmark-manager';
import { DownloadManager } from '../browser/download-manager';
import { BrowsingHistoryManager } from '../browser/browsing-history-manager';

export abstract class DatabaseManager {
  private static db: DatabaseType;
  private static dbForPrivateBrowsing: DatabaseType;
  private static dbPath: string;
  // Filesystem path used by older builds for the private SQLite database.
  // The private db is now in-memory, but we still need this path so we can
  // delete any leftover file (and its WAL/SHM sidecars) at startup.
  private static legacyPrivateDbPath: string;

  public static init() {
    DatabaseManager.dbPath = path.join(app.getPath('userData'), 'database.db');
    DatabaseManager.db = new Database(DatabaseManager.dbPath, {});
    DatabaseManager.db.pragma('journal_mode = WAL');
    DatabaseManager.db.pragma('page_size = 8192');
    DatabaseManager.db.pragma('cache_size = 20000');
    DatabaseManager.db.pragma('synchronous = NORMAL');

    // Older builds stored the private db on disk at <userData>/private-database.db
    // and only deleted it on a graceful close. A crash or `kill -9` left the
    // file readable until the next launch. Delete any such leftover, then
    // create a fresh in-memory db so private browsing data is never written
    // to disk in the first place.
    DatabaseManager.legacyPrivateDbPath = path.join(
      app.getPath('userData'),
      'private-database.db'
    );
    DatabaseManager.deleteLegacyPrivateDbFile();
    DatabaseManager.dbForPrivateBrowsing = new Database(':memory:');

    DatabaseManager.buildSchema();

    //init all individual managers
    BookmarkManager.initListeners();
    DownloadManager.initListeners();
    BrowsingHistoryManager.initListeners();
  }

  public static closePrivateDatabase() {
    try {
      DatabaseManager.dbForPrivateBrowsing?.close();
    } catch {
      /* best-effort — fall through to recreate */
    }
    // Re-open an empty in-memory db so any subsequent private browsing
    // session starts with zero history, downloads, etc.
    DatabaseManager.dbForPrivateBrowsing = new Database(':memory:');
    const schemaManager = new SchemaManager(DatabaseManager.dbForPrivateBrowsing);
    schemaManager.applySchemas();
  }

  // Remove the on-disk private SQLite database left over from older builds
  // (file + WAL/SHM sidecars). Called once at startup.
  private static deleteLegacyPrivateDbFile() {
    for (const suffix of ['', '-wal', '-shm']) {
      const filePath = DatabaseManager.legacyPrivateDbPath + suffix;
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error(`Failed to delete ${filePath}:`, e);
        }
      }
    }
  }

  public static getDatabase(isPrivate: boolean): DatabaseType {
    if (isPrivate) {
      return DatabaseManager.dbForPrivateBrowsing;
    }
    return DatabaseManager.db;
  }

  public static buildSchema() {
    {
      // for non-private db
      const schemaManager = new SchemaManager(DatabaseManager.db);
      schemaManager.applySchemas();
    }
    {
      // for private db
      const schemaManager = new SchemaManager(DatabaseManager.dbForPrivateBrowsing);
      schemaManager.applySchemas();
    }
  }
}
