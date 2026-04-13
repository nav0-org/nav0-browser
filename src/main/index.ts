import { app } from 'electron';
import Store from 'electron-store';
import { AppWindowManager } from './browser/app-window-manager';
import { DataStoreManager } from './database/data-store-manager';
import { DownloadManager } from './browser/download-manager';
import { SessionManager } from './browser/session-manager';
import { SettingsEnforcer } from './settings/settings-enforcer';
import { startTestControlServer } from './test-control-server';

// Disable Chromium features that trigger macOS "Local Network" permission dialog.
// These features use mDNS/Bonjour for device discovery, which is unnecessary for
// a privacy-focused browser and causes an unwanted system permission prompt on macOS.
app.commandLine.appendSwitch('disable-features', [
  'MediaRouter',
  'DialMediaRouteProvider',
  'GlobalMediaControls',
].join(','));

// Read hardware acceleration setting early (before app is ready)
// because app.disableHardwareAcceleration() must be called before any BrowserWindow is created.
const earlySettingsStore = new Store({ name: 'browser-settings' });
const earlySettings = earlySettingsStore.get('default') as any;
if (earlySettings && earlySettings.hardwareAccelerationEnabled === false) {
  app.disableHardwareAcceleration();
}

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