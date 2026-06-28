import { app, BrowserWindow, dialog, Menu, MenuItem, net, shell, WebContentsView } from 'electron';
import {
  InAppUrls,
  DataStoreConstants,
  MainToRendererEventsForBrowserIPC,
  WebContentsEvents,
  STREAMING_SITES,
} from '../../constants/app-constants';
import { v4 as uuid } from 'uuid';
import { AppWindow } from './app-window';
import { BookmarkManager } from './bookmark-manager';
import { BookmarkRecord } from '../../types/bookmark-record';
import { BrowsingHistoryManager } from './browsing-history-manager';
import { DownloadManager } from './download-manager';
import * as fs from 'fs';
import path from 'path';
import { Utils } from '../browser/utils';
import { SearchEngine } from '../web/search-engine';
import { PermissionManager } from './permission-manager';
import { ReaderModeManager, ReaderModeState } from './reader-mode-manager';
import { DataStoreManager } from '../database/data-store-manager';
import { BrowserSettings, DEFAULT_BROWSER_SETTINGS } from '../../types/settings-types';
import {
  COSMETIC_FILTER_CSS,
  AD_BLOCK_EARLY_SCRIPT,
  AD_BLOCK_SCRIPT,
} from '../ad-blocker/ad-block-lists';
import { SSLManager } from './ssl-manager';
import { ZoomManager } from './zoom-manager';
import { buildErrorPageScript, NavigationError } from './error-page/error-page';
const domainPattern = /^[^\s]+\.[^\s]+$/;
// Protocols that should be handed off to the OS default handler.
// Covers communication (mailto, tel, sms), calendar (webcal), and
// common app deep-links (slack, zoom, teams, discord, vscode, etc.)
const EXTERNAL_PROTOCOL_RE =
  /^(mailto|tel|callto|sms|facetime|webcal|slack|zoommtg|zoomus|msteams|discord|spotify|vscode|vscode-insiders|obsidian|notion|figma|linear|raycast):/i;

