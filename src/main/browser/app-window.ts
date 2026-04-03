import { BrowserWindow, screen, session } from "electron";
import { v4 as uuid } from "uuid";
import { Tab } from "./tab";
import { AppConstants, ClosedTabRecord, InAppUrls, MainToRendererEventsForBrowserIPC } from "../../constants/app-constants";
import { DownloadManager } from "./download-manager";
import { PermissionManager } from "./permission-manager";
import { NotificationManager } from "./notification-manager";
import { FindInPageManager } from "./find-in-page-manager";
import { UnifiedOverlayManager, OverlayType } from "./unified-overlay-manager";
import type { Database as DB } from 'better-sqlite3';

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
  private findInPageManager: FindInPageManager | null = null;
  private findInPageState: Map<string, { searchText: string }> = new Map(); // per-tab find state
  private permissionPrompts: Map<string, PermissionPromptData> = new Map(); // per-tab permission data
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
      this.partitionSetting = 'persist:private';
    } else {
      this.partitionSetting = 'persist:browsertabs';
    }
    PermissionManager.setupSession(this.partitionSetting);
    const isMac = process.platform === 'darwin';
    const isWindows = process.platform === 'win32';

    this.browserWindowInstance = new BrowserWindow({
      width: 1200,
      height: 800,
      fullscreen: true,
      show: false,
      title : AppConstants.APP_NAME,
      icon: '../../renderer/assets/logo.png',
      titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
      ...(isWindows ? {
        titleBarOverlay: {
          color: '#ffffff',
          symbolColor: '#333333',
          height: 38,
        },
      } : {}),
      trafficLightPosition: isMac ? { x: 12, y: 10 } : undefined,
      webPreferences: {
        preload: BROWSER_LAYOUT_PRELOAD_WEBPACK_ENTRY,
        nodeIntegration: false,
        contextIsolation: true,
        additionalArguments: [`--app-window-id=${this.id}`, `--is-private=${this.isPrivate}`, `--platform=${process.platform}`],
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        partition: this.partitionSetting,
      },
    });

    this.overlayInitPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        this.unifiedOverlayManager = new UnifiedOverlayManager(this.id, this.isPrivate, this.partitionSetting);
        resolve();
      }, 500);
    });
    this.findInPageManager = new FindInPageManager(this.id);
    this.findInPageManager.setBrowserWindow(this.browserWindowInstance);

    this.browserWindowInstance.loadURL(BROWSER_LAYOUT_WEBPACK_ENTRY);

      this.browserWindowInstance.webContents.setWindowOpenHandler(({ url }) => {
        return { action: 'deny' };
      });

      // Pause all active downloads before the window is destroyed
      // so their resume metadata can be persisted to the DB
      this.browserWindowInstance.on('close', () => {
        DownloadManager.pauseAllDownloads();
      });

      this.browserWindowInstance.on('closed', () => {
        this.browserWindowInstance = null;
      });

      // When leaving fullscreen, set proper windowed bounds and resize all views.
      this.browserWindowInstance.on('leave-full-screen', () => {
        this._desiredFullScreen = false;
        const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
        const w = Math.min(1200, screenW);
        const h = Math.min(800, screenH);
        const x = Math.round((screenW - w) / 2);
        const y = Math.round((screenH - h) / 2);
        this.browserWindowInstance?.setBounds({ x, y, width: w, height: h });
        this.handleResizing();
        this.browserWindowInstance?.webContents.send(MainToRendererEventsForBrowserIPC.FULLSCREEN_CHANGED, { isFullScreen: false });
      });

      this.browserWindowInstance.on('enter-full-screen', () => {
        this._desiredFullScreen = true;
        this.handleResizing();
        this.browserWindowInstance?.webContents.send(MainToRendererEventsForBrowserIPC.FULLSCREEN_CHANGED, { isFullScreen: true });
      });

      this.browserWindowInstance.webContents.on('did-finish-load', async () => {
        const firstTab = await this.createTab(InAppUrls.NEW_TAB);
        this.activateTab(firstTab.getId());

        this.browserWindowInstance.webContents.send(MainToRendererEventsForBrowserIPC.NEW_TAB_CREATED, {
          id: firstTab.id,
          title: firstTab.getTitle(),
          url: firstTab.getUrl()
        });
        this.resolveReady();
        this.browserWindowInstance?.show();
      });

      // this.browserWindowInstance.webContents.openDevTools({mode : 'detach'});
      this.browserWindowInstance.on('resize', this.handleResizing.bind(this));
  }

  public closeWindow(clearSession: boolean) {
    for (const tab of this.tabs.values()) {
      tab.clearPendingTimers();
    }
    if(clearSession){
      PermissionManager.clearMemoryPermissions();
      const currentSession = session.fromPartition('persist:private')
      currentSession?.clearAuthCache();
      currentSession?.clearStorageData();
      currentSession?.clearCache();
      currentSession?.clearHostResolverCache();
      currentSession?.clearCodeCaches({});
      currentSession?.clearSharedDictionaryCache();
      currentSession?.clearStorageData();
      currentSession?.closeAllConnections();
      currentSession?.clearData();
    }
    this.browserWindowInstance.close();
  }

  public getViewBounds(): { x: number, y: number, width: number, height: number } | null{
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
      const parentBounds = this.browserWindowInstance.contentView.getBounds();
      overlayView.setBounds(parentBounds);
      this.browserWindowInstance.contentView.addChildView(overlayView);
    }
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
    return 85 + (this.permissionStripVisible ? 48 : 0) + (this.isFindInPageVisible() ? 48 : 0);
  }

  private resizeActiveTab(): void {
    if (!this.browserWindowInstance || !this.getActiveTab()) return;
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    const yOffset = this.getYOffset();
    this.getActiveTab().getWebContentsViewInstance()?.setBounds({
      x: 0, y: yOffset, width: parentBounds.width, height: parentBounds.height - yOffset,
    });
  }

  private handleResizing() {
    if (!this.browserWindowInstance) return;
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    const yOffset = this.getYOffset();

    // Resize active tab
    if (this.getActiveTab()) {
      this.getActiveTab().getWebContentsViewInstance()?.setBounds({
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
        overlayView.setBounds(parentBounds);
      }
    }
  }

  async createTab(url: string, activateNewTab = true): Promise<Tab> {
    const tab = new Tab(this, url, this.partitionSetting);
    this.tabs.set(tab.getId(), tab);

    this.browserWindowInstance?.webContents.send(MainToRendererEventsForBrowserIPC.NEW_TAB_CREATED, {
      id: tab.id,
      title: tab.getTitle(),
      url: tab.getUrl()
    });

    if(activateNewTab){
      await tab.whenReady();
      this.activateTab(tab.getId(), true);
    }

    return tab;
  }

  createSuspendedTab(url: string, title: string): Tab {
    const tab = new Tab(this, url, this.partitionSetting, { suspended: true, title });
    this.tabs.set(tab.getId(), tab);

    this.browserWindowInstance?.webContents.send(MainToRendererEventsForBrowserIPC.NEW_TAB_CREATED, {
      id: tab.id,
      title: tab.getTitle(),
      url: tab.getUrl()
    });

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
      this.browserWindowInstance?.webContents.send(MainToRendererEventsForBrowserIPC.HIDE_PERMISSION_STRIP);
    }

    if(this.activeTabId && this.getActiveTab()){
      const prevView = this.getActiveTab().getWebContentsViewInstance();
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

      // Restore per-tab strip state for the new tab BEFORE calculating offset
      const findState = this.findInPageState.get(id);
      if (findState) {
        if (tab && tab.getWebContentsViewInstance()) {
          this.findInPageManager.setActiveTabWebContents(tab.getWebContentsViewInstance().webContents);
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
      tab.getWebContentsViewInstance()?.setBounds({x: 0, y: yOffset, width: parentBounds.width, height: parentBounds.height - yOffset});
      this.browserWindowInstance.contentView.addChildView(tab.getWebContentsViewInstance());
      // Only focus tab if find bar is not visible (find bar needs input focus)
      if (!this.isFindInPageVisible()) {
        tab.getWebContentsViewInstance()?.webContents.focus();
      }
    }
    this.browserWindowInstance?.webContents.send(MainToRendererEventsForBrowserIPC.TAB_ACTIVATED, {
      id: this.getActiveTab().id,
      title: this.getActiveTab().getTitle(),
      url: this.getActiveTab().getUrl()
    });
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

  getBrowserWindowInstance(): BrowserWindow | null {
    return this.browserWindowInstance;
  }

  toggleFullScreen(): void {
    if (this.browserWindowInstance) {
      this._desiredFullScreen = !this._desiredFullScreen;
      this.browserWindowInstance.setFullScreen(this._desiredFullScreen);
    }
  }

  updateViewBounds(bounds: { x: number, y: number, width: number, height: number }): void {
    if (this.getActiveTab()) {
      this.getActiveTab().getWebContentsViewInstance()?.setBounds(bounds);
    }
  }

  // --- Overlay methods (delegate to UnifiedOverlayManager) ---

  async showOptionsMenuOverlay(): Promise<void> {
    this.hideCommandKOverlay();
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

  broadcastToTabs(channel: string, data: any): void {
    this.tabs.forEach(tab => {
      try {
        tab.getWebContentsViewInstance()?.webContents?.send(channel, data);
      } catch (_) { /* tab may be closing */ }
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
      this.findInPageManager.setActiveTabWebContents(activeTab.getWebContentsViewInstance().webContents);
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

  async showSSLInfoOverlay(data: { sslStatus: string; sslDetails: any; url: string }): Promise<void> {
    if (!this.browserWindowInstance) return;
    this.hideOptionsMenuOverlay();
    this.hideCommandKOverlay();
    this.hideCommandOOverlay();

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
    return Array.from(this.tabs.values()).map(tab => ({
      url: tab.getUrl(),
      title: tab.getTitle(),
    }));
  }

}
