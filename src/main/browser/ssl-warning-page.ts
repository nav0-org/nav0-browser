/**
 * Generates the HTML for the SSL/security warning interstitial page.
 * This page is shown when:
 * - The user navigates to an HTTP (non-SSL) website
 * - The SSL certificate for a website is invalid or untrusted
 *
 * Editorial dashboard grammar in the dark "danger" theme: 48-px lightweight
 * title with a red rule, hairline-bordered main panel containing the
 * eyebrow code label, specific heading, body paragraph with the hostname
 * inlined as a mono chip, mono error-code chip, primary "Go back to
 * safety" action, and a collapsible Advanced section with a risks list
 * + low-key mono "Proceed (unsafe)" link.
 */

// Loaded as a raw string via webpack asset/source
import template from './ssl-warning-page.html';

export type SSLWarningType = 'http' | 'certificate';

interface SSLWarningOptions {
  type: SSLWarningType;
  url: string;
  /** Certificate error string from Electron, e.g. "net::ERR_CERT_AUTHORITY_INVALID" */
  errorCode?: string;
}

export function generateSSLWarningHTML(options: SSLWarningOptions): string {
  const { type, url, errorCode } = options;

  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }

  const isHttp = type === 'http';

  // Title shown in tab + masthead
  const title = isHttp ? 'This connection isn’t secure' : 'This connection isn’t safe';

  // Uppercase mono code label
  const eyebrow = isHttp ? 'HTTP_NOT_ENCRYPTED' : 'TLS_HANDSHAKE_FAILED';

  // Specific h2 inside the main panel
  const heading = isHttp
    ? `${hostname} is served over plain HTTP`
    : `${hostname}’s certificate is not trusted`;

  // Body paragraph — hostname rendered as a mono chip
  const hostChip = `<span class="host">${escapeHtml(hostname)}</span>`;
  const message = isHttp
    ? `Traffic to and from ${hostChip} travels in plain text. Anything you send — passwords, messages, payment details — can be read or modified by anyone on the network between you and the site.`
    : `The certificate served by ${hostChip} isn’t signed by an authority Nav0 trusts. We can’t verify the site is who it claims to be, and any data you send could be visible or tampered with by a third party.`;

  // Mono error-code chip
  const errorCodeLabel = isHttp
    ? 'net::ERR_HTTP_NOT_ENCRYPTED'
    : errorCode || 'net::ERR_CERT_AUTHORITY_INVALID';

  // Glyph (white-on-red tile in the template, so just the inner path)
  const iconSvg = isHttp
    ? '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
    : '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';

  // Risk list — rendered as <li> rows inside the Advanced panel
  const riskItems = isHttp
    ? [
        'Data is sent in plain text and can be intercepted by anyone on the network.',
        'Attackers can read or modify the content of the page (man-in-the-middle attack).',
        'Passwords, personal information, and payment details are exposed.',
        'The identity of the site cannot be verified.',
      ]
    : [
        'The site’s identity cannot be verified — it may be impersonating another site.',
        'An attacker may have intercepted your connection (man-in-the-middle attack).',
        'Any data you send could be captured or altered by a third party.',
        'The certificate may be expired, revoked, or never issued by a trusted authority.',
      ];

  const riskDetails = riskItems.map((line) => `<li>${escapeHtml(line)}</li>`).join('\n');

  const encodedUrl = Buffer.from(url).toString('base64');

  return template
    .replace(/\{\{TITLE\}\}/g, escapeHtml(title))
    .replace(/\{\{EYEBROW\}\}/g, escapeHtml(eyebrow))
    .replace(/\{\{HEADING\}\}/g, escapeHtml(heading))
    .replace(/\{\{MESSAGE\}\}/g, message)
    .replace(/\{\{ERROR_CODE\}\}/g, escapeHtml(errorCodeLabel))
    .replace(/\{\{ICON_SVG\}\}/g, iconSvg)
    .replace(/\{\{RISK_DETAILS\}\}/g, riskDetails)
    .replace(/\{\{ENCODED_URL\}\}/g, encodedUrl)
    .replace(/\{\{HOSTNAME\}\}/g, escapeHtml(hostname))
    .replace(/\{\{URL_DISPLAY\}\}/g, escapeHtml(url));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
