import './ssl-info.css';

// Lucide icons (DESIGN.md §6): 16 px header icons, 14 px close glyph. overlay/index.ts runs
// createIcons() after init and after every show(), which converts them.
const ICON_LOCK = '<i data-lucide="lock" width="16" height="16"></i>';
const ICON_WARNING = '<i data-lucide="triangle-alert" width="16" height="16"></i>';

let containerEl: HTMLElement;
let header: HTMLElement;
let headerIcon: HTMLElement;
let headerText: HTMLElement;
let body: HTMLElement;

const SSL_INFO_HTML = `
  <div class="ssl-info-panel" id="si-ssl-info-panel">
    <div class="ssl-info-header" id="si-ssl-info-header">
      <div class="ssl-info-header-icon" id="si-ssl-info-header-icon"></div>
      <strong id="si-ssl-info-header-text"></strong>
      <button class="ssl-info-close" id="si-ssl-info-close" title="Close">
        <i data-lucide="x" width="14" height="14"></i>
      </button>
    </div>
    <div class="ssl-info-body" id="si-ssl-info-body"></div>
  </div>
`;

const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

function renderSSLInfo(data: { sslStatus: string; sslDetails: any; url: string }): void {
  let hostname = '';
  let protocol = '';
  try {
    const parsed = new URL(data.url);
    hostname = parsed.hostname;
    protocol = parsed.protocol;
  } catch {
    /* ignore */
  }

  header.classList.remove('secure', 'insecure');

  if (data.sslStatus === 'secure') {
    header.classList.add('secure');
    headerIcon.innerHTML = ICON_LOCK;
    headerText.textContent = 'Connection is secure';

    let html = '';
    html += `<div class="ssl-info-detail">Your connection to <strong>${escapeHtml(hostname)}</strong> is encrypted using TLS. This means your passwords, messages, and credit card numbers stay private.</div>`;
    html += '<div class="ssl-info-protocol">';
    html += `<div><span class="ssl-label">Protocol:</span> HTTPS (encrypted)</div>`;
    html += `<div><span class="ssl-label">Host:</span> ${escapeHtml(hostname)}</div>`;
    html += '</div>';
    if (data.sslDetails) {
      html += '<div class="ssl-info-cert">';
      html += '<div class="ssl-info-section-heading">Certificate</div>';
      html += `<div><span class="ssl-label">Subject:</span> ${escapeHtml(data.sslDetails.subjectName)}</div>`;
      html += `<div><span class="ssl-label">Issuer:</span> ${escapeHtml(data.sslDetails.issuer)}</div>`;
      html += `<div><span class="ssl-label">Valid from:</span> ${escapeHtml(data.sslDetails.validFrom)}</div>`;
      html += `<div><span class="ssl-label">Valid until:</span> ${escapeHtml(data.sslDetails.validTo)}</div>`;
      html += '</div>';
    }
    body.innerHTML = html;
  } else {
    header.classList.add('insecure');
    headerIcon.innerHTML = ICON_WARNING;
    headerText.textContent = 'Connection is not secure';

    let html = '';
    if (protocol === 'http:') {
      html +=
        '<div class="ssl-info-warning-banner">Your connection to this site is not encrypted</div>';
      html += `<div class="ssl-info-detail">You should not enter any sensitive information on this site (for example, passwords or credit cards), because it could be stolen by attackers.</div>`;
      html += '<div class="ssl-info-protocol">';
      html += `<div><span class="ssl-label">Protocol:</span> <span class="ssl-text-danger">HTTP (not encrypted)</span></div>`;
      html += `<div><span class="ssl-label">Host:</span> ${escapeHtml(hostname)}</div>`;
      html += '</div>';
      html += '<div class="ssl-info-risks">';
      html += '<div class="ssl-info-section-heading">Risks</div>';
      html += '<ul>';
      html += '<li>Passwords and data are sent in plain text</li>';
      html += '<li>Attackers on your network can see and modify content</li>';
      html += '<li>The identity of this website cannot be verified</li>';
      html += '</ul></div>';
    } else {
      html +=
        '<div class="ssl-info-warning-banner">Certificate error — you bypassed the warning</div>';
      html += `<div class="ssl-info-detail">The certificate for <strong>${escapeHtml(hostname)}</strong> is not trusted. Someone could be intercepting your connection.</div>`;
      html += '<div class="ssl-info-protocol">';
      html += `<div><span class="ssl-label">Protocol:</span> <span class="ssl-text-danger">HTTPS (certificate invalid)</span></div>`;
      html += `<div><span class="ssl-label">Host:</span> ${escapeHtml(hostname)}</div>`;
      html += '</div>';
      if (data.sslDetails) {
        html += '<div class="ssl-info-cert">';
        html += '<div class="ssl-info-section-heading">Certificate (untrusted)</div>';
        html += `<div><span class="ssl-label">Subject:</span> ${escapeHtml(data.sslDetails.subjectName)}</div>`;
        html += `<div><span class="ssl-label">Issuer:</span> ${escapeHtml(data.sslDetails.issuer)}</div>`;
        html += `<div><span class="ssl-label">Valid from:</span> ${escapeHtml(data.sslDetails.validFrom)}</div>`;
        html += `<div><span class="ssl-label">Valid until:</span> ${escapeHtml(data.sslDetails.validTo)}</div>`;
        html += '</div>';
      }
      html += '<div class="ssl-info-risks">';
      html += '<div class="ssl-info-section-heading">Risks</div>';
      html += '<ul>';
      html += '<li>An attacker may be impersonating this site</li>';
      html += '<li>Your data could be intercepted (man-in-the-middle)</li>';
      html += '<li>The certificate may be expired, self-signed, or revoked</li>';
      html += '</ul></div>';
    }
    body.innerHTML = html;
  }
}

export function init(container: HTMLElement): void {
  containerEl = container;
  container.innerHTML = SSL_INFO_HTML;

  header = container.querySelector('#si-ssl-info-header') as HTMLElement;
  headerIcon = container.querySelector('#si-ssl-info-header-icon') as HTMLElement;
  headerText = container.querySelector('#si-ssl-info-header-text') as HTMLElement;
  body = container.querySelector('#si-ssl-info-body') as HTMLElement;

  const closeBtn = container.querySelector('#si-ssl-info-close') as HTMLButtonElement;
  closeBtn.addEventListener('click', () => {
    window.BrowserAPI.hideSSLInfo(window.BrowserAPI.appWindowId);
  });

  // Click outside the panel = dismiss
  container.addEventListener('click', () => {
    window.BrowserAPI.hideSSLInfo(window.BrowserAPI.appWindowId);
  });
  // Prevent clicks on the panel itself from bubbling to the container
  const panel = container.querySelector('.ssl-info-panel') as HTMLElement;
  panel.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Only handle events when this panel is visible
    if (containerEl.hasAttribute('hidden')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      window.BrowserAPI.hideSSLInfo(window.BrowserAPI.appWindowId);
    }
  });
}

export function show(data?: any): void {
  if (data) {
    renderSSLInfo(data as { sslStatus: string; sslDetails: any; url: string });
  }
}

export function hide(): void {
  // Nothing special needed on hide
}
