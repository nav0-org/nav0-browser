#!/usr/bin/env node
/*
 * Idle memory measurement for Nav0 (Linux + macOS + Windows).
 *
 * Launches the PACKAGED app with a fresh throwaway profile, lets it settle,
 * then samples memory over a window and reports:
 *   - Accurate total  : summed accurate footprint across all Nav0 processes.
 *                       Linux   -> PSS (/proc/<pid>/smaps_rollup, shared pages
 *                                  counted once);
 *                       macOS   -> "Physical footprint" (vmmap — the number
 *                                  Activity Monitor's Memory column shows);
 *                       Windows -> Private Working Set (WMI perf counter — the
 *                                  number Task Manager's Memory column shows).
 *   - Working-set total: summed workingSetSize from app.getAppMetrics(). This is
 *                       RSS-like (counts shared pages in every process) and is
 *                       what browser-perf-test.js sums today — shown so you can
 *                       see how much it overcounts an idle multiprocess app.
 *   - Per-process type: from app.getAppMetrics() via the /memory control endpoint.
 *
 * The process list comes from getAppMetrics() (cross-platform); the accurate
 * per-process number is layered on via the OS tool.
 *
 * Env knobs: SETTLE_MS, SAMPLE_WINDOW_MS, RUNS, PORT, TAB_URL
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const IS_MAC = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';
const IS_WIN = process.platform === 'win32';
const ACCURATE_LABEL = IS_MAC ? 'phys_footprint' : IS_WIN ? 'private working set' : 'PSS';

const PORT = Number(process.env.PORT || 39472);
const SETTLE_MS = Number(process.env.SETTLE_MS || 30000);
const SAMPLE_WINDOW_MS = Number(process.env.SAMPLE_WINDOW_MS || 30000);
const SAMPLE_EVERY_MS = 5000;
const RUNS = Number(process.env.RUNS || 3);
// Optional: open a single tab on this URL instead of the default new-tab page.
// Uses Nav0's own `--url` CLI flag, which opens exactly one window with one tab
// and skips default startup — so the measurement reflects that one real page.
const TAB_URL = process.env.TAB_URL || '';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findBinary() {
  const outDir = path.join(__dirname, '..', '..', 'out');
  if (!fs.existsSync(outDir)) return null;
  for (const d of fs.readdirSync(outDir)) {
    const dir = path.join(outDir, d);
    if (IS_LINUX && d.includes('linux')) {
      // forge.config.ts sets the Linux executableName to lowercase 'nav0'.
      const files = fs.readdirSync(dir);
      if (files.includes('nav0')) return path.join(dir, 'nav0');
      const skip = new Set(['chrome-sandbox', 'chrome_crashpad_handler']);
      for (const f of files) {
        if (skip.has(f) || f.includes('.')) continue;
        try {
          const st = fs.statSync(path.join(dir, f));
          if (st.isFile() && st.mode & 0o111) return path.join(dir, f);
        } catch {
          /* ignore */
        }
      }
    }
    if (IS_MAC && d.includes('darwin')) {
      // out/Nav0-darwin-<arch>/Nav0.app/Contents/MacOS/Nav0
      const appName = fs.readdirSync(dir).find((f) => f.endsWith('.app'));
      if (!appName) continue;
      const macosDir = path.join(dir, appName, 'Contents', 'MacOS');
      if (!fs.existsSync(macosDir)) continue;
      const exe = fs.readdirSync(macosDir)[0];
      if (exe) return path.join(macosDir, exe);
    }
    if (IS_WIN && d.includes('win32')) {
      // out/Nav0-win32-x64/Nav0.exe (executableName is 'Nav0' on non-linux).
      const files = fs.readdirSync(dir);
      if (files.includes('Nav0.exe')) return path.join(dir, 'Nav0.exe');
      const exe = files.find(
        (f) => f.toLowerCase().endsWith('.exe') && !/crashpad|sandbox/i.test(f)
      );
      if (exe) return path.join(dir, exe);
    }
  }
  return null;
}

