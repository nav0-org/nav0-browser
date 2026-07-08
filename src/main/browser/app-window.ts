import { app, BrowserWindow, screen, session } from 'electron';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { Tab } from './tab';
import {
  AppConstants,
  ClosedTabRecord,
  InAppUrls,
  MainToRendererEventsForBrowserIPC,
  PartitionNames,
} from '../../constants/app-constants';
import { DatabaseManager } from '../database/database-manager';
import { DownloadManager } from './download-manager';
import { PermissionManager } from './permission-manager';
import { NotificationManager } from './notification-manager';
import { FindInPageManager } from './find-in-page-manager';
import { UnifiedOverlayManager, OverlayType } from './unified-overlay-manager';
import { ZoomManager } from './zoom-manager';
import { TabSwitchManager } from './tab-switch-manager';
import type { Database as DB } from 'better-sqlite3';
import type {
  BasicAuthCreds,
  BasicAuthRequest,
  DialogRequest,
  DialogResponse,
} from '../../types/dialog-types';

export interface PermissionPromptData {
  requestId: string;
  tabId?: string;
  origin: string;
  permissions: Array<{ type: string; label: string; icon: string }>;
  isSecure: boolean;
  isPrivate: boolean;
  faviconUrl: string | null;
  isInsecureBlocked: boolean;
  isFloodBlocked: boolean;
}

export class AppWindow {
  public readonly id: string = uuid();
  private browserWindowInstance: BrowserWindow | null = null;
  private tabs: Map<string, Tab>;
  private activeTabId: string | null;
  public isPrivate = false;
  private partitionSetting: string;
  private unifiedOverlayManager: UnifiedOverlayManager | null = null;
  private overlayInitPromise: Promise<void>;
  private urlAutocompleteBounds: { x: number; y: number; width: number; height: number } | null =
    null;
  private findInPageManager: FindInPageManager | null = null;
  private tabSwitchManager: TabSwitchManager = new TabSwitchManager((index) =>
    this.activateTabByIndex(index)
  );
  private findInPageState: Map<string, { searchText: string }> = new Map(); // per-tab find state
  private permissionPrompts: Map<string, PermissionPromptData> = new Map(); // per-tab permission data
  private pendingDialogs: Map<string, (response: DialogResponse) => void> = new Map();
  private pendingBasicAuth: Map<string, (creds: BasicAuthCreds | null) => void> = new Map();
  private database: DB;
  private readyPromise: Promise<void>;
  private resolveReady: () => void;
  private _desiredFullScreen = true;

  constructor(isPrivate = false, database: DB) {
    this.isPrivate = isPrivate;
    this.database = database;
    this.tabs = new Map();
    this.activeTabId = null;
    this.readyPromise = new Promise<void>((resolve) => {
      this.resolveReady = resolve;
    });
    this.init();
  }

