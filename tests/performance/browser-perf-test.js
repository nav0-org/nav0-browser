#!/usr/bin/env node
'use strict';

const puppeteer = require('puppeteer-core');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const os = require('os');

// ─── Configuration ──────────────────────────────────────────────────────────

const TAB_COUNTS = [10, 20, 30, 40, 50];
const SETTLE_TIME_MS = 8000;      // Wait after tabs are opened before measuring
const SAMPLE_DURATION_MS = 5000;  // Duration to sample CPU usage over
const PAGE_LOAD_TIMEOUT_MS = 20000;
const NAV0_DEBUG_PORT = 9229;
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const REPORT_DIR = path.join(__dirname, 'reports');
const ELECTRON_BIN = path.join(PROJECT_ROOT, 'node_modules/electron/dist/electron');
const CHROME_HARNESS = path.join(__dirname, 'chrome-harness.js');

const TEST_URLS = [
  // Light pages — minimal JS, mostly static text/HTML
  'https://news.ycombinator.com',                    // ~30 KB, plain HTML
  'https://lite.cnn.com',                            // text-only news
  'https://text.npr.org',                            // text-only public radio
  'https://en.wikipedia.org/wiki/Main_Page',         // mostly static HTML + images
  'https://www.craigslist.org/about/sites',          // minimal styling, static links

  // Medium pages — moderate JS, standard web apps
  'https://developer.mozilla.org/en-US/',            // docs site, moderate JS
  'https://docs.github.com',                         // docs with some JS interactivity
  'https://stackoverflow.com/questions',             // server-rendered + JS enhancements
  'https://www.npmjs.com',                           // React SPA, moderate bundle
  'https://github.com/explore',                      // server-rendered + Turbo

  // Heavy pages — large JS bundles, rich media, dynamic content
  'https://www.reddit.com/r/programming/',           // heavy React SPA, infinite scroll
  'https://www.youtube.com',                         // video player, large JS payload
  'https://www.bbc.com/news',                        // media-rich, ads, trackers
  'https://edition.cnn.com',                         // heavy media, video autoplay
  'https://www.twitch.tv/directory',                 // heavy SPA, live thumbnails
];

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

// ─── /proc Resource Measurement (Linux) ─────────────────────────────────────

function getDescendantPids(pid) {
  try {
    const out = execSync(`pgrep -P ${pid}`, { encoding: 'utf-8', timeout: 5000 }).trim();
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

function getProcessTree(pid) {
  return [pid, ...getDescendantPids(pid)];
}

function readCpuTicks(pid) {
  try {
    const raw = fs.readFileSync(`/proc/${pid}/stat`, 'utf-8');
    const afterComm = raw.slice(raw.lastIndexOf(')') + 2);
    const fields = afterComm.split(' ');
    const utime = parseInt(fields[11], 10) || 0;
    const stime = parseInt(fields[12], 10) || 0;
    return utime + stime;
  } catch {
    return 0;
  }
}

function readMemoryKB(pid) {
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, 'utf-8');
    const match = status.match(/VmRSS:\s+(\d+)\s+kB/);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
}

function readNetBytes(pid) {
  try {
    const raw = fs.readFileSync(`/proc/${pid}/net/dev`, 'utf-8');
    const lines = raw.trim().split('\n').slice(2);
    let rx = 0, tx = 0;
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts[0] === 'lo:') continue;
      rx += parseInt(parts[1], 10) || 0;
      tx += parseInt(parts[9], 10) || 0;
    }
    return { rx, tx };
  } catch {
    return { rx: 0, tx: 0 };
  }
}

function snapshotProcessTree(pid) {
  const pids = getProcessTree(pid);
  let memoryKB = 0, cpuTicks = 0;
  for (const p of pids) {
    memoryKB += readMemoryKB(p);
    cpuTicks += readCpuTicks(p);
  }
  const netData = readNetBytes(pid);
  return { processCount: pids.length, memoryKB, cpuTicks, net: netData };
}

function computeMetrics(snap1, snap2, elapsedSec, netBefore, netAfter) {
  const CLK_TCK = 100;
  const cpuDelta = (snap2.cpuTicks - snap1.cpuTicks) / CLK_TCK;
  const cpuPercent = +(cpuDelta / elapsedSec * 100).toFixed(2);
  const memoryMB = +(snap2.memoryKB / 1024).toFixed(2);
  const networkRxMB = +((netAfter.rx - netBefore.rx) / 1048576).toFixed(2);
  const networkTxMB = +((netAfter.tx - netBefore.tx) / 1048576).toFixed(2);
  return { processCount: snap2.processCount, memoryMB, cpuPercent, networkRxMB, networkTxMB };
}

