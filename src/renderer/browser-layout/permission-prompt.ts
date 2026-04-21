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

let stripContainer: HTMLElement;
let currentRequestId: string | null = null;
let initialized = false;

function respond(decision: string): void {
  if (currentRequestId) {
    window.BrowserAPI.respondToPermissionPrompt(
      window.BrowserAPI.appWindowId,
      currentRequestId,
      decision
    );
    currentRequestId = null;
    hideStrip();
  }
}

function updateStrip(data: PermissionPromptData): void {
  currentRequestId = data.requestId;

  const originEl = document.getElementById('perm-origin') as HTMLElement;
  const labelEl = document.getElementById('perm-label') as HTMLElement;
  const lockIcon = document.getElementById('perm-lock-icon') as HTMLElement;
  const warningIcon = document.getElementById('perm-warning-icon') as HTMLElement;
  const privateNote = document.getElementById('perm-private-note') as HTMLElement;
  const insecureNote = document.getElementById('perm-insecure-note') as HTMLElement;
  const allowOnceBtn = document.getElementById('perm-allow-once') as HTMLButtonElement;
  const alwaysAllowBtn = document.getElementById('perm-always-allow') as HTMLButtonElement;
  const denyOnceBtn = document.getElementById('perm-deny-once') as HTMLButtonElement;
  const alwaysDenyBtn = document.getElementById('perm-always-deny') as HTMLButtonElement;

  // Origin
  if (originEl) originEl.textContent = data.origin;

  // Permission label (combine all requested permissions)
  if (labelEl) {
    const labels = data.permissions.map((p) => p.label);
    labelEl.textContent = labels.join(', ');
  }

  // Secure/insecure icon
  if (lockIcon && warningIcon) {
    if (data.isSecure) {
      lockIcon.style.display = '';
      warningIcon.style.display = 'none';
    } else {
      lockIcon.style.display = 'none';
      warningIcon.style.display = '';
    }
  }

  // Notes
  if (privateNote) privateNote.style.display = data.isPrivate ? '' : 'none';

  // Button states
  if (data.isInsecureBlocked) {
    if (insecureNote) insecureNote.style.display = '';
    if (allowOnceBtn) allowOnceBtn.disabled = true;
    if (alwaysAllowBtn) alwaysAllowBtn.disabled = true;
    if (denyOnceBtn) denyOnceBtn.disabled = false;
    if (alwaysDenyBtn) alwaysDenyBtn.disabled = false;
  } else if (data.isFloodBlocked) {
    if (insecureNote) insecureNote.style.display = 'none';
    if (allowOnceBtn) allowOnceBtn.disabled = true;
    if (alwaysAllowBtn) alwaysAllowBtn.disabled = true;
    if (denyOnceBtn) denyOnceBtn.disabled = true;
    if (alwaysDenyBtn) alwaysDenyBtn.disabled = true;
    setTimeout(() => respond('deny_once'), 1500);
  } else {
    if (insecureNote) insecureNote.style.display = 'none';
    if (allowOnceBtn) allowOnceBtn.disabled = false;
    if (alwaysAllowBtn) alwaysAllowBtn.disabled = false;
    if (denyOnceBtn) denyOnceBtn.disabled = false;
    if (alwaysDenyBtn) alwaysDenyBtn.disabled = false;
  }

  createIcons({ icons });
}

function showStrip(data: PermissionPromptData): void {
  stripContainer.style.display = 'block';
  updateStrip(data);
  window.dispatchEvent(new Event('resize'));
}

function hideStrip(): void {
  stripContainer.style.display = 'none';
  currentRequestId = null;
  window.dispatchEvent(new Event('resize'));
}

export function initPermissionPrompt(): void {
  if (initialized) return;
  initialized = true;

  stripContainer = document.getElementById('permission-strip') as HTMLElement;

  // Button handlers
  document
    .getElementById('perm-allow-once')
    ?.addEventListener('click', () => respond('allow_once'));
  document
    .getElementById('perm-always-allow')
    ?.addEventListener('click', () => respond('always_allow'));
  document.getElementById('perm-deny-once')?.addEventListener('click', () => respond('deny_once'));
  document
    .getElementById('perm-always-deny')
    ?.addEventListener('click', () => respond('always_deny'));

  // Escape = deny once (when strip visible)
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (stripContainer.style.display === 'none') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      respond('deny_once');
    }
  });

  // Listen for show/hide IPC from main process
  window.BrowserAPI.onShowPermissionStrip((data: any) => {
    showStrip(data as PermissionPromptData);
  });

  window.BrowserAPI.onHidePermissionStrip(() => {
    hideStrip();
  });
}
