import { session, ipcMain, app, webContents } from "electron";
import { DataStoreConstants, RendererToMainEventsForBrowserIPC } from "../../constants/app-constants";
import { DataStoreManager } from "../database/data-store-manager";
import { DatabaseManager } from "../database/database-manager";
import { BrowserSettings, DEFAULT_BROWSER_SETTINGS, USER_AGENT_PRESETS } from "../../types/settings-types";
import { AD_BLOCK_DOMAINS, AD_URL_PATTERNS } from "../ad-blocker/ad-block-lists";

export abstract class SettingsEnforcer {
  private static autoDeleteInterval: ReturnType<typeof setInterval> | null = null;
  private static readonly AUTO_DELETE_CHECK_MS = 6 * 60 * 60 * 1000; // 6 hours

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

  // ---- Cookie Policy Enforcement ----
  private static applyCookiePolicy(settings: BrowserSettings) {
    const ses = session.fromPartition('persist:browsertabs');
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
        delete headers['set-cookie'];
        delete headers['Set-Cookie'];
        callback({ responseHeaders: headers });
      });
      return;
    }

    if (settings.cookiePolicy === 'block-all-third-party' || settings.cookiePolicy === 'block-with-exceptions') {
      ses.webRequest.onHeadersReceived((details, callback) => {
        if (!details.responseHeaders) {
          callback({});
          return;
        }

        const setCookieHeaders = details.responseHeaders['set-cookie'] || details.responseHeaders['Set-Cookie'];
        if (!setCookieHeaders) {
          callback({ responseHeaders: details.responseHeaders });
          return;
        }

        // Determine if this is a third-party request
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
          // Check exceptions
          if (settings.cookiePolicy === 'block-with-exceptions') {
            const requestDomain = requestUrl.hostname.toLowerCase();
            const isExempt = settings.cookieExceptions.some(exception => {
              const exDomain = exception.toLowerCase().trim();
              return requestDomain === exDomain || requestDomain.endsWith('.' + exDomain);
            });
            if (isExempt) {
              callback({ responseHeaders: details.responseHeaders });
              return;
            }
          }
          // Block third-party cookies
          const headers = { ...details.responseHeaders };
          delete headers['set-cookie'];
          delete headers['Set-Cookie'];
          callback({ responseHeaders: headers });
        } else {
          callback({ responseHeaders: details.responseHeaders });
        }
      });
    }
  }

  private static getRegistrableDomain(hostname: string): string {
    // Simplified eTLD+1 extraction
    const parts = hostname.split('.');
    if (parts.length <= 2) return hostname;
    return parts.slice(-2).join('.');
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

    const preset = settings.userAgentPreset || 'default';
    let userAgent: string;

    if (preset === 'custom') {
      userAgent = settings.userAgentCustomValue || USER_AGENT_PRESETS['default'].value;
    } else {
      userAgent = USER_AGENT_PRESETS[preset]?.value || USER_AGENT_PRESETS['default'].value;
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