// ─── Network Helpers ────────────────────────────────────────────────────────

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

async function getCDPWebSocketUrl(port) {
  const info = await httpGetJson(`http://127.0.0.1:${port}/json/version`);
  return info.webSocketDebuggerUrl;
}

function findPidOnPort(port) {
  try {
    const out = execSync(`lsof -ti :${port} 2>/dev/null`, { encoding: 'utf-8' }).trim();
    const pid = parseInt(out.split('\n')[0], 10);
    return isNaN(pid) ? null : pid;
  } catch {
    try {
      const out = execSync(`fuser ${port}/tcp 2>/dev/null`, { encoding: 'utf-8' }).trim();
      const pid = parseInt(out, 10);
      return isNaN(pid) ? null : pid;
    } catch {
      return null;
    }
  }
}

// ─── Display Management ─────────────────────────────────────────────────────

let xvfbProcess = null;

function ensureDisplay() {
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

// ─── Process Cleanup ────────────────────────────────────────────────────────

function killTree(pid) {
  const descendants = getDescendantPids(pid);
  for (const p of descendants.reverse()) {
    try { process.kill(p, 'SIGKILL'); } catch {}
  }
  try { process.kill(pid, 'SIGKILL'); } catch {}
}

function ensurePortFree(port) {
  const pid = findPidOnPort(port);
  if (pid) {
    log(`Port ${port} in use by PID ${pid}, killing...`);
    killTree(pid);
  }
}

// Wait for a process to print a specific marker on stdout
function waitForStdoutMarker(proc, marker, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for "${marker}" after ${timeoutMs}ms`));
    }, timeoutMs);

    const onData = (data) => {
      buf += data.toString();
      if (buf.includes(marker)) {
        clearTimeout(timer);
        proc.stdout.removeListener('data', onData);
        resolve();
      }
    };
    proc.stdout.on('data', onData);

    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Process exited with code ${code} before emitting "${marker}"`));
    });
  });
}

// ─── Chrome Test (Electron's Chromium with plain BrowserWindows) ────────────

