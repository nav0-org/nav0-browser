import { app } from 'electron';
import { AppWindowManager } from './browser/app-window-manager';
import { DataStoreManager } from './database/data-store-manager';
import { SettingsEnforcer } from './settings/settings-enforcer';

// Lightweight test control server for perf tests.
// Activated when REMOTE_DEBUGGING_PORT env var is set.
function startTestControlServer(port: number): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const http = require('http') as typeof import('http');
  const server = http.createServer((req: import('http').IncomingMessage, res: import('http').ServerResponse) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET' && req.url === '/status') {
      const win = AppWindowManager.getActiveWindow();
      res.end(JSON.stringify({ ready: true, hasWindow: !!win }));
      return;
    }

    if (req.method === 'POST' && req.url?.startsWith('/create-tab')) {
      const parsed = new URL(req.url, `http://localhost:${port}`);
      const tabUrl = parsed.searchParams.get('url') || 'about:blank';
      const win = AppWindowManager.getActiveWindow();
      if (win) {
        win.createTab(tabUrl, true).then(() => {
          res.end(JSON.stringify({ ok: true }));
        }).catch((err: Error) => {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        });
      } else {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'no active window' }));
      }
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
  });
  server.listen(port, '127.0.0.1');
}

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