// Rank Chromium's discovered favicons by URL size hints so the caller can try
// the sharpest first and fall back if a fetch fails. Chromium hands us every
// `<link rel="icon">` URL it found, including ones the site advertises but
// doesn't actually serve (most commonly `apple-touch-icon` boilerplate that
// 404s). Strictly picking the largest left tabs with broken favicons on those
// sites, so we return the full list ordered best-first and let the handler
// walk it until one fetches successfully.
function rankFaviconUrls(faviconUrls: string[]): string[] {
  if (faviconUrls.length <= 1) return faviconUrls.slice();

  const squareSize = /(\d{2,4})x\1/i;
  const trailingSize = /[-_](\d{2,4})\.(?:png|webp|jpe?g|ico|svg)(?:[?#]|$)/i;

  const score = (url: string): number => {
    const lower = url.toLowerCase();
    const m = lower.match(squareSize) ?? lower.match(trailingSize);
    let s = m ? parseInt(m[1], 10) : 0;
    if (lower.includes('.svg')) s = Math.max(s, 256);
    if (lower.includes('apple-touch-icon')) s = Math.max(s, 120);
    if (s === 0 && /\.(png|webp|svg)(?:[?#]|$)/i.test(lower)) s = 32;
    return s;
  };

  return faviconUrls
    .map((url, i) => ({ url, score: score(url), i }))
    .sort((a, b) => b.score - a.score || b.i - a.i)
    .map((entry) => entry.url);
}

export class Tab {
  public readonly id: string = uuid();
  private url: string;
  private title: string;
  private faviconUrl: string | null = null;
  private webContentsViewInstance: WebContentsView | null = null;
  private partitionSetting: string;
  private preloadScript: string | null = null;
  private parentAppWindow: AppWindow | null = null;
  private bookmark: BookmarkRecord | null = null;
  private lastHistoryRecordId: string | null = null;
  private navigationDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly NAVIGATION_DEBOUNCE_MS = 500;
  private readyPromise: Promise<void> = Promise.resolve();
  private static handledDownloads: Set<string> = new Set();
  private currentOrigin: string | null = null;
  private readerMode: ReaderModeState = ReaderModeManager.createState();
  private readerModeCheckTimer: ReturnType<typeof setTimeout> | null = null;
  private readerModeToggleLock = false;
  private static pdfSessionsRegistered = new Set<string>();
  private popupTimestamps: number[] = [];
  private static readonly MAX_POPUPS = 3;
  private static readonly POPUP_WINDOW_MS = 60_000;
  private _destroyed = false;
  private showingSSLWarning = false;
  private pendingError: NavigationError | null = null;
  private sslStatus: 'secure' | 'insecure' | 'internal' = 'internal';
  private sslCertificate: Electron.Certificate | null = null;
  private willDownloadHandler:
    | ((
        event: Electron.Event,
        item: Electron.DownloadItem,
        webContents: Electron.WebContents
      ) => void)
    | null = null;
  private isSuspended = false;
  private isPinned = false;
  private lastActivatedAt: Date = new Date();
  private pageStartTime: number | null = null;
  private activeTimeAccumulator = 0;
  private lastActiveStart: number | null = null;
  private timeFlushInterval: ReturnType<typeof setInterval> | null = null;
  private static readonly TIME_FLUSH_INTERVAL_MS = 60_000;

  constructor(
    parentAppWindow: AppWindow,
    url: string,
    partitionSetting: string,
    options?: { suspended?: boolean; title?: string }
  ) {
    this.parentAppWindow = parentAppWindow;
    this.id = uuid();
    this.url = url || '';
    this.title = options?.title || 'New Tab';
    this.partitionSetting = partitionSetting;
    if (options?.suspended) {
      this.isSuspended = true;
    } else {
      this.loadURL();
    }
  }

  private async loadURL(url?: string) {
    let urlToLoad;
    let preloadScriptToLoad;
    let isInternalPage = false;
    this.url = url ?? this.url;
    this.url = this.url.trim();
    if (this.url.startsWith(InAppUrls.BOOKMARKS)) {
      urlToLoad = BOOKMARKS_WEBPACK_ENTRY;
      preloadScriptToLoad = BOOKMARKS_PRELOAD_WEBPACK_ENTRY;
      isInternalPage = true;
    } else if (this.url.startsWith(InAppUrls.BROWSER_SETTINGS)) {
      urlToLoad = BROWSER_SETTINGS_WEBPACK_ENTRY;
      preloadScriptToLoad = BROWSER_SETTINGS_PRELOAD_WEBPACK_ENTRY;
      isInternalPage = true;
    } else if (this.url.startsWith(InAppUrls.DOWNLOADS)) {
      urlToLoad = DOWNLOADS_WEBPACK_ENTRY;
      preloadScriptToLoad = DOWNLOADS_PRELOAD_WEBPACK_ENTRY;
      isInternalPage = true;
    } else if (this.url.startsWith(InAppUrls.HISTORY)) {
      urlToLoad = HISTORY_WEBPACK_ENTRY;
      preloadScriptToLoad = HISTORY_PRELOAD_WEBPACK_ENTRY;
      isInternalPage = true;
    } else if (this.url.startsWith(InAppUrls.NEW_TAB)) {
      urlToLoad = NEW_TAB_WEBPACK_ENTRY;
      preloadScriptToLoad = NEW_TAB_PRELOAD_WEBPACK_ENTRY;
      this.url = '';
      isInternalPage = true;
    } else if (this.url.startsWith(InAppUrls.ABOUT)) {
      urlToLoad = ABOUT_WEBPACK_ENTRY;
      preloadScriptToLoad = ABOUT_PRELOAD_WEBPACK_ENTRY;
      isInternalPage = true;
    } else if (EXTERNAL_PROTOCOL_RE.test(this.url)) {
      // Hand off mailto:, tel:, etc. to the OS default handler
      shell.openExternal(this.url).catch(() => {});
      return;
    } else if (this.url.startsWith('file://')) {
      urlToLoad = this.url;
      preloadScriptToLoad = null;
    } else if (this.url.startsWith('http://') && !this.isLocalhost(this.url)) {
      // Force HTTP to HTTPS — if the certificate is invalid, the
      // certificate-error handler will show the interstitial warning.
      this.url = this.url.replace(/^http:\/\//, 'https://');
      urlToLoad = this.url;
      preloadScriptToLoad = WEB_CONTENT_PRELOAD_WEBPACK_ENTRY;
    } else if (this.url.startsWith('http://') || this.url.startsWith('https://')) {
      urlToLoad = this.url;
      preloadScriptToLoad = WEB_CONTENT_PRELOAD_WEBPACK_ENTRY;
    } else if (Tab.looksLikeLocalhostInput(this.url)) {
      // Bare localhost-style inputs (localhost:3000, 127.0.0.1, myapp.local,
      // foo.test) should load directly over HTTP — they rarely have valid
      // TLS certs, and forcing HTTPS breaks reverse-proxy and dev-server flows.
      this.url = 'http://' + this.url;
      urlToLoad = this.url;
      preloadScriptToLoad = WEB_CONTENT_PRELOAD_WEBPACK_ENTRY;
    } else if (domainPattern.test(this.url)) {
      this.url = 'https://' + this.url;
      urlToLoad = this.url;
      preloadScriptToLoad = WEB_CONTENT_PRELOAD_WEBPACK_ENTRY;
    } else {
      this.url = await SearchEngine.getSearchUrl(this.url);
      urlToLoad = this.url;
      preloadScriptToLoad = WEB_CONTENT_PRELOAD_WEBPACK_ENTRY;
    }
    const needsNewView =
      this.preloadScript !== preloadScriptToLoad || !this.webContentsViewInstance;
    if (needsNewView) {
      this.preloadScript = preloadScriptToLoad;
      this.initWebContentsView();
    }
    if (isInternalPage) {
      this.readyPromise = new Promise<void>((resolve) => {
        this.webContentsViewInstance.webContents.once('did-finish-load', () => resolve());
      });
    } else {
      this.readyPromise = Promise.resolve();
    }
    if (urlToLoad) {
      this.webContentsViewInstance.webContents.loadURL(urlToLoad);
    }
    // If this tab is already active and the view was recreated, re-activate after content loads
    if (needsNewView && this.parentAppWindow.getActiveTabId() === this.id) {
      await this.readyPromise;
      this.parentAppWindow.activateTab(this.id);
    }
  }

  private async initWebContentsView() {
    if (this.webContentsViewInstance) {
      this.webContentsViewInstance.webContents.close();
    }
    this.webContentsViewInstance = new WebContentsView({
      webPreferences: {
        preload: this.preloadScript,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        plugins: true,
        additionalArguments: [
          `--app-window-id=${this.parentAppWindow.id}`,
          `--is-private=${this.parentAppWindow.isPrivate}`,
          `--tab-id=${this.id}`,
        ],
        allowRunningInsecureContent: false,
        partition: this.partitionSetting,
      },
    });
    // WebRTC leak protection without breaking connectivity: keep the full
    // 'default' ICE policy so calls can connect, and rely on Chromium's mDNS
    // masking (WebRtcHideLocalIpsWithMdns, enabled in index.ts) to replace real
    // local IPs with ".local" hostnames on the wire. The stricter
    // 'default_public_interface_only' policy we used before withheld host
    // candidates and broke demanding WebRTC services (Google Meet failed to
    // connect with DisconnectedError).
    this.webContentsViewInstance.webContents.setWebRTCIPHandlingPolicy('default');
    // User agent is set at the session level by SettingsEnforcer.applyUserAgent()
    // this.webContentsViewInstance.webContents.openDevTools({mode : 'detach'});
    this.registerPdfHandler();
    this.initEventHandlers();
  }

  /**
   * Registers a session-level handler that strips non-attachment Content-Disposition
   * headers from PDF responses so they render inline instead of being saved.
   * Explicit `attachment` dispositions are preserved — those signal an intentional
   * download (e.g. Gmail's "Download attachment" link) and force-rendering them
   * inline can crash the sandboxed PDF-viewer renderer.
   * Only registers once per session partition.
   */
  private registerPdfHandler(): void {
    if (Tab.pdfSessionsRegistered.has(this.partitionSetting)) return;
    Tab.pdfSessionsRegistered.add(this.partitionSetting);

    this.webContentsViewInstance.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        const headers = details.responseHeaders;
        if (!headers) {
          callback({});
          return;
        }

        // Find content-type header (case-insensitive)
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

        if (!isPdf) {
          callback({ responseHeaders: headers });
          return;
        }

        // Preserve explicit attachment dispositions — server is signaling a
        // download. Stripping them forces Chromium's PDF viewer to load in a
        // cross-origin context that crashes the sandboxed renderer.
        let isAttachment = false;
        for (const key of Object.keys(headers)) {
          if (key.toLowerCase() === 'content-disposition') {
            const value = (headers[key]?.[0] || '').toLowerCase();
            if (value.trim().startsWith('attachment')) {
              isAttachment = true;
            }
            break;
          }
        }

        if (isAttachment) {
          callback({ responseHeaders: headers });
          return;
        }

        // Remove non-attachment Content-Disposition (e.g. `inline`) so PDFs
        // render in-tab via the built-in viewer.
        const newHeaders = { ...headers };
        for (const key of Object.keys(newHeaders)) {
          if (key.toLowerCase() === 'content-disposition') {
            delete newHeaders[key];
          }
        }
        callback({ responseHeaders: newHeaders });
      }
    );
  }

  private initEventHandlers() {
    // Intercept navigations to external protocols (mailto:, tel:, etc.)
    // and hand them off to the OS default handler instead of navigating.
    this.webContentsViewInstance.webContents.on('will-navigate', (event, url) => {
      if (EXTERNAL_PROTOCOL_RE.test(url)) {
        event.preventDefault();
        shell.openExternal(url).catch(() => {});
      }
    });

    // Chrome-style zoom shortcuts (Cmd/Ctrl +/-/0) when the page has focus.
    this.webContentsViewInstance.webContents.on('before-input-event', (event, input) => {
      if (this._destroyed) return;
      const action = ZoomManager.matchShortcut(input);
      if (!action) return;
      event.preventDefault();
      if (action === 'in') this.zoomIn();
      else if (action === 'out') this.zoomOut();
      else this.resetZoom();
    });

    //for hard navigation (debounced)
    this.webContentsViewInstance.webContents.on(
      WebContentsEvents.DID_NAVIGATE,
      async (event, url: string) => {
        if (this._destroyed) return;
        // Skip data: URLs (SSL warning interstitials) during forward/back navigation.
        // These are not real pages — go back to where the user came from.
        if (url.startsWith('data:') && !this.showingSSLWarning) {
          const nav = this.webContentsViewInstance.webContents.navigationHistory;
          if (nav.canGoBack()) {
            nav.goBack();
          }
          return;
        }
        // Clear any pending error on successful navigation
        this.pendingError = null;
        // Reset SSL status for new navigation (will be re-evaluated in sendTabUrlUpdate)
        try {
          const hostname = new URL(url).hostname;
          if (this.sslStatus === 'insecure' && !SSLManager.isHostBypassed(hostname)) {
            this.sslStatus = 'secure';
            this.sslCertificate = null;
          }
        } catch {
          /* ignore invalid URLs */
        }
        this.handleOriginChange(url);
        this.debouncedHandleNavigationCompletion(url);
        // Inject early ad-block hooks (IMA mock, play() interception) as soon as navigation commits
        this.injectAdBlockEarlyScript(url);
      }
    );
    //for soft navigation (debounced)
    this.webContentsViewInstance.webContents.on(
      WebContentsEvents.DID_NAVIGATE_IN_PAGE,
      async (event, url: string, isMainFrame: boolean) => {
        if (this._destroyed) return;
        // did-navigate-in-page fires for every frame. Ignore subframes (e.g. the
        // gapi hovercard iframe in Gmail changing its #fragment) so an iframe URL
        // never lands in the address bar — only the main frame drives it.
        if (!isMainFrame) return;
        this.debouncedHandleNavigationCompletion(url);
        // Re-apply dark mode for back/forward in-page navigations (bfcache restores)
      }
    );

    // Cosmetic ad filtering and DOM cleanup once the DOM is ready
    this.webContentsViewInstance.webContents.on(WebContentsEvents.DOM_READY, () => {
      if (this.pendingError) {
        this.injectCustomErrorPage(this.pendingError);
        this.pendingError = null;
        return;
      }
      this.injectAdBlockDOMScript();
    });

    this.willDownloadHandler = async (
      event: Electron.Event,
      item: Electron.DownloadItem,
      downloadWebContents: Electron.WebContents
    ) => {
      // Allow cross-session resumes triggered by createInterruptedDownload
      // (their downloadWebContents won't match any tab's webContents)
      const downloadId = item.getStartTime().toString() + '_' + item.getFilename();
      const isCrossSessionResume = DownloadManager.isResuming(downloadId);
      if (!isCrossSessionResume && downloadWebContents !== this.webContentsViewInstance.webContents)
        return;

      await this.handleDownload(item);
    };
    this.webContentsViewInstance.webContents.session.on('will-download', this.willDownloadHandler);
    this.webContentsViewInstance.webContents.on(WebContentsEvents.DID_START_LOADING, () => {
      if (this._destroyed) return;
      this.parentAppWindow
        .getBrowserWindowInstance()
        ?.webContents.send(MainToRendererEventsForBrowserIPC.TAB_LOADING_CHANGED, {
          id: this.id,
          isLoading: true,
        });
    });
    this.webContentsViewInstance.webContents.on(WebContentsEvents.DID_STOP_LOADING, () => {
      if (this._destroyed) return;
      this.parentAppWindow
        .getBrowserWindowInstance()
        ?.webContents.send(MainToRendererEventsForBrowserIPC.TAB_LOADING_CHANGED, {
          id: this.id,
          isLoading: false,
        });
    });
    this.webContentsViewInstance.webContents.on(
      WebContentsEvents.PAGE_TITLE_UPDATED,
      async (event, title: string) => {
        if (this._destroyed) return;
        this.title = title;
        this.parentAppWindow
          .getBrowserWindowInstance()
          ?.webContents.send(MainToRendererEventsForBrowserIPC.TAB_TITLE_UPDATED, {
            id: this.id,
            title: this.title,
          });
        // Update the history record with the actual title
        if (this.lastHistoryRecordId) {
          await BrowsingHistoryManager.updateRecordTitle(
            this.parentAppWindow.id,
            this.lastHistoryRecordId,
            title
          );
        }
      }
    );
    this.webContentsViewInstance.webContents.on(
      WebContentsEvents.PAGE_FAVICON_UPDATED,
      async (event, faviconUrls: string[]) => {
        if (this._destroyed) return;
        if (this.url.startsWith(InAppUrls.PREFIX) || this.url === '') return;

        const candidates = rankFaviconUrls(faviconUrls);
        if (candidates.length === 0) return;

        // Fetch from the main process using net.fetch so the bytes don't go
        // through the renderer's <img> tag — some CDNs (e.g. Cloudflare) block
        // cross-site image requests based on Sec-Fetch-Site/Sec-Fetch-Dest, so
        // we base64-encode the bytes ourselves to sidestep that. Walk the
        // candidates best-first and stop at the first one that fetches: many
        // sites advertise an apple-touch-icon (or other sized variant) they
        // don't actually serve, and we want to fall back instead of stamping a
        // broken URL onto the tab.
        let faviconToSend: string | null = null;
        for (const candidate of candidates) {
          if (this._destroyed) return;
          if (!candidate.startsWith('http')) {
            faviconToSend = candidate;
            break;
          }
          try {
            const response = await (
              net.fetch as (input: string, init?: Record<string, unknown>) => Promise<Response>
            )(candidate, { session: this.webContentsViewInstance?.webContents.session });
            if (response.ok) {
              const contentType = response.headers.get('content-type') || 'image/x-icon';
              const buffer = Buffer.from(await response.arrayBuffer());
              faviconToSend = `data:${contentType};base64,${buffer.toString('base64')}`;
              break;
            }
          } catch {
            // try the next candidate
          }
        }

        // Every candidate failed — send the best URL and let the renderer's
        // onerror handler swap in the empty-favicon placeholder.
        if (faviconToSend === null) faviconToSend = candidates[0];

        this.faviconUrl = faviconToSend;
        if (this._destroyed) return;
        this.parentAppWindow
          .getBrowserWindowInstance()
          ?.webContents.send(MainToRendererEventsForBrowserIPC.TAB_FAVICON_UPDATED, {
            id: this.id,
            faviconUrl: faviconToSend,
          });
        if (this.lastHistoryRecordId) {
          await BrowsingHistoryManager.updateRecordFavicon(
            this.parentAppWindow.id,
            this.lastHistoryRecordId,
            faviconToSend
          );
        }
      }
    );
    this.webContentsViewInstance.webContents.on(
      WebContentsEvents.DID_FAIL_LOAD,
      (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (this._destroyed) return;
        // Only handle main frame failures; ignore subframe/resource errors and aborted loads
        if (!isMainFrame || errorCode === -3) return;
        console.error('Failed to load URL:', this.url, errorCode, errorDescription);
        this.pendingError = { errorCode, errorDescription, validatedURL };
        this.parentAppWindow
          .getBrowserWindowInstance()
          ?.webContents.send(MainToRendererEventsForBrowserIPC.NAVIGATION_FAILED, {
            id: this.id,
          });
      }
    );

    this.webContentsViewInstance.webContents.on('context-menu', (event, params) => {
      if (this._destroyed) return;
      this.handleContextMenuEvent(this.parentAppWindow, event, params);
    });

    // Handle SSL certificate errors — show interstitial warning page
    this.webContentsViewInstance.webContents.on(
      'certificate-error',
      (event, url, error, certificate, callback) => {
        if (this._destroyed) {
          callback(false);
          return;
        }

        // If the host has been explicitly bypassed by the user, allow the connection
        try {
          if (SSLManager.isHostBypassed(new URL(url).hostname)) {
            event.preventDefault();
            callback(true);
            return;
          }
        } catch {
          /* ignore parse errors */
        }

        // Guard: don't stack multiple warnings
        if (this.showingSSLWarning) {
          event.preventDefault();
          callback(false);
          return;
        }

        event.preventDefault();
        callback(false);

        this.showingSSLWarning = true;
        this.sslCertificate = certificate;
        this.url = url;
        this.sendTabUrlUpdate(url);

        SSLManager.showWarning(this.webContentsViewInstance.webContents, url, error).then(
          (decision) => {
            this.showingSSLWarning = false;
            if (decision === 'proceed') {
              this.sslStatus = 'insecure';
              this.navigate(url);
            } else {
              const wc = this.webContentsViewInstance.webContents;
              if (wc.navigationHistory.canGoBack()) {
                wc.navigationHistory.goBack();
              } else {
                this.navigate(InAppUrls.NEW_TAB);
              }
            }
          }
        );
      }
    );

    this.attachWindowOpenHandling(this.webContentsViewInstance.webContents);
  }

  /**
   * Wires window.open handling onto a webContents and, crucially, re-attaches
   * itself to every popup window that webContents spawns. Child windows do NOT
   * inherit their opener's window-open handler, so without this a window.open
   * call made from inside a popup is dropped and silently does nothing — e.g.
   * Google Meet's "Start now" button, which lives in the "Share your new
   * meeting" popup and opens the meeting via window.open before closing that
   * popup.
   */
  private attachWindowOpenHandling(webContents: Electron.WebContents): void {
    const isMainTab = webContents === this.webContentsViewInstance?.webContents;

    webContents.setWindowOpenHandler(({ url, disposition }) => {
      // Hand off external protocols to the OS (mailto:, tel:, etc.)
      if (EXTERNAL_PROTOCOL_RE.test(url)) {
        shell.openExternal(url).catch(() => {});
        return { action: 'deny' };
      }

      // A 'background-tab' disposition can only come from a modifier / middle
      // click (Ctrl/Cmd/middle) on a link — a page can't request one through
      // window.open — so it's an unambiguous, deliberate user action and skips
      // the flood guard and popup policy. (Context-menu "Open link in new tab",
      // Command-K, the app menu, etc. never reach this handler at all; they call
      // createTab directly and were already exempt.)
      if (disposition !== 'background-tab') {
        // Everything else here is page-driven — a scripted window.open, or a
        // _blank left-click we can't tell apart from one — so it stays subject
        // to flood protection and the popup policy.
        const now = Date.now();
        this.popupTimestamps = this.popupTimestamps.filter((t) => now - t < Tab.POPUP_WINDOW_MS);

        if (this.popupTimestamps.length >= Tab.MAX_POPUPS) {
          console.warn(
            `Popup blocked: tab exceeded ${Tab.MAX_POPUPS} automatic popups in ${Tab.POPUP_WINDOW_MS / 1000}s`
          );
          return { action: 'deny' };
        }

        if (!this.isPopupAllowedBySettings(url, webContents.getURL())) {
          console.warn(`Popup blocked by settings for: ${url}`);
          return { action: 'deny' };
        }

        this.popupTimestamps.push(now);
      }

      if (url === 'about:blank') {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            frame: false,
            fullscreenable: false,
            backgroundColor: 'black',
          },
        };
      } else if (disposition === 'foreground-tab' || disposition === 'background-tab') {
        // A popup that opens a tab is usually about to close itself (e.g. Meet's
        // "Start now"), so surface the new tab; _blank links from the main tab
        // stay in the background to avoid stealing focus. Either way the tab is
        // spawned from this page, so open it next to its opener.
        this.parentAppWindow.createTab(url, !isMainTab, this.getId());
      } else if (disposition === 'new-window') {
        // Allow popup windows (e.g. OAuth flows like "Continue with Google")
        // to open as real windows, preserving window.opener for callback communication
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 500,
            height: 700,
            fullscreenable: false,
          },
        };
      }
      return { action: 'deny' };
    });

    // Child windows don't inherit this handler, so re-attach to any popup this
    // webContents spawns (and, recursively, to popups of popups).
    webContents.on('did-create-window', (childWindow: BrowserWindow) => {
      if (childWindow.webContents && !childWindow.webContents.isDestroyed()) {
        this.attachWindowOpenHandling(childWindow.webContents);
      }
    });
  }

  private isPopupAllowedBySettings(popupUrl: string, openerUrl: string): boolean {
    try {
      const stored = DataStoreManager.get(DataStoreConstants.BROWSER_SETTINGS) as BrowserSettings;
      const s = { ...DEFAULT_BROWSER_SETTINGS, ...stored };

      // Get hostnames for both the opener page and the popup destination
      let openerHostname = '';
      try {
        openerHostname = new URL(openerUrl).hostname;
      } catch {
        /* ignore */
      }
      let popupHostname = '';
      try {
        popupHostname = new URL(popupUrl).hostname;
      } catch {
        /* ignore */
      }

      const matchesSite = (hostname: string, sites: string[]) =>
        (sites || []).some((site) => {
          const d = site.toLowerCase().trim();
          return hostname === d || hostname.endsWith('.' + d);
        });

      // Check if either the opener or the popup destination matches
      const matchesAny = (sites: string[]) =>
        matchesSite(openerHostname, sites) || matchesSite(popupHostname, sites);

      if (s.popupPolicy === 'allow') {
        return !matchesAny(s.popupBlockedSites);
      }

      if (s.popupPolicy === 'smart') {
        // Allowed-list sites always pass
        if (matchesAny(s.popupAllowedSites)) return true;
        // Rate-limit: allow up to MAX_POPUPS within POPUP_WINDOW_MS
        return this.popupTimestamps.length < Tab.MAX_POPUPS;
      }

      // Block policy: only allow if site is in allowed list
      return matchesAny(s.popupAllowedSites);
    } catch {
      return true;
    }
  }

  async handleDownload(item: Electron.DownloadItem): Promise<void> {
    const storedSettings = DataStoreManager.get(
      DataStoreConstants.BROWSER_SETTINGS
    ) as BrowserSettings;
    const s = { ...DEFAULT_BROWSER_SETTINGS, ...storedSettings };
    let downloadDir = s.downloadPath || app.getPath('downloads');
    if (s.downloadPath && !fs.existsSync(s.downloadPath)) {
      downloadDir = app.getPath('downloads');
    }
    const requestedFileName = item.getFilename();
    const downloadId = item.getStartTime().toString() + '_' + requestedFileName;

    // Prevent duplicate handling when multiple tabs share the same session
    if (Tab.handledDownloads.has(downloadId)) return;
    Tab.handledDownloads.add(downloadId);

    // Check if this is a cross-session resume (triggered by createInterruptedDownload)
    let dbRecordId = DownloadManager.checkResuming(downloadId);
    const isCrossSessionResume = !!dbRecordId;

    // New downloads get a Chrome-style " (n)" suffix when a file of the same
    // name already exists, so we never clobber it. Resumes must keep their
    // original path so the partial file on disk is continued, not duplicated.
    let downloadPath = path.join(downloadDir, requestedFileName);
    let fileName = requestedFileName;
    if (!isCrossSessionResume) {
      downloadPath = Utils.getUniqueFilePath(downloadPath);
      fileName = path.basename(downloadPath);
    }

    item.setSavePath(downloadPath);

    if (dbRecordId) {
      // Resuming from previous session – update existing record
      DownloadManager.updateRecordStatus(this.parentAppWindow.id, dbRecordId, 'in_progress');
    } else {
      // New download – create DB record
      const record = await DownloadManager.addRecord(
        this.parentAppWindow.id,
        item.getURL(),
        fileName,
        path.extname(fileName),
        Utils.getFileType(path.extname(fileName)),
        item.getTotalBytes(),
        downloadPath
      );
      dbRecordId = record.id;
    }

    // Store resume metadata in the DB for cross-session resume
    DownloadManager.updateRecordResumeMetadata(
      this.parentAppWindow.id,
      dbRecordId,
      JSON.stringify(item.getURLChain()),
      item.getETag(),
      item.getLastModifiedTime(),
      item.getStartTime()
    );

    // Track in main process so renderer can query on page load
    DownloadManager.trackDownloadStarted(downloadId, fileName, item.getTotalBytes(), dbRecordId);
    DownloadManager.storeDownloadItem(downloadId, item);

    // Notify renderer (browser chrome + all tabs) that a download has started
    const startedData = {
      downloadId,
      dbRecordId,
      fileName,
      totalBytes: item.getTotalBytes(),
    };
    this.parentAppWindow
      .getBrowserWindowInstance()
      .webContents.send(MainToRendererEventsForBrowserIPC.DOWNLOAD_STARTED, startedData);
    this.parentAppWindow.broadcastToTabs(
      MainToRendererEventsForBrowserIPC.DOWNLOAD_STARTED,
      startedData
    );

    // Track progress updates (throttled to every 250ms)
    let lastProgressSent = 0;
    item.on('updated', (_event, state) => {
      const now = Date.now();
      if (now - lastProgressSent < 250) return;
      lastProgressSent = now;

      if (state === 'progressing') {
        DownloadManager.trackDownloadProgress(
          downloadId,
          item.getReceivedBytes(),
          item.getTotalBytes()
        );
        const browserWindow = this.parentAppWindow.getBrowserWindowInstance();
        if (!browserWindow?.webContents) return;
        const progressData = {
          downloadId,
          receivedBytes: item.getReceivedBytes(),
          totalBytes: item.getTotalBytes(),
        };
        browserWindow.webContents.send(
          MainToRendererEventsForBrowserIPC.DOWNLOAD_PROGRESS,
          progressData
        );
        this.parentAppWindow.broadcastToTabs(
          MainToRendererEventsForBrowserIPC.DOWNLOAD_PROGRESS,
          progressData
        );
      }
    });

    item.once('done', async (_event, state) => {
      Tab.handledDownloads.delete(downloadId);
      DownloadManager.trackDownloadCompleted(downloadId);

      // Update DB record status
      if (state === 'completed') {
        DownloadManager.updateRecordStatus(
          this.parentAppWindow.id,
          dbRecordId,
          'completed',
          item.getTotalBytes() || item.getReceivedBytes()
        );
      } else if (state === 'cancelled') {
        // During shutdown, downloads are auto-cancelled after being paused by
        // pauseAllDownloads() – don't overwrite the 'paused' status in the DB
        if (!DownloadManager.isShuttingDown()) {
          DownloadManager.updateRecordStatus(this.parentAppWindow.id, dbRecordId, 'cancelled');
        }
      } else {
        console.error(`Download failed: ${state}`);
      }

      // Clean up the .nav0resume backup when a download finishes normally
      if (!DownloadManager.isShuttingDown()) {
        try {
          const backupPath = downloadPath + '.nav0resume';
          if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
        } catch (_) {
          /* best-effort */
        }
      }

      const browserWindow = this.parentAppWindow.getBrowserWindowInstance();
      if (!browserWindow?.webContents) return;
      const completedData = { downloadId, state, fileName, dbRecordId };
      browserWindow.webContents.send(
        MainToRendererEventsForBrowserIPC.DOWNLOAD_COMPLETED,
        completedData
      );
      this.parentAppWindow.broadcastToTabs(
        MainToRendererEventsForBrowserIPC.DOWNLOAD_COMPLETED,
        completedData
      );
    });

    // createInterruptedDownload produces a DownloadItem in the 'interrupted'
    // state — it won't begin downloading until we explicitly resume it.
    if (isCrossSessionResume && item.canResume()) {
      item.resume();
    }

    console.log('Download started:', downloadPath);
  }

  private handleOriginChange(url: string): void {
    try {
      const newOrigin = new URL(url).origin;
      if (this.currentOrigin && this.currentOrigin !== newOrigin) {
        PermissionManager.clearSessionPermissionsForTabOrigin(this.id, this.currentOrigin);
      }
      this.currentOrigin = newOrigin;
    } catch {
      // Invalid URL, ignore
    }
  }

  private isAdBlockAllowed(url?: string): boolean {
    const checkUrl = url || this.url;
    if (
      checkUrl.startsWith(InAppUrls.PREFIX) ||
      checkUrl === '' ||
      checkUrl.startsWith('file://')
    ) {
      return false;
    }
    try {
      const stored = DataStoreManager.get(DataStoreConstants.BROWSER_SETTINGS) as BrowserSettings;
      const settings = { ...DEFAULT_BROWSER_SETTINGS, ...stored };
      if (!settings.adBlockerEnabled) return false;

      const hostname = new URL(checkUrl).hostname;
      const isAllowed = (settings.adBlockerAllowedSites || []).some((site) => {
        const siteDomain = site.toLowerCase().trim();
        return hostname === siteDomain || hostname.endsWith('.' + siteDomain);
      });
      return !isAllowed;
    } catch {
      return false;
    }
  }

  /**
   * Injects early ad-block script right after navigation commits.
   * Sets up Google IMA SDK mock, HTMLMediaElement.play() hook, and
   * script/iframe creation interception BEFORE page scripts can load ads.
   */
  private injectAdBlockEarlyScript(url: string): void {
    if (!this.isAdBlockAllowed(url)) return;
    if (Tab.isStreamingSite(url)) return;
    const wc = this.webContentsViewInstance.webContents;
    wc.executeJavaScript(AD_BLOCK_EARLY_SCRIPT).catch(() => {});
  }

  /**
   * Injects cosmetic CSS and DOM-level ad cleanup script once DOM is ready.
   * Handles hiding ad elements, MutationObserver, video cleanup, and overlays.
   */
  private injectAdBlockDOMScript(): void {
    if (!this.isAdBlockAllowed()) return;
    if (Tab.isStreamingSite(this.url)) return;
    const wc = this.webContentsViewInstance.webContents;
    wc.insertCSS(COSMETIC_FILTER_CSS).catch(() => {});
    wc.executeJavaScript(AD_BLOCK_SCRIPT).catch(() => {});
  }

  private static isStreamingSite(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return STREAMING_SITES.some((site) => hostname === site || hostname.endsWith('.' + site));
    } catch {
      return false;
    }
  }

  private injectCustomErrorPage(error: NavigationError): void {
    const script = buildErrorPageScript(error);
    this.webContentsViewInstance.webContents.executeJavaScript(script).catch(() => {});
  }

  private debouncedHandleNavigationCompletion(url: string): void {
    if (this._destroyed) return;
    if (this.navigationDebounceTimer) {
      clearTimeout(this.navigationDebounceTimer);
    }
    // Deactivate reader mode on navigation
    if (this.readerMode.isActive) {
      this.deactivateReaderMode();
    }
    // Reset reader mode eligibility
    this.readerMode.isEligible = false;
    this.readerMode.cachedArticle = null;
    this.sendReaderModeAvailability();

    // Update URL and send tab update immediately for responsive UI
    // Skip data: URLs (e.g. SSL warning pages) and active SSL warnings
    if (this.showingSSLWarning || url.startsWith('data:')) return;
    if (!this.url.startsWith(InAppUrls.PREFIX) && this.url !== '') {
      this.url = url;
    }
    this.sendTabUrlUpdate(url);
    // Debounce the history recording to avoid bursts from rapid navigation
    this.navigationDebounceTimer = setTimeout(() => {
      this.recordHistory(url);
    }, Tab.NAVIGATION_DEBOUNCE_MS);

    // Schedule reader mode eligibility check after page settles
    this.scheduleReaderModeCheck();
  }

  private async sendTabUrlUpdate(url: string): Promise<void> {
    if (this._destroyed) return;
    const foundBookmarkRecord = await BookmarkManager.isBookmark(this.parentAppWindow.id, url);
    if (this._destroyed) return;
    this.bookmark = foundBookmarkRecord;

    // Determine SSL status for this URL
    this.updateSSLStatus(url);

    // Build certificate details if available
    let sslDetails: {
      issuer: string;
      validFrom: string;
      validTo: string;
      subjectName: string;
    } | null = null;
    if (this.sslCertificate) {
      sslDetails = {
        issuer: this.sslCertificate.issuerName,
        validFrom: new Date(this.sslCertificate.validStart * 1000).toLocaleDateString(),
        validTo: new Date(this.sslCertificate.validExpiry * 1000).toLocaleDateString(),
        subjectName: this.sslCertificate.subjectName,
      };
    }

    this.parentAppWindow
      .getBrowserWindowInstance()
      ?.webContents.send(MainToRendererEventsForBrowserIPC.TAB_URL_UPDATED, {
        id: this.id,
        url: this.url,
        isBookmark: this.bookmark ? true : false,
        bookmarkId: this.bookmark ? this.bookmark.id : null,
        bookmarkType: this.bookmark ? this.bookmark.type : null,
        canGoBack: this.webContentsViewInstance?.webContents.navigationHistory.canGoBack() ?? false,
        canGoForward:
          this.webContentsViewInstance?.webContents.navigationHistory.canGoForward() ?? false,
        sslStatus: this.sslStatus,
        sslDetails,
      });
  }

  private updateSSLStatus(url: string): void {
    if (!url || url.startsWith(InAppUrls.PREFIX) || url.startsWith('file://')) {
      this.sslStatus = 'internal';
      this.sslCertificate = null;
      return;
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:') {
        // If the host was bypassed, keep insecure status
        if (SSLManager.isHostBypassed(parsed.hostname)) {
          this.sslStatus = 'insecure';
        } else if (this.sslStatus !== 'insecure') {
          // Secure HTTPS with valid certificate
          this.sslStatus = 'secure';
          // Fetch the actual certificate from the webContents
          this.fetchCertificate();
        }
      } else {
        this.sslStatus = 'insecure';
        this.sslCertificate = null;
      }
    } catch {
      this.sslStatus = 'internal';
    }
  }

  private fetchCertificate(): void {
    // Certificate details are populated from the certificate-error handler
    // for bypassed sites. For valid HTTPS, certificate details aren't available
    // through Electron's API without a verify proc, so we just show the lock icon.
  }

  private recordHistory(url: string): void {
    if (this.url.startsWith(InAppUrls.PREFIX) || this.url === '') {
      this.lastHistoryRecordId = null;
      return;
    }
    // Finalize time tracking for the previous page before recording the new one
    this.finalizePageTime();
    try {
      let urlObject: URL | null = null;
      try {
        urlObject = new URL(this.url);
      } catch (error) {
        //do nothing
      }
      // Strip URL fragment/hash so in-page anchor changes don't create a
      // brand new history entry (e.g. page.html#section1 vs page.html#section2
      // are the same visit).
      const urlWithoutFragment = url.split('#')[0];
      // One row per visit — revisits to the same URL intentionally create
      // new rows so the history timeline and per-visit time tracking are
      // preserved.
      const record = BrowsingHistoryManager.insertRecord(
        this.parentAppWindow.id,
        urlWithoutFragment,
        this.title,
        urlObject ? urlObject.hostname : '',
        urlObject ? `${urlObject.protocol}//${urlObject.hostname}/favicon.ico` : ''
      );
      this.lastHistoryRecordId = record?.id ?? null;
      // Start time tracking for the new page
      this.pageStartTime = Date.now();
      this.activeTimeAccumulator = 0;
      this.lastActiveStart = Date.now();
      this.startTimeFlush();
    } catch (error) {
      // Window may have been closed/removed before the debounced history recording fired
    }
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  getId(): string {
    return this.id;
  }

  getUrl(): string {
    return this.url;
  }

  setUrl(url: string): void {
    this.url = url;
  }

  getTitle(): string {
    return this.title;
  }

  getFaviconUrl(): string | null {
    return this.faviconUrl;
  }

  setTitle(title: string): void {
    this.title = title;
  }

  async handleFileSelection(extensions: string[]): Promise<string[] | null> {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Files', extensions }],
    });
    console.log(result);
    if (result.canceled) {
      return null;
    }
    return result.filePaths;
  }

  clearPendingTimers(): void {
    this._destroyed = true;
    this.stopTimeFlush();
    if (this.navigationDebounceTimer) {
      clearTimeout(this.navigationDebounceTimer);
      this.navigationDebounceTimer = null;
    }
    if (this.readerModeCheckTimer) {
      clearTimeout(this.readerModeCheckTimer);
      this.readerModeCheckTimer = null;
    }
    if (this.willDownloadHandler && this.webContentsViewInstance) {
      this.webContentsViewInstance.webContents.session.removeListener(
        'will-download',
        this.willDownloadHandler
      );
      this.willDownloadHandler = null;
    }
  }

  getWebContentsViewInstance(): WebContentsView | null {
    return this.webContentsViewInstance;
  }

  getIsSuspended(): boolean {
    return this.isSuspended;
  }

  getIsPinned(): boolean {
    return this.isPinned;
  }

  setPinned(pinned: boolean): void {
    this.isPinned = pinned;
  }

  getLastActivatedAt(): Date {
    return this.lastActivatedAt;
  }

  updateLastActivatedAt(): void {
    this.lastActivatedAt = new Date();
  }

  resumeActiveTime(): void {
    this.lastActiveStart = Date.now();
  }

  pauseActiveTime(): void {
    if (this.lastActiveStart) {
      this.activeTimeAccumulator += Math.floor((Date.now() - this.lastActiveStart) / 1000);
      this.lastActiveStart = null;
    }
  }

  /**
   * Persist current time data to the DB without resetting tracking state.
   * Called periodically so long-running tabs don't lose data on crash.
   */
  private flushPageTime(): void {
    if (!this.lastHistoryRecordId || !this.pageStartTime || !this.parentAppWindow) return;
    const now = Date.now();
    const totalDuration = Math.floor((now - this.pageStartTime) / 1000);
    let activeDuration = this.activeTimeAccumulator;
    if (this.lastActiveStart) {
      activeDuration += Math.floor((now - this.lastActiveStart) / 1000);
    }
    try {
      BrowsingHistoryManager.updateRecordTimeTracking(
        this.parentAppWindow.id,
        this.lastHistoryRecordId,
        totalDuration,
        activeDuration,
        new Date(now).toISOString()
      );
    } catch {
      // Window may have been closed
    }
  }

  private startTimeFlush(): void {
    this.stopTimeFlush();
    this.timeFlushInterval = setInterval(() => this.flushPageTime(), Tab.TIME_FLUSH_INTERVAL_MS);
  }

  private stopTimeFlush(): void {
    if (this.timeFlushInterval) {
      clearInterval(this.timeFlushInterval);
      this.timeFlushInterval = null;
    }
  }

  finalizePageTime(): void {
    this.stopTimeFlush();
    if (!this.lastHistoryRecordId || !this.pageStartTime || !this.parentAppWindow) return;
    this.pauseActiveTime();
    const totalDuration = Math.floor((Date.now() - this.pageStartTime) / 1000);
    const activeDuration = this.activeTimeAccumulator;
    const outTimestamp = new Date().toISOString();
    BrowsingHistoryManager.updateRecordTimeTracking(
      this.parentAppWindow.id,
      this.lastHistoryRecordId,
      totalDuration,
      activeDuration,
      outTimestamp
    );
  }

  suspend(): void {
    if (this.isSuspended || this._destroyed) return;
    this.finalizePageTime();
    // Clear timers but preserve tab identity (don't set _destroyed permanently)
    if (this.navigationDebounceTimer) {
      clearTimeout(this.navigationDebounceTimer);
      this.navigationDebounceTimer = null;
    }
    if (this.readerModeCheckTimer) {
      clearTimeout(this.readerModeCheckTimer);
      this.readerModeCheckTimer = null;
    }
    if (this.willDownloadHandler && this.webContentsViewInstance) {
      this.webContentsViewInstance.webContents.session.removeListener(
        'will-download',
        this.willDownloadHandler
      );
      this.willDownloadHandler = null;
    }
    if (this.webContentsViewInstance) {
      this.webContentsViewInstance.webContents.removeAllListeners();
      this.webContentsViewInstance.removeAllListeners();
      this.webContentsViewInstance.webContents.close();
      this.webContentsViewInstance = null;
    }
    this.readerMode = ReaderModeManager.createState();
    this.isSuspended = true;
  }

  async unsuspend(): Promise<void> {
    if (!this.isSuspended) return;
    this.isSuspended = false;
    this._destroyed = false;
    this.lastActivatedAt = new Date();
    await this.loadURL();
  }

  navigate(url: string): void {
    if (this.isSuspended) {
      this.url = url;
      this.isSuspended = false;
      this._destroyed = false;
    }
    this.loadURL(url);
  }

  // Reader Mode methods
  private scheduleReaderModeCheck(): void {
    if (this.readerModeCheckTimer) {
      clearTimeout(this.readerModeCheckTimer);
    }
    // Wait for DOM to settle before checking eligibility
    this.readerModeCheckTimer = setTimeout(async () => {
      // Don't check internal pages
      if (this.url.startsWith(InAppUrls.PREFIX) || this.url === '') {
        this.readerMode.isEligible = false;
        this.sendReaderModeAvailability();
        return;
      }
      try {
        const eligible = await ReaderModeManager.checkEligibility(
          this.webContentsViewInstance.webContents
        );
        this.readerMode.isEligible = eligible;
        this.sendReaderModeAvailability();
      } catch {
        this.readerMode.isEligible = false;
        this.sendReaderModeAvailability();
      }
    }, 1000);
  }

  private sendReaderModeAvailability(): void {
    try {
      this.parentAppWindow
        .getBrowserWindowInstance()
        ?.webContents.send(MainToRendererEventsForBrowserIPC.READER_MODE_AVAILABILITY_CHANGED, {
          id: this.id,
          isEligible: this.readerMode.isEligible,
        });
    } catch {
      // Window may be closed
    }
  }

  private sendReaderModeStateChanged(): void {
    try {
      this.parentAppWindow
        .getBrowserWindowInstance()
        ?.webContents.send(MainToRendererEventsForBrowserIPC.READER_MODE_STATE_CHANGED, {
          id: this.id,
          isActive: this.readerMode.isActive,
        });
    } catch {
      // Window may be closed
    }
  }

  // --- Page zoom (per-tab, Chrome-style) ---

  zoomIn(): number {
    const wc = this.webContentsViewInstance?.webContents;
    if (!wc) return 1;
    return ZoomManager.zoomIn(wc);
  }

  zoomOut(): number {
    const wc = this.webContentsViewInstance?.webContents;
    if (!wc) return 1;
    return ZoomManager.zoomOut(wc);
  }

  resetZoom(): number {
    const wc = this.webContentsViewInstance?.webContents;
    if (!wc) return 1;
    return ZoomManager.reset(wc);
  }

  getZoomFactor(): number {
    const wc = this.webContentsViewInstance?.webContents;
    if (!wc) return 1;
    return ZoomManager.getFactor(wc);
  }

  downloadCurrentPdf(): void {
    if (!this.webContentsViewInstance) return;
    const url = this.webContentsViewInstance.webContents.getURL();
    if (!url) return;
    this.webContentsViewInstance.webContents.downloadURL(url);
  }

  async toggleReaderMode(): Promise<void> {
    // Prevent rapid toggling
    if (this.readerModeToggleLock) return;
    this.readerModeToggleLock = true;

    try {
      if (this.readerMode.isActive) {
        await this.deactivateReaderMode();
      } else if (this.readerMode.isEligible) {
        await this.activateReaderMode();
      }
    } finally {
      this.readerModeToggleLock = false;
    }
  }

  private async activateReaderMode(): Promise<void> {
    // Extract article content
    const article =
      this.readerMode.cachedArticle ||
      (await ReaderModeManager.extractContent(this.webContentsViewInstance.webContents));
    if (!article) return;

    this.readerMode.cachedArticle = article;

    // Inject reader mode view
    const cssKey = await ReaderModeManager.activate(
      this.webContentsViewInstance.webContents,
      article
    );
    if (cssKey === null) return;

    this.readerMode.insertedCSSKey = cssKey;
    this.readerMode.isActive = true;
    this.sendReaderModeStateChanged();
  }

  private async deactivateReaderMode(): Promise<void> {
    await ReaderModeManager.deactivate(
      this.webContentsViewInstance.webContents,
      this.readerMode.insertedCSSKey
    );
    this.readerMode.insertedCSSKey = null;
    this.readerMode.isActive = false;
    this.sendReaderModeStateChanged();
  }

  isReaderModeEligible(): boolean {
    return this.readerMode.isEligible;
  }

  isReaderModeActive(): boolean {
    return this.readerMode.isActive;
  }

  private isExternalPage(): boolean {
    return (
      !this.url.startsWith(InAppUrls.PREFIX) && this.url !== '' && !this.url.startsWith('file://')
    );
  }

  private isLocalhost(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === '[::1]'
      );
    } catch {
      return false;
    }
  }

  /**
   * Detects address-bar input that should be treated as a local URL even
   * without an http:// scheme — e.g. `localhost:3000`, `127.0.0.1/foo`,
   * `myapp.local`, `backend.test`. Returning true routes the input to a
   * direct HTTP navigation instead of a search fallback + https upgrade.
   */
  private static looksLikeLocalhostInput(input: string): boolean {
    if (!input) return false;
    const raw = input.trim();
    if (!raw || /\s/.test(raw)) return false;
    // Split off path/query to isolate the authority portion
    const authority = raw.split(/[/?#]/, 1)[0];
    if (!authority) return false;
    // Strip port
    let host = authority;
    const portIdx = host.lastIndexOf(':');
    if (portIdx > -1 && /^\d+$/.test(host.slice(portIdx + 1))) {
      host = host.slice(0, portIdx);
    }
    host = host.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '[::1]' ||
      host === '::1'
    )
      return true;
    // Loopback / link-local TLDs commonly used for local dev and intranet
    if (
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.test') ||
      host.endsWith('.lan') ||
      host.endsWith('.internal') ||
      host.endsWith('.home.arpa')
    )
      return true;
    return false;
  }

  //for handling right clicks
  handleContextMenuEvent(parentAppWindow: AppWindow, event: any, params: any) {
    const { editFlags, linkURL, srcURL, selectionText, mediaType, isEditable, x, y } = params;
    const template: (Electron.MenuItemConstructorOptions | MenuItem)[] = [];

    if (isEditable) {
      // Handle editable text fields (textarea, input, etc.)
      if (editFlags.canCut) {
        template.push({
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut',
        });
      }
      // if (editFlags.canCopy) {
      //   template.push({
      //     label: 'Copy',
      //     accelerator: 'CmdOrCtrl+C',
      //     role: 'copy'
      //   });
      // }
      if (editFlags.canPaste) {
        template.push({
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste',
        });
      }
      // if (editFlags.canPaste) {
      //   template.push({
      //     label: 'Paste as Plain Text',
      //     click: () => {
      //       this.webContentsViewInstance.webContents.pa({ plainText: true });
      //     }
      //   });
      // }
      if (editFlags.canDelete) {
        template.push({
          label: 'Delete',
          role: 'delete',
        });
      }
      if (editFlags.canSelectAll) {
        template.push({
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectAll',
        });
      }
      // if (editFlags.canEditRichly) {
      //   template.push(
      //     { type: 'separator' },
      //     {
      //       label: 'Spelling and Grammar',
      //       submenu: [
      //         { label: 'Check Document', role: 'checkSpelling' },
      //         { type: 'separator' },
      //         { label: 'Check Spelling While Typing', type: 'checkbox', checked: true }
      //       ]
      //     }
      //   );
      // }
    }
    if (linkURL) {
      //for clicking on hyperlinks
      if (EXTERNAL_PROTOCOL_RE.test(linkURL)) {
        template.push(
          {
            label: 'Open in default app',
            click: () => {
              shell.openExternal(linkURL).catch(() => {});
            },
          },
          {
            label: 'Copy link address',
            click: () => {
              this.webContentsViewInstance.webContents.executeJavaScript(`
              navigator.clipboard.writeText("${linkURL}");
            `);
            },
          },
          { type: 'separator' as const }
        );
      } else {
        template.push(
          {
            label: 'Open link in new tab',
            click: () => {
              parentAppWindow.createTab(linkURL, false, this.getId());
            },
          },
          {
            label: 'Open link in new window',
            click: () => {
              //@todo - implement this
            },
          },
          {
            label: 'Copy link address',
            click: () => {
              this.webContentsViewInstance.webContents.executeJavaScript(`
            navigator.clipboard.writeText("${linkURL}");
          `);
            },
          },
          { type: 'separator' }
        );
      }
    }
    if (srcURL) {
      //for clicking on image
      template.push(
        {
          label: 'Save Image As...',
          click: async () => {
            this.webContentsViewInstance.webContents.downloadURL(srcURL);
          },
        },
        {
          label: 'Copy Image',
          click: () => {
            this.webContentsViewInstance.webContents.copyImageAt(params.x, params.y);
          },
        },
        { type: 'separator' }
      );
    }
    if (selectionText) {
      //for selected text
      const engineName = SearchEngine.getSearchEngineName();
      const truncatedText =
        selectionText.length > 30 ? selectionText.substring(0, 30) + '...' : selectionText;
      template.push(
        {
          label: 'Copy',
          click: () => {
            this.webContentsViewInstance.webContents.copy();
          },
        },
        {
          label: `Search ${engineName} for "${truncatedText}"`,
          click: () => {
            this.parentAppWindow.createTab(selectionText, true, this.getId());
          },
        }
      );
      template.push({ type: 'separator' });
    }

    template.push(
      {
        label: 'Back',
        click: () => {
          if (this.webContentsViewInstance.webContents.navigationHistory.canGoBack()) {
            this.webContentsViewInstance.webContents.navigationHistory.goBack();
          }
        },
      },
      {
        label: 'Forward',
        click: () => {
          if (this.webContentsViewInstance.webContents.navigationHistory.canGoForward()) {
            this.webContentsViewInstance.webContents.navigationHistory.goForward();
          }
        },
      },
      {
        label: 'Reload',
        click: () => {
          this.webContentsViewInstance.webContents.reload();
        },
      },
      {
        label: 'Hard Reload',
        click: () => {
          const webContents = this.webContentsViewInstance.webContents;
          const webSession = webContents.session;
          const currentUrl = webContents.getURL();
          try {
            const origin = new URL(currentUrl).origin;
            webSession.clearStorageData({ origin }).catch(() => {});
          } catch (_) {
            /* origin may not be parseable */
          }
          webSession.clearCache().catch(() => {});
          webSession.clearCodeCaches({}).catch(() => {});
          webContents.reloadIgnoringCache();
        },
      },
      { type: 'separator' },
      {
        label: 'Print...',
        click: () => {
          this.webContentsViewInstance.webContents.print();
        },
      }
    );

    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: parentAppWindow.getBrowserWindowInstance() });
  }
}