async function testChrome(tabCount) {
  log(`[Chrome] Starting test with ${tabCount} tabs...`);

  const proc = spawn(ELECTRON_BIN, [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    CHROME_HARNESS,
    `--tabs=${tabCount}`,
    `--urls=${JSON.stringify(TEST_URLS)}`,
  ], {
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Drain stderr (Electron warnings)
  proc.stderr.on('data', () => {});

  const pid = proc.pid;

  try {
    log(`[Chrome] Waiting for harness to create ${tabCount} windows (PID: ${pid})...`);
    await waitForStdoutMarker(proc, 'PERF_READY', 60000);
    log(`[Chrome] All ${tabCount} windows created. Settling for ${SETTLE_TIME_MS / 1000}s...`);
    await sleep(SETTLE_TIME_MS);

    // Measure
    const netBefore = readNetBytes(pid);
    const snap1 = snapshotProcessTree(pid);
    const t0 = Date.now();
    await sleep(SAMPLE_DURATION_MS);
    const elapsed = (Date.now() - t0) / 1000;
    const snap2 = snapshotProcessTree(pid);
    const netAfter = readNetBytes(pid);

    const metrics = computeMetrics(snap1, snap2, elapsed, netBefore, netAfter);
    const result = { browser: 'Chrome', tabCount, ...metrics };
    log(`[Chrome] ${tabCount} tabs → Mem=${result.memoryMB}MB CPU=${result.cpuPercent}% Procs=${result.processCount} NetRx=${result.networkRxMB}MB`);
    return result;
  } finally {
    killTree(pid);
    await sleep(2000);
  }
}

// ─── Nav0 Test (electron-forge start + CDP) ─────────────────────────────────

async function testNav0(tabCount) {
  log(`[Nav0] Starting test with ${tabCount} tabs...`);
  ensurePortFree(NAV0_DEBUG_PORT);

  const nav0Proc = spawn('npx', [
    'electron-forge', 'start',
    '--', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  ], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      REMOTE_DEBUGGING_PORT: String(NAV0_DEBUG_PORT),
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderrBuf = '';
  nav0Proc.stderr.on('data', (d) => { stderrBuf += d.toString(); });
  nav0Proc.stdout.on('data', () => {}); // Drain stdout

  const spawnPid = nav0Proc.pid;

  try {
    log(`[Nav0] Waiting for webpack build and debug port ${NAV0_DEBUG_PORT}...`);
    await waitForPort(NAV0_DEBUG_PORT, 180000);
    log('[Nav0] Debug port ready. Waiting for app to initialize...');
    await sleep(5000);

    const wsUrl = await getCDPWebSocketUrl(NAV0_DEBUG_PORT);
    const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl, defaultViewport: null });

    // Find the actual Electron PID (the one listening on the debug port)
    const electronPid = findPidOnPort(NAV0_DEBUG_PORT) || spawnPid;
    log(`[Nav0] Connected (Electron PID: ${electronPid}). Finding main renderer...`);

    // Find the main browser layout page (the one that manages tabs)
    const pages = await browser.pages();
    let mainPage = null;
    // Priority 1: browser_layout page
    for (const page of pages) {
      if (page.url().includes('browser_layout')) {
        mainPage = page;
        break;
      }
    }
    // Priority 2: any page with BrowserAPI.createTab
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
      throw new Error(`Could not find Nav0 renderer among ${pages.length} pages: ${pages.map(p => p.url()).join(', ')}`);
    }

    log(`[Nav0] Found renderer. Creating ${tabCount} tabs via BrowserAPI...`);

    // Create tabs using the exposed BrowserAPI
    for (let i = 0; i < tabCount; i++) {
      const url = TEST_URLS[i % TEST_URLS.length];
      try {
        await mainPage.evaluate(async (tabUrl) => {
          const api = window.BrowserAPI;
          if (api && api.createTab) {
            await api.createTab(api.appWindowId, tabUrl, false);
          }
        }, url);
      } catch (err) {
        log(`[Nav0] Tab ${i + 1} creation warning: ${err.message.slice(0, 80)}`);
      }
      await sleep(300); // Avoid overwhelming IPC
      if ((i + 1) % 10 === 0 || i === tabCount - 1) {
        log(`[Nav0] Opened ${i + 1}/${tabCount} tabs`);
      }
    }

    log(`[Nav0] All tabs opened. Settling for ${SETTLE_TIME_MS / 1000}s...`);
    await sleep(SETTLE_TIME_MS);

    // Measure
    const netBefore = readNetBytes(electronPid);
    const snap1 = snapshotProcessTree(electronPid);
    const t0 = Date.now();
    await sleep(SAMPLE_DURATION_MS);
    const elapsed = (Date.now() - t0) / 1000;
    const snap2 = snapshotProcessTree(electronPid);
    const netAfter = readNetBytes(electronPid);

    const metrics = computeMetrics(snap1, snap2, elapsed, netBefore, netAfter);
    const result = { browser: 'Nav0', tabCount, ...metrics };
    log(`[Nav0] ${tabCount} tabs → Mem=${result.memoryMB}MB CPU=${result.cpuPercent}% Procs=${result.processCount} NetRx=${result.networkRxMB}MB`);

    browser.disconnect();
    return result;
  } catch (err) {
    log(`[Nav0] ERROR: ${err.message}`);
    if (stderrBuf) {
      const lastLines = stderrBuf.split('\n').slice(-5).join('\n');
      log(`[Nav0] Last stderr:\n${lastLines}`);
    }
    throw err;
  } finally {
    killTree(spawnPid);
    await sleep(3000);
  }
}

// ─── Report Generation ──────────────────────────────────────────────────────

