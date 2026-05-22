#!/usr/bin/env node
'use strict';

/**
 * Seed Nav0's local SQLite database with realistic bookmarks, downloads, and
 * browsing history. All timestamps are computed relative to `new Date()` —
 * spread across the last N days (default 120), with no dates baked into the
 * data itself. Writes directly to the on-disk database that the dev/packaged
 * app already created (no Electron required).
 *
 * Run Nav0 once before this script so the database file exists and has the
 * latest schema applied.
 *
 * Usage:
 *   node tests/test-data/seed-database.js
 *   node tests/test-data/seed-database.js --packaged           # use ~/Library/.../Nav0 instead of Nav0 (Dev)
 *   node tests/test-data/seed-database.js --user-data=/path    # custom userData
 *   node tests/test-data/seed-database.js --clear              # wipe existing rows first
 *   node tests/test-data/seed-database.js --days=180 --history=1200 --bookmarks=40 --downloads=30
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { resolveUserDataPath, databaseFilePath, parseCliArgs } = require('./lib/paths');
const {
  BOOKMARKS,
  HISTORY_DOMAINS,
  DOWNLOAD_TEMPLATES,
  LONG_TAIL_TOPICS,
  LONG_TAIL_SUBREDDITS,
  LONG_TAIL_GITHUB_REPOS,
} = require('./lib/sample-data');

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
  days: clampInt(args.days, 1, 365 * 2, 120),
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

function shuffled(arr) {
  // Fisher-Yates
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/**
 * Replace date placeholders in a string with values derived from `date`.
 * Supported tokens (case-sensitive):
 *   {YYYY-MM-DD}  2026-05-22
 *   {YYYY-MM}     2026-05
 *   {YYYY}        2026
 *   {MM}          05
 *   {DD}          22
 *   {Q}           2          (calendar quarter, 1-4)
 *   {mmmm}        may        (lowercase full month name)
 *   {MMMM}        May        (capitalised full month name)
 */
function formatWithDate(template, date) {
  if (!template || !template.includes('{')) return template;
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const monthLower = MONTH_NAMES[date.getMonth()];
  const monthCap = monthLower[0].toUpperCase() + monthLower.slice(1);
  const quarter = String(Math.floor(date.getMonth() / 3) + 1);
  return template
    .replace(/\{YYYY-MM-DD\}/g, `${yyyy}-${mm}-${dd}`)
    .replace(/\{YYYY-MM\}/g, `${yyyy}-${mm}`)
    .replace(/\{YYYY\}/g, yyyy)
    .replace(/\{MM\}/g, mm)
    .replace(/\{DD\}/g, dd)
    .replace(/\{Q\}/g, quarter)
    .replace(/\{mmmm\}/g, monthLower)
    .replace(/\{MMMM\}/g, monthCap);
}

/**
 * Distribute N entries across the last `daysBack` days from now, weighting the
 * recent end more heavily so the timeline looks like normal usage instead of a
 * flat line.
 */
