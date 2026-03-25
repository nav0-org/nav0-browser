import { BrowserWindow, screen, session } from "electron";
import { v4 as uuid } from "uuid";
import { Tab } from "./tab";
import { AppConstants, ClosedTabRecord, InAppUrls, MainToRendererEventsForBrowserIPC } from "../../constants/app-constants";
import { DownloadManager } from "./download-manager";
import { PermissionManager } from "./permission-manager";
import { FindInPageManager } from "./find-in-page-manager";
import { UnifiedOverlayManager, OverlayType } from "./unified-overlay-manager";
import { PermissionPromptData } from "./overlay-handlers/permission-prompt-handler";
import type { Database as DB } from 'better-sqlite3';

export { PermissionPromptData };

export class AppWindow {
  public readonly id: string = uuid();
  private browserWindowInstance: BrowserWindow | null = null;
  private tabs: Map<string, Tab>;
  private activeTabId: string | null;
  public isPrivate = false;
  private partitionSetting: string;
  private unifiedOverlayManager: UnifiedOverlayManager | null = null;
  private findInPageManager: FindInPageManager | null = null;
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
    this.browserWindowInstance = new BrowserWindow({
      width: 1200,
      height: 800,
      fullscreen: true,
      show: false,
      title : AppConstants.APP_NAME,
      icon: '../../renderer/assets/logo.png',
      webPreferences: {
        preload: BROWSER_LAYOUT_PRELOAD_WEBPACK_ENTRY,
        nodeIntegration: false,
        contextIsolation: true,
        additionalArguments: [`--app-window-id=${this.id}`, `--is-private=${this.isPrivate}`],
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        partition: this.partitionSetting,
      },
    });

    this.unifiedOverlayManager = new UnifiedOverlayManager(this.id, this.isPrivate, this.partitionSetting);
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
      });

      this.browserWindowInstance.on('enter-full-screen', () => {
        this._desiredFullScreen = true;
        this.handleResizing();
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

  private handleResizing() {
    if (!this.browserWindowInstance) return;
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    const yOffset = 85;

    // Resize active tab
    if (this.getActiveTab()) {
      this.getActiveTab().getWebContentsViewInstance().setBounds({
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
      tab.getWebContentsViewInstance().webContents.removeAllListeners();
      tab.getWebContentsViewInstance().removeAllListeners();
      tab.getWebContentsViewInstance().webContents.close();
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

  activateTab(id: string, isUserInitiated = true): void {
    if(this.activeTabId && this.getActiveTab()){
      this.browserWindowInstance.contentView.removeChildView(this.getActiveTab().getWebContentsViewInstance());
    }
    if (this.tabs.has(id)) {
      this.activeTabId = id;
      const parentBounds = this.browserWindowInstance.contentView.getBounds();
      const yOffset = 85;
      this.getActiveTab().getWebContentsViewInstance()?.setBounds({x: 0, y: yOffset, width: parentBounds.width, height: parentBounds.height - yOffset});
      this.browserWindowInstance.contentView.addChildView(this.getActiveTab().getWebContentsViewInstance());
      this.getActiveTab().getWebContentsViewInstance().webContents.focus();
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
      this.getActiveTab().getWebContentsViewInstance().setBounds(bounds);
    }
  }

  // --- Overlay methods (delegate to UnifiedOverlayManager) ---

  async showOptionsMenuOverlay(): Promise<void> {
    this.hideCommandKOverlay();
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

  async showPermissionPromptOverlay(data: PermissionPromptData): Promise<void> {
    if (!this.unifiedOverlayManager || !this.browserWindowInstance) return;
    await this.unifiedOverlayManager.whenReady();
    this.ensureOverlayViewAdded();
    this.unifiedOverlayManager.showPermissionPrompt(data);
  }

  hidePermissionPromptOverlay(): void {
    if (this.unifiedOverlayManager?.isVisible('permission-prompt')) {
      this.unifiedOverlayManager.hideOverlay('permission-prompt');
      this.removeOverlayViewIfEmpty();
    }
  }

  async showIssueReportOverlay(): Promise<void> {
    if (!this.unifiedOverlayManager || !this.browserWindowInstance) return;
    this.hideOptionsMenuOverlay();
    this.hideCommandKOverlay();
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
      if (tab.getWebContentsViewInstance().webContents.id === webContentsId) {
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
    if (activeTab) {
      this.findInPageManager.setActiveTabWebContents(activeTab.getWebContentsViewInstance().webContents);
    }

    this.findInPageManager.show();
  }

  hideFindInPage(): void {
    if (this.isFindInPageVisible()) {
      this.findInPageManager.hide();
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
    if (!this.unifiedOverlayManager || !this.browserWindowInstance) return;
    this.hideOptionsMenuOverlay();
    this.hideCommandKOverlay();
    this.hideCommandOOverlay();

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

  async setDarkMode(enabled: boolean): Promise<void> {
    Tab.setDarkModeEnabled(enabled);
    for (const tab of this.tabs.values()) {
      if (enabled) {
        await tab.injectDarkModeCSS();
      } else {
        await tab.removeDarkModeCSS();
      }
    }
  }
}
