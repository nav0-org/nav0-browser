// Minimal Electron app used as a Chrome/Chromium stand-in for performance testing.
// Creates plain BrowserWindows (no nav0 UI) to represent vanilla Chromium behavior.
//
// Usage: electron chrome-harness.js --tabs=<N> --urls=<JSON array>
// Prints "PERF_READY" to stdout when all windows are created and URLs are loading.

const { app, BrowserWindow } = require('electron');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('disable-gpu');

const tabArg = process.argv.find((a) => a.startsWith('--tabs='));
const urlsArg = process.argv.find((a) => a.startsWith('--urls='));
const tabCount = tabArg ? parseInt(tabArg.split('=')[1], 10) : 10;

let urls;
try {
  // --urls= may contain '=' inside the JSON, so rejoin after the first '='
  const raw = urlsArg ? urlsArg.slice('--urls='.length) : null;
  urls = raw ? JSON.parse(raw) : ['data:text/html,<h1>Test</h1>'];
} catch {
  urls = ['data:text/html,<h1>Test</h1>'];
}

const windows = [];

app.whenReady().then(async () => {
  for (let i = 0; i < tabCount; i++) {
    const url = urls[i % urls.length];
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    win.loadURL(url);
    windows.push(win);
  }
  // Signal readiness to the test runner
  process.stdout.write('PERF_READY\n');
});

app.on('window-all-closed', () => {
  // Keep running — the test harness will kill us when done.
});
