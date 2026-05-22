'use strict';

/**
 * Shared helpers for locating Nav0's userData directory across platforms.
 *
 * Nav0 derives its userData directory from Electron's app.getPath('appData'):
 *   - macOS:   ~/Library/Application Support/<productName>
 *   - Linux:   $XDG_CONFIG_HOME or ~/.config/<productName>
 *   - Windows: %APPDATA%\<productName>
 *
 * The dev build (electron-forge start) overrides productName to "Nav0 (Dev)"
 * — see src/main/index.ts. Packaged builds use "Nav0".
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEV_PRODUCT_NAME = 'Nav0 (Dev)';
const PACKAGED_PRODUCT_NAME = 'Nav0';

function getAppDataRoot() {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support');
  }
  if (process.platform === 'win32') {
    return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  }
  // Linux / other unix
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
}

function userDataPathFor(productName) {
  return path.join(getAppDataRoot(), productName);
}

/**
 * Pick the userData directory to operate on.
 * Honors --user-data=<path>, then --packaged / --dev, then falls back to whichever
 * directory already exists (preferring dev), and finally creates the dev one.
 */
function resolveUserDataPath(opts = {}) {
  if (opts.userDataPath) {
    return { userDataPath: opts.userDataPath, productName: '(custom)' };
  }
  if (opts.packaged) {
    return {
      userDataPath: userDataPathFor(PACKAGED_PRODUCT_NAME),
      productName: PACKAGED_PRODUCT_NAME,
    };
  }
  if (opts.dev) {
    return { userDataPath: userDataPathFor(DEV_PRODUCT_NAME), productName: DEV_PRODUCT_NAME };
  }

  const devPath = userDataPathFor(DEV_PRODUCT_NAME);
  const packagedPath = userDataPathFor(PACKAGED_PRODUCT_NAME);
  if (fs.existsSync(devPath)) return { userDataPath: devPath, productName: DEV_PRODUCT_NAME };
  if (fs.existsSync(packagedPath)) {
    return { userDataPath: packagedPath, productName: PACKAGED_PRODUCT_NAME };
  }
  return { userDataPath: devPath, productName: DEV_PRODUCT_NAME };
}

function databaseFilePath(userDataPath) {
  return path.join(userDataPath, 'database.db');
}

function sessionStoreFilePath(userDataPath) {
  return path.join(userDataPath, 'session-state.json');
}

function parseCliArgs(argv) {
  const out = { _: [] };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq === -1) out[a.slice(2)] = true;
      else out[a.slice(2, eq)] = a.slice(eq + 1);
    } else {
      out._.push(a);
    }
  }
  return out;
}

module.exports = {
  DEV_PRODUCT_NAME,
  PACKAGED_PRODUCT_NAME,
  getAppDataRoot,
  userDataPathFor,
  resolveUserDataPath,
  databaseFilePath,
  sessionStoreFilePath,
  parseCliArgs,
};
