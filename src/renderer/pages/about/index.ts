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

/**
 * Wire the "Check for updates" control. Detection works on every platform (a
 * single main-process GitHub query); in-place install is offered only where
 * `canAutoInstall` is true (packaged Windows). Elsewhere we point the user at
 * the release page for a manual download.
 */
function initUpdates(): void {
  const statusEl = document.getElementById('update-status');
  const detailEl = document.getElementById('update-detail');
  const checkBtn = document.getElementById('btn-check-update') as HTMLButtonElement | null;
  const actionBtn = document.getElementById('btn-update-action') as HTMLButtonElement | null;
  if (!statusEl || !detailEl || !checkBtn || !actionBtn) return;

  const appWindowId = window.BrowserAPI.appWindowId;

  const setDetail = (text: string, kind?: 'available' | 'error'): void => {
    detailEl.textContent = text;
    detailEl.classList.remove('available', 'error');
    if (kind) detailEl.classList.add(kind);
    detailEl.hidden = !text;
  };

  const hideAction = (): void => {
    actionBtn.hidden = true;
    actionBtn.disabled = false;
    actionBtn.onclick = null;
  };

  const showAction = (label: string, onClick: (() => void) | null): void => {
    actionBtn.textContent = label;
    actionBtn.hidden = false;
    actionBtn.disabled = onClick === null;
    actionBtn.onclick = onClick;
  };

  const runInstall = async (version?: string): Promise<void> => {
    showAction('Downloading…', null);
    checkBtn.disabled = true;
    setDetail(version ? `Downloading v${version} in the background…` : 'Downloading the update…');
    try {
      const result = await window.BrowserAPI.downloadAndInstallUpdate();
      if (result.downloaded) {
        setDetail('Update downloaded. Restart Nav0 to finish updating.', 'available');
        showAction('Restart now', () => window.BrowserAPI.quitAndInstallUpdate());
      } else if (result.error) {
        setDetail(result.error, 'error');
        hideAction();
      } else {
        setDetail('No update was available to download.');
        hideAction();
      }
    } catch {
      setDetail('The update could not be downloaded.', 'error');
      hideAction();
    } finally {
      checkBtn.disabled = false;
    }
  };

  const check = async (): Promise<void> => {
    checkBtn.disabled = true;
    checkBtn.textContent = 'Checking…';
    hideAction();
    setDetail('');
    statusEl.textContent = 'Checking for updates…';
    try {
      const result = await window.BrowserAPI.checkForUpdates();
      if (result.status === 'up-to-date') {
        statusEl.textContent = "You're on the latest version.";
        setDetail(`Nav0 v${result.currentVersion} is up to date.`);
      } else if (result.status === 'update-available') {
        statusEl.textContent = `Update available: v${result.latestVersion}`;
        if (result.canAutoInstall) {
          setDetail(
            `You're on v${result.currentVersion}. Download and install v${result.latestVersion}?`,
            'available'
          );
          showAction('Download & install', () => {
            void runInstall(result.latestVersion);
          });
        } else {
          setDetail(
            `You're on v${result.currentVersion}. Open the release page to download v${result.latestVersion}.`,
            'available'
          );
          showAction('View release', () => {
            const url =
              result.releaseUrl || 'https://github.com/nav0-org/nav0-browser/releases/latest';
            window.BrowserAPI.createTab(appWindowId, url, true);
          });
        }
      } else {
        statusEl.textContent = "Couldn't check for updates.";
        setDetail(result.error || 'Please try again later.', 'error');
      }
    } catch {
      statusEl.textContent = "Couldn't check for updates.";
      setDetail('Please try again later.', 'error');
    } finally {
      checkBtn.disabled = false;
      checkBtn.textContent = 'Check for updates';
    }
  };

  checkBtn.addEventListener('click', () => {
    void check();
  });
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
    setText('kv-platform', PLATFORM_NAMES[info.platform] || info.platform);
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

  initUpdates();

  // Re-render lucide icons in case any were injected after the initial pass.
  createIcons({ icons });
});
