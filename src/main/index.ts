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
  } catch { /* ignore dialog failures so we never re-enter */ }
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

// Disable Chromium features that trigger macOS "Local Network" permission dialog.
// These features use mDNS/Bonjour for device discovery, which is unnecessary for
// a privacy-focused browser and causes an unwanted system permission prompt on macOS.
app.commandLine.appendSwitch('disable-features', [
  'MediaRouter',
  'DialMediaRouteProvider',
  'GlobalMediaControls',
].join(','));

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Initialize main window when app is ready
app.whenReady().then(async() => {
  await DataStoreManager.init();
  await SettingsEnforcer.init();
  await AppWindowManager.init();

  // Start test control server after everything is initialized
  const testPort = process.env.REMOTE_DEBUGGING_PORT ? parseInt(process.env.REMOTE_DEBUGGING_PORT, 10) : 0;
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

// Re-create window when dock icon is clicked (macOS)
app.on('activate', () => {
  AppWindowManager.createWindow(false);
});