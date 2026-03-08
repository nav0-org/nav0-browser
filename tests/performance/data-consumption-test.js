#!/usr/bin/env node
'use strict';

/**
 * Data Consumption Comparison Test: Nav0 vs Chrome (Electron Chromium baseline)
 *
 * Measures ACTUAL network data transferred by each browser when loading
 * the same set of web pages, using the Chrome DevTools Protocol (CDP)
 * Network domain for precise per-request byte accounting.
 *
 * This captures ALL network activity including:
 *   - Page content (HTML, CSS, JS, images, fonts, media)
 *   - Background requests (telemetry, analytics, prefetch, service workers)
 *   - Third-party tracker requests
 *   - WebSocket frames
 *
 * Usage:
 *   node tests/performance/data-consumption-test.js
 *   node tests/performance/data-consumption-test.js --runs=3
 *   node tests/performance/data-consumption-test.js --urls-only=light
 *   node tests/performance/data-consumption-test.js --idle-monitor=30
 */

const puppeteer = require('puppeteer-core');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const os = require('os');

// ─── Configuration ──────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const REPORT_DIR = path.join(__dirname, 'reports');
const ELECTRON_BIN = require('electron');
const CHROME_HARNESS = path.join(__dirname, 'chrome-data-harness.js');
const IS_MAC = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';

const NAV0_DEBUG_PORT = 9229;
const CHROME_DEBUG_PORT = 9230;
const CHROME_CONTROL_PORT = 19280;

const PAGE_LOAD_TIMEOUT_MS = 30000;
const POST_LOAD_SETTLE_MS = 5000;   // Wait after DOMContentLoaded for async resources
const IDLE_MONITOR_SEC = 20;        // Monitor idle traffic after all pages loaded
const NUM_RUNS = 1;                 // Number of test runs for averaging

// Parse CLI args
const args = process.argv.slice(2).reduce((acc, a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  acc[k] = v || 'true';
  return acc;
}, {});

const RUNS = parseInt(args.runs || NUM_RUNS, 10);
const IDLE_MONITOR = parseInt(args['idle-monitor'] || IDLE_MONITOR_SEC, 10);

// ─── Test URLs ──────────────────────────────────────────────────────────────

const URL_SETS = {
  light: [
    'https://news.ycombinator.com',
    'https://text.npr.org',
    'https://en.wikipedia.org/wiki/Main_Page',
    'https://www.craigslist.org/about/sites',
    'https://lite.cnn.com',
  ],
  medium: [
    'https://developer.mozilla.org/en-US/',
    'https://docs.github.com',
    'https://stackoverflow.com/questions',
    'https://www.npmjs.com',
    'https://github.com/explore',
  ],
  heavy: [
    'https://www.reddit.com/r/programming/',
    'https://www.youtube.com',
    'https://www.bbc.com/news',
    'https://edition.cnn.com',
    'https://www.twitch.tv/directory',
  ],
};

const urlFilter = args['urls-only'];
const TEST_URLS = urlFilter && URL_SETS[urlFilter]
  ? URL_SETS[urlFilter]
  : [...URL_SETS.light, ...URL_SETS.medium, ...URL_SETS.heavy];

// ─── Utility Functions ──────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`  [${ts}] ${msg}`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

// ─── Process Helpers ────────────────────────────────────────────────────────

function getDescendantPids(pid) {
  try {
    // pgrep -P works on both Linux and macOS
    const out = execSync(`pgrep -P ${pid} 2>/dev/null`, { encoding: 'utf-8', timeout: 5000 }).trim();
    if (!out) return [];
    const children = out.split('\n').map(Number).filter(n => !isNaN(n) && n > 0);
    let all = [...children];
    for (const child of children) {
      all = all.concat(getDescendantPids(child));
    }
    return all;
  } catch {
    return [];
  }
}

function killTree(pid) {
  const descendants = getDescendantPids(pid);
  for (const p of descendants.reverse()) {
    try { process.kill(p, 'SIGKILL'); } catch {}
  }
  try { process.kill(pid, 'SIGKILL'); } catch {}
}

