import { session, ipcMain, app, webContents } from "electron";
import { DataStoreConstants, RendererToMainEventsForBrowserIPC, MULTI_PART_TLDS } from "../../constants/app-constants";
import { DataStoreManager } from "../database/data-store-manager";
import { DatabaseManager } from "../database/database-manager";
import { BrowserSettings, DEFAULT_BROWSER_SETTINGS, USER_AGENT_PRESETS } from "../../types/settings-types";
import { AD_BLOCK_DOMAINS, AD_URL_PATTERNS } from "../ad-blocker/ad-block-lists";

export abstract class SettingsEnforcer {
  private static autoDeleteInterval: ReturnType<typeof setInterval> | null = null;
  private static readonly AUTO_DELETE_CHECK_MS = 6 * 60 * 60 * 1000; // 6 hours

  // Tracks webContentsIds whose current main-frame navigation is a
  // Cloudflare/CAPTCHA challenge page. Ad-blocker injection is skipped
  // for these pages so the verification scripts can run unmodified.
  private static challengePageIds = new Set<number>();

  /** Returns true if the given webContents is currently on a challenge page. */
  public static isChallengePage(webContentsId: number): boolean {
    return SettingsEnforcer.challengePageIds.has(webContentsId);
  }

  public static async init() {
    SettingsEnforcer.initIPCHandlers();
    const settings = SettingsEnforcer.getSettings();
    SettingsEnforcer.applyCookiePolicy(settings);
    SettingsEnforcer.applyProxySettings(settings);
    SettingsEnforcer.applyUserAgent(settings);
    SettingsEnforcer.applyAdBlocker(settings);
    SettingsEnforcer.startAutoDeleteScheduler(settings);
    SettingsEnforcer.runStartupCleanup(settings);
  }

  private static getSettings(): BrowserSettings {
    const stored = DataStoreManager.get(DataStoreConstants.BROWSER_SETTINGS) as BrowserSettings;
    return { ...DEFAULT_BROWSER_SETTINGS, ...stored };
  }

