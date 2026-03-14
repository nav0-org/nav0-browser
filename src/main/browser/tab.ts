import { app, BrowserWindow, dialog, Menu, MenuItem, WebContentsView } from "electron";
import { InAppUrls, DataStoreConstants, MainToRendererEventsForBrowserIPC, WebContentsEvents } from "../../constants/app-constants";
import { v4 as uuid } from "uuid";
import { AppWindow } from "./app-window";
import { BookmarkManager } from "./bookmark-manager";
import { BookmarkRecord } from "../../types/bookmark-record";
import { BrowsingHistoryManager } from "./browsing-history-manager";
import { DownloadManager } from "./download-manager";
import path from "path";
import { Utils } from "../browser/utils";
import { SearchEngine } from "../web/search-engine";
import { PermissionManager } from "./permission-manager";
import { ReaderModeManager, ReaderModeState } from "./reader-mode-manager";
import { DataStoreManager } from "../database/data-store-manager";
import { BrowserSettings, DEFAULT_BROWSER_SETTINGS } from "../../types/settings-types";
import { COSMETIC_FILTER_CSS, AD_BLOCK_EARLY_SCRIPT, AD_BLOCK_SCRIPT } from "../ad-blocker/ad-block-lists";
import { generateSSLWarningHTML } from "./ssl-warning-page";
const domainPattern = /^[^\s]+\.[^\s]+$/;

export class Tab {
  public readonly id: string = uuid();
  private url: string;
  private title: string;
  private faviconUrl: string | null = null;
  private webContentsViewInstance : WebContentsView;
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
  private darkModeCSSKey: string | null = null;
  private static darkModeEnabled = false;
  private _destroyed = false;
  private static readonly SSL_BYPASS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static sslBypassedHosts: Map<string, number> = new Map();
  private showingSSLWarning = false;

  private static readonly DARK_MODE_CSS = `
    html {
      filter: invert(1) hue-rotate(180deg) !important;
      background-color: #111 !important;
    }
    /* Re-invert media so images/videos look normal */
    img, video, picture, canvas, svg image,
    [style*="background-image"],
    embed, object {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    iframe {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    /* Re-invert common icon systems used by LinkedIn, Reddit, etc. */
    svg:not(svg svg), i[class*="icon"], [data-icon], [role="img"],
    [class*="emoji"], [class*="avatar"], [class*="Avatar"],
    [class*="logo"], [class*="Logo"],
    [class*="thumbnail"], [class*="Thumbnail"] {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    /* Force dark backgrounds on stubborn container elements */
    [style*="background-color: rgb(255"], [style*="background-color: #fff"],
    [style*="background-color: #FFF"], [style*="background-color: white"],
    [style*="background: rgb(255"], [style*="background: #fff"],
    [style*="background: #FFF"], [style*="background: white"],
    [style*="background-color:#fff"], [style*="background-color:#FFF"] {
      background-color: inherit !important;
    }
    /* Override inline white/light backgrounds on deeply nested elements */
    [style*="background-color: rgb(2"], [style*="background-color: rgb(24"],
    [style*="background-color: rgb(23"], [style*="background-color: rgb(22"] {
      background-color: inherit !important;
    }
  `;

  constructor(parentAppWindow: AppWindow, url: string , partitionSetting: string) {
    this.parentAppWindow = parentAppWindow;
    this.id = uuid();
    this.url = url || '';
    this.title = 'New Tab';
    this.partitionSetting = partitionSetting;
    this.loadURL();
  }

