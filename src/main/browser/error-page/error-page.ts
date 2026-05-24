import errorPageTemplate from './error-page.html';

export interface NavigationError {
  errorCode: number;
  errorDescription: string;
  validatedURL: string;
}

interface ChecklistItem {
  title: string;
  help: string;
}

interface ErrorContent {
  /** Masthead h1 — generic ("Site can't be reached") */
  title: string;
  /** Uppercase mono code label rendered above the heading ("DNS_LOOKUP_FAILED") */
  eyebrow: string;
  /** Specific h2 inside the main panel ("linkedin.com's server can't be found") */
  heading: string;
  /** Body paragraph — may contain a single {{HOST}} placeholder that gets
   *  rendered as a mono inline chip. */
  message: string;
  /** Optional troubleshooting checklist for the side rail. */
  checklist: ChecklistItem[];
}

const ICONS = {
  wifiOff:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
  globe:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  clock:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  serverOff:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/><line x1="2" y1="2" x2="22" y2="22"/></svg>',
  shield:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  alertCircle:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
};

function getErrorIcon(errorCode: number): string {
  if (errorCode === -106 || errorCode === -109) return ICONS.wifiOff;
  if (errorCode === -105) return ICONS.globe;
  if (errorCode === -7 || errorCode === -118) return ICONS.clock;
  if (errorCode === -102) return ICONS.serverOff;
  if (errorCode === -100 || errorCode === -101 || errorCode === -104) return ICONS.serverOff;
  if (errorCode <= -200 && errorCode >= -299) return ICONS.shield;
  return ICONS.alertCircle;
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const NO_INTERNET_CHECKLIST: ChecklistItem[] = [
  { title: 'Check your Wi-Fi or ethernet', help: 'Make sure something is actually connected.' },
  { title: 'Restart your router', help: 'Power-cycle for 10 seconds, then plug it back in.' },
  { title: 'Disable any VPN or proxy', help: 'They can sever the network silently.' },
  { title: 'Try another site', help: 'If everything fails, it isn’t this site — it’s the link.' },
];

const DNS_CHECKLIST: ChecklistItem[] = [
  { title: 'Check the URL for a typo', help: 'A missing letter is the most common cause.' },
  { title: 'Check your internet connection', help: 'Wi-Fi, ethernet, or hotspot — anything live?' },
  { title: 'Check your DNS settings', help: 'A broken DNS server blocks valid lookups too.' },
  { title: 'Disable any VPN or proxy', help: 'Some networks intercept name resolution.' },
];

const TIMEOUT_CHECKLIST: ChecklistItem[] = [
  { title: 'Try again in a moment', help: 'The server may be temporarily slow or busy.' },
  { title: 'Check your internet connection', help: 'A flaky network can also produce timeouts.' },
  { title: 'Check the URL', help: 'Make sure you have the right address.' },
];

const REFUSED_CHECKLIST: ChecklistItem[] = [
  { title: 'Check the address is correct', help: 'Wrong port or path will be refused outright.' },
  {
    title: 'Is the server actually running?',
    help: 'Local dev servers especially — check the process.',
  },
  { title: 'Firewall or VPN blocking?', help: 'Some networks deny outbound connections.' },
];

const LOST_CHECKLIST: ChecklistItem[] = [
  { title: 'Reload the page', help: 'A transient drop usually clears on retry.' },
  { title: 'Check your connection', help: 'A weak signal can interrupt requests mid-flight.' },
];

function getErrorContent(error: NavigationError): ErrorContent {
  const { errorCode } = error;
  const host = extractHostname(error.validatedURL);

  if (errorCode === -106 || errorCode === -109) {
    return {
      title: 'No internet connection',
      eyebrow: 'NETWORK_OFFLINE',
      heading: 'You’re not connected to the internet',
      message:
        'Nav0 couldn’t reach the network. Check your Wi-Fi, ethernet cable, or hotspot — then reload this page.',
      checklist: NO_INTERNET_CHECKLIST,
    };
  }
  if (errorCode === -105) {
    return {
      title: 'Site can’t be reached',
      eyebrow: 'DNS_LOOKUP_FAILED',
      heading: `${host}’s server can’t be found`,
      message: `The DNS lookup for {{HOST:${host}}} didn’t resolve to an address. Most often this means the URL has a typo, the site is down, or your network can’t reach a DNS server right now.`,
      checklist: DNS_CHECKLIST,
    };
  }
  if (errorCode === -7 || errorCode === -118) {
    return {
      title: 'Connection timed out',
      eyebrow: 'CONNECTION_TIMED_OUT',
      heading: `${host} took too long to respond`,
      message: `Nav0 waited but {{HOST:${host}}} didn’t answer. The site could be temporarily down or simply too busy — try again in a moment.`,
      checklist: TIMEOUT_CHECKLIST,
    };
  }
  if (errorCode === -102) {
    return {
      title: 'Connection refused',
      eyebrow: 'CONNECTION_REFUSED',
      heading: `${host} refused the connection`,
      message: `The server at {{HOST:${host}}} actively refused our request. Either nothing is listening on that port, or a firewall in between dropped the connection.`,
      checklist: REFUSED_CHECKLIST,
    };
  }
  if (errorCode === -100 || errorCode === -101 || errorCode === -104) {
    return {
      title: 'Connection lost',
      eyebrow: 'CONNECTION_INTERRUPTED',
      heading: 'The connection was interrupted',
      message: `Something cut the connection between Nav0 and {{HOST:${host}}} mid-flight. A reload usually fixes this.`,
      checklist: LOST_CHECKLIST,
    };
  }
  if (errorCode <= -200 && errorCode >= -299) {
    return {
      title: 'Connection is not private',
      eyebrow: 'CERTIFICATE_UNTRUSTED',
      heading: `${host}’s certificate can’t be verified`,
      message: `Nav0 couldn’t verify the identity of {{HOST:${host}}}. Proceed only if you trust the site owner.`,
      checklist: [],
    };
  }

  return {
    title: 'This page can’t be reached',
    eyebrow: 'UNKNOWN_ERROR',
    heading: 'Something went wrong while loading this page',
    message: `Nav0 couldn’t load {{HOST:${host}}}. Check your connection and try again.`,
    checklist: [],
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Replaces {{HOST:hostname}} markers with a mono `.host` inline chip. */
function renderMessage(template: string): string {
  return template.replace(/\{\{HOST:([^}]+)\}\}/g, (_match, host) => {
    return `<span class="host">${escapeHtml(host)}</span>`;
  });
}

function renderChecklist(items: ChecklistItem[]): string {
  if (items.length === 0) return '';
  const rows = items
    .map(
      (item) => `
        <li class="check-row">
          <span class="check-dot"></span>
          <div>
            <div class="check-title">${escapeHtml(item.title)}</div>
            <div class="check-help">${escapeHtml(item.help)}</div>
          </div>
        </li>`
    )
    .join('');
  return `
    <aside class="error-side">
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">Try this</div>
          <div class="panel-sub">In order — most-likely first.</div>
        </div>
        <ul class="check-list">${rows}</ul>
      </div>
    </aside>`;
}

/**
 * Builds a JavaScript snippet that replaces the current document with
 * a custom error page. Designed to be executed via webContents.executeJavaScript()
 * so the URL and favicon remain unchanged.
 */
export function buildErrorPageScript(error: NavigationError): string {
  const content = getErrorContent(error);
  const icon = getErrorIcon(error.errorCode);
  const errorCodeLabel = error.errorDescription || `ERR_UNKNOWN (${error.errorCode})`;
  const sidePanel = renderChecklist(content.checklist);

  const html = errorPageTemplate
    .replace(/\{\{ICON\}\}/g, icon)
    .replace(/\{\{TITLE\}\}/g, escapeHtml(content.title))
    .replace(/\{\{EYEBROW\}\}/g, escapeHtml(content.eyebrow))
    .replace(/\{\{HEADING\}\}/g, escapeHtml(content.heading))
    .replace(/\{\{MESSAGE\}\}/g, renderMessage(content.message))
    .replace(/\{\{ERROR_CODE\}\}/g, escapeHtml(errorCodeLabel))
    .replace(/\{\{BODY_CLASS\}\}/g, sidePanel ? '' : 'no-side')
    .replace(/\{\{SIDE_PANEL\}\}/g, sidePanel);

  // Escape for embedding inside a JS string
  const escaped = html
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');

  return `(function(){ document.documentElement.innerHTML = '${escaped}'; })();`;
}