  private init() {
    if (this.isPrivate) {
      this.partitionSetting = PartitionNames.PRIVATE;
    } else {
      this.partitionSetting = PartitionNames.BROWSING;
    }
    PermissionManager.setupSession(this.partitionSetting);
    const isMac = process.platform === 'darwin';
    const isWindows = process.platform === 'win32';
    const isLinux = process.platform === 'linux';

    // macOS opens in its native fullscreen Space. Linux and Windows fill the
    // screen as a *maximized* window instead — true fullscreen there makes the
    // window manager hide its own panels (top/bottom bars, taskbar), which we
    // want to keep visible.
    this._desiredFullScreen = isMac;

    this.browserWindowInstance = new BrowserWindow({
      width: 1200,
      height: 800,
      fullscreen: isMac,
      show: false,
      title: AppConstants.APP_NAME,
      icon:
        process.platform === 'linux'
          ? path.join(app.getAppPath(), 'src/renderer/assets/logo.png')
          : undefined,
      titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
      // Chromium-drawn minimize/maximize/close buttons for the frameless
      // window. Electron supports this Window Controls Overlay on Linux since
      // v30.2 (electron/electron#41769) — without it, a 'hidden' title bar on
      // Linux shows no window controls at all. Colours match the tab strip
      // (--tab-inactive, or the dark private strip) so the overlay reads as
      // part of it.
      ...(isWindows || isLinux
        ? {
            titleBarOverlay: {
              color: this.isPrivate ? '#2a0a0a' : '#e7e5e1',
              symbolColor: this.isPrivate ? '#ffffff' : '#333333',
              height: 38,
            },
          }
        : {}),
      trafficLightPosition: isMac ? { x: 12, y: 10 } : undefined,
      webPreferences: {
        preload: BROWSER_LAYOUT_PRELOAD_WEBPACK_ENTRY,
        nodeIntegration: false,
        contextIsolation: true,
        additionalArguments: [
          `--app-window-id=${this.id}`,
          `--is-private=${this.isPrivate}`,
          `--platform=${process.platform}`,
        ],
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        partition: this.partitionSetting,
      },
    });

    // Fill the screen on Linux/Windows without going into true fullscreen, so
    // the system top/bottom bars (and taskbar) stay visible. Some X11 window
    // managers ignore maximization hints while the window is still unmapped
    // (electron/electron#1418, #45815), so this is re-asserted after show().
    if (isLinux || isWindows) {
      this.browserWindowInstance.maximize();
    }

    this.overlayInitPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        this.unifiedOverlayManager = new UnifiedOverlayManager(
          this.id,
          this.isPrivate,
          this.partitionSetting
        );
        resolve();
      }, 500);
    });
    this.findInPageManager = new FindInPageManager(this.id);
    this.findInPageManager.setBrowserWindow(this.browserWindowInstance);

    this.browserWindowInstance.loadURL(BROWSER_LAYOUT_WEBPACK_ENTRY);

    this.browserWindowInstance.webContents.setWindowOpenHandler(({ url }) => {
      return { action: 'deny' };
    });

    // Chrome-style zoom shortcuts (Cmd/Ctrl +/-/0) also fire when focus is on
    // the browser chrome (e.g. the URL bar) rather than the page — apply them
    // to the active tab so zooming works regardless of where focus sits.
    this.browserWindowInstance.webContents.on('before-input-event', (event, input) => {
      // Alt+<digits> tab switching also needs to work while the chrome (URL bar,
      // new-tab page, …) holds focus, so feed events here too.
      if (this.tabSwitchManager.handleInput(input)) {
        event.preventDefault();
        return;
      }
      const action = ZoomManager.matchShortcut(input);
      if (!action) return;
      event.preventDefault();
      if (action === 'in') this.zoomInActiveTab();
      else if (action === 'out') this.zoomOutActiveTab();
      else this.resetZoomActiveTab();
    });

    // Pause all active downloads before the window is destroyed
    // so their resume metadata can be persisted to the DB
    this.browserWindowInstance.on('close', () => {
      DownloadManager.pauseAllDownloads();
    });

    this.browserWindowInstance.on('closed', () => {
      this.tabSwitchManager.dispose();
      // Resolve any outstanding dialogs / auth prompts so awaiting callers don't hang
      for (const [, resolve] of this.pendingDialogs) resolve({ confirmed: false });
      this.pendingDialogs.clear();
      for (const [, callback] of this.pendingBasicAuth) callback(null);
      this.pendingBasicAuth.clear();
      this.browserWindowInstance = null;
    });

    // When leaving fullscreen on macOS, set proper windowed bounds and resize
    // all views — the window started in a fullscreen Space, so it has no
    // meaningful windowed bounds to return to. On Linux/Windows the window
    // manager restores the pre-fullscreen state itself (typically maximized);
    // forcing bounds here would shrink a maximized window to 1200×800 every
    // time fullscreen ends (F11 or leaving HTML5 video fullscreen).
    this.browserWindowInstance.on('leave-full-screen', () => {
      this._desiredFullScreen = false;
      if (isMac) {
        const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
        const w = Math.min(1200, screenW);
        const h = Math.min(800, screenH);
        const x = Math.round((screenW - w) / 2);
        const y = Math.round((screenH - h) / 2);
        this.browserWindowInstance?.setBounds({ x, y, width: w, height: h });
      }
      this.handleResizing();
      this.browserWindowInstance?.webContents.send(
        MainToRendererEventsForBrowserIPC.FULLSCREEN_CHANGED,
        { isFullScreen: false }
      );
    });

    this.browserWindowInstance.on('enter-full-screen', () => {
      this._desiredFullScreen = true;
      this.handleResizing();
      this.browserWindowInstance?.webContents.send(
        MainToRendererEventsForBrowserIPC.FULLSCREEN_CHANGED,
        { isFullScreen: true }
      );
    });

    this.browserWindowInstance.webContents.on('did-finish-load', async () => {
      const firstTab = await this.createTab(InAppUrls.NEW_TAB);
      this.activateTab(firstTab.getId());

      this.browserWindowInstance.webContents.send(
        MainToRendererEventsForBrowserIPC.NEW_TAB_CREATED,
        {
          id: firstTab.id,
          title: firstTab.getTitle(),
          url: firstTab.getUrl(),
        }
      );
      this.resolveReady();
      this.browserWindowInstance?.show();
      // Re-assert maximization now that the window is mapped. X11 window
      // managers (e.g. Muffin on Linux Mint) may ignore the maximize() issued
      // while the window was still hidden, which left a small floating window.
      if (isLinux) {
        this.browserWindowInstance?.maximize();
      }
    });

    // this.browserWindowInstance.webContents.openDevTools({mode : 'detach'});
    this.browserWindowInstance.on('resize', this.handleResizing.bind(this));
  }

  /**
   * Tear down every tab's WebContentsView. Inactive tabs are not children of
   * the BrowserWindow's contentView (activateTab removes the previous view on
   * tab switch), so their WebContents wouldn't otherwise be destroyed when the
   * window closes — they'd keep running, holding open WebSockets and playing
   * audio (e.g. WhatsApp Web message pings). Call this from every window-close
   * path before the BrowserWindow is destroyed.
   */
  public destroyAllTabs(): void {
    for (const [id, tab] of this.tabs) {
      try {
        tab.finalizePageTime();
      } catch {
        /* best-effort */
      }
      tab.clearPendingTimers();
      PermissionManager.clearSessionPermissionsForTab(id);
      const view = tab.getWebContentsViewInstance();
      if (!view) continue;
      try {
        NotificationManager.clearNotificationsForWebContents(view.webContents.id);
      } catch {
        /* best-effort */
      }
      try {
        view.webContents.removeAllListeners();
        view.removeAllListeners();
        if (!view.webContents.isDestroyed()) {
          view.webContents.close();
        }
      } catch {
        /* best-effort */
      }
    }
  }

  public closeWindow(clearSession: boolean) {
    for (const tab of this.tabs.values()) {
      tab.clearPendingTimers();
    }
    if (clearSession) {
      AppWindow.clearPrivateSession();
    }
    this.browserWindowInstance.close();
  }

  /**
   * Wipe every trace of the private session. Called when the last private
   * window closes (or when the app quits with private windows still open).
   * Both the Electron session partition and the SQLite private db are
   * in-memory, so this resets RAM-resident state — there is nothing on disk
   * to remove. `closeAllConnections` actively tears down any sockets the
   * session still owns, and `closePrivateDatabase()` drops the in-memory db
   * so the next private sitting starts empty.
   */
  public static clearPrivateSession(): void {
    PermissionManager.clearMemoryPermissions();
    try {
      const privateSession = session.fromPartition(PartitionNames.PRIVATE);
      privateSession?.closeAllConnections();
      privateSession?.clearAuthCache();
      privateSession?.clearHostResolverCache();
      privateSession?.clearCache();
      privateSession?.clearCodeCaches({});
      privateSession?.clearSharedDictionaryCache();
      privateSession?.clearStorageData();
      privateSession?.clearData();
    } catch (e) {
      console.error('Failed to clear private session:', e);
    }
    try {
      DatabaseManager.closePrivateDatabase();
    } catch (e) {
      console.error('Failed to reset private database:', e);
    }
  }

  public getViewBounds(): { x: number; y: number; width: number; height: number } | null {
    if (this.browserWindowInstance) {
      return this.browserWindowInstance.getBounds();
    }
    return null;
  }

  // --- Unified overlay view management ---

  private ensureOverlayViewAdded(): void {
    if (!this.unifiedOverlayManager || !this.browserWindowInstance) return;
    const overlayView = this.unifiedOverlayManager.getWebContentsViewInstance();
    if (!this.browserWindowInstance.contentView.children.includes(overlayView)) {
      overlayView.setBounds(this.computeOverlayBounds());
      this.browserWindowInstance.contentView.addChildView(overlayView);
    } else {
      overlayView.setBounds(this.computeOverlayBounds());
    }
  }

  private computeOverlayBounds(): { x: number; y: number; width: number; height: number } {
    if (!this.browserWindowInstance) return { x: 0, y: 0, width: 0, height: 0 };
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    // If url-autocomplete is the only visible overlay, restrict bounds to its region
    // so the rest of the page (including the URL input) keeps receiving mouse events.
    if (
      this.unifiedOverlayManager &&
      this.unifiedOverlayManager.isVisible('url-autocomplete') &&
      this.urlAutocompleteBounds
    ) {
      const otherVisible = (
        [
          'command-k',
          'command-o',
          'options-menu',
          'issue-report',
          'ssl-info',
          'alert',
          'basic-auth',
        ] as const
      ).some((t) => this.unifiedOverlayManager!.isVisible(t));
      if (!otherVisible) {
        const b = this.urlAutocompleteBounds;
        return {
          x: Math.max(0, Math.round(b.x)),
          y: Math.max(0, Math.round(b.y)),
          width: Math.max(0, Math.min(Math.round(b.width), parentBounds.width)),
          height: Math.max(0, Math.min(Math.round(b.height), parentBounds.height)),
        };
      }
    }
    return parentBounds;
  }

  private removeOverlayViewIfEmpty(): void {
    if (!this.unifiedOverlayManager || !this.browserWindowInstance) return;
    if (!this.unifiedOverlayManager.hasAnyVisible()) {
      const overlayView = this.unifiedOverlayManager.getWebContentsViewInstance();
      if (this.browserWindowInstance.contentView.children.includes(overlayView)) {
        this.browserWindowInstance.contentView.removeChildView(overlayView);
      }
    }
  }

  private getYOffset(): number {
    return 82 + (this.permissionStripVisible ? 48 : 0) + (this.isFindInPageVisible() ? 48 : 0);
  }

  private resizeActiveTab(): void {
    if (!this.browserWindowInstance || !this.getActiveTab()) return;
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    const yOffset = this.getYOffset();
    this.getActiveTab()
      .getWebContentsViewInstance()
      ?.setBounds({
        x: 0,
        y: yOffset,
        width: parentBounds.width,
        height: parentBounds.height - yOffset,
      });
  }

  private handleResizing() {
    if (!this.browserWindowInstance) return;
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    const yOffset = this.getYOffset();

    // Resize active tab
    if (this.getActiveTab()) {
      this.getActiveTab()
        .getWebContentsViewInstance()
        ?.setBounds({
          x: 0,
          y: yOffset,
          width: parentBounds.width,
          height: parentBounds.height - yOffset,
        });
    }

    // Resize unified overlay if visible
    if (this.unifiedOverlayManager && this.unifiedOverlayManager.hasAnyVisible()) {
      const overlayView = this.unifiedOverlayManager.getWebContentsViewInstance();
      if (this.browserWindowInstance.contentView.children.includes(overlayView)) {
        overlayView.setBounds(this.computeOverlayBounds());
      }
    }
  }

  async createTab(url: string, activateNewTab = true, openerTabId?: string): Promise<Tab> {
    const tab = new Tab(this, url, this.partitionSetting);
    const index = this.insertTab(tab, openerTabId);

    this.browserWindowInstance?.webContents.send(
      MainToRendererEventsForBrowserIPC.NEW_TAB_CREATED,
      {
        id: tab.id,
        title: tab.getTitle(),
        url: tab.getUrl(),
        index,
      }
    );

    if (activateNewTab) {
      await tab.whenReady();
      this.activateTab(tab.getId(), true);
    }

    return tab;
  }

  // Inserts a freshly created tab into the ordered tab Map and returns its final
  // index. When openerTabId is given — i.e. the tab was spawned from an existing
  // page (a _blank link, window.open, or the "open link in new tab" context
  // menu) — the new tab is placed directly after its opener, like Chrome,
  // instead of at the end of the strip. Without an opener (Ctrl+T, the app menu,
  // the command palette, session restore, …) it appends as before. New tabs are
  // always unpinned, so the insertion point is clamped to the unpinned region to
  // keep pinned tabs grouped at the front.
  private insertTab(tab: Tab, openerTabId?: string): number {
    const entries = Array.from(this.tabs.entries());
    const openerIndex = openerTabId ? entries.findIndex(([id]) => id === openerTabId) : -1;

    if (openerIndex === -1) {
      this.tabs.set(tab.getId(), tab);
      return entries.length;
    }

    const firstUnpinnedIndex = entries.findIndex(([, t]) => !t.getIsPinned());
    const unpinnedStart = firstUnpinnedIndex === -1 ? entries.length : firstUnpinnedIndex;
    const insertIndex = Math.max(openerIndex + 1, unpinnedStart);

    entries.splice(insertIndex, 0, [tab.getId(), tab]);
    this.tabs = new Map(entries);
    return insertIndex;
  }

  createSuspendedTab(url: string, title: string): Tab {
    const tab = new Tab(this, url, this.partitionSetting, { suspended: true, title });
    this.tabs.set(tab.getId(), tab);

    this.browserWindowInstance?.webContents.send(
      MainToRendererEventsForBrowserIPC.NEW_TAB_CREATED,
      {
        id: tab.id,
        title: tab.getTitle(),
        url: tab.getUrl(),
      }
    );

    return tab;
  }

  closeTab(id: string, isUserInitiated = true): ClosedTabRecord | null {
    const tab = this.tabs.get(id);
    let closedRecord: ClosedTabRecord | null = null;
    if (tab) {
      if (!this.isPrivate) {
        const url = tab.getUrl();
        if (url && !url.startsWith(InAppUrls.PREFIX) && url !== '') {
          closedRecord = {
            url,
            title: tab.getTitle(),
            faviconUrl: tab.getFaviconUrl(),
            closedAt: Date.now(),
          };
        }
      }
      tab.finalizePageTime();
      tab.clearPendingTimers();
      PermissionManager.clearSessionPermissionsForTab(id);
      // Clean up notifications for this tab's webContents
      const tabView = tab.getWebContentsViewInstance();
      if (tabView) {
        NotificationManager.clearNotificationsForWebContents(tabView.webContents.id);
      }
      // Clean up per-tab strip state
      this.findInPageState.delete(id);
      this.permissionPrompts.delete(id);
      const view = tab.getWebContentsViewInstance();
      if (view) {
        view.webContents.removeAllListeners();
        view.removeAllListeners();
        view.webContents.close();
      }
    }
    this.tabs.delete(id);
    if (this.activeTabId === id) {
      this.activeTabId = null;
    }
    this.browserWindowInstance?.webContents.send(MainToRendererEventsForBrowserIPC.TAB_CLOSED, {
      id: id,
    });
    return closedRecord;
  }

  async activateTab(id: string, isUserInitiated = true): Promise<void> {
    // Save current find-in-page state before switching
    if (this.isFindInPageVisible() && this.activeTabId) {
      this.findInPageState.set(this.activeTabId, {
        searchText: this.findInPageManager.getLastSearchText(),
      });
      this.findInPageManager.hide();
    }
    if (this.permissionStripVisible) {
      this.permissionStripVisible = false;
      this.browserWindowInstance?.webContents.send(
        MainToRendererEventsForBrowserIPC.HIDE_PERMISSION_STRIP
      );
    }

    if (this.activeTabId && this.getActiveTab()) {
      const prevTab = this.getActiveTab();
      prevTab.pauseActiveTime();
      const prevView = prevTab.getWebContentsViewInstance();
      if (prevView) {
        this.browserWindowInstance.contentView.removeChildView(prevView);
      }
    }
    if (this.tabs.has(id)) {
      this.activeTabId = id;
      const tab = this.getActiveTab();

      // Unsuspend hibernated tabs on activation
      if (tab.getIsSuspended()) {
        await tab.unsuspend();
      }
      tab.updateLastActivatedAt();
      tab.resumeActiveTime();

      // Restore per-tab strip state for the new tab BEFORE calculating offset
      const findState = this.findInPageState.get(id);
      if (findState) {
        if (tab && tab.getWebContentsViewInstance()) {
          this.findInPageManager.setActiveTabWebContents(
            tab.getWebContentsViewInstance().webContents
          );
        }
        this.findInPageManager.show(findState.searchText);
      }
      const permData = this.permissionPrompts.get(id);
      if (permData) {
        this.permissionStripVisible = true;
        this.browserWindowInstance?.webContents.send(
          MainToRendererEventsForBrowserIPC.SHOW_PERMISSION_STRIP,
          permData
        );
      }

      const parentBounds = this.browserWindowInstance.contentView.getBounds();
      const yOffset = this.getYOffset();
      tab.getWebContentsViewInstance()?.setBounds({
        x: 0,
        y: yOffset,
        width: parentBounds.width,
        height: parentBounds.height - yOffset,
      });
      this.browserWindowInstance.contentView.addChildView(tab.getWebContentsViewInstance());
      // Only focus tab if find bar is not visible (find bar needs input focus)
      if (!this.isFindInPageVisible()) {
        tab.getWebContentsViewInstance()?.webContents.focus();
      }
    }
    this.browserWindowInstance?.webContents.send(MainToRendererEventsForBrowserIPC.TAB_ACTIVATED, {
      id: this.getActiveTab().id,
      title: this.getActiveTab().getTitle(),
      url: this.getActiveTab().getUrl(),
    });
  }

  // Activate the nth tab (1-based) in the visible strip order. Out-of-range
  // indices are ignored so an Alt+<n> for a tab that doesn't exist is a no-op.
  activateTabByIndex(oneBasedIndex: number): void {
    const tabs = this.getTabs();
    if (oneBasedIndex < 1 || oneBasedIndex > tabs.length) return;
    const target = tabs[oneBasedIndex - 1];
    if (!target || target.getId() === this.activeTabId) return;
    this.activateTab(target.getId(), true);
  }

  // Exposed so a tab's own before-input-event handler can feed Alt+<digit>
  // presses into the shared, per-window accumulator when the page holds focus.
  getTabSwitchManager(): TabSwitchManager {
    return this.tabSwitchManager;
  }

  getActiveTab(): Tab | null {
    if (this.activeTabId) {
      return this.tabs.get(this.activeTabId) || null;
    }
    return null;
  }

  getTabs(): Tab[] {
    return Array.from(this.tabs.values());
  }

  getActiveTabId(): string | null {
    return this.activeTabId;
  }

  setActiveTabId(id: string): void {
    if (this.tabs.has(id)) {
      this.activeTabId = id;
    }
  }

  getTabById(id: string): Tab | null {
    return this.tabs.get(id) || null;
  }

  setTabPinned(id: string, pinned: boolean): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.setPinned(pinned);
    this.reorderPinnedTabs();
    this.browserWindowInstance?.webContents.send(
      pinned
        ? MainToRendererEventsForBrowserIPC.TAB_PINNED
        : MainToRendererEventsForBrowserIPC.TAB_UNPINNED,
      { id }
    );
  }

  // Reorders the tabs to match the requested id order (e.g. from a drag in the
  // Command-O tab switcher). Unknown ids are ignored and any tabs missing from
  // the requested order are appended in their existing order. The pinned-first
  // invariant is always enforced afterwards, so pinned tabs stick to the left
  // no matter where the user dropped them. The final order is broadcast to the
  // tab-strip renderer so the visible strip stays in sync.
  reorderTabs(orderedIds: string[]): void {
    const newTabs = new Map<string, Tab>();
    for (const id of orderedIds) {
      const tab = this.tabs.get(id);
      if (tab && !newTabs.has(id)) {
        newTabs.set(id, tab);
      }
    }
    for (const [id, tab] of this.tabs) {
      if (!newTabs.has(id)) {
        newTabs.set(id, tab);
      }
    }
    this.tabs = newTabs;
    this.reorderPinnedTabs();
    this.browserWindowInstance?.webContents.send(MainToRendererEventsForBrowserIPC.TABS_REORDERED, {
      order: this.getTabs().map((tab) => tab.getId()),
    });
  }

  // Keep the tab Map ordered with pinned tabs first, preserving each group's
  // relative order — mirroring how the renderer's tab strip reorders on pin.
  // This keeps getTabs() (and therefore the saved session order) matching what
  // the user actually sees.
  private reorderPinnedTabs(): void {
    const entries = Array.from(this.tabs.entries());
    const pinned = entries.filter(([, tab]) => tab.getIsPinned());
    const unpinned = entries.filter(([, tab]) => !tab.getIsPinned());
    this.tabs = new Map([...pinned, ...unpinned]);
  }

  getBrowserWindowInstance(): BrowserWindow | null {
    return this.browserWindowInstance;
  }

  toggleFullScreen(): void {
    if (this.browserWindowInstance) {
      this._desiredFullScreen = !this._desiredFullScreen;
      this.browserWindowInstance.setFullScreen(this._desiredFullScreen);
    }
  }

  updateViewBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    if (this.getActiveTab()) {
      this.getActiveTab().getWebContentsViewInstance()?.setBounds(bounds);
    }
  }

  // --- Page zoom (delegates to the active tab) ---

  zoomInActiveTab(): number {
    return this.getActiveTab()?.zoomIn() ?? 1;
  }

  zoomOutActiveTab(): number {
    return this.getActiveTab()?.zoomOut() ?? 1;
  }

  resetZoomActiveTab(): number {
    return this.getActiveTab()?.resetZoom() ?? 1;
  }

  getActiveTabZoomFactor(): number {
    return this.getActiveTab()?.getZoomFactor() ?? 1;
  }

  // --- Overlay methods (delegate to UnifiedOverlayManager) ---

  async showOptionsMenuOverlay(): Promise<void> {
    this.hideCommandKOverlay();
    this.hideUrlAutocompleteOverlay();
    await this.overlayInitPromise;
    if (this.unifiedOverlayManager.isVisible('options-menu')) return;
    await this.unifiedOverlayManager.whenReady();
    this.ensureOverlayViewAdded();
    this.unifiedOverlayManager.showOverlay('options-menu');
  }

  hideOptionsMenuOverlay(): void {
    if (this.unifiedOverlayManager?.isVisible('options-menu')) {
      this.unifiedOverlayManager.hideOverlay('options-menu');
      this.removeOverlayViewIfEmpty();
    }
  }

  async showCommandKOverlay(): Promise<void> {
    this.hideOptionsMenuOverlay();
    this.hideCommandOOverlay();
    this.hideUrlAutocompleteOverlay();
    await this.overlayInitPromise;
    if (this.unifiedOverlayManager.isVisible('command-k')) {
      this.hideCommandKOverlay();
      return;
    }
    await this.unifiedOverlayManager.whenReady();
    this.ensureOverlayViewAdded();
    this.unifiedOverlayManager.showOverlay('command-k');
  }

  hideCommandKOverlay(): void {
    if (this.unifiedOverlayManager?.isVisible('command-k')) {
      this.unifiedOverlayManager.hideOverlay('command-k');
      this.removeOverlayViewIfEmpty();
    }
  }

  async showCommandOOverlay(): Promise<void> {
    this.hideOptionsMenuOverlay();
    this.hideCommandKOverlay();
    this.hideUrlAutocompleteOverlay();
    await this.overlayInitPromise;
    if (this.unifiedOverlayManager.isVisible('command-o')) {
      this.hideCommandOOverlay();
      return;
    }
    await this.unifiedOverlayManager.whenReady();
    this.ensureOverlayViewAdded();
    this.unifiedOverlayManager.showOverlay('command-o');
  }

  hideCommandOOverlay(): void {
    if (this.unifiedOverlayManager?.isVisible('command-o')) {
      this.unifiedOverlayManager.hideOverlay('command-o');
      this.removeOverlayViewIfEmpty();
    }
  }

  async showUrlAutocompleteOverlay(data: {
    bounds: { x: number; y: number; width: number; height: number };
    results: unknown[];
    activeIndex: number;
  }): Promise<void> {
    await this.overlayInitPromise;
    await this.unifiedOverlayManager.whenReady();
    this.urlAutocompleteBounds = data.bounds;
    const alreadyVisible = this.unifiedOverlayManager.isVisible('url-autocomplete');
    if (!alreadyVisible) {
      // Mark visible first so computeOverlayBounds returns the small region.
      this.unifiedOverlayManager.showOverlay('url-autocomplete', data);
    } else {
      this.unifiedOverlayManager.updateUrlAutocomplete({
        results: data.results as never,
        activeIndex: data.activeIndex,
      });
    }
    this.ensureOverlayViewAdded();
  }

  updateUrlAutocompleteOverlay(data: { results: unknown[]; activeIndex: number }): void {
    if (!this.unifiedOverlayManager?.isVisible('url-autocomplete')) return;
    this.unifiedOverlayManager.updateUrlAutocomplete({
      results: data.results as never,
      activeIndex: data.activeIndex,
    });
  }

  hideUrlAutocompleteOverlay(): void {
    if (this.unifiedOverlayManager?.isVisible('url-autocomplete')) {
      this.unifiedOverlayManager.hideOverlay('url-autocomplete');
      this.urlAutocompleteBounds = null;
      this.removeOverlayViewIfEmpty();
    }
  }

  forwardUrlAutocompleteResultClicked(data: unknown): void {
    if (!this.browserWindowInstance) return;
    this.browserWindowInstance.webContents.send(
      MainToRendererEventsForBrowserIPC.URL_AUTOCOMPLETE_RESULT_FORWARDED,
      data
    );
  }

  focusUrlBar(): void {
    this.hideOptionsMenuOverlay();
    this.hideCommandKOverlay();
    this.hideCommandOOverlay();
    if (!this.browserWindowInstance) return;
    this.browserWindowInstance.webContents.focus();
    this.browserWindowInstance.webContents.send(MainToRendererEventsForBrowserIPC.FOCUS_URL_BAR);
  }

  broadcastToTabs(channel: string, data: any): void {
    this.tabs.forEach((tab) => {
      try {
        tab.getWebContentsViewInstance()?.webContents?.send(channel, data);
      } catch (_) {
        /* tab may be closing */
      }
    });
  }

  // Permission prompt — rendered as a strip in browser_layout (per-tab)
  private permissionStripVisible = false;

  async showPermissionPrompt(data: PermissionPromptData): Promise<void> {
    if (!this.browserWindowInstance) return;
    const tabId = data.tabId || this.activeTabId;
    if (!tabId) return;
    this.permissionPrompts.set(tabId, data);

    // Only show the strip visually if this is the active tab
    if (tabId === this.activeTabId) {
      this.permissionStripVisible = true;
      this.browserWindowInstance.webContents.send(
        MainToRendererEventsForBrowserIPC.SHOW_PERMISSION_STRIP,
        data
      );
      this.resizeActiveTab();
    }
  }

  hidePermissionPrompt(): void {
    // Remove the active tab's permission data
    if (this.activeTabId) {
      this.permissionPrompts.delete(this.activeTabId);
    }
    if (!this.permissionStripVisible) return;
    this.permissionStripVisible = false;
    this.browserWindowInstance?.webContents.send(
      MainToRendererEventsForBrowserIPC.HIDE_PERMISSION_STRIP
    );
    this.resizeActiveTab();
  }

  async showIssueReportOverlay(): Promise<void> {
    if (!this.browserWindowInstance) return;
    this.hideOptionsMenuOverlay();
    this.hideCommandKOverlay();
    this.hideUrlAutocompleteOverlay();
    await this.overlayInitPromise;
    if (this.unifiedOverlayManager.isVisible('issue-report')) return;
    await this.unifiedOverlayManager.whenReady();
    this.ensureOverlayViewAdded();
    this.unifiedOverlayManager.showOverlay('issue-report');
  }

  hideIssueReportOverlay(): void {
    if (this.unifiedOverlayManager?.isVisible('issue-report')) {
      this.unifiedOverlayManager.hideOverlay('issue-report');
      this.removeOverlayViewIfEmpty();
    }
  }

  // --- Alert / Confirm / Prompt overlay ---

  async showAlertOverlay(data: Omit<DialogRequest, 'requestId'>): Promise<DialogResponse> {
    if (!this.browserWindowInstance) {
      return { confirmed: false };
    }
    const requestId = uuid();
    const request: DialogRequest = { requestId, ...data };

    const responsePromise = new Promise<DialogResponse>((resolve) => {
      this.pendingDialogs.set(requestId, resolve);
    });

    this.hideUrlAutocompleteOverlay();
    await this.overlayInitPromise;
    if (!this.unifiedOverlayManager) {
      this.pendingDialogs.delete(requestId);
      return { confirmed: false };
    }
    await this.unifiedOverlayManager.whenReady();
    this.ensureOverlayViewAdded();
    this.unifiedOverlayManager.showOverlay('alert', request);

    return responsePromise;
  }

  resolveDialog(requestId: string, response: DialogResponse): void {
    const resolver = this.pendingDialogs.get(requestId);
    if (!resolver) return;
    this.pendingDialogs.delete(requestId);
    resolver(response);
    this.hideAlertOverlay();
  }

  hideAlertOverlay(): void {
    if (this.unifiedOverlayManager?.isVisible('alert')) {
      this.unifiedOverlayManager.hideOverlay('alert');
      this.removeOverlayViewIfEmpty();
    }
  }

  // --- Basic auth overlay ---

  async showBasicAuthOverlay(
    data: Omit<BasicAuthRequest, 'requestId'>,
    callback: (creds: BasicAuthCreds | null) => void
  ): Promise<void> {
    if (!this.browserWindowInstance) {
      callback(null);
      return;
    }
    const requestId = uuid();
    const request: BasicAuthRequest = { requestId, ...data };
    this.pendingBasicAuth.set(requestId, callback);

    this.hideUrlAutocompleteOverlay();
    await this.overlayInitPromise;
    if (!this.unifiedOverlayManager) {
      this.pendingBasicAuth.delete(requestId);
      callback(null);
      return;
    }
    await this.unifiedOverlayManager.whenReady();
    this.ensureOverlayViewAdded();
    this.unifiedOverlayManager.showOverlay('basic-auth', request);
  }

  resolveBasicAuth(requestId: string, creds: BasicAuthCreds | null): void {
    const callback = this.pendingBasicAuth.get(requestId);
    if (!callback) return;
    this.pendingBasicAuth.delete(requestId);
    callback(creds);
    this.hideBasicAuthOverlay();
  }

  hideBasicAuthOverlay(): void {
    if (this.unifiedOverlayManager?.isVisible('basic-auth')) {
      this.unifiedOverlayManager.hideOverlay('basic-auth');
      this.removeOverlayViewIfEmpty();
    }
  }

  findTabByWebContentsId(webContentsId: number): Tab | null {
    for (const tab of this.tabs.values()) {
      const view = tab.getWebContentsViewInstance();
      if (view && view.webContents.id === webContentsId) {
        return tab;
      }
    }
    return null;
  }

  // --- Find in page ---

  private isFindInPageVisible(): boolean {
    return this.findInPageManager?.isVisible ?? false;
  }

  async showFindInPage(): Promise<void> {
    this.hideOptionsMenuOverlay();
    this.hideCommandKOverlay();
    this.hideCommandOOverlay();

    if (this.isFindInPageVisible()) {
      this.hideFindInPage();
      return;
    }

    const activeTab = this.getActiveTab();
    if (activeTab && activeTab.getWebContentsViewInstance()) {
      this.findInPageManager.setActiveTabWebContents(
        activeTab.getWebContentsViewInstance().webContents
      );
    }

    if (this.activeTabId) this.findInPageState.set(this.activeTabId, { searchText: '' });
    this.findInPageManager.show();
    this.resizeActiveTab();
  }

  hideFindInPage(): void {
    if (this.isFindInPageVisible()) {
      if (this.activeTabId) this.findInPageState.delete(this.activeTabId);
      this.findInPageManager.hide();
      this.resizeActiveTab();
    }
  }

  findInPage(text: string, options?: { matchCase?: boolean }): void {
    if (!this.isFindInPageVisible()) return;
    this.findInPageManager.find(text, options);
  }

  findInPageNext(text: string, options?: { matchCase?: boolean }): void {
    if (!this.isFindInPageVisible()) return;
    this.findInPageManager.findNext(text, options);
  }

  findInPagePrevious(text: string, options?: { matchCase?: boolean }): void {
    if (!this.isFindInPageVisible()) return;
    this.findInPageManager.findPrevious(text, options);
  }

  stopFindInPage(): void {
    this.findInPageManager?.clearHighlights();
  }

  // --- SSL info ---

  private sslInfoDismissedAt = 0;

  async showSSLInfoOverlay(data: {
    sslStatus: string;
    sslDetails: any;
    url: string;
  }): Promise<void> {
    if (!this.browserWindowInstance) return;
    this.hideOptionsMenuOverlay();
    this.hideCommandKOverlay();
    this.hideCommandOOverlay();
    // URL autocomplete restricts the shared overlay view to the URL bar
    // strip; leaving it open while SSL opens would clip the SSL panel.
    this.hideUrlAutocompleteOverlay();

    await this.overlayInitPromise;

    if (this.unifiedOverlayManager.isVisible('ssl-info')) {
      this.hideSSLInfoOverlay();
      return;
    }

    if (Date.now() - this.sslInfoDismissedAt < 300) {
      return;
    }

    this.unifiedOverlayManager.setSSLInfoOnDismiss(() => this.hideSSLInfoOverlay());

    await this.unifiedOverlayManager.whenReady();
    this.ensureOverlayViewAdded();
    this.unifiedOverlayManager.showOverlay('ssl-info', data);
  }

  hideSSLInfoOverlay(): void {
    if (this.unifiedOverlayManager?.isVisible('ssl-info')) {
      this.sslInfoDismissedAt = Date.now();
      this.unifiedOverlayManager.hideOverlay('ssl-info');
      this.removeOverlayViewIfEmpty();
    }
  }

  // --- Misc ---

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  getTabCount(): number {
    return this.tabs.size;
  }

  getTabSummaries(): { url: string; title: string }[] {
    return Array.from(this.tabs.values()).map((tab) => ({
      url: tab.getUrl(),
      title: tab.getTitle(),
    }));
  }
}
