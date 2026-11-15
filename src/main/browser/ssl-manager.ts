import { WebContents } from 'electron';
import { generateSSLWarningHTML } from './ssl-warning-page';

const SSL_BYPASS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const GO_BACK_TITLE_SENTINEL = '__ssl_go_back__';

/**
 * Central manager for SSL certificate warning interstitials.
 * Maintains a process-wide set of user-bypassed hosts (shared across
 * all tabs, windows, and session types including private browsing).
 */
export class SSLManager {
  /** Hosts the user has chosen to proceed to despite certificate errors, with timestamps. */
  private static bypassedHosts: Map<string, number> = new Map();

  /**
   * Returns true if the given host has been bypassed and the bypass hasn't expired.
   * Expired entries are cleaned up automatically.
   */
  static isHostBypassed(hostname: string): boolean {
    const bypassedAt = SSLManager.bypassedHosts.get(hostname);
    if (!bypassedAt) return false;
    if (Date.now() - bypassedAt < SSL_BYPASS_TTL_MS) return true;
    SSLManager.bypassedHosts.delete(hostname);
    return false;
  }

  /** Record that the user chose to bypass the SSL warning for the given host. */
  static addBypass(hostname: string): void {
    SSLManager.bypassedHosts.set(hostname, Date.now());
  }

  /** Generate the warning page HTML for a certificate error. */
  static generateWarningPage(url: string, errorCode: string): string {
    return generateSSLWarningHTML({ type: 'certificate', url, errorCode });
  }

  /**
   * Load the SSL warning interstitial into the given webContents and return
   * a promise that resolves with the user's decision.
   *
   * - 'proceed': user clicked "Proceed anyway" → bypass is recorded automatically
   * - 'go-back':  user clicked "Go back to safety"
   * - 'left':     the tab navigated away some other way (toolbar Back, a typed
   *               URL, a bookmark). The listeners go with it, so a later
   *               page-initiated navigation to the same URL can't count as
   *               "Proceed" and bypass the certificate.
   */
  static showWarning(
    wc: WebContents,
    url: string,
    errorCode: string
  ): Promise<'proceed' | 'go-back' | 'left'> {
    const html = SSLManager.generateWarningPage(url, errorCode);
    wc.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    return new Promise((resolve) => {
      const willNavHandler = (event: Electron.Event, navigationUrl: string) => {
        if (navigationUrl === url) {
          event.preventDefault();
          cleanup();
          try {
            SSLManager.addBypass(new URL(url).hostname);
          } catch {
            /* ignore */
          }
          resolve('proceed');
        }
      };

      const titleHandler = (_event: Electron.Event, title: string) => {
        if (title === GO_BACK_TITLE_SENTINEL) {
          cleanup();
          resolve('go-back');
        }
      };

      // The warning itself is a data: URL; any other main-frame document
      // navigation means the tab has left it.
      const leaveHandler = (
        details: Electron.Event<Electron.WebContentsDidStartNavigationEventParams>
      ) => {
        if (!details.isMainFrame || details.isSameDocument || details.url.startsWith('data:')) {
          return;
        }
        cleanup();
        resolve('left');
      };

      const cleanup = () => {
        wc.removeListener('will-navigate', willNavHandler);
        wc.removeListener('page-title-updated', titleHandler);
        wc.removeListener('did-start-navigation', leaveHandler);
      };

      wc.on('will-navigate', willNavHandler);
      wc.on('page-title-updated', titleHandler);
      wc.on('did-start-navigation', leaveHandler);
    });
  }
}