function launch(binary, userDataDir) {
  const common = [`--user-data-dir=${userDataDir}`];
  // `--url <u>` must come before the Chromium flags; the CLI parser stops
  // scanning URLs at `--user-data-dir=` / `--no-sandbox` / `--disable-*`.
  if (TAB_URL) common.unshift('--url', TAB_URL);
  const env = { ...process.env, REMOTE_DEBUGGING_PORT: String(PORT) };
  // Linux: headless via xvfb, no-sandbox for CI runners. macOS/Windows: launch
  // directly on the real display with the normal sandbox so the number is real.
  if (IS_LINUX) {
    return spawn('xvfb-run', ['-a', binary, ...common, '--no-sandbox', '--disable-dev-shm-usage'], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }
  return spawn(binary, common, { env, stdio: ['ignore', 'pipe', 'pipe'] });
}

// Windows: one WMI query returns every process's Private Working Set (bytes)
// keyed by PID — the value Task Manager's "Memory" column shows. Fetched once
// per sample and looked up per-pid, so we don't spawn PowerShell N times.
function getWinPrivateWSMap() {
  try {
    const ps =
      'Get-CimInstance Win32_PerfRawData_PerfProc_Process | ' +
      'Where-Object { $_.IDProcess -ne 0 } | ' +
      'Select-Object IDProcess,WorkingSetPrivate | ConvertTo-Json -Compress';
    const out = execSync(`powershell -NoProfile -NonInteractive -Command "${ps}"`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 32 * 1024 * 1024,
    });
    const data = JSON.parse(out);
    const rows = Array.isArray(data) ? data : [data];
    const map = new Map();
    for (const r of rows) {
      map.set(Number(r.IDProcess), Math.round(Number(r.WorkingSetPrivate) / 1024));
    }
    return map;
  } catch {
    return new Map();
  }
}

// Accurate per-process footprint in KB, or 0 if the OS tool can't read it.
// On Windows the value comes from winMap (pid -> private working set KB).
function accurateKB(pid, winMap) {
  try {
    if (IS_LINUX) {
      const m = fs.readFileSync(`/proc/${pid}/smaps_rollup`, 'utf-8').match(/^Pss:\s+(\d+)\s+kB/m);
      return m ? parseInt(m[1], 10) : 0;
    }
    if (IS_WIN) {
      return winMap && winMap.has(pid) ? winMap.get(pid) : 0;
    }
    // macOS: "Physical footprint:" from vmmap --summary (not the (peak) line).
    const out = execSync(`/usr/bin/vmmap --summary ${pid}`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 16 * 1024 * 1024,
    });
    const m = out.match(/Physical footprint:\s+([\d.]+)\s*([KMG])/);
    if (!m) return 0;
    const v = parseFloat(m[1]);
    return Math.round(m[2] === 'G' ? v * 1024 * 1024 : m[2] === 'M' ? v * 1024 : v);
  } catch {
    return 0;
  }
}

function httpGet(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { host: '127.0.0.1', port: PORT, path: pathname, timeout: 3000 },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
  });
}

async function waitForReady(timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await httpGet('/status')).ready) return true;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  return false;
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function sampleOnce() {
  const mem = await httpGet('/memory'); // getAppMetrics breakdown = the process list
  const rows = mem.metrics;
  if (!rows.some((r) => r.type === 'Browser')) throw new Error('no Browser process yet');
  const winMap = IS_WIN ? getWinPrivateWSMap() : null;
  let ws = 0;
  let acc = 0;
  let accOk = true;
  const byType = {};
  for (const r of rows) {
    ws += r.workingSetKB;
    const a = accurateKB(r.pid, winMap);
    if (a > 0) acc += a;
    else accOk = false;
    byType[r.type] = (byType[r.type] || 0) + (a > 0 ? a : r.workingSetKB);
  }
  return { ws, acc, accOk, byType, procCount: rows.length };
}