  private async loadURL(url?: string){
    let urlToLoad;
    let preloadScriptToLoad;
    let isInternalPage = false;
    this.url = url ?? this.url;
    this.url = this.url.trim();
    if (this.url.startsWith(InAppUrls.BOOKMARKS)){
      urlToLoad = BOOKMARKS_WEBPACK_ENTRY;
      preloadScriptToLoad = BOOKMARKS_PRELOAD_WEBPACK_ENTRY;
      isInternalPage = true;
    } else if (this.url.startsWith(InAppUrls.BROWSER_SETTINGS)){
      urlToLoad = BROWSER_SETTINGS_WEBPACK_ENTRY;
      preloadScriptToLoad = BROWSER_SETTINGS_PRELOAD_WEBPACK_ENTRY;
      isInternalPage = true;
    } else if (this.url.startsWith(InAppUrls.DOWNLOADS)){
      urlToLoad = DOWNLOADS_WEBPACK_ENTRY;
      preloadScriptToLoad = DOWNLOADS_PRELOAD_WEBPACK_ENTRY;
      isInternalPage = true;
    } else if (this.url.startsWith(InAppUrls.HISTORY)){
      urlToLoad = HISTORY_WEBPACK_ENTRY;
      preloadScriptToLoad = HISTORY_PRELOAD_WEBPACK_ENTRY;
      isInternalPage = true;
    } else if (this.url.startsWith(InAppUrls.NEW_TAB)){
      urlToLoad = NEW_TAB_WEBPACK_ENTRY;
      preloadScriptToLoad = NEW_TAB_PRELOAD_WEBPACK_ENTRY;
      this.url = '';
      isInternalPage = true;
    } else if (this.url.startsWith(InAppUrls.ABOUT)){
      urlToLoad = ABOUT_WEBPACK_ENTRY;
      preloadScriptToLoad = ABOUT_PRELOAD_WEBPACK_ENTRY;
      isInternalPage = true;
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
    } else if (domainPattern.test(this.url)) {
      this.url = 'https://' + this.url;
      urlToLoad = this.url;
      preloadScriptToLoad = WEB_CONTENT_PRELOAD_WEBPACK_ENTRY;
    } else {
      this.url = await SearchEngine.getSearchUrl(this.url);
      urlToLoad = this.url;
      preloadScriptToLoad = WEB_CONTENT_PRELOAD_WEBPACK_ENTRY;
    }
    const needsNewView = this.preloadScript !== preloadScriptToLoad || !this.webContentsViewInstance;
    if(needsNewView){
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
    if(urlToLoad){
      this.webContentsViewInstance.webContents.loadURL(urlToLoad);
    }
    // If this tab is already active and the view was recreated, re-activate after content loads
    if (needsNewView && this.parentAppWindow.getActiveTabId() === this.id) {
      await this.readyPromise;
      this.parentAppWindow.activateTab(this.id);
    }
  }

  private async initWebContentsView(){
    if(this.webContentsViewInstance) {
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
        additionalArguments: [`--app-window-id=${this.parentAppWindow.id}`, `--is-private=${this.parentAppWindow.isPrivate}`, `--tab-id=${this.id}`],
        allowRunningInsecureContent: false,
        partition: this.partitionSetting
      }
    });
    // this.webContentsViewInstance.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    // this.webContentsViewInstance.webContents.openDevTools({mode : 'detach'});
    this.registerPdfHandler();
    this.initEventHandlers();
  }

  /**
   * Registers a session-level handler that forces PDF responses to display inline
   * instead of triggering a download. Only registers once per session partition.
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

        if (isPdf) {
          // Remove Content-Disposition header to force inline display
          const newHeaders = { ...headers };
          for (const key of Object.keys(newHeaders)) {
            if (key.toLowerCase() === 'content-disposition') {
              delete newHeaders[key];
            }
          }
          callback({ responseHeaders: newHeaders });
        } else {
          callback({ responseHeaders: headers });
        }
      }
    );
  }

  private initEventHandlers() {
    //for hard navigation (debounced)
    this.webContentsViewInstance.webContents.on(WebContentsEvents.DID_NAVIGATE, async (event, url: string) => {
      if (this._destroyed) return;
      // Reset dark mode CSS key on navigation so it can be re-injected on DOM_READY
      this.darkModeCSSKey = null;
      this.handleOriginChange(url);
      this.debouncedHandleNavigationCompletion(url);
      // Inject early ad-block hooks (IMA mock, play() interception) as soon as navigation commits
      this.injectAdBlockEarlyScript(url);
    });
    //for soft navigation (debounced)
    this.webContentsViewInstance.webContents.on(WebContentsEvents.DID_NAVIGATE_IN_PAGE, async (event, url: string) => {
      if (this._destroyed) return;
      this.debouncedHandleNavigationCompletion(url);
      // Re-apply dark mode for back/forward in-page navigations (bfcache restores)
      this.applyDarkModeIfEnabled();
    });

    // Cosmetic ad filtering and DOM cleanup once the DOM is ready
    this.webContentsViewInstance.webContents.on(WebContentsEvents.DOM_READY, () => {
      this.injectAdBlockDOMScript();
      this.applyDarkModeIfEnabled();
    });

    this.webContentsViewInstance.webContents.session.on('will-download', async (event, item, downloadWebContents) => {
      // Only handle downloads initiated by this tab's webContents
      if (downloadWebContents !== this.webContentsViewInstance.webContents) return;

      const fileName = item.getFilename();
      const mimeType = item.getMimeType();

      // Intercept PDF downloads and open them in-tab instead
      if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        const pdfUrl = item.getURL();
        item.cancel();
        if (pdfUrl) {
          this.navigate(pdfUrl);
        }
        return;
      }

      await this.handleDownload(item);
    });
    this.webContentsViewInstance.webContents.on(WebContentsEvents.PAGE_TITLE_UPDATED, async (event, title: string) => {
      if (this._destroyed) return;
      this.title = title;
      this.parentAppWindow.getBrowserWindowInstance()?.webContents.send(MainToRendererEventsForBrowserIPC.TAB_TITLE_UPDATED, {
        id: this.id,
        title: this.title
      });
      // Update the history record with the actual title
      if(this.lastHistoryRecordId) {
        await BrowsingHistoryManager.updateRecordTitle(this.parentAppWindow.id, this.lastHistoryRecordId, title);
      }
    });
    this.webContentsViewInstance.webContents.on(WebContentsEvents.PAGE_FAVICON_UPDATED, async (event, faviconUrls: string[]) => {
      if (this._destroyed) return;
      if(!this.url.startsWith(InAppUrls.PREFIX) && this.url !== '') {
        this.faviconUrl = faviconUrls[faviconUrls.length - 1];
        this.parentAppWindow.getBrowserWindowInstance()?.webContents.send(MainToRendererEventsForBrowserIPC.TAB_FAVICON_UPDATED, {
          id: this.id,
          faviconUrl: this.faviconUrl
        });
        // Update the history record with the actual favicon
        if(this.lastHistoryRecordId) {
          await BrowsingHistoryManager.updateRecordFavicon(this.parentAppWindow.id, this.lastHistoryRecordId, this.faviconUrl);
        }
      }
    });
    this.webContentsViewInstance.webContents.on(WebContentsEvents.DID_FAIL_LOAD, (event) => {
      if (this._destroyed) return;
      console.error('Failed to load URL:', this.url);
      this.parentAppWindow.getBrowserWindowInstance()?.webContents.send(MainToRendererEventsForBrowserIPC.NAVIGATION_FAILED, {
        id: this.id,
      });
    });

    this.webContentsViewInstance.webContents.on('context-menu', (event, params) => {
      if (this._destroyed) return;
      this.handleContextMenuEvent(this.parentAppWindow, event, params)
    });

    // Handle SSL certificate errors — show interstitial warning page
    this.webContentsViewInstance.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
      if (this._destroyed) {
        callback(false);
        return;
      }

      // If the host has been explicitly bypassed by the user, allow the connection
      try {
        const hostname = new URL(url).hostname;
        const bypassedAt = Tab.sslBypassedHosts.get(hostname);
        if (bypassedAt) {
          if ((Date.now() - bypassedAt) < Tab.SSL_BYPASS_TTL_MS) {
            event.preventDefault();
            callback(true);
            return;
          }
          // Expired — remove stale entry
          Tab.sslBypassedHosts.delete(hostname);
        }
      } catch { /* ignore parse errors */ }

      // Guard: if we're already showing a warning, don't stack another one
      if (this.showingSSLWarning) {
        event.preventDefault();
        callback(false);
        return;
      }

      // Block the insecure connection and show warning page
      event.preventDefault();
      callback(false);

      this.showingSSLWarning = true;
      const warningHTML = generateSSLWarningHTML({ type: 'certificate', url, errorCode: error });
      this.webContentsViewInstance.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(warningHTML)}`);
      // Show the original URL in the address bar instead of the data: URL
      this.url = url;
      this.sendTabUrlUpdate(url);
      this.setupSSLWarningProceedHandler(url);
    });

    this.webContentsViewInstance.webContents.setWindowOpenHandler(({ url, disposition }) => {
      const now = Date.now();
      this.popupTimestamps = this.popupTimestamps.filter(t => now - t < Tab.POPUP_WINDOW_MS);

      // Flood protection: always enforced regardless of policy
      if (this.popupTimestamps.length >= Tab.MAX_POPUPS) {
        console.warn(`Popup blocked: tab exceeded ${Tab.MAX_POPUPS} popups in ${Tab.POPUP_WINDOW_MS / 1000}s`);
        return { action: 'deny' }
      }

      // Check popup policy from settings
      if (!this.isPopupAllowedBySettings(url)) {
        console.warn(`Popup blocked by settings for: ${url}`);
        return { action: 'deny' }
      }

      if (url === 'about:blank') {
        this.popupTimestamps.push(now);
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            frame: false,
            fullscreenable: false,
            backgroundColor: 'black',
          }
        }
      } else if (disposition === 'foreground-tab' || disposition === 'background-tab'){
        this.popupTimestamps.push(now);
        this.parentAppWindow.createTab(url, false);
      } else if (disposition === 'new-window') {
        // Allow popup windows (e.g. OAuth flows like "Continue with Google")
        // to open as real windows, preserving window.opener for callback communication
        this.popupTimestamps.push(now);
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 500,
            height: 700,
            fullscreenable: false,
          }
        }
      }
      return { action: 'deny' }
    });
  }

  private isPopupAllowedBySettings(popupUrl: string): boolean {
    try {
      const stored = DataStoreManager.get(DataStoreConstants.BROWSER_SETTINGS) as BrowserSettings;
      const s = { ...DEFAULT_BROWSER_SETTINGS, ...stored };

      // Get hostnames for both the opener page and the popup destination
      const openerUrl = this.webContentsViewInstance.webContents.getURL();
      let openerHostname = '';
      try { openerHostname = new URL(openerUrl).hostname; } catch { /* ignore */ }
      let popupHostname = '';
      try { popupHostname = new URL(popupUrl).hostname; } catch { /* ignore */ }

      const matchesSite = (hostname: string, sites: string[]) =>
        (sites || []).some(site => {
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
    const downloadPath = app.getPath('downloads') + '/' + item.getFilename();
    const downloadId = item.getStartTime().toString() + '_' + item.getFilename();

    // Prevent duplicate handling when multiple tabs share the same session
    if (Tab.handledDownloads.has(downloadId)) return;
    Tab.handledDownloads.add(downloadId);

    item.setSavePath(downloadPath);

    // Check if this is a cross-session resume (triggered by createInterruptedDownload)
    let dbRecordId = DownloadManager.checkResuming(downloadId);

    if (dbRecordId) {
      // Resuming from previous session – update existing record
      DownloadManager.updateRecordStatus(this.parentAppWindow.id, dbRecordId, 'in_progress');
    } else {
      // New download – create DB record
      const record = await DownloadManager.addRecord(this.parentAppWindow.id, item.getURL(), item.getFilename(), path.extname(item.getFilename()), Utils.getFileType(path.extname(item.getFilename())), item.getTotalBytes(), downloadPath);
      dbRecordId = record.id;
    }

    // Store resume metadata in the DB for cross-session resume
    DownloadManager.updateRecordResumeMetadata(
      this.parentAppWindow.id, dbRecordId,
      JSON.stringify(item.getURLChain()), item.getETag(), item.getLastModifiedTime(), item.getStartTime()
    );

    // Track in main process so renderer can query on page load
    DownloadManager.trackDownloadStarted(downloadId, item.getFilename(), item.getTotalBytes(), dbRecordId);
    DownloadManager.storeDownloadItem(downloadId, item);

    // Notify renderer (browser chrome + all tabs) that a download has started
    const startedData = { downloadId, dbRecordId, fileName: item.getFilename(), totalBytes: item.getTotalBytes() };
    this.parentAppWindow.getBrowserWindowInstance().webContents.send(MainToRendererEventsForBrowserIPC.DOWNLOAD_STARTED, startedData);
    this.parentAppWindow.broadcastToTabs(MainToRendererEventsForBrowserIPC.DOWNLOAD_STARTED, startedData);

    // Track progress updates (throttled to every 250ms)
    let lastProgressSent = 0;
    item.on('updated', (_event, state) => {
      const now = Date.now();
      if (now - lastProgressSent < 250) return;
      lastProgressSent = now;

      if (state === 'progressing') {
        DownloadManager.trackDownloadProgress(downloadId, item.getReceivedBytes(), item.getTotalBytes());
        const browserWindow = this.parentAppWindow.getBrowserWindowInstance();
        if (!browserWindow?.webContents) return;
        const progressData = { downloadId, receivedBytes: item.getReceivedBytes(), totalBytes: item.getTotalBytes() };
        browserWindow.webContents.send(MainToRendererEventsForBrowserIPC.DOWNLOAD_PROGRESS, progressData);
        this.parentAppWindow.broadcastToTabs(MainToRendererEventsForBrowserIPC.DOWNLOAD_PROGRESS, progressData);
      }
    });

    item.once('done', async (_event, state) => {
      Tab.handledDownloads.delete(downloadId);
      DownloadManager.trackDownloadCompleted(downloadId);

      // Update DB record status
      if (state === 'completed') {
        DownloadManager.updateRecordStatus(this.parentAppWindow.id, dbRecordId, 'completed', item.getTotalBytes());
      } else if (state === 'cancelled') {
        // During shutdown, downloads are auto-cancelled after being paused by
        // pauseAllDownloads() – don't overwrite the 'paused' status in the DB
        if (!DownloadManager.isShuttingDown()) {
          DownloadManager.updateRecordStatus(this.parentAppWindow.id, dbRecordId, 'cancelled');
        }
      } else {
        console.error(`Download failed: ${state}`);
      }

      const browserWindow = this.parentAppWindow.getBrowserWindowInstance();
      if (!browserWindow?.webContents) return;
      const completedData = { downloadId, state, fileName: item.getFilename(), dbRecordId };
      browserWindow.webContents.send(MainToRendererEventsForBrowserIPC.DOWNLOAD_COMPLETED, completedData);
      this.parentAppWindow.broadcastToTabs(MainToRendererEventsForBrowserIPC.DOWNLOAD_COMPLETED, completedData);
    });
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
    if (checkUrl.startsWith(InAppUrls.PREFIX) || checkUrl === '' || checkUrl.startsWith('file://')) {
      return false;
    }
    try {
      const stored = DataStoreManager.get(DataStoreConstants.BROWSER_SETTINGS) as BrowserSettings;
      const settings = { ...DEFAULT_BROWSER_SETTINGS, ...stored };
      if (!settings.adBlockerEnabled) return false;

      const hostname = new URL(checkUrl).hostname;
      const isAllowed = (settings.adBlockerAllowedSites || []).some(site => {
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
    const wc = this.webContentsViewInstance.webContents;
    wc.executeJavaScript(AD_BLOCK_EARLY_SCRIPT).catch(() => {});
  }

  /**
   * Injects cosmetic CSS and DOM-level ad cleanup script once DOM is ready.
   * Handles hiding ad elements, MutationObserver, video cleanup, and overlays.
   */
  private injectAdBlockDOMScript(): void {
    if (!this.isAdBlockAllowed()) return;
    const wc = this.webContentsViewInstance.webContents;
    wc.insertCSS(COSMETIC_FILTER_CSS).catch(() => {});
    wc.executeJavaScript(AD_BLOCK_SCRIPT).catch(() => {});
  }

  private debouncedHandleNavigationCompletion(url: string): void {
    if (this._destroyed) return;
    if(this.navigationDebounceTimer) {
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
    // Skip URL bar update when showing SSL warning — the original URL is already displayed
    if (this.showingSSLWarning) return;
    if(!this.url.startsWith(InAppUrls.PREFIX) && this.url !== '') {
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
    this.parentAppWindow.getBrowserWindowInstance()?.webContents.send(MainToRendererEventsForBrowserIPC.TAB_URL_UPDATED, {
      id: this.id,
      url: this.url,
      isBookmark: (this.bookmark? true : false),
      bookmarkId: this.bookmark ? this.bookmark.id : null,
      canGoBack: this.webContentsViewInstance.webContents.navigationHistory.canGoBack(),
      canGoForward: this.webContentsViewInstance.webContents.navigationHistory.canGoForward()
    });
  }

  private recordHistory(url: string): void {
    if(this.url.startsWith(InAppUrls.PREFIX) || this.url === '') {
      this.lastHistoryRecordId = null;
      return;
    }
    try {
      let urlObject: URL | null = null;
      try {
        urlObject = new URL(this.url);
      } catch (error) {
        //do nothing
      }
      // Strip URL fragment/hash to avoid duplicate history entries for the same page
      // (e.g. page.html#section1 vs page.html#section2 should be one record)
      const urlWithoutFragment = url.split('#')[0];
      // Atomic upsert: finds existing record by URL and updates timestamp,
      // or inserts a new record — all within a single synchronous transaction
      // to prevent duplicate entries from concurrent calls.
      const record = BrowsingHistoryManager.upsertRecord(
        this.parentAppWindow.id, urlWithoutFragment, this.title,
        urlObject ? urlObject.hostname : '',
        urlObject ? `${urlObject.protocol}//${urlObject.hostname}/favicon.ico` : ''
      );
      this.lastHistoryRecordId = record?.id ?? null;
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
    const result = await dialog.showOpenDialog({properties: ['openFile', 'multiSelections'], filters: [{ name: 'Files', extensions }]});
    console.log(result);
    if (result.canceled) {
      return null;
    }
    return result.filePaths;
  }

  clearPendingTimers(): void {
    this._destroyed = true;
    if (this.navigationDebounceTimer) {
      clearTimeout(this.navigationDebounceTimer);
      this.navigationDebounceTimer = null;
    }
    if (this.readerModeCheckTimer) {
      clearTimeout(this.readerModeCheckTimer);
      this.readerModeCheckTimer = null;
    }
  }

  getWebContentsViewInstance(): WebContentsView {
    return this.webContentsViewInstance;
  }

  navigate(url: string): void {
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
      this.parentAppWindow.getBrowserWindowInstance()?.webContents.send(
        MainToRendererEventsForBrowserIPC.READER_MODE_AVAILABILITY_CHANGED,
        { id: this.id, isEligible: this.readerMode.isEligible }
      );
    } catch {
      // Window may be closed
    }
  }

  private sendReaderModeStateChanged(): void {
    try {
      this.parentAppWindow.getBrowserWindowInstance()?.webContents.send(
        MainToRendererEventsForBrowserIPC.READER_MODE_STATE_CHANGED,
        { id: this.id, isActive: this.readerMode.isActive }
      );
    } catch {
      // Window may be closed
    }
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
    const article = this.readerMode.cachedArticle ||
      await ReaderModeManager.extractContent(this.webContentsViewInstance.webContents);
    if (!article) return;

    this.readerMode.cachedArticle = article;

    // Inject reader mode view
    const cssKey = await ReaderModeManager.activate(
      this.webContentsViewInstance.webContents, article
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
    return !this.url.startsWith(InAppUrls.PREFIX) && this.url !== '' && !this.url.startsWith('file://');
  }

  private applyDarkModeIfEnabled(): void {
    if (!Tab.darkModeEnabled || !this.isExternalPage()) return;
    this.injectDarkModeCSS();
  }

  async injectDarkModeCSS(): Promise<void> {
    if (!this.isExternalPage()) return;
    // Remove stale key before re-injecting (page may have changed via bfcache)
    if (this.darkModeCSSKey) {
      try {
        await this.webContentsViewInstance.webContents.removeInsertedCSS(this.darkModeCSSKey);
      } catch { /* old page gone */ }
      this.darkModeCSSKey = null;
    }
    try {
      this.darkModeCSSKey = await this.webContentsViewInstance.webContents.insertCSS(Tab.DARK_MODE_CSS);
    } catch {
      // Page may not be ready
    }
    // Strip inline background colors that fight the invert filter
    this.webContentsViewInstance.webContents.executeJavaScript(`
      (function() {
        try {
          var els = document.querySelectorAll('[style*="background"]');
          els.forEach(function(el) {
            var bg = el.style.backgroundColor;
            if (!bg) return;
            var m = bg.match(/\\d+/g);
            if (m && m.length >= 3) {
              var r = parseInt(m[0]), g = parseInt(m[1]), b = parseInt(m[2]);
              // If the inline bg is light (brightness > 180), clear it
              if ((r * 299 + g * 587 + b * 114) / 1000 > 180) {
                el.style.backgroundColor = 'transparent';
              }
            }
          });
        } catch(e) {}
      })();
    `).catch(() => {});
  }

  async removeDarkModeCSS(): Promise<void> {
    if (!this.darkModeCSSKey) return;
    try {
      await this.webContentsViewInstance.webContents.removeInsertedCSS(this.darkModeCSSKey);
    } catch {
      // Page may be closed
    }
    this.darkModeCSSKey = null;
  }

  static setDarkModeEnabled(enabled: boolean): void {
    Tab.darkModeEnabled = enabled;
  }

  static isDarkModeEnabled(): boolean {
    return Tab.darkModeEnabled;
  }

  private isLocalhost(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
    } catch {
      return false;
    }
  }

  /**
   * Sets up a one-time navigation handler on the warning page's webContents.
   * When the user clicks "Proceed" on the warning page, the page navigates
   * to the original URL. We intercept that navigation, record the bypass,
   * and re-navigate properly.
   */
  private setupSSLWarningProceedHandler(pendingUrl: string): void {
    const wc = this.webContentsViewInstance.webContents;
    const handler = (event: Electron.Event, navigationUrl: string) => {
      if (navigationUrl === 'about:blank#ssl-go-back') {
        // "Go back to safety" — go back if possible, otherwise open new tab page
        event.preventDefault();
        wc.removeListener('will-navigate', handler);
        this.showingSSLWarning = false;
        if (wc.navigationHistory.canGoBack()) {
          wc.navigationHistory.goBack();
        } else {
          this.navigate(InAppUrls.NEW_TAB);
        }
        return;
      }
      if (navigationUrl === pendingUrl) {
        event.preventDefault();
        wc.removeListener('will-navigate', handler);
        try {
          const hostname = new URL(pendingUrl).hostname;
          Tab.sslBypassedHosts.set(hostname, Date.now());
        } catch { /* ignore */ }
        this.showingSSLWarning = false;
        this.navigate(pendingUrl);
      }
    };
    wc.on('will-navigate', handler);
  }

  //for handling right clicks
  handleContextMenuEvent(parentAppWindow: AppWindow, event: any, params: any) {
    const { editFlags, linkURL, srcURL, selectionText, mediaType, isEditable, x, y } = params;
    const template: (Electron.MenuItemConstructorOptions | MenuItem)[] = [];
    
    if (isEditable) { // Handle editable text fields (textarea, input, etc.)
      if (editFlags.canCut) {
        template.push({
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
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
          role: 'paste'
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
          role: 'delete'
        });
      }
      if (editFlags.canSelectAll) {
        template.push({
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectAll'
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
    if (linkURL) { //for clicking on hyperlinks
      template.push(
        { label: 'Open link in new tab', click: () => {
          parentAppWindow.createTab(linkURL, false);
        }},
        { label: 'Open link in new window', click: () => {
          //@todo - implement this
        }},
        { label: 'Copy link address', click: () => {
          this.webContentsViewInstance.webContents.executeJavaScript(`
            navigator.clipboard.writeText("${linkURL}");
          `);
        }},
        { type:  'separator'}
      );
    }
    if (srcURL) { //for clicking on image
      template.push(
        { label: 'Save Image As...', click: async () => {
          this.webContentsViewInstance.webContents.downloadURL(srcURL);
        }},
        { label: 'Copy Image', click: () => {
          this.webContentsViewInstance.webContents.copyImageAt(params.x, params.y);
        }},
        { type:  'separator'}
      );
    } 
    if (selectionText) { //for selected text
      const engineName = SearchEngine.getSearchEngineName();
      const truncatedText = selectionText.length > 30 ? selectionText.substring(0, 30) + '...' : selectionText;
      template.push(
        { label: 'Copy', click: () => {
          this.webContentsViewInstance.webContents.copy();
        }},
        { label: `Search ${engineName} for "${truncatedText}"`, click: () => {
          this.parentAppWindow.createTab(selectionText, true);
        }}
      );
      template.push(
        { type:  'separator'}
      );
    } 

    
    template.push(
      { label: 'Back', click: () => {
        if (this.webContentsViewInstance.webContents.navigationHistory.canGoBack()) {
          this.webContentsViewInstance.webContents.navigationHistory.goBack();
        }
      }},
      { label: 'Forward', click: () => {
        if (this.webContentsViewInstance.webContents.navigationHistory.canGoForward()) {
          this.webContentsViewInstance.webContents.navigationHistory.goForward();
        }
      }},
      { label: 'Reload', click: () => {
        this.webContentsViewInstance.webContents.reload();
      }},
      { type: 'separator' },
      { label: 'Print...', click: () => {
        this.webContentsViewInstance.webContents.print();
      }},
    );
  
    
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: parentAppWindow.getBrowserWindowInstance()});
  }
}