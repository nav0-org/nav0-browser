/**
 * Generates the HTML for the SSL/security warning interstitial page.
 * This page is shown when:
 * - The user navigates to an HTTP (non-SSL) website
 * - The SSL certificate for a website is invalid or untrusted
 */

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
  const title = isHttp
    ? 'Connection Not Secure'
    : 'Certificate Error';
  const heading = isHttp
    ? 'This connection is not secure'
    : 'This site\'s certificate is not trusted';
  const description = isHttp
    ? `The website <strong>${escapeHtml(hostname)}</strong> does not use an encrypted (HTTPS) connection. Information you send to this site (such as passwords, messages, or credit card details) could be read or modified by attackers on the network.`
    : `The certificate for <strong>${escapeHtml(hostname)}</strong> is not valid. This could mean someone is trying to intercept your connection, or the site is misconfigured.${errorCode ? ` <br><br><code>${escapeHtml(errorCode)}</code>` : ''}`;
  const riskDetails = isHttp
    ? `<li>Your data is sent in plain text and can be intercepted by anyone on the network</li>
       <li>Attackers can read or modify the content of the page (man-in-the-middle attack)</li>
       <li>Passwords, personal information, and payment details are exposed</li>
       <li>The identity of the website cannot be verified</li>`
    : `<li>The site\'s identity cannot be verified — it may be impersonating another site</li>
       <li>An attacker may have intercepted your connection (man-in-the-middle attack)</li>
       <li>Any data you send could be captured by a third party</li>
       <li>The site\'s certificate may have been revoked, expired, or was never issued by a trusted authority</li>`;

  // The proceed URL is the original URL itself. We encode it in a data attribute
  // and use inline JS to navigate, since the page is loaded as a data URL.
  const encodedUrl = Buffer.from(url).toString('base64');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f0f0f;
      color: #e0e0e0;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding: 60px 20px;
      -webkit-font-smoothing: antialiased;
    }

    .warning-container {
      max-width: 600px;
      width: 100%;
    }

    .warning-icon {
      width: 64px;
      height: 64px;
      margin-bottom: 24px;
    }

    .warning-icon svg {
      width: 64px;
      height: 64px;
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #f44336;
      margin-bottom: 16px;
      line-height: 1.3;
    }

    .description {
      font-size: 15px;
      line-height: 1.7;
      color: #b0b0b0;
      margin-bottom: 32px;
    }

    .description strong {
      color: #e0e0e0;
    }

    .description code {
      background: #1a1a1a;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 13px;
      color: #ff8a80;
    }

    .back-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 28px;
      background-color: #2196f3;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-bottom: 40px;
    }

    .back-button:hover {
      background-color: #1976d2;
    }

    .divider {
      border: none;
      border-top: 1px solid #222;
      margin: 0 0 24px 0;
    }

    .advanced-toggle {
      font-size: 13px;
      color: #777;
      cursor: pointer;
      user-select: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 16px;
    }

    .advanced-toggle:hover {
      color: #999;
    }

    .arrow {
      display: inline-block;
      transition: transform 0.2s;
      font-size: 10px;
    }

    .arrow.open {
      transform: rotate(90deg);
    }

    .advanced-content {
      display: none;
      animation: fadeIn 0.2s ease-in;
    }

    .advanced-content.visible {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .risk-card {
      background-color: #1a1212;
      border: 1px solid #3d1f1f;
      border-radius: 10px;
      padding: 20px 24px;
      margin-bottom: 20px;
    }

    .risk-card h3 {
      font-size: 14px;
      font-weight: 600;
      color: #ff8a80;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .risk-card ul {
      list-style: none;
      padding: 0;
    }

    .risk-card li {
      font-size: 14px;
      line-height: 1.6;
      color: #b0a0a0;
      padding: 4px 0 4px 20px;
      position: relative;
    }

    .risk-card li::before {
      content: "\\2022";
      color: #f44336;
      position: absolute;
      left: 4px;
    }

    .proceed-button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: transparent;
      color: #777;
      border: 1px solid #333;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .proceed-button:hover {
      color: #ff8a80;
      border-color: #5c2a2a;
      background-color: #1a1212;
    }

    .url-display {
      font-size: 12px;
      color: #555;
      margin-top: 16px;
      word-break: break-all;
      font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
    }
  </style>
</head>
<body>
  <div class="warning-container">
    <div class="warning-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${isHttp
          ? '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
          : '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
        }
      </svg>
    </div>

    <h1>${escapeHtml(heading)}</h1>
    <p class="description">${description}</p>

    <button class="back-button" onclick="history.back()">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Go back to safety
    </button>

    <hr class="divider">

    <div class="advanced-toggle" onclick="toggleAdvanced()">
      <span class="arrow" id="arrow">&#9654;</span>
      Advanced
    </div>

    <div class="advanced-content" id="advancedContent">
      <div class="risk-card">
        <h3>Risks of proceeding</h3>
        <ul>
          ${riskDetails}
        </ul>
      </div>

      <button class="proceed-button" id="proceedBtn" data-url="${encodedUrl}">
        Proceed to ${escapeHtml(hostname)} (unsafe)
      </button>

      <div class="url-display">${escapeHtml(url)}</div>
    </div>
  </div>

  <script>
    function toggleAdvanced() {
      var content = document.getElementById('advancedContent');
      var arrow = document.getElementById('arrow');
      content.classList.toggle('visible');
      arrow.classList.toggle('open');
    }

    document.getElementById('proceedBtn').addEventListener('click', function() {
      var encoded = this.getAttribute('data-url');
      var url = atob(encoded);
      window.location.href = url;
    });
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