function findPidOnPort(port) {
  try {
    // lsof works on both macOS and Linux
    const out = execSync(`lsof -ti :${port} 2>/dev/null`, { encoding: 'utf-8' }).trim();
    const pid = parseInt(out.split('\n')[0], 10);
    return isNaN(pid) ? null : pid;
  } catch {
    if (IS_LINUX) {
      try {
        const out = execSync(`fuser ${port}/tcp 2>/dev/null`, { encoding: 'utf-8' }).trim();
        const pid = parseInt(out, 10);
        return isNaN(pid) ? null : pid;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function ensurePortFree(port) {
  const pid = findPidOnPort(port);
  if (pid) {
    log(`Port ${port} in use by PID ${pid}, killing...`);
    killTree(pid);
  }
}

function waitForPort(port, timeoutMs = 120000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`Timeout waiting for port ${port} after ${timeoutMs}ms`));
      }
      const sock = new net.Socket();
      sock.setTimeout(1000);
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => { sock.destroy(); setTimeout(attempt, 500); });
      sock.once('timeout', () => { sock.destroy(); setTimeout(attempt, 500); });
      sock.connect(port, '127.0.0.1');
    };
    attempt();
  });
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error from ${url}`)); }
      });
    }).on('error', reject);
  });
}

function httpPost(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'POST',
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Display Management ─────────────────────────────────────────────────────

let xvfbProcess = null;

function ensureDisplay() {
  if (IS_MAC) {
    log('macOS detected — no virtual display needed.');
    return;
  }
  if (process.env.DISPLAY) {
    log(`Using existing display: ${process.env.DISPLAY}`);
    return;
  }
  log('No DISPLAY detected. Starting Xvfb on :99...');
  xvfbProcess = spawn('Xvfb', [':99', '-screen', '0', '1920x1080x24', '-nolisten', 'tcp'], {
    stdio: 'ignore', detached: true,
  });
  xvfbProcess.unref();
  process.env.DISPLAY = ':99';
  log('Xvfb started on :99');
}

function cleanupDisplay() {
  if (xvfbProcess) {
    try { process.kill(-xvfbProcess.pid, 'SIGTERM'); } catch {}
    try { xvfbProcess.kill('SIGTERM'); } catch {}
    xvfbProcess = null;
  }
}

// ─── CDP Network Data Collection ────────────────────────────────────────────

/**
 * Collects all network data from a CDP session by attaching to every target.
 * Returns a collector object with methods to start/stop and retrieve results.
 */
function createNetworkCollector() {
  const requests = [];       // All completed requests with sizes
  const activeRequests = {};  // requestId -> partial data
  let totalEncodedReceived = 0;   // Bytes on the wire (compressed)
  let totalDecodedReceived = 0;   // Bytes after decompression
  let totalRequestBytes = 0;      // Bytes sent (headers + body)
  let requestCount = 0;
  let wsFramesReceived = 0;
  let wsFramesSent = 0;
  let wsBytesReceived = 0;
  let wsbytesSent = 0;

  function handleRequestWillBeSent(params) {
    activeRequests[params.requestId] = {
      url: params.request.url,
      method: params.request.method,
      type: params.type || 'Other',
      initiator: params.initiator?.type || 'other',
      timestamp: params.timestamp,
      requestHeadersBytes: estimateHeaderSize(params.request.headers),
      requestBodyBytes: params.request.postData ? params.request.postData.length : 0,
    };
  }

  function handleResponseReceived(params) {
    const req = activeRequests[params.requestId];
    if (req) {
      req.statusCode = params.response.status;
      req.mimeType = params.response.mimeType;
      req.responseHeadersBytes = estimateHeaderSize(params.response.headers);
      req.protocol = params.response.protocol || '';
      req.fromCache = params.response.fromDiskCache || params.response.fromServiceWorker || false;
      req.remoteAddress = params.response.remoteIPAddress || '';
    }
  }

  function handleDataReceived(params) {
    const req = activeRequests[params.requestId];
    if (req) {
      req.encodedDataLength = (req.encodedDataLength || 0) + params.encodedDataLength;
      req.decodedBodyLength = (req.decodedBodyLength || 0) + params.dataLength;
    }
  }

  function handleLoadingFinished(params) {
    const req = activeRequests[params.requestId];
    if (req) {
      // encodedDataLength on LoadingFinished is the total wire bytes for the request
      req.totalEncodedLength = params.encodedDataLength || req.encodedDataLength || 0;
      req.completed = true;

      const sentBytes = req.requestHeadersBytes + req.requestBodyBytes;
      const receivedEncoded = req.totalEncodedLength;
      const receivedDecoded = (req.responseHeadersBytes || 0) + (req.decodedBodyLength || 0);

      totalRequestBytes += sentBytes;
      totalEncodedReceived += receivedEncoded;
      totalDecodedReceived += receivedDecoded;
      requestCount++;

      requests.push({ ...req });
      delete activeRequests[params.requestId];
    }
  }

  function handleLoadingFailed(params) {
    const req = activeRequests[params.requestId];
    if (req) {
      req.failed = true;
      req.errorText = params.errorText;
      requests.push({ ...req });
      delete activeRequests[params.requestId];
    }
  }

  function handleWebSocketFrameReceived(params) {
    wsFramesReceived++;
    wsBytesReceived += (params.response?.payloadData?.length || 0);
  }

  function handleWebSocketFrameSent(params) {
    wsFramesSent++;
    wsbytesSent += (params.response?.payloadData?.length || 0);
  }

  function estimateHeaderSize(headers) {
    if (!headers) return 0;
    let size = 0;
    for (const [key, value] of Object.entries(headers)) {
      size += key.length + 2 + String(value).length + 2; // "Key: Value\r\n"
    }
    return size;
  }

  return {
    handlers: {
      'Network.requestWillBeSent': handleRequestWillBeSent,
      'Network.responseReceived': handleResponseReceived,
      'Network.dataReceived': handleDataReceived,
      'Network.loadingFinished': handleLoadingFinished,
      'Network.loadingFailed': handleLoadingFailed,
      'Network.webSocketFrameReceived': handleWebSocketFrameReceived,
      'Network.webSocketFrameSent': handleWebSocketFrameSent,
    },
    getResults() {
      return {
        totalEncodedReceived,
        totalDecodedReceived,
        totalRequestBytes,
        requestCount,
        wsFramesReceived,
        wsFramesSent,
        wsBytesReceived,
        wsbytesSent,
        requests: [...requests],
      };
    },
    reset() {
      requests.length = 0;
      Object.keys(activeRequests).forEach(k => delete activeRequests[k]);
      totalEncodedReceived = 0;
      totalDecodedReceived = 0;
      totalRequestBytes = 0;
      requestCount = 0;
      wsFramesReceived = 0;
      wsFramesSent = 0;
      wsBytesReceived = 0;
      wsbytesSent = 0;
    },
  };
}

/**
 * Attach the CDP Network domain to a Puppeteer CDPSession and wire up
 * the collector's event handlers.
 */
async function attachNetworkMonitor(cdpSession, collector) {
  await cdpSession.send('Network.enable', {
    maxTotalBufferSize: 10000000,
    maxResourceBufferSize: 5000000,
  });

  for (const [event, handler] of Object.entries(collector.handlers)) {
    cdpSession.on(event, handler);
  }
}

// ─── Chrome (Electron Chromium Baseline) Test ───────────────────────────────

async function testChromeDataConsumption() {
  log('[Chrome] Starting data consumption test...');
  ensurePortFree(CHROME_DEBUG_PORT);
  ensurePortFree(CHROME_CONTROL_PORT);

  const electronFlags = [
    `--remote-debugging-port=${CHROME_DEBUG_PORT}`,
    ...(IS_LINUX ? ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] : []),
    CHROME_HARNESS,
  ];
  const proc = spawn(ELECTRON_BIN, electronFlags, {
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
      CONTROL_PORT: String(CHROME_CONTROL_PORT),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stderr.on('data', () => {});
  // Watch for control server readiness
  let controlReady = false;
  proc.stdout.on('data', (d) => {
    if (d.toString().includes('CONTROL_READY')) controlReady = true;
  });

  const pid = proc.pid;

  try {
    log(`[Chrome] Waiting for debug port ${CHROME_DEBUG_PORT} (PID: ${pid})...`);
    await waitForPort(CHROME_DEBUG_PORT, 60000);
    await waitForPort(CHROME_CONTROL_PORT, 10000);
    await sleep(2000);

    // Connect via CDP
    const info = await httpGetJson(`http://127.0.0.1:${CHROME_DEBUG_PORT}/json/version`);
    const browser = await puppeteer.connect({
      browserWSEndpoint: info.webSocketDebuggerUrl,
      defaultViewport: null,
    });

    const collector = createNetworkCollector();

    // Phase 1: Load each URL and measure data consumed
    const perPageResults = [];
    log(`[Chrome] Loading ${TEST_URLS.length} pages sequentially...`);

    for (let i = 0; i < TEST_URLS.length; i++) {
      const testUrl = TEST_URLS[i];
      collector.reset();

      // Ask the harness to open a new BrowserWindow for this URL
      await httpPost(`http://127.0.0.1:${CHROME_CONTROL_PORT}/open?url=${encodeURIComponent(testUrl)}`);

      // Wait for the new target to appear in CDP
      await sleep(2000);

      // Find the target matching our URL
      const targets = await browser.targets();
      let targetPage = null;
      const testHostname = new URL(testUrl).hostname;

      for (const target of targets) {
        if (target.type() === 'page') {
          try {
            const p = await target.page();
            if (p && p.url().includes(testHostname)) {
              targetPage = p;
              break;
            }
          } catch {}
        }
      }

      if (targetPage) {
        const cdp = await targetPage.createCDPSession();
        await attachNetworkMonitor(cdp, collector);
        log(`[Chrome]   [${i + 1}/${TEST_URLS.length}] ${testUrl} (attached CDP)`);
      } else {
        log(`[Chrome]   [${i + 1}/${TEST_URLS.length}] ${testUrl} (could not attach CDP target)`);
      }

      // Wait for page to load + async resources
      await sleep(PAGE_LOAD_TIMEOUT_MS / 2);
      await sleep(POST_LOAD_SETTLE_MS);

      const pageData = collector.getResults();
      perPageResults.push({
        url: testUrl,
        ...summarizeResults(pageData),
        requestDetails: categorizeRequests(pageData.requests, testUrl),
      });
    }

    // Phase 2: Monitor idle/background traffic
    log(`[Chrome] Monitoring idle background traffic for ${IDLE_MONITOR}s...`);
    collector.reset();

    // Open a blank page via harness and monitor background activity
    await httpPost(`http://127.0.0.1:${CHROME_CONTROL_PORT}/open?url=${encodeURIComponent('about:blank')}`);
    await sleep(2000);

    const targets = await browser.targets();
    for (const target of targets) {
      if (target.type() === 'page') {
        try {
          const p = await target.page();
          if (p && p.url() === 'about:blank') {
            const idleCdp = await p.createCDPSession();
            await attachNetworkMonitor(idleCdp, collector);
            break;
          }
        } catch {}
      }
    }

    await sleep(IDLE_MONITOR * 1000);

    const idleData = collector.getResults();
    const idleResult = {
      ...summarizeResults(idleData),
      requests: idleData.requests.map(r => ({ url: r.url, type: r.type, bytes: r.totalEncodedLength || 0 })),
    };

    browser.disconnect();

    log('[Chrome] Data collection complete.');
    return { perPageResults, idleResult };
  } finally {
    killTree(pid);
    await sleep(2000);
  }
}

