#!/usr/bin/env node
'use strict';

//
// macOS Desktop Performance Test: Nav0 vs Chrome
//
// Run locally on your Mac with both browsers installed:
//   npx puppeteer-core   # (or npm i puppeteer-core in this dir)
//   node tests/performance/browser-perf-test-mac.js
//
// Requires: puppeteer-core, Node.js 18+
//

const puppeteer = require('puppeteer-core');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const os = require('os');

// ─── Configuration ──────────────────────────────────────────────────────────

const TAB_COUNTS = [10, 20, 30, 40, 50];
const SETTLE_TIME_MS = 8000;
const SAMPLE_DURATION_MS = 5000;
const CHROME_DEBUG_PORT = 9222;
const NAV0_DEBUG_PORT = 9229;
const REPORT_DIR = path.join(__dirname, 'reports');

// App paths — auto-detected; override with env vars CHROME_BIN / NAV0_BIN
const CHROME_BIN = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const NAV0_CANDIDATES = [
  path.join(os.homedir(), 'Desktop/nav0-browser.app/Contents/MacOS/nav0-browser'),
  '/Applications/nav0-browser.app/Contents/MacOS/nav0-browser',
];
const NAV0_BIN = process.env.NAV0_BIN || NAV0_CANDIDATES.find(p => fs.existsSync(p)) || NAV0_CANDIDATES[1];

const TEST_URLS = [
  // Light pages
  'https://news.ycombinator.com',
  'https://lite.cnn.com',
  'https://text.npr.org',
  'https://en.wikipedia.org/wiki/Main_Page',
  'https://www.craigslist.org/about/sites',

  // Medium pages
  'https://developer.mozilla.org/en-US/',
  'https://docs.github.com',
  'https://stackoverflow.com/questions',
  'https://www.npmjs.com',
  'https://github.com/explore',

  // Heavy pages
  'https://www.reddit.com/r/programming/',
  'https://www.youtube.com',
  'https://www.bbc.com/news',
  'https://edition.cnn.com',
  'https://www.twitch.tv/directory',
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

// ─── macOS Resource Measurement (via ps) ────────────────────────────────────

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

function getMemoryKB(pid) {
  try {
    // ps -o rss= gives resident set size in KB
    const out = execSync(`ps -o rss= -p ${pid}`, { encoding: 'utf-8', timeout: 5000 }).trim();
    return parseInt(out, 10) || 0;
  } catch {
    return 0;
  }
}

function getCpuPercent(pid) {
  try {
    // ps -o %cpu= gives instantaneous CPU% (of one core)
    const out = execSync(`ps -o %cpu= -p ${pid}`, { encoding: 'utf-8', timeout: 5000 }).trim();
    return parseFloat(out) || 0;
  } catch {
    return 0;
  }
}

function snapshotProcessTree(pid) {
  const pids = getProcessTree(pid);
  let memoryKB = 0;
  let cpuPercent = 0;
  for (const p of pids) {
    memoryKB += getMemoryKB(p);
    cpuPercent += getCpuPercent(p);
  }
  return { processCount: pids.length, memoryKB, cpuPercent: +cpuPercent.toFixed(2) };
}

// Sample CPU multiple times over SAMPLE_DURATION_MS and average it
async function measureResources(pid, durationMs) {
  const samples = [];
  const interval = 1000; // sample every second
  const count = Math.max(1, Math.floor(durationMs / interval));
  for (let i = 0; i < count; i++) {
    samples.push(snapshotProcessTree(pid));
    if (i < count - 1) await sleep(interval);
  }
  const last = samples[samples.length - 1];
  const avgCpu = +(samples.reduce((s, x) => s + x.cpuPercent, 0) / samples.length).toFixed(2);
  const memoryMB = +(last.memoryKB / 1024).toFixed(2);
  return {
    processCount: last.processCount,
    memoryMB,
    cpuPercent: avgCpu,
  };
}

// ─── Network Helpers ────────────────────────────────────────────────────────

function waitForPort(port, timeoutMs = 60000) {
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
    return null;
  }
}

// ─── Process Cleanup ────────────────────────────────────────────────────────

function killTree(pid) {
  const descendants = getDescendantPids(pid);
  for (const p of descendants.reverse()) {
    try { process.kill(p, 'SIGTERM'); } catch {}
  }
  try { process.kill(pid, 'SIGTERM'); } catch {}
  // Give a moment then force kill stragglers
  setTimeout(() => {
    for (const p of [...descendants, pid]) {
      try { process.kill(p, 'SIGKILL'); } catch {}
    }
  }, 2000);
}

