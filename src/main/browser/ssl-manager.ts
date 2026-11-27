import { WebContents } from 'electron';
import { generateSSLWarningHTML } from './ssl-warning-page';

const SSL_BYPASS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Central manager for SSL certificate warning interstitials.
 * Maintains a process-wide set of user-bypassed hosts (shared across
 * all tabs, windows, and session types including private browsing).
 */
export class SSLManager {
  /** The title the warning page sets when the user clicks "Go back to safety". */
  static readonly GO_BACK_TITLE_SENTINEL = '__ssl_go_back__';

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
    const warningUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    wc.loadURL(warningUrl);

    return new Promise((resolve) => {
      // Whether this warning's latest load got to the end, and whether the
      // user has decided.
      let drawn = false;
      let settled = false;

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
        if (title === SSLManager.GO_BACK_TITLE_SENTINEL) {
          cleanup();
          resolve('go-back');
        }
      };

      // Any other main-frame document navigation means the tab has left the
      // warning (Back onto another warning's data: entry included). Two starts
      // don't: a reload of this warning (or of the one still on screen while
      // it loads), and its own "Proceed" link, which will-navigate handles
      // next (did-start-navigation fires first). Proceed must come from the
      // warning page itself: a popup or the previous page navigating to the
      // URL leaves the warning and gets a fresh one.
      const leaveHandler = (
        details: Electron.Event<Electron.WebContentsDidStartNavigationEventParams>
      ) => {
        if (!details.isMainFrame || details.isSameDocument) return;
        if (
          details.url.startsWith('data:') &&
          (details.url === warningUrl || details.url === wc.getURL())
        ) {
          drawn = false;
          return;
        }
        const fromWarning =
          details.initiator === wc.mainFrame && !!details.initiator?.url.startsWith('data:');
        if (details.url === url && fromWarning) return;
        cleanup();
        resolve('left');
      };

      // A Stop while the warning loads leaves it half drawn, or an older one
      // on screen, without working buttons, and a Reload then can bring the
      // older one back: once loading has stopped, draw this one again (a
      // reload of the warning isn't leaving it). Not from inside the
      // navigation's own events.
      const finishHandler = () => {
        drawn = wc.getURL() === warningUrl;
      };
      const stopHandler = () => {
        if (drawn) return;
        setTimeout(() => {
          if (settled || wc.isDestroyed() || !wc.getURL().startsWith('data:')) return;
          if (wc.getURL() === warningUrl) wc.reload();
          else wc.loadURL(warningUrl);
        });
      };

      const cleanup = () => {
        settled = true;
        wc.removeListener('will-navigate', willNavHandler);
        wc.removeListener('page-title-updated', titleHandler);
        wc.removeListener('did-start-navigation', leaveHandler);
        wc.removeListener('did-finish-load', finishHandler);
        wc.removeListener('did-stop-loading', stopHandler);
      };

      wc.on('will-navigate', willNavHandler);
      wc.on('page-title-updated', titleHandler);
      wc.on('did-start-navigation', leaveHandler);
      wc.on('did-finish-load', finishHandler);
      wc.on('did-stop-loading', stopHandler);
    });
  }
}