// ─── Nav0 Test ──────────────────────────────────────────────────────────────

async function testNav0DataConsumption() {
  log('[Nav0] Starting data consumption test...');
  ensurePortFree(NAV0_DEBUG_PORT);

  const nav0ElectronFlags = [
    `--remote-debugging-port=${NAV0_DEBUG_PORT}`,
    ...(IS_LINUX ? ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] : []),
  ];
  const nav0Proc = spawn('npx', [
    'electron-forge', 'start',
    '--',
    ...nav0ElectronFlags,
  ], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      REMOTE_DEBUGGING_PORT: String(NAV0_DEBUG_PORT),
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  nav0Proc.stderr.on('data', (d) => {
    const line = d.toString().trim();
    if (line.includes('Compil') || line.includes('webpack') || line.includes('Error') || line.includes('Launching')) {
      log(`[Nav0:stderr] ${line.slice(0, 120)}`);
    }
  });
  nav0Proc.stdout.on('data', (d) => {
    const line = d.toString().trim();
    if (line) log(`[Nav0:stdout] ${line.slice(0, 120)}`);
  });

  const spawnPid = nav0Proc.pid;

  try {
    log(`[Nav0] Waiting for webpack build and debug port ${NAV0_DEBUG_PORT} (PID: ${spawnPid})...`);
    await waitForPort(NAV0_DEBUG_PORT, 180000);
    log('[Nav0] Debug port ready. Waiting for app to initialize...');
    await sleep(5000);

    const info = await httpGetJson(`http://127.0.0.1:${NAV0_DEBUG_PORT}/json/version`);
    const browser = await puppeteer.connect({
      browserWSEndpoint: info.webSocketDebuggerUrl,
      defaultViewport: null,
    });

    // Find the main renderer page that has BrowserAPI
    const pages = await browser.pages();
    let mainPage = null;
    for (const page of pages) {
      if (page.url().includes('browser_layout')) {
        mainPage = page;
        break;
      }
    }
    if (!mainPage) {
      for (const page of pages) {
        try {
          const hasApi = await page.evaluate(() =>
            typeof window.BrowserAPI === 'object' && typeof window.BrowserAPI.createTab === 'function'
          );
          if (hasApi) { mainPage = page; break; }
        } catch {}
      }
    }
    if (!mainPage) {
      throw new Error(`Could not find Nav0 renderer among ${pages.length} pages`);
    }

    log('[Nav0] Found main renderer. Starting data measurement...');

    // For Nav0, we need to monitor network on each webContents target.
    // CDP allows us to attach to specific targets. We'll use the browser-level
    // CDP connection to monitor all targets.
    const perPageResults = [];
    log(`[Nav0] Loading ${TEST_URLS.length} pages sequentially via BrowserAPI...`);

    for (let i = 0; i < TEST_URLS.length; i++) {
      const url = TEST_URLS[i];
      const collector = createNetworkCollector();

      // Create tab via BrowserAPI
      try {
        await mainPage.evaluate(async (tabUrl) => {
          const api = window.BrowserAPI;
          if (api && api.createTab) {
            await api.createTab(api.appWindowId, tabUrl, false);
          }
        }, url);
      } catch (err) {
        log(`[Nav0]   Tab creation warning: ${err.message.slice(0, 80)}`);
      }

      // Wait for the new target to appear and attach CDP
      await sleep(2000);

      // Find the newly created target (web content page loading our URL)
      const targets = await browser.targets();
      let targetPage = null;

      for (const target of targets) {
        if (target.type() === 'page') {
          try {
            const p = await target.page();
            if (p) {
              const pageUrl = p.url();
              // Match by URL (the tab should be navigating to our test URL)
              if (pageUrl.includes(new URL(url).hostname)) {
                targetPage = p;
                break;
              }
            }
          } catch {}
        }
      }

      if (targetPage) {
        const cdp = await targetPage.createCDPSession();
        await attachNetworkMonitor(cdp, collector);
        log(`[Nav0]   [${i + 1}/${TEST_URLS.length}] ${url} (attached CDP)`);
      } else {
        log(`[Nav0]   [${i + 1}/${TEST_URLS.length}] ${url} (could not attach, using page-level monitoring)`);
      }

      // Wait for page to fully load + async resources
      await sleep(PAGE_LOAD_TIMEOUT_MS / 2);
      await sleep(POST_LOAD_SETTLE_MS);

      const pageData = collector.getResults();
      perPageResults.push({
        url,
        ...summarizeResults(pageData),
        requestDetails: categorizeRequests(pageData.requests, url),
      });
    }

    // Phase 2: Monitor idle/background traffic
    log(`[Nav0] Monitoring idle background traffic for ${IDLE_MONITOR}s...`);
    const idleCollector = createNetworkCollector();

    // Attach to main page for idle monitoring
    const idleCdp = await mainPage.createCDPSession();
    await attachNetworkMonitor(idleCdp, idleCollector);
    await sleep(IDLE_MONITOR * 1000);

    const idleData = idleCollector.getResults();
    const idleResult = {
      ...summarizeResults(idleData),
      requests: idleData.requests.map(r => ({ url: r.url, type: r.type, bytes: r.totalEncodedLength || 0 })),
    };

    browser.disconnect();
    log('[Nav0] Data collection complete.');
    return { perPageResults, idleResult };
  } finally {
    killTree(spawnPid);
    await sleep(3000);
  }
}

