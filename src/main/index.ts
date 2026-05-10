import path from 'path';
import { app, dialog } from 'electron';
import { AppWindowManager } from './browser/app-window-manager';
import { DataStoreManager } from './database/data-store-manager';
import { DownloadManager } from './browser/download-manager';
import { SessionManager } from './browser/session-manager';
import { SettingsEnforcer } from './settings/settings-enforcer';
import { configureUserAgentFallback } from './browser/ua-switcher';
import { startTestControlServer } from './test-control-server';

// Global error handlers — keep the browser alive when a stray exception
// or unhandled rejection escapes a handler. Without these, Electron shows
// its default fatal-crash dialog and the window goes away.
let lastErrorDialogAt = 0;
const ERROR_DIALOG_COOLDOWN_MS = 5000;
function showErrorDialogThrottled(title: string, message: string): void {
  const now = Date.now();
  if (now - lastErrorDialogAt < ERROR_DIALOG_COOLDOWN_MS) return;
  lastErrorDialogAt = now;
  try {
    dialog.showErrorBox(title, message);
  } catch {
    /* ignore dialog failures so we never re-enter */
  }
}
process.on('uncaughtException', (err: Error) => {
  console.error('[main] uncaughtException:', err);
  showErrorDialogThrottled(
    'Nav0 encountered an unexpected error',
    `The browser will keep running, but some features may be unstable.\n\n${err?.stack || err?.message || String(err)}`
  );
});
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[main] unhandledRejection:', reason);
});

// Strip "Electron/..." and "nav0-browser/..." tokens from the default User-Agent
// and zero Chrome minor-version numbers so sites that fingerprint the UA (e.g.
// Cloudflare Turnstile) don't flag webContents we haven't explicitly configured.
// Must run before any BrowserWindow / WebContentsView is created.
configureUserAgentFallback();

// Isolate dev from the installed Nav0 and avoid the macOS Keychain dependency.
// The dev binary runs from node_modules/electron (CFBundleName "Electron"),
// so it would otherwise share userData with the installed app but try to
// derive its OSCrypt key from a different keychain entry — and on unsigned
// dev builds that entry often can't be created at all, leaving Chromium with
// a per-process random key and cookies that vanish on the next launch.
// Production keeps real OSCrypt via the EnableCookieEncryption fuse.
if (!app.isPackaged) {
  app.setPath('userData', path.join(app.getPath('appData'), 'Nav0 (Dev)'));
  app.commandLine.appendSwitch('use-mock-keychain');
}

// Disable Chromium features that trigger macOS "Local Network" permission dialog.
// These features use mDNS/Bonjour for device discovery, which is unnecessary for
// a privacy-focused browser and causes an unwanted system permission prompt on macOS.
app.commandLine.appendSwitch(
  'disable-features',
  ['MediaRouter', 'DialMediaRouteProvider', 'GlobalMediaControls'].join(',')
);

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Initialize main window when app is ready
app.whenReady().then(async () => {
  await DataStoreManager.init();
  await SettingsEnforcer.init();
  await AppWindowManager.init();

  // Start test control server after everything is initialized
  const testPort = process.env.REMOTE_DEBUGGING_PORT
    ? parseInt(process.env.REMOTE_DEBUGGING_PORT, 10)
    : 0;
  if (testPort > 0) {
    startTestControlServer(testPort);
  }
});

// Save session state before quit (must run before downloads/settings cleanup)
app.on('before-quit', () => {
  SessionManager.stopPeriodicSave();
  SessionManager.saveCurrentSession();
});

// Pause all in-progress downloads before quitting so they can be resumed later
app.on('before-quit', () => {
  DownloadManager.pauseAllDownloads();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle "clear on close" settings on graceful quit
app.on('before-quit', async () => {
  await SettingsEnforcer.onBeforeQuit();
});

// Restore an existing window when the dock icon is clicked (macOS). Only fall
// back to creating a new window if every window has been closed — matching the
// platform convention used by Safari, Chrome, and Finder.
app.on('activate', () => {
  const existing = AppWindowManager.getActiveWindow() ?? AppWindowManager.getWindows()[0];
  if (existing) {
    const bw = existing.getBrowserWindowInstance();
    if (bw) {
      if (bw.isMinimized()) bw.restore();
      bw.focus();
      return;
    }
  }
  AppWindowManager.createWindow(false);
});

// HTTP basic / proxy authentication. Show an in-app overlay rather than
// letting Chromium fall back to its native auth dialog (which bypasses our
// chrome). If we can't resolve the owning window we leave the event alone so
// the default behavior (cancel / platform dialog) still applies.
app.on('login', (event, webContents, request, authInfo, callback) => {
  const window = AppWindowManager.findWindowByWebContentsId(webContents.id);
  if (!window) return;
  event.preventDefault();

  // Activate the triggering tab so the credentials dialog appears in context
  // rather than over an unrelated tab.
  const tab = window.findTabByWebContentsId(webContents.id);
  if (tab && window.getActiveTabId() !== tab.id) {
    window.activateTab(tab.id, false);
  }
  window.getBrowserWindowInstance()?.focus();

  window.showBasicAuthOverlay(
    {
      host: authInfo.host,
      port: authInfo.port,
      realm: authInfo.realm,
      isProxy: authInfo.isProxy,
      scheme: authInfo.scheme,
      url: request.url,
    },
    (creds) => {
      if (creds) {
        callback(creds.username, creds.password);
      } else {
        // Cancel the auth challenge: calling the callback with no arguments
        // tells Chromium to cancel the request.
        callback();
      }
    }
  );
});