async function measureOnce(binary, runIdx) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav0-idle-'));
  const child = launch(binary, userDataDir);
  let stderr = '';
  child.stderr.on('data', (d) => (stderr += d.toString()));

  try {
    if (!(await waitForReady(45000))) {
      throw new Error(`app did not become ready\n--- stderr tail ---\n${stderr.slice(-1500)}`);
    }
    process.stdout.write(`  run ${runIdx + 1}: ready, settling ${SETTLE_MS / 1000}s ...`);
    await sleep(SETTLE_MS);

    const samples = [];
    const t0 = Date.now();
    while (Date.now() - t0 < SAMPLE_WINDOW_MS) {
      samples.push(await sampleOnce());
      await sleep(SAMPLE_EVERY_MS);
    }
    process.stdout.write(' done\n');

    const accAvailable = samples.every((s) => s.accOk);
    const accSeries = samples.map((s) => (accAvailable ? s.acc : s.ws));
    const med = median(accSeries);
    const rep = samples.reduce((a, b) =>
      Math.abs((accAvailable ? a.acc : a.ws) - med) <= Math.abs((accAvailable ? b.acc : b.ws) - med)
        ? a
        : b
    );
    return {
      accAvailable,
      headlineMB: +(med / 1024).toFixed(1),
      troughMB: +(Math.min(...accSeries) / 1024).toFixed(1),
      wsMB: +(median(samples.map((s) => s.ws)) / 1024).toFixed(1),
      procCount: rep.procCount,
      byTypeMB: Object.fromEntries(
        Object.entries(rep.byType).map(([k, v]) => [k, +(v / 1024).toFixed(1)])
      ),
    };
  } finally {
    // Windows: kill the whole tree (Electron helpers won't get a POSIX signal).
    if (IS_WIN) {
      try {
        execSync(`taskkill /pid ${child.pid} /t /f`, { stdio: 'ignore' });
      } catch {
        /* already dead */
      }
    } else {
      child.kill('SIGTERM');
      await sleep(1500);
      try {
        child.kill('SIGKILL');
      } catch {
        /* already dead */
      }
    }
    try {
      // maxRetries covers Windows briefly holding file handles after exit.
      fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      /* best effort */
    }
  }
}

(async () => {
  if (!IS_LINUX && !IS_MAC && !IS_WIN) {
    console.error(`Unsupported platform: ${process.platform} (Linux, macOS, or Windows only).`);
    process.exit(1);
  }
  const binary = findBinary();
  if (!binary) {
    const kind = IS_MAC ? 'macOS (.app)' : IS_WIN ? 'Windows (.exe)' : 'Linux';
    console.error(`No packaged ${kind} binary under out/. Run \`npm run package\` first.`);
    process.exit(1);
  }
  console.log(`Platform: ${process.platform}  Accurate metric: ${ACCURATE_LABEL}`);
  console.log(`Binary: ${binary}`);
  console.log(`Tab: ${TAB_URL || 'default new-tab page'}`);
  console.log(
    `Config: RUNS=${RUNS} SETTLE=${SETTLE_MS / 1000}s WINDOW=${SAMPLE_WINDOW_MS / 1000}s`
  );
  if (IS_MAC || IS_WIN)
    console.log('(a Nav0 window will briefly open on your display during each run)\n');
  else console.log('');

  const results = [];
  for (let i = 0; i < RUNS; i++) {
    try {
      results.push(await measureOnce(binary, i));
    } catch (e) {
      console.error(`  run ${i + 1} FAILED: ${e.message}`);
    }
  }
  if (!results.length) {
    console.error('All runs failed.');
    process.exit(1);
  }

  const accAvailable = results.every((r) => r.accAvailable);
  const label = accAvailable ? ACCURATE_LABEL : 'working-set (accurate tool unavailable)';
  console.log(`\n===== IDLE MEMORY (single window, ${TAB_URL || 'one new-tab'}) =====`);
  results.forEach((r, i) =>
    console.log(
      `run ${i + 1}: ${label} med=${r.headlineMB}MB trough=${r.troughMB}MB | working-set=${r.wsMB}MB | procs=${r.procCount}`
    )
  );
  const medHead = median(results.map((r) => r.headlineMB));
  const medWs = median(results.map((r) => r.wsMB));
  const over = accAvailable
    ? ` [working-set sum: ${medWs} MB, +${(((medWs - medHead) / medHead) * 100).toFixed(0)}%]`
    : '';
  console.log(`\nMEDIAN idle (${label}): ${medHead} MB${over}`);
  console.log(
    `\nPer-process-type ${accAvailable ? ACCURATE_LABEL : 'working-set'} (representative run):`
  );
  const rep = results[results.length - 1];
  Object.entries(rep.byTypeMB)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, mb]) => console.log(`  ${String(t).padEnd(16)} ${mb} MB`));
})();