function ensurePortFree(port) {
  const pid = findPidOnPort(port);
  if (pid) {
    log(`Port ${port} in use by PID ${pid}, killing...`);
    killTree(pid);
  }
}

// ─── Chrome Test (real Chrome via CDP) ──────────────────────────────────────

async function testChrome(tabCount) {
  log(`[Chrome] Starting test with ${tabCount} tabs...`);
  ensurePortFree(CHROME_DEBUG_PORT);
  await sleep(1000);

  // Create a temp profile so we don't touch the user's real profile
  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-perf-'));

  const proc = spawn(CHROME_BIN, [
    `--remote-debugging-port=${CHROME_DEBUG_PORT}`,
    `--user-data-dir=${tmpProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-background-networking',
    'about:blank',
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  proc.stdout.on('data', () => {});
  proc.stderr.on('data', () => {});
  const pid = proc.pid;

  try {
    log(`[Chrome] Waiting for debug port ${CHROME_DEBUG_PORT} (PID: ${pid})...`);
    await waitForPort(CHROME_DEBUG_PORT);
    await sleep(2000);

    const wsUrl = await getCDPWebSocketUrl(CHROME_DEBUG_PORT);
    const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl, defaultViewport: null });

    log(`[Chrome] Connected. Opening ${tabCount} tabs...`);

    for (let i = 0; i < tabCount; i++) {
      const url = TEST_URLS[i % TEST_URLS.length];
      try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      } catch (err) {
        log(`[Chrome] Tab ${i + 1} warning: ${err.message.slice(0, 80)}`);
      }
      if ((i + 1) % 10 === 0 || i === tabCount - 1) {
        log(`[Chrome] Opened ${i + 1}/${tabCount} tabs`);
      }
    }

    log(`[Chrome] All tabs opened. Settling for ${SETTLE_TIME_MS / 1000}s...`);
    await sleep(SETTLE_TIME_MS);

    // Measure
    const metrics = await measureResources(pid, SAMPLE_DURATION_MS);
    const result = { browser: 'Chrome', tabCount, ...metrics };
    log(`[Chrome] ${tabCount} tabs → Mem=${result.memoryMB}MB CPU=${result.cpuPercent}% Procs=${result.processCount}`);

    browser.disconnect();
    return result;
  } finally {
    killTree(pid);
    await sleep(3000);
    // Clean up temp profile
    try { fs.rmSync(tmpProfile, { recursive: true, force: true }); } catch {}
  }
}

// ─── Nav0 Test (installed app + HTTP test control server) ───────────────────
//
// The packaged app has EnableNodeCliInspectArguments fuse disabled, which blocks
// --remote-debugging-port. Instead the app starts a lightweight HTTP control
// server when the REMOTE_DEBUGGING_PORT env var is set (see src/main/index.ts).

function httpPost(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'POST' }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function testNav0(tabCount) {
  log(`[Nav0] Starting test with ${tabCount} tabs...`);
  ensurePortFree(NAV0_DEBUG_PORT);
  await sleep(1000);

  const proc = spawn(NAV0_BIN, [], {
    env: {
      ...process.env,
      REMOTE_DEBUGGING_PORT: String(NAV0_DEBUG_PORT),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  let stderrBuf = '';
  proc.stderr.on('data', (d) => { stderrBuf += d.toString(); });
  proc.stdout.on('data', () => {});

  const spawnPid = proc.pid;

  try {
    log(`[Nav0] Waiting for test control server on port ${NAV0_DEBUG_PORT} (PID: ${spawnPid})...`);
    await waitForPort(NAV0_DEBUG_PORT, 60000);
    log('[Nav0] Control server ready. Waiting for app to settle...');
    await sleep(3000);

    const electronPid = findPidOnPort(NAV0_DEBUG_PORT) || spawnPid;
    log(`[Nav0] Connected (Electron PID: ${electronPid}). Creating ${tabCount} tabs via HTTP...`);

    for (let i = 0; i < tabCount; i++) {
      const url = TEST_URLS[i % TEST_URLS.length];
      try {
        const encoded = encodeURIComponent(url);
        await httpPost(`http://127.0.0.1:${NAV0_DEBUG_PORT}/create-tab?url=${encoded}`);
      } catch (err) {
        log(`[Nav0] Tab ${i + 1} warning: ${err.message.slice(0, 80)}`);
      }
      await sleep(300);
      if ((i + 1) % 10 === 0 || i === tabCount - 1) {
        log(`[Nav0] Opened ${i + 1}/${tabCount} tabs`);
      }
    }

    log(`[Nav0] All tabs opened. Settling for ${SETTLE_TIME_MS / 1000}s...`);
    await sleep(SETTLE_TIME_MS);

    // Measure
    const metrics = await measureResources(electronPid, SAMPLE_DURATION_MS);
    const result = { browser: 'Nav0', tabCount, ...metrics };
    log(`[Nav0] ${tabCount} tabs → Mem=${result.memoryMB}MB CPU=${result.cpuPercent}% Procs=${result.processCount}`);

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
  lines.push(`  System:    ${os.type()} ${os.arch()} | ${os.cpus()[0]?.model || 'Unknown'} | ${os.cpus().length} CPUs | ${(os.totalmem() / 1073741824).toFixed(1)} GB RAM`);
  lines.push(`  Date:      ${new Date().toISOString()}`);
  lines.push(`  Settle:    ${SETTLE_TIME_MS / 1000}s | Sample: ${SAMPLE_DURATION_MS / 1000}s`);
  lines.push(`  Tab URLs:  ${TEST_URLS.length} rotating test URLs`);
  lines.push(`  Chrome:    ${CHROME_BIN}`);
  lines.push(`  Nav0:      ${NAV0_BIN}`);
  lines.push('');

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

  // ── Process Count ──
  lines.push(thin);
  lines.push('  PROCESS COUNT');
  lines.push(thin);
  lines.push(fmtHeader());
  for (const tc of TAB_COUNTS) {
    const c = chromeMap[tc], n = nav0Map[tc];
    if (c && n) lines.push(fmtRow(tc, c.processCount, n.processCount, ''));
    else if (c) lines.push(fmtRowSingle(tc, 'Chrome', c.processCount, ''));
    else if (n) lines.push(fmtRowSingle(tc, 'Nav0', n.processCount, ''));
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

    lines.push('');
  }

  lines.push(sep);

  const report = lines.join('\n');
  console.log(report);

  // Save reports
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const ts = timestamp();
  const jsonPath = path.join(REPORT_DIR, `perf-report-mac-${ts}.json`);
  const textPath = path.join(REPORT_DIR, `perf-report-mac-${ts}.txt`);

  const jsonReport = {
    timestamp: new Date().toISOString(),
    system: {
      platform: `${os.type()} ${os.arch()}`,
      cpu: os.cpus()[0]?.model || 'Unknown',
      cpuCount: os.cpus().length,
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
  console.log('\n  Browser Performance Comparison: Nav0 vs Chrome (macOS)');
  console.log('  ' + '='.repeat(55));
  console.log(`  Tab counts: ${TAB_COUNTS.join(', ')}`);
  console.log(`  Test URLs:  ${TEST_URLS.length} rotating sites`);
  console.log(`  Settle:     ${SETTLE_TIME_MS / 1000}s  |  Sample: ${SAMPLE_DURATION_MS / 1000}s`);
  console.log('');

  if (process.platform !== 'darwin') {
    console.error('  ERROR: This script is for macOS. Use browser-perf-test.js on Linux.');
    process.exit(1);
  }
  if (!fs.existsSync(CHROME_BIN)) {
    console.error(`  ERROR: Chrome not found at ${CHROME_BIN}`);
    console.error('  Install Chrome or update CHROME_BIN at the top of this script.');
    process.exit(1);
  }
  if (!fs.existsSync(NAV0_BIN)) {
    console.error(`  ERROR: Nav0 not found. Searched:`);
    for (const c of NAV0_CANDIDATES) console.error(`    - ${c}`);
    console.error('  Set NAV0_BIN env var to the correct path.');
    process.exit(1);
  }

  const chromeResults = [];
  const nav0Results = [];

  for (const tabCount of TAB_COUNTS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  TEST CASE: ${tabCount} tabs`);
    console.log('─'.repeat(60));

    try {
      const result = await testChrome(tabCount);
      chromeResults.push(result);
    } catch (err) {
      log(`[Chrome] FAILED for ${tabCount} tabs: ${err.message}`);
    }

    try {
      const result = await testNav0(tabCount);
      nav0Results.push(result);
    } catch (err) {
      log(`[Nav0] FAILED for ${tabCount} tabs: ${err.message}`);
    }
  }

  generateReport(chromeResults, nav0Results);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`\n  FATAL: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
