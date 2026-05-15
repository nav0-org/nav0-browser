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

function setChecksumRow(elementId: string, value: string): void {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (value === 'unavailable') {
    const row = el.closest('.about-row') as HTMLElement | null;
    if (row) row.style.display = 'none';
    return;
  }
  el.textContent = value;
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const info = await window.BrowserAPI.getAboutInfo();

    document.getElementById('app-version').textContent = `v${info.appVersion}`;
    document.getElementById('electron-version').textContent = info.electronVersion;
    document.getElementById('chromium-version').textContent = info.chromiumVersion;
    document.getElementById('node-version').textContent = info.nodeVersion;
    document.getElementById('v8-version').textContent = info.v8Version;
    document.getElementById('platform').textContent =
      PLATFORM_NAMES[info.platform] || info.platform;
    document.getElementById('arch').textContent = ARCH_NAMES[info.arch] || info.arch;
    document.getElementById('os-version').textContent = info.osVersion || '--';
    document.getElementById('app-path').textContent = info.appPath;
    setChecksumRow('executable-checksum', info.executableChecksum);
    setChecksumRow('asar-checksum', info.asarChecksum);
  } catch (err) {
    console.error('Failed to load about info:', err);
  }

  // Link handlers — open URLs in a new tab in the current window
  const appWindowId = window.BrowserAPI.appWindowId;

  document.getElementById('link-release-notes')?.addEventListener('click', () => {
    window.BrowserAPI.createTab(appWindowId, 'https://nav0.org/releases/', true);
  });

  document.getElementById('link-source-code')?.addEventListener('click', () => {
    window.BrowserAPI.createTab(appWindowId, 'https://github.com/nav0-org/nav0-browser', true);
  });

  document.getElementById('link-report-issue')?.addEventListener('click', () => {
    window.BrowserAPI.showIssueReport(appWindowId);
  });

  document.getElementById('link-license')?.addEventListener('click', () => {
    window.BrowserAPI.createTab(
      appWindowId,
      'https://github.com/nav0-org/nav0-browser/blob/main/LICENSE.md',
      true
    );
  });
});
