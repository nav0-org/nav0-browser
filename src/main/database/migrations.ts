import type { Database } from 'better-sqlite3';
import { FaviconCache } from '../browser/favicon-cache';

// Data migrations, oldest first. A database runs each one once, in order and in
// a transaction of its own; PRAGMA user_version counts the ones it has run (see
// SchemaManager). Only ever append to this list.
export const MIGRATIONS: Array<(db: Database) => void> = [
  // Site icons move from the history and bookmark rows to the favicon cache.
  // A row's icon was a local copy, or a remote URL (often a guessed
  // /favicon.ico) that the built-in pages fetched each time they showed it:
  // each host keeps its newest local copy, and the rows keep none.
  (db) => {
    const newest = new Map<string, { url: string; dataUrl: string; createdDate: string }>();
    for (const table of ['bookmark', 'browsingHistory']) {
      const rows = db
        .prepare(
          `SELECT url, faviconUrl, createdDate FROM ${table} WHERE faviconUrl LIKE 'data:%';`
        )
        .iterate() as IterableIterator<{ url: string; faviconUrl: string; createdDate: string }>;
      for (const { url, faviconUrl, createdDate } of rows) {
        const host = FaviconCache.hostOf(url);
        if (!host || newest.get(host)?.createdDate > createdDate) continue;
        newest.set(host, { url, dataUrl: faviconUrl, createdDate });
      }
    }
    for (const { url, dataUrl } of newest.values()) FaviconCache.save(db, url, dataUrl);
    db.prepare('UPDATE browsingHistory SET faviconUrl = NULL WHERE faviconUrl IS NOT NULL;').run();
    db.prepare('UPDATE bookmark SET faviconUrl = NULL WHERE faviconUrl IS NOT NULL;').run();
  },
];
