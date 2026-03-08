// Minimal Electron app used as a Chrome/Chromium stand-in for data consumption testing.
// Creates BrowserWindows on demand via a simple HTTP control server.
//
// Usage: electron chrome-data-harness.js
// Requires --remote-debugging-port=<port> flag on the electron command line.
//
// Control API (HTTP on port CONTROL_PORT env var, default 19280):
//   POST /open?url=<encoded-url>  — Opens a new BrowserWindow navigating to the URL
//   POST /close-all               — Closes all windows
//   GET  /status                   — Returns { windowCount }

const { app, BrowserWindow } = require('electron');
const http = require('http');
const url = require('url');

const CONTROL_PORT = parseInt(process.env.CONTROL_PORT || '19280', 10);

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('disable-gpu');

const windows = [];

function createWindow(targetUrl) {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadURL(targetUrl);
  windows.push(win);
  win.on('closed', () => {
    const idx = windows.indexOf(win);
    if (idx !== -1) windows.splice(idx, 1);
  });
  return win;
}

app.whenReady().then(() => {
  // Start control server
  const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);

    if (parsed.pathname === '/open' && req.method === 'POST') {
      const targetUrl = parsed.query.url;
      if (!targetUrl) {
        res.writeHead(400);
        res.end('Missing ?url= parameter');
        return;
      }
      createWindow(targetUrl);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, windowCount: windows.length }));
    } else if (parsed.pathname === '/close-all' && req.method === 'POST') {
      for (const w of [...windows]) {
        try { w.close(); } catch {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } else if (parsed.pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ windowCount: windows.length }));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(CONTROL_PORT, '127.0.0.1', () => {
    // Signal readiness via stdout so the test script knows we're ready
    console.log(`CONTROL_READY:${CONTROL_PORT}`);
  });
});

app.on('window-all-closed', () => {
  // Keep running — the test harness will kill us when done.
});