function generateTimestamps(count, daysBack) {
  const end = Date.now();
  const start = end - daysBack * 24 * 60 * 60 * 1000;
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

function seedBookmarks(db, count, daysBack) {
  const items = shuffled(BOOKMARKS).slice(0, count);
  const stamps = generateTimestamps(items.length, daysBack);
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

// Generate a "long-tail" visit that isn't from the canonical domain rotation.
// Picks one of: search query, github repo, subreddit, wiki article. Returns
// { url, title } so it slots into seedHistory next to the canonical entries.
function generateLongTailEntry() {
  const kind = Math.random();
  if (kind < 0.4) {
    const q = pick(LONG_TAIL_TOPICS);
    const engine = Math.random() < 0.7 ? 'duckduckgo' : 'google';
    const url =
      engine === 'duckduckgo'
        ? `https://duckduckgo.com/?q=${encodeURIComponent(q)}`
        : `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    return { url, title: `${q} — ${engine === 'duckduckgo' ? 'DuckDuckGo' : 'Google'}` };
  }
  if (kind < 0.7) {
    const repo = pick(LONG_TAIL_GITHUB_REPOS);
    const tail = pick(['', '/issues', '/pulls', '/discussions', '/releases', '/wiki']);
    return { url: `https://github.com/${repo}${tail}`, title: `${repo} — GitHub` };
  }
  if (kind < 0.9) {
    const sub = pick(LONG_TAIL_SUBREDDITS);
    const tail = pick(['/', '/new/', '/top/', '/hot/']);
    return { url: `https://www.reddit.com/${sub}${tail}`, title: `${sub} — Reddit` };
  }
  const topic = pick(LONG_TAIL_TOPICS).split(' ').slice(0, 2).join('_');
  return {
    url: `https://en.wikipedia.org/wiki/${topic}`,
    title: `${topic.replace(/_/g, ' ')} — Wikipedia`,
  };
}

function seedHistory(db, count, daysBack) {
  const stamps = generateTimestamps(count, daysBack);
  const rows = [];
  for (let i = 0; i < count; i++) {
    let url;
    let title;
    // ~20% of rows come from the long-tail pool so the timeline doesn't read
    // as the same ~100 URLs repeated. The remainder rotate through the
    // canonical domains so popular sites still dominate the view.
    if (Math.random() < 0.2) {
      const entry = generateLongTailEntry();
      url = entry.url;
      title = entry.title;
    } else {
      const domain = pick(HISTORY_DOMAINS);
      const pathPart = pick(domain.paths);
      url = domain.base + pathPart;
      title = domain.title;
      if (pathPart.includes('q=')) {
        const q = decodeURIComponent(pathPart.split('q=')[1].split('&')[0]);
        title = `${q} — ${domain.title}`;
      } else if (pathPart.startsWith('/wiki/')) {
        title = pathPart.replace('/wiki/', '').replace(/_/g, ' ') + ' — Wikipedia';
      } else if (pathPart.startsWith('/package/')) {
        title = pathPart.replace('/package/', '') + ' — npm';
      }
    }

    const created = stamps[i];

    // Time-on-page distribution:
    //   10%   <5s (bounce — closed tab almost immediately)
    //   75%   5s-3min (normal read)
    //   12%   3-15min (deep read)
    //   3%    15-60min (left tab open while doing something else)
    const r = Math.random();
    let activeDuration;
    if (r < 0.1) activeDuration = Math.round(randomBetween(0, 5));
    else if (r < 0.85) activeDuration = Math.round(randomBetween(5, 180));
    else if (r < 0.97) activeDuration = Math.round(randomBetween(180, 900));
    else activeDuration = Math.round(randomBetween(900, 3600));

    // Total time = active + extra idle (tab open in background).
    const idle =
      Math.random() < 0.3 ? Math.round(randomBetween(0, 60)) : Math.round(randomBetween(60, 1800));
    const totalDuration = activeDuration + idle;
    const outTs = new Date(created.getTime() + totalDuration * 1000);

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

function seedDownloads(db, count, daysBack) {
  // Shuffle so a small --downloads=N picks a varied subset, and allow count to
  // exceed the template list by cycling through with a deduping suffix.
  const pool = shuffled(DOWNLOAD_TEMPLATES);
  const stamps = generateTimestamps(count, daysBack);

  // Pick a plausible download folder per platform.
  const downloadFolder =
    process.platform === 'win32'
      ? path.join(process.env.USERPROFILE || 'C:\\Users\\nav0', 'Downloads')
      : path.join(process.env.HOME || '/home/nav0', 'Downloads');

  const usedNames = new Set();
  const rows = stamps.map((created, i) => {
    const t = pool[i % pool.length];
    // Templates may embed {YYYY-MM} / {YYYY-MM-DD} / {Q} / {mmmm} so the
    // surfaced name and URL reflect the download's createdDate rather than
    // a date baked into the source.
    let fileName = formatWithDate(t.fileName, created);
    let url = formatWithDate(t.url, created);
    if (usedNames.has(fileName)) {
      // Insert a "-N" suffix before the extension to keep names unique when
      // the same template is reused without a date placeholder.
      const dot = fileName.lastIndexOf('.');
      let n = 2;
      let candidate;
      do {
        candidate =
          dot > 0 ? `${fileName.slice(0, dot)}-${n}${fileName.slice(dot)}` : `${fileName}-${n}`;
        n += 1;
      } while (usedNames.has(candidate));
      fileName = candidate;
      // Reflect the suffix in the URL too so urlChain stays self-consistent.
      const urlDot = url.lastIndexOf('.');
      url = urlDot > 0 ? `${url.slice(0, urlDot)}-${n - 1}${url.slice(urlDot)}` : `${url}-${n - 1}`;
    }
    usedNames.add(fileName);

    // Jitter the template size so repeated rows don't share the same byte
    // count (and so the rendered "1.2 MB / 3.4 MB" looks varied).
    const fileSize = Math.max(1, Math.floor(t.fileSize * randomBetween(0.75, 1.25)));

    // 85% completed, 10% cancelled, 5% paused — looks like a real folder.
    const r = Math.random();
    let status;
    let receivedBytes;
    if (r < 0.85) {
      status = 'completed';
      receivedBytes = fileSize;
    } else if (r < 0.95) {
      status = 'cancelled';
      receivedBytes = Math.floor(fileSize * randomBetween(0.05, 0.6));
    } else {
      status = 'paused';
      receivedBytes = Math.floor(fileSize * randomBetween(0.1, 0.9));
    }
    return {
      id: uuid(),
      url,
      createdDate: created.toISOString(),
      fileName,
      fileExtension: t.fileExtension,
      fileType: t.fileType,
      fileSize,
      fileLocation: path.join(downloadFolder, fileName),
      status,
      receivedBytes,
      urlChain: JSON.stringify([url]),
      eTag: '',
      lastModified: '',
      startTime: created.getTime() / 1000,
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
    bookmarks = seedBookmarks(db, opts.bookmarkCount, opts.days);
    log(`Inserted ${bookmarks} bookmarks`);
  }
  if (opts.historyCount > 0) {
    history = seedHistory(db, opts.historyCount, opts.days);
    log(`Inserted ${history} browsing-history entries`);
  }
  if (opts.downloadCount > 0) {
    downloads = seedDownloads(db, opts.downloadCount, opts.days);
    log(`Inserted ${downloads} downloads`);
  }

  db.close();
  log(`Done. Spread across the last ${opts.days} day(s), ending at ${new Date().toISOString()}.`);
}

try {
  main();
} catch (err) {
  console.error('seed-database failed:', err);
  process.exit(1);
}