// ─── Result Analysis ────────────────────────────────────────────────────────

function summarizeResults(data) {
  return {
    totalBytesReceived: data.totalEncodedReceived,
    totalBytesReceivedDecoded: data.totalDecodedReceived,
    totalBytesSent: data.totalRequestBytes,
    totalRequests: data.requestCount,
    totalBytesTransferred: data.totalEncodedReceived + data.totalRequestBytes,
    webSocketBytesReceived: data.wsBytesReceived,
    webSocketBytesSent: data.wsbytesSent,
  };
}

function categorizeRequests(requests, pageUrl) {
  const pageHost = (() => { try { return new URL(pageUrl).hostname; } catch { return ''; } })();

  const categories = {
    firstParty: { count: 0, bytes: 0 },
    thirdParty: { count: 0, bytes: 0 },
    tracker: { count: 0, bytes: 0 },
    cached: { count: 0, bytes: 0 },
    failed: { count: 0 },
    byType: {},
  };

  // Common tracker/telemetry domains
  const TRACKER_PATTERNS = [
    /google-analytics\.com/,
    /googletagmanager\.com/,
    /googlesyndication\.com/,
    /doubleclick\.net/,
    /facebook\.net/,
    /fbcdn\.net/,
    /analytics\./,
    /telemetry\./,
    /tracking\./,
    /pixel\./,
    /beacon\./,
    /sentry\.io/,
    /hotjar\.com/,
    /segment\.com/,
    /mixpanel\.com/,
    /amplitude\.com/,
    /newrelic\.com/,
    /datadoghq\.com/,
    /crashlytics/,
    /scorecardresearch\.com/,
    /quantserve\.com/,
    /adsafeprotected\.com/,
    /moatads\.com/,
    /chartbeat\.com/,
    /optimizely\.com/,
    /taboola\.com/,
    /outbrain\.com/,
  ];

  for (const req of requests) {
    if (req.failed) {
      categories.failed.count++;
      continue;
    }

    const bytes = req.totalEncodedLength || 0;
    const reqHost = (() => { try { return new URL(req.url).hostname; } catch { return ''; } })();

    // Classify by type
    const type = req.type || 'Other';
    if (!categories.byType[type]) categories.byType[type] = { count: 0, bytes: 0 };
    categories.byType[type].count++;
    categories.byType[type].bytes += bytes;

    // Cached
    if (req.fromCache) {
      categories.cached.count++;
      categories.cached.bytes += bytes;
      continue;
    }

    // Tracker detection
    const isTracker = TRACKER_PATTERNS.some(p => p.test(req.url));
    if (isTracker) {
      categories.tracker.count++;
      categories.tracker.bytes += bytes;
    }

    // First vs third party
    if (pageHost && reqHost && (reqHost === pageHost || reqHost.endsWith('.' + pageHost))) {
      categories.firstParty.count++;
      categories.firstParty.bytes += bytes;
    } else {
      categories.thirdParty.count++;
      categories.thirdParty.bytes += bytes;
    }
  }

  return categories;
}

