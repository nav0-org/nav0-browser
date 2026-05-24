#!/usr/bin/env node
'use strict';

/**
 * Write a saved-session file so Nav0 reopens with multiple windows and a
 * realistic mix of tabs (~24–30 across 3 windows by default). The session is
 * picked up by Nav0's SessionManager:
 *
 *   - With `startupMode = continue` (default), Nav0 restores it automatically
 *     on the next launch.
 *   - With any other startup mode, the session is still saved and can be
 *     reopened via the "Restore previous session" affordance in the UI.
 *
 * Nav0 must be CLOSED while this script runs — Nav0 overwrites session-state
 * on its periodic save and on graceful shutdown, which would clobber the seed.
 *
 * Usage:
 *   node tests/test-data/seed-session.js
 *   node tests/test-data/seed-session.js --packaged
 *   node tests/test-data/seed-session.js --user-data=/path
 *   node tests/test-data/seed-session.js --windows=4 --tabs-per-window=8
 *   node tests/test-data/seed-session.js --layout=workReadingPersonal
 */

const fs = require('fs');
const path = require('path');

const { resolveUserDataPath, sessionStoreFilePath, parseCliArgs } = require('./lib/paths');
const { SESSION_LAYOUTS } = require('./lib/sample-data');

const args = parseCliArgs(process.argv);
const opts = {
  userDataPath: args['user-data'] && args['user-data'] !== true ? args['user-data'] : null,
  packaged: !!args.packaged,
  dev: !!args.dev,
  layout: typeof args.layout === 'string' ? args.layout : 'workReadingPersonal',
  windows: parseIntOr(args.windows, null),
  tabsPerWindow: parseIntOr(args['tabs-per-window'], null),
};

function parseIntOr(raw, fallback) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function faviconUrlFor(url) {
  try {
    return new URL(url).origin + '/favicon.ico';
  } catch {
    return null;
  }
}

function buildWindows() {
  const layout = SESSION_LAYOUTS[opts.layout];
  if (!layout) {
    const available = Object.keys(SESSION_LAYOUTS).join(', ');
    throw new Error(`Unknown layout "${opts.layout}". Available: ${available}`);
  }

  let groups = layout;
  if (opts.windows != null) {
    // Truncate or repeat to hit the requested window count.
    groups = [];
    for (let i = 0; i < opts.windows; i++) {
      groups.push(layout[i % layout.length]);
    }
  }

  return groups.map((group) => {
    let tabs = group.tabs;
    if (opts.tabsPerWindow != null) {
      tabs = [];
      for (let i = 0; i < opts.tabsPerWindow; i++) {
        tabs.push(group.tabs[i % group.tabs.length]);
      }
    }
    return {
      tabs: tabs.map((t) => ({
        url: t.url,
        title: t.title,
        faviconUrl: faviconUrlFor(t.url),
      })),
      activeTabIndex: 0,
    };
  });
}

function main() {
  const { userDataPath, productName } = resolveUserDataPath(opts);
  const sessionFile = sessionStoreFilePath(userDataPath);

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const windows = buildWindows();
  const totalTabs = windows.reduce((n, w) => n + w.tabs.length, 0);

  const sessionState = {
    windows,
    savedAt: Date.now(),
    restored: false,
  };

  // electron-store's on-disk format wraps the value under the "default" key —
  // see DataStoreManager.UNIVERSAL_KEY in src/main/database/data-store-manager.ts.
  const storeBody = { default: sessionState };
  fs.writeFileSync(sessionFile, JSON.stringify(storeBody, null, 2));

  console.log(`  userData:  ${userDataPath} (${productName})`);
  console.log(`  Wrote:     ${sessionFile}`);
  console.log(`  Layout:    ${opts.layout}`);
  console.log(`  Windows:   ${windows.length}`);
  console.log(`  Total tabs: ${totalTabs}`);
  console.log(
    `\n  Make sure Nav0 is closed before launching it — otherwise the running app will overwrite this file on its next periodic save.`
  );
  console.log(
    `  With startupMode = "continue" (default), Nav0 will restore this session on next launch.`
  );
}

try {
  main();
} catch (err) {
  console.error('seed-session failed:', err.message || err);
  process.exit(1);
}
