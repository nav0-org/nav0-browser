import './basic-auth.css';
import { createIcons, icons } from 'lucide';

interface BasicAuthPanelData {
  requestId: string;
  host: string;
  port: number;
  realm: string;
  isProxy: boolean;
  scheme: string;
  url: string;
}

let containerEl: HTMLElement;
let titleEl: HTMLElement;
let subtitleEl: HTMLElement;
let realmEl: HTMLElement;
let warningEl: HTMLElement;
let usernameEl: HTMLInputElement;
let passwordEl: HTMLInputElement;
let signInBtnEl: HTMLButtonElement;
let cancelBtnEl: HTMLButtonElement;
let scrimEl: HTMLElement;
let dialogEl: HTMLElement;

let currentRequestId: string | null = null;

const BASIC_AUTH_HTML = `
  <div class="basic-auth-overlay">
    <div class="basic-auth-scrim" id="basic-auth-scrim"></div>
    <div class="basic-auth-dialog" id="basic-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="basic-auth-title">
      <div class="basic-auth-header">
        <i data-lucide="lock" width="16" height="16"></i>
        <span id="basic-auth-title">Sign in</span>
      </div>
      <div class="basic-auth-body">
        <div class="basic-auth-subtitle" id="basic-auth-subtitle"></div>
        <div class="basic-auth-realm" id="basic-auth-realm" hidden></div>
        <div class="basic-auth-warning" id="basic-auth-warning" hidden>
          <i data-lucide="triangle-alert" width="14" height="14"></i>
          <span>Your credentials will be sent over an unencrypted connection.</span>
        </div>
        <label class="basic-auth-label" for="basic-auth-username">Username</label>
        <input type="text" class="basic-auth-input" id="basic-auth-username" autocomplete="off" />
        <label class="basic-auth-label" for="basic-auth-password">Password</label>
        <input type="password" class="basic-auth-input" id="basic-auth-password" autocomplete="off" />
      </div>
      <div class="basic-auth-actions">
        <button class="basic-auth-btn basic-auth-btn-secondary" id="basic-auth-cancel">Cancel</button>
        <button class="basic-auth-btn basic-auth-btn-primary" id="basic-auth-signin">Sign in</button>
      </div>
    </div>
  </div>
`;

function respond(creds: { username: string; password: string } | null): void {
  if (!currentRequestId) return;
  const requestId = currentRequestId;
  currentRequestId = null;
  const appWindowId = window.BrowserAPI?.appWindowId as string;
  window.BrowserAPI.respondToBasicAuth(appWindowId, requestId, creds);
}

function onSubmit(): void {
  const username = usernameEl.value;
  const password = passwordEl.value;
  respond({ username, password });
}

function onCancel(): void {
  respond(null);
}

function handleKeydown(e: KeyboardEvent): void {
  if (containerEl.hasAttribute('hidden')) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    onCancel();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    onSubmit();
  }
}

export function init(container: HTMLElement): void {
  containerEl = container;
  container.innerHTML = BASIC_AUTH_HTML;

  titleEl = container.querySelector('#basic-auth-title') as HTMLElement;
  subtitleEl = container.querySelector('#basic-auth-subtitle') as HTMLElement;
  realmEl = container.querySelector('#basic-auth-realm') as HTMLElement;
  warningEl = container.querySelector('#basic-auth-warning') as HTMLElement;
  usernameEl = container.querySelector('#basic-auth-username') as HTMLInputElement;
  passwordEl = container.querySelector('#basic-auth-password') as HTMLInputElement;
  signInBtnEl = container.querySelector('#basic-auth-signin') as HTMLButtonElement;
  cancelBtnEl = container.querySelector('#basic-auth-cancel') as HTMLButtonElement;
  scrimEl = container.querySelector('#basic-auth-scrim') as HTMLElement;
  dialogEl = container.querySelector('#basic-auth-dialog') as HTMLElement;

  signInBtnEl.addEventListener('click', onSubmit);
  cancelBtnEl.addEventListener('click', onCancel);
  scrimEl.addEventListener('click', (e) => e.stopPropagation());
  dialogEl.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('keydown', handleKeydown, true);
}

export function show(data?: BasicAuthPanelData): void {
  if (!data) return;
  currentRequestId = data.requestId;

  titleEl.textContent = data.isProxy ? 'Proxy authentication required' : 'Sign in';

  const authority = data.port ? `${data.host}:${data.port}` : data.host;
  if (data.isProxy) {
    subtitleEl.textContent = `The proxy ${authority} requires a username and password.`;
  } else {
    subtitleEl.textContent = `${authority} requires a username and password.`;
  }

  if (data.realm && data.realm.trim().length > 0) {
    realmEl.textContent = `Realm: ${data.realm}`;
    realmEl.removeAttribute('hidden');
  } else {
    realmEl.setAttribute('hidden', '');
  }

  const scheme = (data.scheme || '').toLowerCase();
  const insecure = !data.isProxy && scheme !== 'https';
  if (insecure) {
    warningEl.removeAttribute('hidden');
  } else {
    warningEl.setAttribute('hidden', '');
  }

  usernameEl.value = '';
  passwordEl.value = '';

  createIcons({ icons });

  setTimeout(() => {
    usernameEl.focus();
  }, 0);
}

export function hide(): void {
  currentRequestId = null;
  usernameEl.value = '';
  passwordEl.value = '';
}
