#!/usr/bin/env node
'use strict';

/**
 * Seed Nav0's local SQLite database with realistic bookmarks, downloads, and
 * browsing history covering the last few months. Writes directly to the on-disk
 * database that the dev/packaged app already created (no Electron required).
 *
 * Run Nav0 once before this script so the database file exists and has the
 * latest schema applied.
 *
 * Usage:
 *   node tests/test-data/seed-database.js
 *   node tests/test-data/seed-database.js --packaged           # use ~/Library/.../Nav0 instead of Nav0 (Dev)
 *   node tests/test-data/seed-database.js --user-data=/path    # custom userData
 *   node tests/test-data/seed-database.js --clear              # wipe existing rows first
 *   node tests/test-data/seed-database.js --months=6 --history=1200 --bookmarks=40 --downloads=30
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { resolveUserDataPath, databaseFilePath, parseCliArgs } = require('./lib/paths');
const { BOOKMARKS, HISTORY_DOMAINS, DOWNLOAD_TEMPLATES } = require('./lib/sample-data');

// better-sqlite3 lives in the project's node_modules; require it from there so
// the script works no matter the current working directory.
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const Database = require(path.join(PROJECT_ROOT, 'node_modules', 'better-sqlite3'));

const args = parseCliArgs(process.argv);
const opts = {
  userDataPath: args['user-data'] && args['user-data'] !== true ? args['user-data'] : null,
  packaged: !!args.packaged,
  dev: !!args.dev,
  clear: !!args.clear,
  months: clampInt(args.months, 1, 24, 4),
  bookmarkCount: clampInt(args.bookmarks, 0, 500, BOOKMARKS.length),
  historyCount: clampInt(args.history, 0, 50000, 800),
  downloadCount: clampInt(args.downloads, 0, 500, DOWNLOAD_TEMPLATES.length),
};

function clampInt(raw, min, max, fallback) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function uuid() {
  return crypto.randomUUID();
}

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`  [${ts}] ${msg}`);
}

function topLevelDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function faviconUrlFor(url) {
  try {
    const u = new URL(url);
    return u.origin + '/favicon.ico';
  } catch {
    return '';
  }
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Distribute N entries across a date range, weighting the recent end more
 * heavily so the timeline looks like normal usage instead of a flat line.
 */
function generateTimestamps(count, monthsBack) {
  const end = Date.now();
  const start = end - monthsBack * 30 * 24 * 60 * 60 * 1000;
  const span = end - start;
  const out = [];
  for (let i = 0; i < count; i++) {
    // x^2 bias toward 1.0 → recent.
    const t = Math.pow(Math.random(), 2);
    out.push(new Date(end - t * span));
  }
  out.sort((a, b) => a.getTime() - b.getTime());
  return out;
}

function seedBookmarks(db, count, monthsBack) {
  const items = BOOKMARKS.slice(0, count);
  const stamps = generateTimestamps(items.length, monthsBack);
  const stmt = db.prepare(
    'INSERT INTO bookmark (id, title, url, createdDate, faviconUrl, type) VALUES (?, ?, ?, ?, ?, ?);'
  );
  const insertMany = db.transaction((rows) => {
    for (const row of rows)
      stmt.run(row.id, row.title, row.url, row.createdDate, row.faviconUrl, row.type);
  });
  const rows = items.map((b, i) => ({
    id: uuid(),
    title: b.title,
    url: b.url,
    createdDate: stamps[i].toISOString(),
    faviconUrl: faviconUrlFor(b.url),
    type: b.type || 'reference',
  }));
  insertMany(rows);
  return rows.length;
}

function seedHistory(db, count, monthsBack) {
  const stamps = generateTimestamps(count, monthsBack);
  const rows = [];
  for (let i = 0; i < count; i++) {
    const domain = pick(HISTORY_DOMAINS);
    const pathPart = pick(domain.paths);
    const url = domain.base + pathPart;
    const created = stamps[i];

    // Plausible time-on-page: most pages 10s–3min, a long tail to 30min.
    const activeDuration = Math.round(
      Math.random() < 0.85 ? randomBetween(8, 180) : randomBetween(180, 1800)
    );
    const totalDuration = activeDuration + Math.round(randomBetween(0, 120));
    const outTs = new Date(created.getTime() + totalDuration * 1000);

    // Title: append a "— search" hint when the path looks like a search query.
    let title = domain.title;
    if (pathPart.includes('q=')) {
      const q = decodeURIComponent(pathPart.split('q=')[1].split('&')[0]);
      title = `${q} — ${domain.title}`;
    } else if (pathPart.startsWith('/wiki/')) {
      title = pathPart.replace('/wiki/', '').replace(/_/g, ' ') + ' — Wikipedia';
    } else if (pathPart.startsWith('/package/')) {
      title = pathPart.replace('/package/', '') + ' — npm';
    }

    rows.push({
      id: uuid(),
      url,
      title,
      createdDate: created.toISOString(),
      topLevelDomain: topLevelDomain(url),
      faviconUrl: faviconUrlFor(url),
      totalDuration,
      activeDuration,
      outTimestamp: outTs.toISOString(),
    });
  }

  const stmt = db.prepare(
    'INSERT INTO browsingHistory (id, url, title, createdDate, topLevelDomain, faviconUrl, totalDuration, activeDuration, outTimestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);'
  );
  const insertMany = db.transaction((batch) => {
    for (const r of batch) {
      stmt.run(
        r.id,
        r.url,
        r.title,
        r.createdDate,
        r.topLevelDomain,
        r.faviconUrl,
        r.totalDuration,
        r.activeDuration,
        r.outTimestamp
      );
    }
  });
  insertMany(rows);
  return rows.length;
}

