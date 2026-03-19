import './index.css';
import { initTheme } from '../common/theme';
initTheme();

const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const ICON_LOCK = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
const ICON_WARNING = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

const init = () => {
  document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('ssl-info-header') as HTMLElement;
    const headerIcon = document.getElementById('ssl-info-header-icon') as HTMLElement;
    const headerText = document.getElementById('ssl-info-header-text') as HTMLElement;
    const body = document.getElementById('ssl-info-body') as HTMLElement;
    const closeBtn = document.getElementById('ssl-info-close') as HTMLButtonElement;

    closeBtn.addEventListener('click', () => {
      window.BrowserAPI.hideSSLInfo(window.BrowserAPI.appWindowId);
    });

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        window.BrowserAPI.hideSSLInfo(window.BrowserAPI.appWindowId);
      }
    });

    (window as any).showSSLInfo = (data: { sslStatus: string; sslDetails: any; url: string }) => {
      let hostname = '';
      let protocol = '';
      try {
        const parsed = new URL(data.url);
        hostname = parsed.hostname;
        protocol = parsed.protocol;
      } catch { /* ignore */ }

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
          html += '<div class="ssl-info-warning-banner">Your connection to this site is not encrypted</div>';
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
          html += '<div class="ssl-info-warning-banner">Certificate error — you bypassed the warning</div>';
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
    };
  });
};

init();
