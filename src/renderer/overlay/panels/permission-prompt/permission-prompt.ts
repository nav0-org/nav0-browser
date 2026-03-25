import './permission-prompt.css';
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

let containerEl: HTMLElement;
let currentRequestId: string | null = null;

const PERMISSION_PROMPT_HTML = `
  <div class="permission-overlay" id="pp-permission-overlay">
    <div class="permission-scrim" id="pp-permission-scrim"></div>
    <div class="permission-prompt" id="pp-permission-prompt" role="dialog" aria-modal="true" aria-labelledby="permission-message">
      <!-- Site identity bar -->
      <div class="permission-header">
        <div class="permission-site-identity">
          <i id="pp-permission-lock-icon" data-lucide="lock" width="14" height="14" class="permission-lock"></i>
          <i id="pp-permission-warning-icon" data-lucide="triangle-alert" width="14" height="14" class="permission-warning" style="display:none;"></i>
          <span class="permission-origin" id="pp-permission-origin"></span>
        </div>
      </div>

      <!-- Permission description -->
      <div class="permission-body">
        <div class="permission-request-list" id="pp-permission-request-list">
          <!-- Dynamically filled with permission items -->
        </div>
      </div>

      <!-- Action buttons (2x2 grid) -->
      <div class="permission-actions">
        <div class="permission-actions-row">
          <button id="pp-allow-once-btn" class="permission-btn permission-btn-allow-once" aria-label="Allow access for this session only">
            Allow Once
          </button>
          <button id="pp-always-allow-btn" class="permission-btn permission-btn-always-allow" aria-label="Always allow access from this site">
            Always Allow
          </button>
        </div>
        <div class="permission-actions-row">
          <button id="pp-deny-once-btn" class="permission-btn permission-btn-deny-once" aria-label="Deny access for this session only">
            Deny Once
          </button>
          <button id="pp-always-deny-btn" class="permission-btn permission-btn-always-deny" aria-label="Always deny access from this site">
            Always Deny
          </button>
        </div>
      </div>

      <!-- Private browsing note -->
      <div class="permission-private-note" id="pp-permission-private-note" style="display:none;">
        In private browsing, permission choices are not saved.
      </div>

      <!-- Insecure origin message -->
      <div class="permission-insecure-message" id="pp-permission-insecure-message" style="display:none;">
        <i data-lucide="shield-alert" width="14" height="14"></i>
        <span>This site is not secure. Nav0 cannot grant device permissions to insecure sites.</span>
      </div>
    </div>
  </div>
`;

function respond(decision: string): void {
  if (currentRequestId) {
    window.BrowserAPI.respondToPermissionPrompt(
      window.BrowserAPI.appWindowId,
      currentRequestId,
      decision
    );
    currentRequestId = null;
  }
}

function updatePrompt(data: PermissionPromptData): void {
  currentRequestId = data.requestId;

  // Update origin
  const originEl = containerEl.querySelector('#pp-permission-origin') as HTMLElement;
  if (originEl) originEl.textContent = data.origin;

  // Update secure/insecure icon
  const lockIcon = containerEl.querySelector('#pp-permission-lock-icon') as HTMLElement;
  const warningIcon = containerEl.querySelector('#pp-permission-warning-icon') as HTMLElement;
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
  const listEl = containerEl.querySelector('#pp-permission-request-list') as HTMLElement;
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
  const privateNote = containerEl.querySelector('#pp-permission-private-note') as HTMLElement;
  if (privateNote) {
    privateNote.style.display = data.isPrivate ? '' : 'none';
  }

  // Insecure origin blocking
  const insecureMsg = containerEl.querySelector('#pp-permission-insecure-message') as HTMLElement;
  const allowOnceBtn = containerEl.querySelector('#pp-allow-once-btn') as HTMLButtonElement;
  const alwaysAllowBtn = containerEl.querySelector('#pp-always-allow-btn') as HTMLButtonElement;
  const denyOnceBtn = containerEl.querySelector('#pp-deny-once-btn') as HTMLButtonElement;
  const alwaysDenyBtn = containerEl.querySelector('#pp-always-deny-btn') as HTMLButtonElement;

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

export function init(container: HTMLElement): void {
  containerEl = container;
  container.innerHTML = PERMISSION_PROMPT_HTML;

  // Button handlers
  container.querySelector('#pp-allow-once-btn')?.addEventListener('click', () => respond('allow_once'));
  container.querySelector('#pp-always-allow-btn')?.addEventListener('click', () => respond('always_allow'));
  container.querySelector('#pp-deny-once-btn')?.addEventListener('click', () => respond('deny_once'));
  container.querySelector('#pp-always-deny-btn')?.addEventListener('click', () => respond('always_deny'));

  // Scrim click = dismiss = Deny Once
  container.querySelector('#pp-permission-scrim')?.addEventListener('click', () => respond('deny_once'));

  // Keyboard: Escape = Deny Once
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Only handle events when this panel is visible
    if (containerEl.hasAttribute('hidden')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      respond('deny_once');
    }

    // Focus trap within the prompt
    if (e.key === 'Tab') {
      const prompt = container.querySelector('#pp-permission-prompt') as HTMLElement;
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
}

export function show(data?: any): void {
  if (data) {
    updatePrompt(data as PermissionPromptData);
  }
}

export function hide(): void {
  currentRequestId = null;
}
