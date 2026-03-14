import errorPageTemplate from './error-page.html';

export interface NavigationError {
  errorCode: number;
  errorDescription: string;
  validatedURL: string;
}

const ICONS = {
  wifiOff: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
  globe: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  clock: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  shield: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  alertCircle: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
};

function getErrorIcon(errorCode: number): string {
  if (errorCode === -106 || errorCode === -109) return ICONS.wifiOff;
  if (errorCode === -105) return ICONS.globe;
  if (errorCode === -7 || errorCode === -118) return ICONS.clock;
  if (errorCode <= -200 && errorCode >= -299) return ICONS.shield;
  return ICONS.alertCircle;
}

function getErrorContent(error: NavigationError): { title: string; message: string; suggestion: string } {
  const { errorCode, validatedURL } = error;

  if (errorCode === -106 || errorCode === -109) {
    return {
      title: 'No internet connection',
      message: 'You\u2019re not connected to the internet.',
      suggestion: 'Check your network cables, modem, and router, or reconnect to Wi-Fi.',
    };
  }
  if (errorCode === -105) {
    let hostname = validatedURL;
    try { hostname = new URL(validatedURL).hostname; } catch { /* use raw URL */ }
    return {
      title: 'Site can\u2019t be reached',
      message: `${hostname}\u2019s server DNS address could not be found.`,
      suggestion: 'Check if there is a typo in the URL.',
    };
  }
  if (errorCode === -7 || errorCode === -118) {
    return {
      title: 'Connection timed out',
      message: 'The server took too long to respond.',
      suggestion: 'The site could be temporarily down or too busy. Try again later.',
    };
  }
  if (errorCode === -102) {
    return {
      title: 'Connection refused',
      message: 'The server refused the connection.',
      suggestion: 'Check if the site is running and the address is correct.',
    };
  }
  if (errorCode === -100 || errorCode === -101 || errorCode === -104) {
    return {
      title: 'Connection lost',
      message: 'The connection to the server was interrupted.',
      suggestion: 'Try reloading the page.',
    };
  }
  if (errorCode <= -200 && errorCode >= -299) {
    return {
      title: 'Connection is not private',
      message: 'This site\u2019s security certificate is not trusted.',
      suggestion: 'Proceed with caution or contact the site owner.',
    };
  }

  return {
    title: 'This page can\u2019t be reached',
    message: 'Something went wrong while loading this page.',
    suggestion: 'Check your connection and try again.',
  };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Builds a JavaScript snippet that replaces the current document with
 * a custom error page. Designed to be executed via webContents.executeJavaScript()
 * so the URL and favicon remain unchanged.
 */
export function buildErrorPageScript(error: NavigationError): string {
  const { title, message, suggestion } = getErrorContent(error);
  const icon = getErrorIcon(error.errorCode);
  const errorCodeLabel = error.errorDescription || `ERR_UNKNOWN (${error.errorCode})`;

  const html = errorPageTemplate
    .replace('{{ICON}}', icon)
    .replace('{{TITLE}}', escapeHtml(title))
    .replace('{{MESSAGE}}', escapeHtml(message))
    .replace('{{SUGGESTION}}', escapeHtml(suggestion))
    .replace('{{ERROR_CODE}}', escapeHtml(errorCodeLabel));

  // Escape for embedding inside a JS string
  const escaped = html.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');

  return `(function(){ document.documentElement.innerHTML = '${escaped}'; })();`;
}