// ─── Report Generation ──────────────────────────────────────────────────────

function generateDataReport(chromeData, nav0Data) {
  const sep = '='.repeat(90);
  const thin = '-'.repeat(90);
  const lines = [];

  lines.push('');
  lines.push(sep);
  lines.push('          DATA CONSUMPTION COMPARISON: Nav0 vs Chrome');
  lines.push(sep);
  lines.push('');
  lines.push(`  System:      ${os.type()} ${os.arch()} | ${os.cpus().length} CPUs | ${(os.totalmem() / 1073741824).toFixed(1)} GB RAM`);
  lines.push(`  Date:        ${new Date().toISOString()}`);
  lines.push(`  Test URLs:   ${TEST_URLS.length} pages`);
  lines.push(`  Idle monitor: ${IDLE_MONITOR}s`);
  lines.push(`  Runs:        ${RUNS}`);
  lines.push(`  Chrome:      Electron's bundled Chromium (plain BrowserWindows)`);
  lines.push(`  Nav0:        Full nav0 browser with ad-blocking & privacy features`);
  lines.push('');

  // ── Per-page comparison ──
  lines.push(thin);
  lines.push('  PER-PAGE DATA CONSUMPTION (wire bytes received)');
  lines.push(thin);
  lines.push('  ' + pad('URL', 42) + pad('Chrome', 16) + pad('Nav0', 16) + pad('Diff', 18) + 'Winner');
  lines.push('  ' + '-'.repeat(86));

  let chromeTotalBytes = 0;
  let nav0TotalBytes = 0;
  let chromeTotalSent = 0;
  let nav0TotalSent = 0;
  let chromeTotalRequests = 0;
  let nav0TotalRequests = 0;

  for (let i = 0; i < TEST_URLS.length; i++) {
    const c = chromeData.perPageResults[i];
    const n = nav0Data.perPageResults[i];
    if (!c || !n) continue;

    const cBytes = c.totalBytesReceived;
    const nBytes = n.totalBytesReceived;
    chromeTotalBytes += cBytes;
    nav0TotalBytes += nBytes;
    chromeTotalSent += c.totalBytesSent;
    nav0TotalSent += n.totalBytesSent;
    chromeTotalRequests += c.totalRequests;
    nav0TotalRequests += n.totalRequests;

    const shortUrl = new URL(c.url).hostname.replace('www.', '').slice(0, 38);
    const diff = nBytes - cBytes;
    const pct = cBytes > 0 ? ((diff / cBytes) * 100).toFixed(1) : 'N/A';
    const sign = diff >= 0 ? '+' : '';
    const winner = nBytes <= cBytes ? 'Nav0' : 'Chrome';

    lines.push('  ' +
      pad(shortUrl, 42) +
      pad(formatBytes(cBytes), 16) +
      pad(formatBytes(nBytes), 16) +
      pad(`${sign}${pct}%`, 18) +
      winner
    );
  }

  // ── Totals ──
  lines.push('  ' + '-'.repeat(86));
  {
    const diff = nav0TotalBytes - chromeTotalBytes;
    const pct = chromeTotalBytes > 0 ? ((diff / chromeTotalBytes) * 100).toFixed(1) : 'N/A';
    const sign = diff >= 0 ? '+' : '';
    const winner = nav0TotalBytes <= chromeTotalBytes ? 'Nav0' : 'Chrome';
    lines.push('  ' +
      pad('TOTAL RECEIVED', 42) +
      pad(formatBytes(chromeTotalBytes), 16) +
      pad(formatBytes(nav0TotalBytes), 16) +
      pad(`${sign}${pct}%`, 18) +
      winner
    );
  }
  {
    const diff = nav0TotalSent - chromeTotalSent;
    const pct = chromeTotalSent > 0 ? ((diff / chromeTotalSent) * 100).toFixed(1) : 'N/A';
    const sign = diff >= 0 ? '+' : '';
    const winner = nav0TotalSent <= chromeTotalSent ? 'Nav0' : 'Chrome';
    lines.push('  ' +
      pad('TOTAL SENT', 42) +
      pad(formatBytes(chromeTotalSent), 16) +
      pad(formatBytes(nav0TotalSent), 16) +
      pad(`${sign}${pct}%`, 18) +
      winner
    );
  }
  lines.push('  ' +
    pad('TOTAL REQUESTS', 42) +
    pad(String(chromeTotalRequests), 16) +
    pad(String(nav0TotalRequests), 16) +
    pad(`${nav0TotalRequests - chromeTotalRequests}`, 18) +
    (nav0TotalRequests <= chromeTotalRequests ? 'Nav0' : 'Chrome')
  );
  lines.push('');

  // ── Request category breakdown ──
  lines.push(thin);
  lines.push('  REQUEST CATEGORY BREAKDOWN (aggregated across all pages)');
  lines.push(thin);

  const chromeAgg = aggregateCategories(chromeData.perPageResults);
  const nav0Agg = aggregateCategories(nav0Data.perPageResults);

  lines.push('  ' + pad('Category', 24) + pad('Chrome Reqs', 14) + pad('Chrome Bytes', 16) + pad('Nav0 Reqs', 14) + pad('Nav0 Bytes', 16));
  lines.push('  ' + '-'.repeat(84));

  for (const cat of ['firstParty', 'thirdParty', 'tracker', 'cached', 'failed']) {
    const cCat = chromeAgg[cat] || { count: 0, bytes: 0 };
    const nCat = nav0Agg[cat] || { count: 0, bytes: 0 };
    lines.push('  ' +
      pad(cat, 24) +
      pad(String(cCat.count), 14) +
      pad(formatBytes(cCat.bytes || 0), 16) +
      pad(String(nCat.count), 14) +
      pad(formatBytes(nCat.bytes || 0), 16)
    );
  }
  lines.push('');

  // ── Resource type breakdown ──
  lines.push(thin);
  lines.push('  RESOURCE TYPE BREAKDOWN');
  lines.push(thin);
  lines.push('  ' + pad('Type', 20) + pad('Chrome Reqs', 14) + pad('Chrome Bytes', 16) + pad('Nav0 Reqs', 14) + pad('Nav0 Bytes', 16));
  lines.push('  ' + '-'.repeat(80));

  const allTypes = new Set([...Object.keys(chromeAgg.byType || {}), ...Object.keys(nav0Agg.byType || {})]);
  const sortedTypes = [...allTypes].sort((a, b) => {
    const cb = (chromeAgg.byType?.[b]?.bytes || 0);
    const ca = (chromeAgg.byType?.[a]?.bytes || 0);
    return cb - ca;
  });

  for (const type of sortedTypes) {
    const cType = chromeAgg.byType?.[type] || { count: 0, bytes: 0 };
    const nType = nav0Agg.byType?.[type] || { count: 0, bytes: 0 };
    lines.push('  ' +
      pad(type, 20) +
      pad(String(cType.count), 14) +
      pad(formatBytes(cType.bytes), 16) +
      pad(String(nType.count), 14) +
      pad(formatBytes(nType.bytes), 16)
    );
  }
  lines.push('');

  // ── Idle background traffic ──
  lines.push(thin);
  lines.push(`  IDLE/BACKGROUND TRAFFIC (${IDLE_MONITOR}s monitoring period)`);
  lines.push(thin);
  lines.push(`  Chrome: ${chromeData.idleResult.totalRequests} requests, ${formatBytes(chromeData.idleResult.totalBytesReceived)} received, ${formatBytes(chromeData.idleResult.totalBytesSent)} sent`);
  lines.push(`  Nav0:   ${nav0Data.idleResult.totalRequests} requests, ${formatBytes(nav0Data.idleResult.totalBytesReceived)} received, ${formatBytes(nav0Data.idleResult.totalBytesSent)} sent`);

  if (chromeData.idleResult.requests.length > 0) {
    lines.push('');
    lines.push('  Chrome idle requests:');
    for (const r of chromeData.idleResult.requests.slice(0, 20)) {
      lines.push(`    ${r.type.padEnd(12)} ${formatBytes(r.bytes).padEnd(12)} ${r.url.slice(0, 70)}`);
    }
  }
  if (nav0Data.idleResult.requests.length > 0) {
    lines.push('');
    lines.push('  Nav0 idle requests:');
    for (const r of nav0Data.idleResult.requests.slice(0, 20)) {
      lines.push(`    ${r.type.padEnd(12)} ${formatBytes(r.bytes).padEnd(12)} ${r.url.slice(0, 70)}`);
    }
  }
  lines.push('');

  // ── Summary ──
  lines.push(sep);
  lines.push('  SUMMARY');
  lines.push(sep);
  lines.push('');

  const totalChrome = chromeTotalBytes + chromeTotalSent;
  const totalNav0 = nav0TotalBytes + nav0TotalSent;
  const savings = totalChrome > 0 ? (((totalChrome - totalNav0) / totalChrome) * 100).toFixed(1) : 'N/A';

  lines.push(`  Total data transferred (sent + received):`);
  lines.push(`    Chrome:  ${formatBytes(totalChrome)}`);
  lines.push(`    Nav0:    ${formatBytes(totalNav0)}`);
  lines.push(`    ${totalNav0 <= totalChrome ? `Nav0 saves ${savings}% data` : `Chrome saves ${(((totalNav0 - totalChrome) / totalNav0) * 100).toFixed(1)}% data`}`);
  lines.push('');

  const trackerSavings = chromeAgg.tracker.bytes > 0
    ? `Nav0 blocks ${formatBytes(chromeAgg.tracker.bytes - (nav0Agg.tracker.bytes || 0))} of tracker data`
    : 'No tracker data detected';
  lines.push(`  Tracker data: ${trackerSavings}`);

  const reqSavings = chromeTotalRequests - nav0TotalRequests;
  lines.push(`  Request reduction: ${reqSavings > 0 ? `Nav0 makes ${reqSavings} fewer requests (${((reqSavings / chromeTotalRequests) * 100).toFixed(1)}% fewer)` : `Nav0 makes ${-reqSavings} more requests`}`);
  lines.push('');
  lines.push(sep);

  const report = lines.join('\n');
  console.log(report);

  // Save reports
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const ts = timestamp();
  const jsonPath = path.join(REPORT_DIR, `data-consumption-${ts}.json`);
  const textPath = path.join(REPORT_DIR, `data-consumption-${ts}.txt`);

  const jsonReport = {
    timestamp: new Date().toISOString(),
    system: {
      platform: `${os.type()} ${os.arch()}`,
      cpus: os.cpus().length,
      totalMemoryGB: +(os.totalmem() / 1073741824).toFixed(1),
    },
    config: {
      testUrls: TEST_URLS,
      idleMonitorSec: IDLE_MONITOR,
      runs: RUNS,
      pageLoadTimeoutMs: PAGE_LOAD_TIMEOUT_MS,
      postLoadSettleMs: POST_LOAD_SETTLE_MS,
    },
    chrome: chromeData,
    nav0: nav0Data,
    summary: {
      chromeTotalTransferred: totalChrome,
      nav0TotalTransferred: totalNav0,
      dataSavingsPercent: totalNav0 <= totalChrome ? parseFloat(savings) : -parseFloat(savings),
      chromeRequests: chromeTotalRequests,
      nav0Requests: nav0TotalRequests,
    },
  };

  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  fs.writeFileSync(textPath, report);

  log(`Reports saved:`);
  log(`  JSON: ${jsonPath}`);
  log(`  Text: ${textPath}`);
}

