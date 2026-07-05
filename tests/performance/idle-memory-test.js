#!/usr/bin/env node
/*
 * Idle memory measurement for Nav0 (Linux).
 *
 * Launches the PACKAGED app headless (xvfb) with a fresh throwaway profile,
 * lets it settle, then samples memory over a window and reports:
 *   - Accurate total  : summed PSS across the Nav0 process tree
 *                       (/proc/<pid>/smaps_rollup — shared pages counted once)
 *   - Naive total     : summed RSS (what browser-perf-test.js does today) so
 *                       you can see how much RSS overcounts an idle multiprocess app
 *   - Per-process type: from app.getAppMetrics() via the /memory control endpoint
 *
 * Env knobs: SETTLE_MS, SAMPLE_WINDOW_MS, RUNS, PORT
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const PORT = Number(process.env.PORT || 39472);
const SETTLE_MS = Number(process.env.SETTLE_MS || 30000);
const SAMPLE_WINDOW_MS = Number(process.env.SAMPLE_WINDOW_MS || 30000);
const SAMPLE_EVERY_MS = 5000;
const RUNS = Number(process.env.RUNS || 3);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findBinary() {
  const outDir = path.join(__dirname, '..', '..', 'out');
  if (!fs.existsSync(outDir)) return null;
  // forge.config.ts sets the Linux executableName to lowercase 'nav0'.
  const skip = new Set(['chrome-sandbox', 'chrome_crashpad_handler']);
  for (const d of fs.readdirSync(outDir)) {
    if (!d.includes('linux')) continue;
    const dir = path.join(outDir, d);
    const files = fs.readdirSync(dir);
    if (files.includes('nav0')) return path.join(dir, 'nav0');
    for (const f of files) {
      if (skip.has(f) || f.includes('.')) continue;
      const full = path.join(dir, f);
      try {
        const st = fs.statSync(full);
        if (st.isFile() && st.mode & 0o111) return full;
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

function getProcessTree(rootPid) {
  const pids = fs
    .readdirSync('/proc')
    .filter((n) => /^\d+$/.test(n))
    .map(Number);
  const children = new Map();
  for (const pid of pids) {
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf-8');
      // comm (field 2) can contain spaces/parens — split after the last ')'
      const rest = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
      const ppid = Number(rest[1]); // [0]=state, [1]=ppid
      if (!children.has(ppid)) children.set(ppid, []);
      children.get(ppid).push(pid);
    } catch {
      /* process gone */
    }
  }
  const tree = [];
  const stack = [rootPid];
  while (stack.length) {
    const p = stack.pop();
    tree.push(p);
    for (const c of children.get(p) || []) stack.push(c);
  }
  return tree;
}

function readField(pid, file, re) {
  try {
    const m = fs.readFileSync(`/proc/${pid}/${file}`, 'utf-8').match(re);
    return m ? parseInt(m[1], 10) : 0;
  } catch {
    return 0;
  }
}
const readPssKB = (pid) => readField(pid, 'smaps_rollup', /^Pss:\s+(\d+)\s+kB/m);
const readRssKB = (pid) => readField(pid, 'status', /VmRSS:\s+(\d+)\s+kB/);

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
  const mem = await httpGet('/memory'); // getAppMetrics breakdown
  const typeByPid = new Map(mem.metrics.map((m) => [m.pid, m.type]));
  const browser = mem.metrics.find((m) => m.type === 'Browser');
  if (!browser) throw new Error('no Browser process in getAppMetrics');
  const tree = getProcessTree(browser.pid);

  let totalPss = 0;
  let totalRss = 0;
  const byType = {};
  for (const pid of tree) {
    const pss = readPssKB(pid);
    totalPss += pss;
    totalRss += readRssKB(pid);
    const t = typeByPid.get(pid) || 'Other/Zygote';
    byType[t] = (byType[t] || 0) + pss;
  }
  return { totalPss, totalRss, byType, procCount: tree.length };
}

async function measureOnce(binary, runIdx) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nav0-idle-'));
  const child = spawn(
    'xvfb-run',
    ['-a', binary, `--user-data-dir=${userDataDir}`, '--no-sandbox', '--disable-dev-shm-usage'],
    {
      env: { ...process.env, REMOTE_DEBUGGING_PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
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
    // Pick the sample nearest the median total PSS as the representative breakdown
    const med = median(samples.map((s) => s.totalPss));
    const rep = samples.reduce((a, b) =>
      Math.abs(a.totalPss - med) <= Math.abs(b.totalPss - med) ? a : b
    );
    const troughPss = Math.min(...samples.map((s) => s.totalPss));
    process.stdout.write(' done\n');
    return {
      medPssMB: +(med / 1024).toFixed(1),
      troughPssMB: +(troughPss / 1024).toFixed(1),
      medRssMB: +(median(samples.map((s) => s.totalRss)) / 1024).toFixed(1),
      procCount: rep.procCount,
      byTypeMB: Object.fromEntries(
        Object.entries(rep.byType).map(([k, v]) => [k, +(v / 1024).toFixed(1)])
      ),
    };
  } finally {
    child.kill('SIGTERM');
    await sleep(1500);
    try {
      child.kill('SIGKILL');
    } catch {
      /* already dead */
    }
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
}

(async () => {
  const binary = findBinary();
  if (!binary) {
    console.error('No packaged Linux binary under out/. Run `npm run package` first.');
    process.exit(1);
  }
  console.log(`Binary: ${binary}`);
  console.log(
    `Config: RUNS=${RUNS} SETTLE=${SETTLE_MS / 1000}s WINDOW=${SAMPLE_WINDOW_MS / 1000}s\n`
  );

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

  console.log('\n===== IDLE MEMORY (single window, one new-tab, headless) =====');
  results.forEach((r, i) =>
    console.log(
      `run ${i + 1}: PSS med=${r.medPssMB}MB trough=${r.troughPssMB}MB | RSS med=${r.medRssMB}MB | procs=${r.procCount}`
    )
  );
  const medPss = median(results.map((r) => r.medPssMB));
  const medRss = median(results.map((r) => r.medRssMB));
  console.log(
    `\nMEDIAN accurate idle (PSS): ${medPss} MB   [naive RSS sum: ${medRss} MB, +${(((medRss - medPss) / medPss) * 100).toFixed(0)}% overcount]`
  );
  console.log('\nPer-process-type PSS (representative run):');
  const rep = results[results.length - 1];
  Object.entries(rep.byTypeMB)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, mb]) => console.log(`  ${t.padEnd(16)} ${mb} MB`));
})();
