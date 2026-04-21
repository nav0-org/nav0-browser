/**
 * Generates the HTML for the SSL/security warning interstitial page.
 * This page is shown when:
 * - The user navigates to an HTTP (non-SSL) website
 * - The SSL certificate for a website is invalid or untrusted
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
  const title = isHttp ? 'Connection Not Secure' : 'Certificate Error';
  const heading = isHttp
    ? 'This connection is not secure'
    : "This site's certificate is not trusted";
  const description = isHttp
    ? `The website <strong>${escapeHtml(hostname)}</strong> does not use an encrypted (HTTPS) connection. Information you send to this site (such as passwords, messages, or credit card details) could be read or modified by attackers on the network.`
    : `The certificate for <strong>${escapeHtml(hostname)}</strong> is not valid. This could mean someone is trying to intercept your connection, or the site is misconfigured.${errorCode ? ` <br><br><code>${escapeHtml(errorCode)}</code>` : ''}`;
  const riskDetails = isHttp
    ? `<li>Your data is sent in plain text and can be intercepted by anyone on the network</li>
       <li>Attackers can read or modify the content of the page (man-in-the-middle attack)</li>
       <li>Passwords, personal information, and payment details are exposed</li>
       <li>The identity of the website cannot be verified</li>`
    : `<li>The site's identity cannot be verified — it may be impersonating another site</li>
       <li>An attacker may have intercepted your connection (man-in-the-middle attack)</li>
       <li>Any data you send could be captured by a third party</li>
       <li>The site's certificate may have been revoked, expired, or was never issued by a trusted authority</li>`;
  const iconSvg = isHttp
    ? '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
    : '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';

  const encodedUrl = Buffer.from(url).toString('base64');

  return template
    .replace('{{TITLE}}', escapeHtml(title))
    .replace('{{HEADING}}', escapeHtml(heading))
    .replace('{{DESCRIPTION}}', description)
    .replace('{{ICON_SVG}}', iconSvg)
    .replace('{{RISK_DETAILS}}', riskDetails)
    .replace('{{ENCODED_URL}}', encodedUrl)
    .replace('{{HOSTNAME}}', escapeHtml(hostname))
    .replace('{{URL_DISPLAY}}', escapeHtml(url));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
