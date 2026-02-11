import { app } from "electron";
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { SchemaManager } from "./schema-manager";
import { BookmarkManager } from "../browser/bookmark-manager";
import { DownloadManager } from "../browser/download-manager";
import { BrowsingHistoryManager } from "../browser/browsing-history-manager";

export abstract class DatabaseManager{
  private static db: DatabaseType;
  private static dbForPrivateBrowsing: DatabaseType;
  private static dbPath: string;
  private static dbPathForPrivateBrowsing: string;


  public static init(){
    DatabaseManager.dbPath = path.join(app.getPath('userData'), 'database.db');
    DatabaseManager.db = new Database(DatabaseManager.dbPath, { });
    DatabaseManager.db.pragma('journal_mode = WAL');
    DatabaseManager.db.pragma('page_size = 8192');
    DatabaseManager.db.pragma('cache_size = 20000');
    DatabaseManager.db.pragma('synchronous = NORMAL');

    DatabaseManager.dbPathForPrivateBrowsing = path.join(app.getPath('userData'), 'private-database.db');
    DatabaseManager.dbForPrivateBrowsing = new Database(DatabaseManager.dbPathForPrivateBrowsing, { });
    DatabaseManager.dbForPrivateBrowsing.pragma('journal_mode = WAL');
    DatabaseManager.dbForPrivateBrowsing.pragma('page_size = 8192');
    DatabaseManager.dbForPrivateBrowsing.pragma('cache_size = 20000');
    DatabaseManager.dbForPrivateBrowsing.pragma('synchronous = NORMAL');

    DatabaseManager.buildSchema();

    //init all individual managers
    BookmarkManager.initListeners();
    DownloadManager.initListeners();
    BrowsingHistoryManager.initListeners();
  }

  public static closePrivateDatabase(){
    if (fs.existsSync(DatabaseManager.dbPathForPrivateBrowsing)) {
      fs.unlinkSync(DatabaseManager.dbPathForPrivateBrowsing);
    }
    DatabaseManager.dbForPrivateBrowsing = new Database(DatabaseManager.dbPathForPrivateBrowsing);
  }

  public static getDatabase(isPrivate: boolean): DatabaseType{
    if(isPrivate){
      return DatabaseManager.dbForPrivateBrowsing;
    }
    return DatabaseManager.db;
  }
  
  public static buildSchema(){
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