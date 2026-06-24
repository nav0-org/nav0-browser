import './index.css';
import { createIcons, icons } from 'lucide';

createIcons({ icons });

const PLATFORM_NAMES: Record<string, string> = {
  darwin: 'macOS',
  win32: 'Windows',
  linux: 'Linux',
  freebsd: 'FreeBSD',
};

const ARCH_NAMES: Record<string, string> = {
  x64: 'x86_64',
  arm64: 'ARM64',
  ia32: 'x86 (32-bit)',
};

function setText(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHash(id: string, value: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const wrap = el.closest('.hash') as HTMLElement | null;
  // Hide the row entirely when the value is unavailable so the panel
  // stays tidy — same behavior the prior implementation used.
  const row = el.closest('.hash-row') as HTMLElement | null;
  if (value === 'unavailable') {
    if (row) row.style.display = 'none';
    return;
  }
  if (value === 'not packaged') {
    if (wrap) wrap.classList.add('muted');
    el.textContent = 'not packaged (dev mode)';
    // Hide the copy button — nothing to copy.
    const btn = wrap?.querySelector('.copy-btn') as HTMLElement | null;
    if (btn) btn.style.display = 'none';
    return;
  }
  el.textContent = value;
}

async function copyToClipboard(text: string, btn: HTMLElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for environments where clipboard API is unavailable.
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch {
      /* best-effort */
    }
    ta.remove();
  }
  btn.classList.add('copied');
  setTimeout(() => btn.classList.remove('copied'), 900);
}

document.addEventListener('DOMContentLoaded', async () => {
  const appWindowId = window.BrowserAPI.appWindowId;

  try {
    const info = await window.BrowserAPI.getAboutInfo();

    // ---- Software ----
    setText('kv-app-version', `v${info.appVersion}`);
    const buildBadge = document.getElementById('kv-build-badge');
    if (buildBadge) {
      buildBadge.textContent = info.isPackaged ? 'release' : 'dev';
      buildBadge.classList.toggle('dev', !info.isPackaged);
      buildBadge.hidden = false;
    }
    setText('kv-electron', info.electronVersion);
    setText('kv-chromium', info.chromiumVersion);
    setText('kv-node', info.nodeVersion);
    setText('kv-v8', info.v8Version);

    // ---- System ----
    // ChromeOS runs the app inside a Linux container, so info.platform is
    // 'linux'; surface the more specific name when we detected Crostini.
    const platformLabel = info.isChromeOS
      ? 'ChromeOS (Linux)'
      : PLATFORM_NAMES[info.platform] || info.platform;
    setText('kv-platform', platformLabel);
    setText('kv-architecture', ARCH_NAMES[info.arch] || info.arch);
    setText('kv-os', info.osVersion || '--');

    // ---- Integrity ----
    setHash('hash-exec', info.executableChecksum);
    setHash('hash-asar', info.isPackaged ? info.asarChecksum : 'not packaged');
    setHash('hash-app-path', info.appPath);
  } catch (err) {
    console.error('Failed to load about info:', err);
  }

  // ---- Copy buttons ----
  document.querySelectorAll<HTMLButtonElement>('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.dataset.copyTarget;
      if (!targetId) return;
      const target = document.getElementById(targetId);
      const text = target?.textContent?.trim() || '';
      if (text) copyToClipboard(text, btn);
    });
  });

  // ---- Link handlers ----
  const openTab = (url: string) => {
    window.BrowserAPI.createTab(appWindowId, url, true);
  };

  document.getElementById('link-website')?.addEventListener('click', () => {
    openTab('https://nav0.org');
  });

  document.getElementById('link-source-code')?.addEventListener('click', () => {
    openTab('https://github.com/nav0-org/nav0-browser');
  });

  document.getElementById('link-release-notes')?.addEventListener('click', () => {
    openTab('https://nav0.org/releases/');
  });

  document.getElementById('link-privacy')?.addEventListener('click', () => {
    openTab('https://nav0.org/privacy');
  });

  document.getElementById('link-report-issue')?.addEventListener('click', () => {
    window.BrowserAPI.showIssueReport(appWindowId);
  });

  document.getElementById('link-license')?.addEventListener('click', () => {
    openTab('https://github.com/nav0-org/nav0-browser/blob/main/LICENSE.md');
  });

  // Re-render lucide icons in case any were injected after the initial pass.
  createIcons({ icons });
});
