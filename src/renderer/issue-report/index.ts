import './index.css';
import { initTheme } from '../common/theme';
import { createIcons, icons } from 'lucide';

initTheme();

const WORKER_URL = 'https://nav0-issue-creation.100-percent-ketan.workers.dev';

function getSystemInfo(): string {
  const platform = (window as any).BrowserAPI?.platform || navigator.platform;
  const userAgent = navigator.userAgent;
  // Extract Electron and Chrome versions from user agent
  const electronMatch = userAgent.match(/Electron\/([\d.]+)/);
  const chromeMatch = userAgent.match(/Chrome\/([\d.]+)/);
  const lines = [
    `Platform: ${platform}`,
    `Electron: ${electronMatch ? electronMatch[1] : 'unknown'}`,
    `Chrome: ${chromeMatch ? chromeMatch[1] : 'unknown'}`,
  ];
  return lines.join('\n');
}

function close(): void {
  (window as any).BrowserAPI.hideIssueReport((window as any).BrowserAPI.appWindowId);
}

function showStatus(message: string, type: 'success' | 'error'): void {
  const statusEl = document.getElementById('issue-report-status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `issue-report-status ${type}`;
    statusEl.style.display = '';
  }
}

function resetForm(): void {
  (document.getElementById('issue-title') as HTMLInputElement).value = '';
  (document.getElementById('issue-description') as HTMLTextAreaElement).value = '';
  (document.getElementById('issue-type') as HTMLSelectElement).value = 'bug';
  const statusEl = document.getElementById('issue-report-status');
  if (statusEl) statusEl.style.display = 'none';
}

async function submitIssue(): Promise<void> {
  const titleInput = document.getElementById('issue-title') as HTMLInputElement;
  const descriptionInput = document.getElementById('issue-description') as HTMLTextAreaElement;
  const typeSelect = document.getElementById('issue-type') as HTMLSelectElement;
  const submitBtn = document.getElementById('issue-submit-btn') as HTMLButtonElement;

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const type = typeSelect.value;

  if (!title) {
    showStatus('Please enter a title.', 'error');
    titleInput.focus();
    return;
  }

  if (!description) {
    showStatus('Please enter a description.', 'error');
    descriptionInput.focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  const typeLabel = type === 'bug' ? 'Bug Report' : type === 'feature' ? 'Feature Request' : 'Other';
  const body = `**Type:** ${typeLabel}\n\n**Description:**\n${description}\n\n---\n**System Info:**\n\`\`\`\n${getSystemInfo()}\n\`\`\`\n\n*Submitted from Nav0 Browser in-app issue reporter*`;

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `[${typeLabel}] ${title}`, body }),
    });

    if (response.ok) {
      showStatus('Issue submitted successfully! Thank you for your feedback.', 'success');
      titleInput.value = '';
      descriptionInput.value = '';
      typeSelect.value = 'bug';
      setTimeout(() => close(), 2000);
    } else {
      const data = await response.json().catch(() => null);
      showStatus('Failed to submit issue. Please try again.', 'error');
    }
  } catch (err) {
    showStatus('Network error. Please check your connection and try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  createIcons({ icons });

  // Populate system info preview
  const sysinfoEl = document.getElementById('sysinfo-preview');
  if (sysinfoEl) {
    sysinfoEl.textContent = getSystemInfo();
  }

  // Button handlers
  document.getElementById('issue-submit-btn')?.addEventListener('click', submitIssue);
  document.getElementById('issue-cancel-btn')?.addEventListener('click', () => {
    resetForm();
    close();
  });

  // Scrim click = close
  document.getElementById('issue-report-scrim')?.addEventListener('click', () => {
    resetForm();
    close();
  });

  // Escape = close
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      resetForm();
      close();
    }
  });

  // Focus title input on open
  setTimeout(() => {
    (document.getElementById('issue-title') as HTMLInputElement)?.focus();
  }, 100);
});