function generateReport(chromeResults, nav0Results) {
  const sep = '='.repeat(80);
  const thin = '-'.repeat(80);
  const lines = [];

  lines.push('');
  lines.push(sep);
  lines.push('          BROWSER PERFORMANCE COMPARISON: Nav0 vs Chrome');
  lines.push(sep);
  lines.push('');
  lines.push(`  System:    ${os.type()} ${os.arch()} | ${os.cpus().length} CPUs | ${(os.totalmem() / 1073741824).toFixed(1)} GB RAM`);
  lines.push(`  Date:      ${new Date().toISOString()}`);
  lines.push(`  Settle:    ${SETTLE_TIME_MS / 1000}s | Sample: ${SAMPLE_DURATION_MS / 1000}s`);
  lines.push(`  Tab URLs:  ${TEST_URLS.length} rotating test URLs`);
  lines.push(`  Chrome:    Electron's bundled Chromium (plain BrowserWindows, no nav0 UI)`);
  lines.push('');

  // Build lookup maps
  const chromeMap = {};
  const nav0Map = {};
  for (const r of chromeResults) chromeMap[r.tabCount] = r;
  for (const r of nav0Results) nav0Map[r.tabCount] = r;

  // ── Memory Table ──
  lines.push(thin);
  lines.push('  MEMORY USAGE (MB) — Resident Set Size across all processes');
  lines.push(thin);
  lines.push(fmtHeader());
  for (const tc of TAB_COUNTS) {
    const c = chromeMap[tc], n = nav0Map[tc];
    if (c && n) lines.push(fmtRow(tc, c.memoryMB, n.memoryMB, 'MB'));
    else if (c) lines.push(fmtRowSingle(tc, 'Chrome', c.memoryMB, 'MB'));
    else if (n) lines.push(fmtRowSingle(tc, 'Nav0', n.memoryMB, 'MB'));
  }
  lines.push('');

  // ── CPU Table ──
  lines.push(thin);
  lines.push('  CPU USAGE (%) — Average during sample period');
  lines.push(thin);
  lines.push(fmtHeader());
  for (const tc of TAB_COUNTS) {
    const c = chromeMap[tc], n = nav0Map[tc];
    if (c && n) lines.push(fmtRow(tc, c.cpuPercent, n.cpuPercent, '%'));
    else if (c) lines.push(fmtRowSingle(tc, 'Chrome', c.cpuPercent, '%'));
    else if (n) lines.push(fmtRowSingle(tc, 'Nav0', n.cpuPercent, '%'));
  }
  lines.push('');

  // ── Network Rx Table ──
  lines.push(thin);
  lines.push('  NETWORK RECEIVED (MB) — During sample period');
  lines.push(thin);
  lines.push(fmtHeader());
  for (const tc of TAB_COUNTS) {
    const c = chromeMap[tc], n = nav0Map[tc];
    if (c && n) lines.push(fmtRow(tc, c.networkRxMB, n.networkRxMB, 'MB'));
  }
  lines.push('');

  // ── Network Tx Table ──
  lines.push(thin);
  lines.push('  NETWORK SENT (MB) — During sample period');
  lines.push(thin);
  lines.push(fmtHeader());
  for (const tc of TAB_COUNTS) {
    const c = chromeMap[tc], n = nav0Map[tc];
    if (c && n) lines.push(fmtRow(tc, c.networkTxMB, n.networkTxMB, 'MB'));
  }
  lines.push('');

  // ── Process Count ──
  lines.push(thin);
  lines.push('  PROCESS COUNT');
  lines.push(thin);
  lines.push(fmtHeader());
  for (const tc of TAB_COUNTS) {
    const c = chromeMap[tc], n = nav0Map[tc];
    if (c && n) lines.push(fmtRow(tc, c.processCount, n.processCount, ''));
  }
  lines.push('');

  // ── Summary ──
  const validPairs = TAB_COUNTS
    .map(tc => [chromeMap[tc], nav0Map[tc]])
    .filter(([c, n]) => c && n);

  if (validPairs.length > 0) {
    lines.push(sep);
    lines.push('  SUMMARY');
    lines.push(sep);
    lines.push('');

    const avgCM = avg(validPairs.map(([c]) => c.memoryMB));
    const avgNM = avg(validPairs.map(([, n]) => n.memoryMB));
    const memPct = pctDiff(avgCM, avgNM);
    lines.push(`  Avg Memory:   Chrome ${avgCM.toFixed(1)} MB  vs  Nav0 ${avgNM.toFixed(1)} MB  (${memPct}) → ${avgNM <= avgCM ? 'Nav0' : 'Chrome'} wins`);

    const avgCC = avg(validPairs.map(([c]) => c.cpuPercent));
    const avgNC = avg(validPairs.map(([, n]) => n.cpuPercent));
    const cpuPct = pctDiff(avgCC, avgNC);
    lines.push(`  Avg CPU:      Chrome ${avgCC.toFixed(2)}%  vs  Nav0 ${avgNC.toFixed(2)}%  (${cpuPct}) → ${avgNC <= avgCC ? 'Nav0' : 'Chrome'} wins`);

    const avgCR = avg(validPairs.map(([c]) => c.networkRxMB));
    const avgNR = avg(validPairs.map(([, n]) => n.networkRxMB));
    const rxPct = pctDiff(avgCR, avgNR);
    lines.push(`  Avg Net Rx:   Chrome ${avgCR.toFixed(2)} MB  vs  Nav0 ${avgNR.toFixed(2)} MB  (${rxPct}) → ${avgNR <= avgCR ? 'Nav0' : 'Chrome'} wins`);

    const avgCT = avg(validPairs.map(([c]) => c.networkTxMB));
    const avgNT = avg(validPairs.map(([, n]) => n.networkTxMB));
    const txPct = pctDiff(avgCT, avgNT);
    lines.push(`  Avg Net Tx:   Chrome ${avgCT.toFixed(2)} MB  vs  Nav0 ${avgNT.toFixed(2)} MB  (${txPct}) → ${avgNT <= avgCT ? 'Nav0' : 'Chrome'} wins`);

    lines.push('');
  }

  lines.push(sep);

  const report = lines.join('\n');
  console.log(report);

  // Save reports
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const ts = timestamp();
  const jsonPath = path.join(REPORT_DIR, `perf-report-${ts}.json`);
  const textPath = path.join(REPORT_DIR, `perf-report-${ts}.txt`);

  const jsonReport = {
    timestamp: new Date().toISOString(),
    system: {
      platform: `${os.type()} ${os.arch()}`,
      cpus: os.cpus().length,
      totalMemoryGB: +(os.totalmem() / 1073741824).toFixed(1),
    },
    config: {
      tabCounts: TAB_COUNTS,
      settleTimeMs: SETTLE_TIME_MS,
      sampleDurationMs: SAMPLE_DURATION_MS,
      testUrls: TEST_URLS,
    },
    results: { chrome: chromeResults, nav0: nav0Results },
  };

  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  fs.writeFileSync(textPath, report);

  log(`Reports saved:`);
  log(`  JSON: ${jsonPath}`);
  log(`  Text: ${textPath}`);
}

