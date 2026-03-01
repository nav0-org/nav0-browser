import './index.css';
import { createIcons, icons } from 'lucide';

interface PermissionPromptData {
  requestId: string;
  origin: string;
  permissions: Array<{ type: string; label: string; icon: string }>;
  isSecure: boolean;
  isPrivate: boolean;
  faviconUrl: string | null;
  isInsecureBlocked: boolean;
  isFloodBlocked: boolean;
}

const ICON_MAP: Record<string, string> = {
  'map-pin': 'map-pin',
  'camera': 'camera',
  'mic': 'mic',
  'bell': 'bell',
  'clipboard': 'clipboard',
  'monitor': 'monitor',
  'music': 'music',
  'usb': 'usb',
  'bluetooth': 'bluetooth',
  'keyboard': 'keyboard',
  'type': 'type',
  'eye': 'eye',
  'app-window': 'app-window',
  'shield-alert': 'shield-alert',
  'hard-drive': 'hard-drive',
  'moon': 'moon',
  'speaker': 'speaker',
  'lock': 'lock',
};

let currentRequestId: string | null = null;

function respond(decision: string): void {
  if (currentRequestId) {
    (window as any).BrowserAPI.respondToPermissionPrompt(
      (window as any).BrowserAPI.appWindowId,
      currentRequestId,
      decision
    );
    currentRequestId = null;
  }
}

function updatePrompt(data: PermissionPromptData): void {
  currentRequestId = data.requestId;

  // Update origin
  const originEl = document.getElementById('permission-origin');
  if (originEl) originEl.textContent = data.origin;

  // Update secure/insecure icon
  const lockIcon = document.getElementById('permission-lock-icon');
  const warningIcon = document.getElementById('permission-warning-icon');
  if (lockIcon && warningIcon) {
    if (data.isSecure) {
      lockIcon.style.display = '';
      warningIcon.style.display = 'none';
    } else {
      lockIcon.style.display = 'none';
      warningIcon.style.display = '';
    }
  }

  // Build permission request list
  const listEl = document.getElementById('permission-request-list');
  if (listEl) {
    listEl.innerHTML = '';
    for (const perm of data.permissions) {
      const item = document.createElement('div');
      item.className = 'permission-request-item';
      item.innerHTML = `
        <div class="permission-request-icon">
          <i data-lucide="${perm.icon}" width="18" height="18"></i>
        </div>
        <div class="permission-request-text">
          This site wants to access your <strong>${perm.label}</strong>
        </div>
      `;
      listEl.appendChild(item);
    }
  }

  // Private browsing note
  const privateNote = document.getElementById('permission-private-note');
  if (privateNote) {
    privateNote.style.display = data.isPrivate ? '' : 'none';
  }

  // Insecure origin blocking
  const insecureMsg = document.getElementById('permission-insecure-message');
  const allowOnceBtn = document.getElementById('allow-once-btn') as HTMLButtonElement;
  const alwaysAllowBtn = document.getElementById('always-allow-btn') as HTMLButtonElement;
  const denyOnceBtn = document.getElementById('deny-once-btn') as HTMLButtonElement;
  const alwaysDenyBtn = document.getElementById('always-deny-btn') as HTMLButtonElement;

  if (data.isInsecureBlocked) {
    if (insecureMsg) insecureMsg.style.display = '';
    if (allowOnceBtn) allowOnceBtn.disabled = true;
    if (alwaysAllowBtn) alwaysAllowBtn.disabled = true;
    if (denyOnceBtn) denyOnceBtn.disabled = false;
    if (alwaysDenyBtn) alwaysDenyBtn.disabled = false;
  } else if (data.isFloodBlocked) {
    // Flood protection: auto-deny, buttons disabled
    if (insecureMsg) insecureMsg.style.display = 'none';
    if (allowOnceBtn) allowOnceBtn.disabled = true;
    if (alwaysAllowBtn) alwaysAllowBtn.disabled = true;
    if (denyOnceBtn) denyOnceBtn.disabled = true;
    if (alwaysDenyBtn) alwaysDenyBtn.disabled = true;
    // Auto-respond after a brief delay to show the message
    setTimeout(() => respond('deny_once'), 1500);
  } else {
    if (insecureMsg) insecureMsg.style.display = 'none';
    if (allowOnceBtn) allowOnceBtn.disabled = false;
    if (alwaysAllowBtn) alwaysAllowBtn.disabled = false;
    if (denyOnceBtn) denyOnceBtn.disabled = false;
    if (alwaysDenyBtn) alwaysDenyBtn.disabled = false;
  }

  // Re-render lucide icons for dynamically added elements
  createIcons({ icons });

  // Focus the first actionable button for keyboard accessibility
  if (!data.isInsecureBlocked && !data.isFloodBlocked) {
    setTimeout(() => allowOnceBtn?.focus(), 50);
  } else {
    setTimeout(() => denyOnceBtn?.focus(), 50);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  createIcons({ icons });

  // Button handlers
  document.getElementById('allow-once-btn')?.addEventListener('click', () => respond('allow_once'));
  document.getElementById('always-allow-btn')?.addEventListener('click', () => respond('always_allow'));
  document.getElementById('deny-once-btn')?.addEventListener('click', () => respond('deny_once'));
  document.getElementById('always-deny-btn')?.addEventListener('click', () => respond('always_deny'));

  // Scrim click = dismiss = Deny Once
  document.getElementById('permission-scrim')?.addEventListener('click', () => respond('deny_once'));

  // Keyboard: Escape = Deny Once
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      respond('deny_once');
    }

    // Focus trap within the prompt
    if (e.key === 'Tab') {
      const prompt = document.getElementById('permission-prompt');
      if (!prompt) return;
      const focusable = prompt.querySelectorAll('button:not(:disabled)');
      if (focusable.length === 0) return;

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Listen for prompt show events from main process
  (window as any).BrowserAPI.onPermissionPromptShow((data: PermissionPromptData) => {
    updatePrompt(data);
  });
});
