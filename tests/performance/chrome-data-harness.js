// Minimal Electron app used as a Chrome/Chromium stand-in for data consumption testing.
// Unlike the perf harness, this one does NOT pre-create windows — the test script
// creates pages via Puppeteer/CDP so it can attach Network monitors before navigation.
//
// Usage: electron chrome-data-harness.js
// Requires --remote-debugging-port=<port> flag on the electron command line.

const { app } = require('electron');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('disable-gpu');

app.whenReady().then(() => {
  // App is ready — the test script connects via CDP and drives everything.
  // We just need to keep the process alive.
});

app.on('window-all-closed', () => {
  // Keep running — the test harness will kill us when done.
});
