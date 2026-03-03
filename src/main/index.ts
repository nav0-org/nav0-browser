import { app } from 'electron';
import { AppWindowManager } from './browser/app-window-manager';
import { DataStoreManager } from './database/data-store-manager';
import { SettingsEnforcer } from './settings/settings-enforcer';

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