function aggregateCategories(perPageResults) {
  const agg = {
    firstParty: { count: 0, bytes: 0 },
    thirdParty: { count: 0, bytes: 0 },
    tracker: { count: 0, bytes: 0 },
    cached: { count: 0, bytes: 0 },
    failed: { count: 0 },
    byType: {},
  };

  for (const page of perPageResults) {
    if (!page.requestDetails) continue;
    const d = page.requestDetails;
    for (const cat of ['firstParty', 'thirdParty', 'tracker', 'cached']) {
      agg[cat].count += d[cat]?.count || 0;
      agg[cat].bytes += d[cat]?.bytes || 0;
    }
    agg.failed.count += d.failed?.count || 0;

    if (d.byType) {
      for (const [type, val] of Object.entries(d.byType)) {
        if (!agg.byType[type]) agg.byType[type] = { count: 0, bytes: 0 };
        agg.byType[type].count += val.count || 0;
        agg.byType[type].bytes += val.bytes || 0;
      }
    }
  }

  return agg;
}

function pad(str, len) { return String(str).padEnd(len); }

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n  Data Consumption Comparison: Nav0 vs Chrome');
  console.log('  ' + '='.repeat(50));
  console.log(`  Test URLs:     ${TEST_URLS.length} pages`);
  console.log(`  Idle monitor:  ${IDLE_MONITOR}s`);
  console.log(`  Runs:          ${RUNS}`);
  console.log('');

  if (process.platform !== 'linux' && process.platform !== 'darwin') {
    console.error('  ERROR: This test requires Linux or macOS.');
    process.exit(1);
  }
  if (!fs.existsSync(ELECTRON_BIN)) {
    console.error(`  ERROR: Electron binary not found at ${ELECTRON_BIN}`);
    console.error('  Run: npm install');
    process.exit(1);
  }

  ensureDisplay();

  let chromeData = null;
  let nav0Data = null;

  // Chrome test
  try {
    log('Starting Chrome data consumption test...');
    chromeData = await testChromeDataConsumption();
  } catch (err) {
    log(`Chrome test FAILED: ${err.message}`);
    console.error(err.stack);
  }

  // Nav0 test
  try {
    log('Starting Nav0 data consumption test...');
    nav0Data = await testNav0DataConsumption();
  } catch (err) {
    log(`Nav0 test FAILED: ${err.message}`);
    console.error(err.stack);
  }

  if (chromeData && nav0Data) {
    generateDataReport(chromeData, nav0Data);
  } else {
    log('One or both tests failed. Cannot generate comparison report.');
    if (chromeData) {
      log('Chrome data collected successfully.');
      console.log(JSON.stringify(chromeData, null, 2));
    }
    if (nav0Data) {
      log('Nav0 data collected successfully.');
      console.log(JSON.stringify(nav0Data, null, 2));
    }
  }
}

main()
  .then(() => {
    cleanupDisplay();
    process.exit(0);
  })
  .catch((err) => {
    console.error(`\n  FATAL: ${err.message}`);
    console.error(err.stack);
    cleanupDisplay();
    process.exit(1);
  });
