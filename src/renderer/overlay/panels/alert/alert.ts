import './alert.css';

interface AlertPanelData {
  requestId: string;
  kind: 'alert' | 'confirm' | 'prompt';
  message: string;
  defaultValue?: string;
  origin: string;
}

let containerEl: HTMLElement;
let titleEl: HTMLElement;
let messageEl: HTMLElement;
let inputWrapEl: HTMLElement;
let inputEl: HTMLInputElement;
let okBtnEl: HTMLButtonElement;
let cancelBtnEl: HTMLButtonElement;
let dialogEl: HTMLElement;
let scrimEl: HTMLElement;

let currentRequestId: string | null = null;
let currentKind: AlertPanelData['kind'] = 'alert';

const ALERT_HTML = `
  <div class="alert-overlay">
    <div class="alert-scrim" id="alert-scrim"></div>
    <div class="alert-dialog" id="alert-dialog" role="alertdialog" aria-modal="true" aria-labelledby="alert-title" aria-describedby="alert-message">
      <div class="alert-header" id="alert-title"></div>
      <div class="alert-body">
        <div class="alert-message" id="alert-message"></div>
        <div class="alert-input-wrap" id="alert-input-wrap" hidden>
          <input type="text" class="alert-input" id="alert-input" />
        </div>
      </div>
      <div class="alert-actions">
        <button class="alert-btn alert-btn-secondary" id="alert-cancel">Cancel</button>
        <button class="alert-btn alert-btn-primary" id="alert-ok">OK</button>
      </div>
    </div>
  </div>
`;

function respond(confirmed: boolean, value?: string): void {
  if (!currentRequestId) return;
  const requestId = currentRequestId;
  currentRequestId = null;
  const appWindowId = window.BrowserAPI?.appWindowId as string;
  window.BrowserAPI.respondToDialog(appWindowId, requestId, { confirmed, value });
}

function onOk(): void {
  if (currentKind === 'prompt') {
    respond(true, inputEl.value);
  } else {
    respond(true);
  }
}

function onCancel(): void {
  if (currentKind === 'alert') {
    respond(true);
  } else {
    respond(false);
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (containerEl.hasAttribute('hidden')) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    onCancel();
  } else if (e.key === 'Enter') {
    const target = e.target as HTMLElement;
    if (target && target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    e.stopPropagation();
    onOk();
  }
}

export function init(container: HTMLElement): void {
  containerEl = container;
  container.innerHTML = ALERT_HTML;

  titleEl = container.querySelector('#alert-title') as HTMLElement;
  messageEl = container.querySelector('#alert-message') as HTMLElement;
  inputWrapEl = container.querySelector('#alert-input-wrap') as HTMLElement;
  inputEl = container.querySelector('#alert-input') as HTMLInputElement;
  okBtnEl = container.querySelector('#alert-ok') as HTMLButtonElement;
  cancelBtnEl = container.querySelector('#alert-cancel') as HTMLButtonElement;
  dialogEl = container.querySelector('#alert-dialog') as HTMLElement;
  scrimEl = container.querySelector('#alert-scrim') as HTMLElement;

  okBtnEl.addEventListener('click', onOk);
  cancelBtnEl.addEventListener('click', onCancel);
  // Scrim is non-dismissive for alert/confirm/prompt to match browser semantics —
  // these dialogs block the page and must be explicitly answered.
  scrimEl.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  dialogEl.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('keydown', handleKeydown, true);
}

export function show(data?: AlertPanelData): void {
  if (!data) return;
  currentRequestId = data.requestId;
  currentKind = data.kind;

  titleEl.textContent = `${data.origin} says`;
  messageEl.textContent = data.message || '';

  if (data.kind === 'prompt') {
    inputWrapEl.removeAttribute('hidden');
    inputEl.value = data.defaultValue ?? '';
  } else {
    inputWrapEl.setAttribute('hidden', '');
    inputEl.value = '';
  }

  if (data.kind === 'alert') {
    cancelBtnEl.style.display = 'none';
  } else {
    cancelBtnEl.style.display = '';
  }

  setTimeout(() => {
    if (data.kind === 'prompt') {
      inputEl.focus();
      inputEl.select();
    } else {
      okBtnEl.focus();
    }
  }, 0);
}

export function hide(): void {
  // If hidden without a response (e.g. tab closed / programmatic), ensure we don't leak state.
  currentRequestId = null;
}