// ── Formatting helpers ──

function pad(str, len) { return String(str).padEnd(len); }

function fmtHeader() {
  return '  ' + pad('Tabs', 8) + pad('Chrome', 14) + pad('Nav0', 14) + pad('Diff', 18) + 'Winner';
}

function fmtRow(tabs, chromeVal, nav0Val, unit) {
  const diff = nav0Val - chromeVal;
  const base = chromeVal || 1;
  const pct = ((diff / base) * 100).toFixed(1);
  const sign = diff >= 0 ? '+' : '';
  const winner = nav0Val <= chromeVal ? 'Nav0' : 'Chrome';
  return '  ' +
    pad(tabs, 8) +
    pad(`${chromeVal}${unit}`, 14) +
    pad(`${nav0Val}${unit}`, 14) +
    pad(`${sign}${diff.toFixed(2)} (${sign}${pct}%)`, 18) +
    winner;
}

function fmtRowSingle(tabs, browser, val, unit) {
  return '  ' + pad(tabs, 8) + (browser === 'Chrome'
    ? pad(`${val}${unit}`, 14) + pad('N/A', 14)
    : pad('N/A', 14) + pad(`${val}${unit}`, 14)) + pad('—', 18) + '—';
}

function avg(nums) {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function pctDiff(base, other) {
  if (base === 0) return 'N/A';
  const diff = ((other - base) / base * 100).toFixed(1);
  const sign = other >= base ? '+' : '';
  return `${sign}${diff}%`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n  Browser Performance Comparison: Nav0 vs Chrome');
  console.log('  ' + '='.repeat(50));
  console.log(`  Tab counts: ${TAB_COUNTS.join(', ')}`);
  console.log(`  Test URLs:  ${TEST_URLS.length} rotating sites`);
  console.log(`  Settle:     ${SETTLE_TIME_MS / 1000}s  |  Sample: ${SAMPLE_DURATION_MS / 1000}s`);
  console.log('');

  // Prerequisites
  if (process.platform !== 'linux') {
    console.error('  ERROR: This test requires Linux (/proc filesystem).');
    process.exit(1);
  }
  if (!fs.existsSync(ELECTRON_BIN)) {
    console.error(`  ERROR: Electron binary not found at ${ELECTRON_BIN}`);
    console.error('  Run: npm install');
    process.exit(1);
  }

  ensureDisplay();

  const chromeResults = [];
  const nav0Results = [];

  for (const tabCount of TAB_COUNTS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  TEST CASE: ${tabCount} tabs`);
    console.log('─'.repeat(60));

    // Chrome test
    try {
      const result = await testChrome(tabCount);
      chromeResults.push(result);
    } catch (err) {
      log(`[Chrome] FAILED for ${tabCount} tabs: ${err.message}`);
    }

    // Nav0 test
    try {
      const result = await testNav0(tabCount);
      nav0Results.push(result);
    } catch (err) {
      log(`[Nav0] FAILED for ${tabCount} tabs: ${err.message}`);
    }
  }

  // Generate report
  generateReport(chromeResults, nav0Results);
}

// Entry point
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