  private static initIPCHandlers() {
    // Synchronous check used by the preload script to skip polyfill injection
    // on Cloudflare/CAPTCHA challenge pages.
    ipcMain.on('is-challenge-page', (event) => {
      event.returnValue = SettingsEnforcer.isChallengePage(event.sender.id);
    });
    ipcMain.handle(RendererToMainEventsForBrowserIPC.APPLY_SETTINGS, async () => {
      const settings = SettingsEnforcer.getSettings();
      SettingsEnforcer.applyCookiePolicy(settings);
      SettingsEnforcer.applyProxySettings(settings);
      SettingsEnforcer.applyUserAgent(settings);
      SettingsEnforcer.applyAdBlocker(settings);
      SettingsEnforcer.startAutoDeleteScheduler(settings);
      return true;
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.CLEAR_BROWSING_DATA, async (event, options: {
      timeRange: string;
      browsingHistory: boolean;
      downloadHistory: boolean;
      cookiesSiteData: boolean;
      cachedFiles: boolean;
      autofillData: boolean;
      savedPasswords: boolean;
      sitePermissions: boolean;
    }) => {
      return SettingsEnforcer.clearBrowsingData(options);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.GET_COOKIE_COUNT, async () => {
      return SettingsEnforcer.getCookieCount();
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.GET_STORAGE_ESTIMATE, async () => {
      return SettingsEnforcer.getStorageEstimate();
    });
  }

  // ---- Cookie Policy & Response Header Enforcement ----
  // This single onHeadersReceived handler manages both cookie policy
  // and PDF inline display to avoid conflicting listeners on the same session.
  private static applyCookiePolicy(settings: BrowserSettings) {
    const sessions = [
      session.fromPartition('persist:browsertabs'),
      session.fromPartition('persist:private'),
    ];

    for (const ses of sessions) {
      // Remove existing listeners to prevent duplicates
      ses.webRequest.onBeforeSendHeaders(null);
      ses.webRequest.onHeadersReceived(null);

      if (settings.blockAllCookies) {
        // Block all cookies
        ses.webRequest.onBeforeSendHeaders((details, callback) => {
          const headers = { ...details.requestHeaders };
          delete headers['Cookie'];
          callback({ requestHeaders: headers });
        });
        ses.webRequest.onHeadersReceived((details, callback) => {
          const headers = { ...details.responseHeaders };
          if (!headers) { callback({}); return; }
          delete headers['set-cookie'];
          delete headers['Set-Cookie'];
          SettingsEnforcer.applyPdfInlineHeaders(headers);
          SettingsEnforcer.detectChallengePage(details, headers);
          callback({ responseHeaders: headers });
        });
        continue;
      }

      const blockThirdParty = settings.cookiePolicy === 'block-all-third-party' || settings.cookiePolicy === 'block-with-exceptions';

      // Always register onHeadersReceived so PDF inline display works
      // regardless of cookie policy setting
      ses.webRequest.onHeadersReceived((details, callback) => {
        if (!details.responseHeaders) {
          callback({});
          return;
        }

        let headers = details.responseHeaders;

        // --- Third-party cookie blocking ---
        if (blockThirdParty) {
          const setCookieHeaders = headers['set-cookie'] || headers['Set-Cookie'];
          if (setCookieHeaders) {
            const requestUrl = new URL(details.url);
            const frameUrl = details.frame?.url || details.referrer || '';
            let isThirdParty = false;

            if (frameUrl) {
              try {
                const frameUrlObj = new URL(frameUrl);
                const requestDomain = SettingsEnforcer.getRegistrableDomain(requestUrl.hostname);
                const frameDomain = SettingsEnforcer.getRegistrableDomain(frameUrlObj.hostname);
                isThirdParty = requestDomain !== frameDomain;
              } catch {
                // If we can't parse, allow it
              }
            }

            if (isThirdParty) {
              const requestDomain = requestUrl.hostname.toLowerCase();

              // Check the always-allow list (verification/CAPTCHA domains)
              const alwaysAllow = (settings.cookieAlwaysAllowDomains || []);
              const isAlwaysAllowed = alwaysAllow.some(d => {
                const domain = d.toLowerCase().trim();
                return requestDomain === domain || requestDomain.endsWith('.' + domain);
              });

              // Check user-configured exceptions (block-with-exceptions mode)
              let isExempt = isAlwaysAllowed;
              if (!isExempt && settings.cookiePolicy === 'block-with-exceptions') {
                isExempt = settings.cookieExceptions.some(exception => {
                  const exDomain = exception.toLowerCase().trim();
                  return requestDomain === exDomain || requestDomain.endsWith('.' + exDomain);
                });
              }

              if (!isExempt) {
                headers = { ...headers };
                delete headers['set-cookie'];
                delete headers['Set-Cookie'];
              }
            }
          }
        }

        // --- PDF inline display ---
        SettingsEnforcer.applyPdfInlineHeaders(headers);

        // --- Challenge page detection ---
        SettingsEnforcer.detectChallengePage(details, headers);

        callback({ responseHeaders: headers });
      });
    }
  }

  /**
   * Removes Content-Disposition headers from PDF responses so they display
   * inline in the browser instead of triggering a download.
   * Mutates the headers object in place.
   */
  /**
   * Detects Cloudflare/CAPTCHA challenge pages from main-frame responses and
   * tracks them so the ad-blocker can skip script injection on those pages.
   */
  private static detectChallengePage(
    details: { resourceType?: string; webContentsId?: number; statusCode?: number },
    headers: Record<string, string[]>
  ): void {
    if (details.resourceType === 'mainFrame' && details.webContentsId) {
      SettingsEnforcer.challengePageIds.delete(details.webContentsId);

      // Check for cf-mitigated header (set on any Cloudflare challenge, regardless of status code)
      const cfMitigated = headers['cf-mitigated'] || headers['Cf-Mitigated'] || [];
      if (cfMitigated.some(v => v.toLowerCase().includes('challenge'))) {
        SettingsEnforcer.challengePageIds.add(details.webContentsId);
        return;
      }

      // Check for Cloudflare challenge responses (403/503 from Cloudflare)
      if (details.statusCode === 403 || details.statusCode === 503) {
        const serverValues = headers['server'] || headers['Server'] || [];
        const cfRay = headers['cf-ray'] || headers['Cf-Ray'] || headers['CF-RAY'] || [];
        const isCloudflare = serverValues.some(v => v.toLowerCase().includes('cloudflare')) || cfRay.length > 0;
        if (isCloudflare) {
          SettingsEnforcer.challengePageIds.add(details.webContentsId);
        }
      }
    }
  }

  private static applyPdfInlineHeaders(headers: Record<string, string[]>): void {
    let isPdf = false;
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'content-type') {
        const value = (headers[key]?.[0] || '').toLowerCase();
        if (value.includes('application/pdf')) {
          isPdf = true;
        }
        break;
      }
    }

    if (isPdf) {
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === 'content-disposition') {
          delete headers[key];
        }
      }
    }
  }

  private static getRegistrableDomain(hostname: string): string {
    const parts = hostname.split('.');
    if (parts.length <= 2) return hostname;
    const lastTwo = parts.slice(-2).join('.');
    if (MULTI_PART_TLDS.has(lastTwo) && parts.length > 2) {
      return parts.slice(-3).join('.');
    }
    return lastTwo;
  }

  // ---- Proxy Settings ----
  private static applyProxySettings(settings: BrowserSettings) {
    const ses = session.fromPartition('persist:browsertabs');

    switch (settings.proxyMode) {
      case 'direct':
        ses.setProxy({ mode: 'direct' });
        break;
      case 'system':
        ses.setProxy({ mode: 'system' });
        break;
      case 'manual': {
        const proxyRules: string[] = [];
        if (settings.proxyHttpHost && settings.proxyHttpPort) {
          proxyRules.push(`http=${settings.proxyHttpHost}:${settings.proxyHttpPort}`);
        }
        if (settings.proxyHttpsHost && settings.proxyHttpsPort) {
          proxyRules.push(`https=${settings.proxyHttpsHost}:${settings.proxyHttpsPort}`);
        } else if (settings.proxyHttpHost && settings.proxyHttpPort) {
          proxyRules.push(`https=${settings.proxyHttpHost}:${settings.proxyHttpPort}`);
        }
        if (settings.proxySocksHost && settings.proxySocksPort) {
          const socksVersion = settings.proxySocksVersion === '4' ? 'socks4' : 'socks5';
          proxyRules.push(`${socksVersion}=${settings.proxySocksHost}:${settings.proxySocksPort}`);
        }
        ses.setProxy({
          proxyRules: proxyRules.join(';'),
          proxyBypassRules: settings.proxyBypassList || '',
        });
        break;
      }
      case 'pac':
        if (settings.proxyPacUrl) {
          ses.setProxy({ pacScript: settings.proxyPacUrl });
        }
        break;
    }
  }

  // ---- User Agent ----
  private static applyUserAgent(settings: BrowserSettings) {
    const browsingSes = session.fromPartition('persist:browsertabs');
    const privateSes = session.fromPartition('persist:private');

    const preset = settings.userAgentPreset || (process.platform === 'darwin' ? 'firefox-mac' : process.platform === 'linux' ? 'firefox-linux' : 'firefox-windows');

    let userAgent: string;

    if (preset === 'custom') {
      userAgent = settings.userAgentCustomValue || '';
      if (!userAgent) return;
    } else {
      userAgent = USER_AGENT_PRESETS[preset]?.value || '';
      if (!userAgent) return;
    }

    browsingSes.setUserAgent(userAgent);
    privateSes.setUserAgent(userAgent);

    // Apply to all existing open tabs so the change takes effect immediately
    for (const wc of webContents.getAllWebContents()) {
      const wcSession = wc.session;
      if (wcSession === browsingSes || wcSession === privateSes) {
        wc.setUserAgent(userAgent);
      }
    }
  }

  // ---- Ad-Blocker ----
  private static adBlockDomains: Set<string> = new Set();

  private static applyAdBlocker(settings: BrowserSettings) {
    const browsingSes = session.fromPartition('persist:browsertabs');
    const privateSes = session.fromPartition('persist:private');

    if (!settings.adBlockerEnabled) {
      browsingSes.webRequest.onBeforeRequest(null);
      privateSes.webRequest.onBeforeRequest(null);
      SettingsEnforcer.adBlockDomains.clear();
      return;
    }

    // Build domain blocklist from comprehensive ad/tracker domains
    SettingsEnforcer.adBlockDomains = new Set(AD_BLOCK_DOMAINS);

    const requestHandler = (details: Electron.OnBeforeRequestListenerDetails, callback: (response: Electron.CallbackResponse) => void) => {
      const currentSettings = SettingsEnforcer.getSettings();
      if (!currentSettings.adBlockerEnabled) {
        callback({});
        return;
      }

      try {
        const url = new URL(details.url);
        const hostname = url.hostname;

        // Check allowed sites (per-site disable)
        const topFrameUrl = details.frame?.url || details.referrer || '';
        if (topFrameUrl) {
          try {
            const topUrl = new URL(topFrameUrl);
            const topDomain = topUrl.hostname;
            if ((currentSettings.adBlockerAllowedSites || []).some(site => {
              const siteDomain = site.toLowerCase().trim();
              return topDomain === siteDomain || topDomain.endsWith('.' + siteDomain);
            })) {
              callback({});
              return;
            }
          } catch { /* ignore */ }
        }

        // Check if hostname matches any blocked domain
        for (const domain of SettingsEnforcer.adBlockDomains) {
          if (hostname === domain || hostname.endsWith('.' + domain)) {
            callback({ cancel: true });
            return;
          }
        }

        // Check URL path patterns for ad-related content
        const urlString = details.url;
        for (const pattern of AD_URL_PATTERNS) {
          if (pattern.test(urlString)) {
            // Don't block navigations to avoid breaking page loads
            if (details.resourceType === 'mainFrame') {
              break;
            }
            callback({ cancel: true });
            return;
          }
        }
      } catch { /* ignore parse errors */ }

      callback({});
    };

    browsingSes.webRequest.onBeforeRequest(requestHandler);
    privateSes.webRequest.onBeforeRequest(requestHandler);
  }

  // ---- Data Retention & Auto-Deletion ----
  private static startAutoDeleteScheduler(settings: BrowserSettings) {
    if (SettingsEnforcer.autoDeleteInterval) {
      clearInterval(SettingsEnforcer.autoDeleteInterval);
      SettingsEnforcer.autoDeleteInterval = null;
    }

    if (!settings.autoDeleteEnabled) return;

    SettingsEnforcer.autoDeleteInterval = setInterval(() => {
      SettingsEnforcer.runAutoDelete();
    }, SettingsEnforcer.AUTO_DELETE_CHECK_MS);
  }

  private static async runStartupCleanup(settings: BrowserSettings) {
    // Handle "clear on close" that may not have run (crash recovery)
    if (settings.clearHistoryOnClose) {
      await SettingsEnforcer.clearAllHistory();
    }
    if (settings.clearCookiesOnClose) {
      await SettingsEnforcer.clearAllCookies();
    }
    if (settings.clearCacheOnClose) {
      await SettingsEnforcer.clearAllCache();
    }

    // Run auto-delete on startup
    if (settings.autoDeleteEnabled) {
      await SettingsEnforcer.runAutoDelete();
    }
  }

  private static async runAutoDelete() {
    const settings = SettingsEnforcer.getSettings();
    if (!settings.autoDeleteEnabled) return;

    const db = DatabaseManager.getDatabase(false);
    const now = Date.now();

    // Browsing history
    if (settings.retentionBrowsingHistory !== 'never') {
      const days = parseInt(settings.retentionBrowsingHistory);
      if (!isNaN(days)) {
        const cutoff = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
        db.prepare("DELETE FROM browsingHistory WHERE createdDate < ?").run(cutoff);
      }
    }

    // Download history
    if (settings.retentionDownloadHistory !== 'never') {
      const days = parseInt(settings.retentionDownloadHistory);
      if (!isNaN(days)) {
        const cutoff = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
        db.prepare("DELETE FROM download WHERE createdDate < ?").run(cutoff);
      }
    }

    // Cookies & site data
    if (settings.retentionCookiesSiteData !== 'never') {
      const days = parseInt(settings.retentionCookiesSiteData);
      if (!isNaN(days)) {
        const ses = session.fromPartition('persist:browsertabs');
        const cookies = await ses.cookies.get({});
        const cutoff = (now / 1000) - (days * 24 * 60 * 60);
        for (const cookie of cookies) {
          if (cookie.expirationDate && cookie.expirationDate < cutoff) {
            try {
              const url = `${cookie.secure ? 'https' : 'http'}://${cookie.domain?.replace(/^\./, '')}${cookie.path || '/'}`;
              await ses.cookies.remove(url, cookie.name);
            } catch { /* ignore */ }
          }
        }
      }
    }

    // Cached files
    if (settings.retentionCachedFiles !== 'never') {
      const days = parseInt(settings.retentionCachedFiles);
      if (!isNaN(days) && days <= 1) {
        await SettingsEnforcer.clearAllCache();
      }
    }
  }

  private static async clearBrowsingData(options: {
    timeRange: string;
    browsingHistory: boolean;
    downloadHistory: boolean;
    cookiesSiteData: boolean;
    cachedFiles: boolean;
    autofillData: boolean;
    savedPasswords: boolean;
    sitePermissions: boolean;
  }): Promise<{ success: boolean; message: string }> {
    const db = DatabaseManager.getDatabase(false);
    const now = Date.now();
    let cutoff: string | null = null;

    switch (options.timeRange) {
      case 'last-hour':
        cutoff = new Date(now - 60 * 60 * 1000).toISOString();
        break;
      case 'last-24h':
        cutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'last-7d':
        cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'last-30d':
        cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'all-time':
      default:
        cutoff = null;
        break;
    }

    let deletedCount = 0;

    if (options.browsingHistory) {
      if (cutoff) {
        const result = db.prepare("DELETE FROM browsingHistory WHERE createdDate >= ?").run(cutoff);
        deletedCount += result.changes;
      } else {
        const result = db.prepare("DELETE FROM browsingHistory").run();
        deletedCount += result.changes;
      }
    }

    if (options.downloadHistory) {
      if (cutoff) {
        const result = db.prepare("DELETE FROM download WHERE createdDate >= ?").run(cutoff);
        deletedCount += result.changes;
      } else {
        const result = db.prepare("DELETE FROM download").run();
        deletedCount += result.changes;
      }
    }

    if (options.cookiesSiteData) {
      await SettingsEnforcer.clearAllCookies();
    }

    if (options.cachedFiles) {
      await SettingsEnforcer.clearAllCache();
    }

    return { success: true, message: `Cleared ${deletedCount} records` };
  }

  private static async clearAllHistory() {
    try {
      const db = DatabaseManager.getDatabase(false);
      db.prepare("DELETE FROM browsingHistory").run();
    } catch (e) { console.error('Failed to clear history:', e); }
  }

  private static async clearAllCookies() {
    try {
      const ses = session.fromPartition('persist:browsertabs');
      await ses.clearStorageData({ storages: ['cookies', 'localstorage'] });
    } catch (e) { console.error('Failed to clear cookies:', e); }
  }

  private static async clearAllCache() {
    try {
      const ses = session.fromPartition('persist:browsertabs');
      await ses.clearCache();
      await ses.clearCodeCaches({});
    } catch (e) { console.error('Failed to clear cache:', e); }
  }

  private static async getCookieCount(): Promise<{ count: number }> {
    try {
      const ses = session.fromPartition('persist:browsertabs');
      const cookies = await ses.cookies.get({});
      return { count: cookies.length };
    } catch {
      return { count: 0 };
    }
  }

  private static async getStorageEstimate(): Promise<{ bytes: number }> {
    try {
      const ses = session.fromPartition('persist:browsertabs');
      const cookies = await ses.cookies.get({});
      // Rough estimate: ~200 bytes per cookie + cache estimate
      const cookieBytes = cookies.length * 200;
      return { bytes: cookieBytes };
    } catch {
      return { bytes: 0 };
    }
  }

  // Called on graceful shutdown
  public static async onBeforeQuit() {
    const settings = SettingsEnforcer.getSettings();
    if (settings.clearHistoryOnClose) {
      await SettingsEnforcer.clearAllHistory();
    }
    if (settings.clearCookiesOnClose) {
      await SettingsEnforcer.clearAllCookies();
    }
    if (settings.clearCacheOnClose) {
      await SettingsEnforcer.clearAllCache();
    }
  }
}
