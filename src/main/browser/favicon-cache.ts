import type { Database } from 'better-sqlite3';
import { MAX_FAVICON_BYTES } from './favicon-fetch';

// The longest icon kept: the largest a fetch takes, base64-encoded, with room
// for its data: header. A page's own data: icon can be no larger.
const MAX_DATA_URL_LENGTH = Math.ceil(MAX_FAVICON_BYTES / 3) * 4 + 256;

/**
 * The local copies of site icons, keyed by host, in the favicon table. A tab
 * saves its page's icon when the site reports one (fetched once, in the tab's
 * own session); the chrome and the built-in pages render only these copies,
 * never a remote URL. Each database keeps its own: a private window's go to the
 * in-memory one, and go with it.
 */
export abstract class FaviconCache {
  /** The key a page's icon is kept under: a web page's host, else null. */
  public static hostOf(url: string): string | null {
    try {
      const { protocol, hostname } = new URL(url);
      return (protocol === 'http:' || protocol === 'https:') && hostname ? hostname : null;
    } catch {
      return null;
    }
  }

  /** Keeps a data: URL as the icon of a page's host. */
  public static save(db: Database, pageUrl: string, dataUrl: string): void {
    const host = FaviconCache.hostOf(pageUrl);
    if (!host || !dataUrl.startsWith('data:') || dataUrl.length > MAX_DATA_URL_LENGTH) return;
    try {
      db.prepare(
        `INSERT INTO favicon (host, dataUrl) VALUES (?, ?)
         ON CONFLICT(host) DO UPDATE SET dataUrl = excluded.dataUrl
         WHERE dataUrl != excluded.dataUrl;`
      ).run(host, dataUrl);
    } catch {
      // Best-effort: the page shows its icon either way.
    }
  }

  /** The icon kept for a page's host, as a data: URL, or null. */
  public static get(db: Database, pageUrl: string): string | null {
    const host = FaviconCache.hostOf(pageUrl);
    if (!host) return null;
    const row = db.prepare('SELECT dataUrl FROM favicon WHERE host = ?;').get(host) as
      | { dataUrl: string }
      | undefined;
    return row?.dataUrl ?? null;
  }

  /**
   * Gives each record the icon kept for its URL's host, or null, in place of
   * whatever it had: a renderer gets no other.
   */
  public static attach<T extends { url: string; faviconUrl?: string | null }>(
    db: Database,
    records: T[]
  ): T[] {
    const found = new Map<string, string | null>();
    for (const record of records) {
      const host = FaviconCache.hostOf(record.url);
      if (host && !found.has(host)) found.set(host, FaviconCache.get(db, record.url));
      record.faviconUrl = host ? found.get(host) : null;
    }
    return records;
  }

  /**
   * Drops the icons of hosts no longer in the history or the bookmarks, so
   * clearing them leaves no trace of the sites in the cache.
   */
  public static prune(db: Database): void {
    const bookmarked = new Set(
      (db.prepare('SELECT url FROM bookmark;').all() as Array<{ url: string }>).map((row) =>
        FaviconCache.hostOf(row.url)
      )
    );
    const unvisited = db
      .prepare(
        'SELECT host FROM favicon WHERE host NOT IN (SELECT topLevelDomain FROM browsingHistory);'
      )
      .all() as Array<{ host: string }>;
    const remove = db.prepare('DELETE FROM favicon WHERE host = ?;');
    db.transaction(() => {
      for (const { host } of unvisited) {
        if (!bookmarked.has(host)) remove.run(host);
      }
    })();
  }
}