function seedDownloads(db, count, monthsBack) {
  const templates = DOWNLOAD_TEMPLATES.slice(0, count);
  const stamps = generateTimestamps(templates.length, monthsBack);

  // Pick a plausible download folder per platform.
  const downloadFolder =
    process.platform === 'win32'
      ? path.join(process.env.USERPROFILE || 'C:\\Users\\nav0', 'Downloads')
      : path.join(process.env.HOME || '/home/nav0', 'Downloads');

  const rows = templates.map((t, i) => {
    // 85% completed, 10% cancelled, 5% paused — looks like a real folder.
    const r = Math.random();
    let status;
    let receivedBytes;
    if (r < 0.85) {
      status = 'completed';
      receivedBytes = t.fileSize;
    } else if (r < 0.95) {
      status = 'cancelled';
      receivedBytes = Math.floor(t.fileSize * randomBetween(0.05, 0.6));
    } else {
      status = 'paused';
      receivedBytes = Math.floor(t.fileSize * randomBetween(0.1, 0.9));
    }
    return {
      id: uuid(),
      url: t.url,
      createdDate: stamps[i].toISOString(),
      fileName: t.fileName,
      fileExtension: t.fileExtension,
      fileType: t.fileType,
      fileSize: t.fileSize,
      fileLocation: path.join(downloadFolder, t.fileName),
      status,
      receivedBytes,
      urlChain: JSON.stringify([t.url]),
      eTag: '',
      lastModified: '',
      startTime: stamps[i].getTime() / 1000,
    };
  });

  const stmt = db.prepare(
    `INSERT INTO download
       (id, url, createdDate, fileName, fileExtension, fileType, fileSize, fileLocation,
        status, receivedBytes, urlChain, eTag, lastModified, startTime)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
  );
  const insertMany = db.transaction((batch) => {
    for (const r of batch) {
      stmt.run(
        r.id,
        r.url,
        r.createdDate,
        r.fileName,
        r.fileExtension,
        r.fileType,
        r.fileSize,
        r.fileLocation,
        r.status,
        r.receivedBytes,
        r.urlChain,
        r.eTag,
        r.lastModified,
        r.startTime
      );
    }
  });
  insertMany(rows);
  return rows.length;
}

function ensureTableExists(db, tableName) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?;")
    .get(tableName);
  return !!row;
}

function main() {
  const { userDataPath, productName } = resolveUserDataPath(opts);
  const dbPath = databaseFilePath(userDataPath);

  log(`Using userData: ${userDataPath} (${productName})`);
  log(`Database file:  ${dbPath}`);

  if (!fs.existsSync(dbPath)) {
    console.error(
      `\nDatabase not found at ${dbPath}.\n` +
        `Launch Nav0 once (npm run start) so the schema gets created, then re-run this script.\n`
    );
    process.exit(1);
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Refuse to write to a DB whose schema doesn't match what we expect.
  for (const t of ['bookmark', 'browsingHistory', 'download']) {
    if (!ensureTableExists(db, t)) {
      console.error(`Expected table "${t}" not found — open Nav0 once so the schema is applied.`);
      process.exit(1);
    }
  }

  if (opts.clear) {
    log('Clearing existing bookmark / browsingHistory / download rows...');
    db.exec('DELETE FROM bookmark; DELETE FROM browsingHistory; DELETE FROM download;');
  }

  let bookmarks = 0;
  let history = 0;
  let downloads = 0;

  if (opts.bookmarkCount > 0) {
    bookmarks = seedBookmarks(db, opts.bookmarkCount, opts.months);
    log(`Inserted ${bookmarks} bookmarks`);
  }
  if (opts.historyCount > 0) {
    history = seedHistory(db, opts.historyCount, opts.months);
    log(`Inserted ${history} browsing-history entries`);
  }
  if (opts.downloadCount > 0) {
    downloads = seedDownloads(db, opts.downloadCount, opts.months);
    log(`Inserted ${downloads} downloads`);
  }

  db.close();
  log(`Done. Spread across the last ~${opts.months} month(s).`);
}

try {
  main();
} catch (err) {
  console.error('seed-database failed:', err);
  process.exit(1);
}
