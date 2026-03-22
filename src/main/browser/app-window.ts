import { BrowserWindow, screen, session } from "electron";
import { v4 as uuid } from "uuid";
import { Tab } from "./tab";
import { AppConstants, ClosedTabRecord, InAppUrls, MainToRendererEventsForBrowserIPC } from "../../constants/app-constants";
import { OptionsMenuManager } from "./options-menu-manager";
import { CommandKOverlayManager } from "./command-k-overlay-manager";
import { CommandOOverlayManager } from "./command-o-overlay-manager";
import { DownloadManager } from "./download-manager";
import { PermissionManager } from "./permission-manager";
import { PermissionPromptOverlayManager, PermissionPromptData } from "./permission-prompt-overlay-manager";
import { FindInPageManager } from "./find-in-page-manager";
import { IssueReportOverlayManager } from "./issue-report-overlay-manager";
import { SSLInfoOverlayManager } from "./ssl-info-overlay-manager";
import type { Database as DB } from 'better-sqlite3';

export class AppWindow {
  public readonly id: string = uuid();
  private browserWindowInstance: BrowserWindow | null = null;
  private tabs: Map<string, Tab>;
  private activeTabId: string | null;
  public isPrivate = false;
  private partitionSetting: string;
  private optionsMenuManager: OptionsMenuManager | null = null;
  private commandKOverlayManager: CommandKOverlayManager | null = null;
  private commandOOverlayManager: CommandOOverlayManager | null = null;
  private permissionPromptOverlayManager: PermissionPromptOverlayManager | null = null;
  private findInPageManager: FindInPageManager | null = null;
  private issueReportOverlayManager: IssueReportOverlayManager | null = null;
  private sslInfoOverlayManager: SSLInfoOverlayManager | null = null;
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

    this.optionsMenuManager = new OptionsMenuManager(this.id, this.isPrivate, this.partitionSetting);
    this.commandKOverlayManager = new CommandKOverlayManager(this.id, this.isPrivate, this.partitionSetting);
    this.commandOOverlayManager = new CommandOOverlayManager(this.id, this.isPrivate, this.partitionSetting);
    this.permissionPromptOverlayManager = new PermissionPromptOverlayManager(this.id, this.isPrivate, this.partitionSetting);
    this.findInPageManager = new FindInPageManager(this.id, this.isPrivate, this.partitionSetting);
    this.issueReportOverlayManager = new IssueReportOverlayManager(this.id, this.isPrivate, this.partitionSetting);
    this.sslInfoOverlayManager = new SSLInfoOverlayManager(this.id, this.isPrivate, this.partitionSetting);

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
        // Window was created with fullscreen: true so it has no pre-fullscreen
        // geometry. Set centered bounds now that the transition is complete.
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

        // Tell the renderer about the new tab
        this.browserWindowInstance.webContents.send(MainToRendererEventsForBrowserIPC.NEW_TAB_CREATED, {
          id: firstTab.id,
          title: firstTab.getTitle(),
          url: firstTab.getUrl()
        });
        this.resolveReady();

        // Show window only after browser chrome and first tab are fully loaded
        this.browserWindowInstance?.show();
      });
    
      // this.browserWindowInstance.webContents.openDevTools({mode : 'detach'});
      this.browserWindowInstance.on('resize', this.handleResizing.bind(this));
  }

  public closeWindow(clearSession: boolean) {
    // Clear pending timers on all tabs to prevent callbacks after window removal
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

    // Resize full-size overlays that are currently visible
    const children = this.browserWindowInstance.contentView.children;
    const fullSizeOverlays = [
      this.optionsMenuManager,
      this.commandKOverlayManager,
      this.commandOOverlayManager,
      this.permissionPromptOverlayManager,
      this.issueReportOverlayManager,
    ];
    for (const mgr of fullSizeOverlays) {
      const view = mgr?.getWebContentsViewInstance();
      if (view && children.includes(view)) {
        view.setBounds(parentBounds);
      }
    }

    // Resize find-in-page bar if visible
    const findView = this.findInPageManager?.getWebContentsViewInstance();
    if (findView && children.includes(findView)) {
      const barWidth = Math.min(520, parentBounds.width - 24);
      findView.setBounds({
        x: parentBounds.width - barWidth - 12,
        y: yOffset,
        width: barWidth,
        height: 48,
      });
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
      // Capture closed tab data before destroying
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

  async showOptionsMenuOverlay(): Promise<void> {
    this.hideCommandKOverlay();
    const existingView = this.optionsMenuManager.getWebContentsViewInstance();
    if(existingView && this.browserWindowInstance.contentView.children.indexOf(existingView) > -1){
      //already open
      return;
    }
    await this.optionsMenuManager.whenReady();
    const view = this.optionsMenuManager.getWebContentsViewInstance();
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    view.setBounds(parentBounds);
    this.browserWindowInstance.contentView.addChildView(view);
  }
  hideOptionsMenuOverlay(): void {
    const view = this.optionsMenuManager?.getWebContentsViewInstance();
    if(view && this.browserWindowInstance.contentView.children.indexOf(view) > -1){
      this.browserWindowInstance.contentView.removeChildView(view);
    }
  }

  async showCommandKOverlay(): Promise<void> {
    this.hideOptionsMenuOverlay();
    this.hideCommandOOverlay();
    const existingView = this.commandKOverlayManager.getWebContentsViewInstance();
    if(existingView && this.browserWindowInstance.contentView.children.indexOf(existingView) > -1){
      // Already open — toggle it closed
      this.hideCommandKOverlay();
      return;
    }
    await this.commandKOverlayManager.whenReady();
    const view = this.commandKOverlayManager.getWebContentsViewInstance();
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    view.setBounds(parentBounds);
    this.browserWindowInstance.contentView.addChildView(view);
    this.commandKOverlayManager.resetState();
    view.webContents.focus();
  }
  hideCommandKOverlay(): void {
    const view = this.commandKOverlayManager?.getWebContentsViewInstance();
    if(view && this.browserWindowInstance.contentView.children.indexOf(view) > -1){
      this.browserWindowInstance.contentView.removeChildView(view);
    }
  }

  async showCommandOOverlay(): Promise<void> {
    this.hideOptionsMenuOverlay();
    this.hideCommandKOverlay();
    const existingView = this.commandOOverlayManager.getWebContentsViewInstance();
    if(existingView && this.browserWindowInstance.contentView.children.indexOf(existingView) > -1){
      // Already open — toggle it closed
      this.hideCommandOOverlay();
      return;
    }
    await this.commandOOverlayManager.whenReady();
    const view = this.commandOOverlayManager.getWebContentsViewInstance();
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    view.setBounds(parentBounds);
    this.browserWindowInstance.contentView.addChildView(view);
    this.commandOOverlayManager.resetState();
    view.webContents.focus();
  }
  hideCommandOOverlay(): void {
    const view = this.commandOOverlayManager?.getWebContentsViewInstance();
    if(view && this.browserWindowInstance.contentView.children.indexOf(view) > -1){
      this.browserWindowInstance.contentView.removeChildView(view);
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
    if (!this.permissionPromptOverlayManager || !this.browserWindowInstance) return;
    await this.permissionPromptOverlayManager.whenReady();
    const view = this.permissionPromptOverlayManager.getWebContentsViewInstance();
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    view.setBounds(parentBounds);
    if (this.browserWindowInstance.contentView.children.indexOf(view) === -1) {
      this.browserWindowInstance.contentView.addChildView(view);
    }
    this.permissionPromptOverlayManager.showPrompt(data);
  }

  hidePermissionPromptOverlay(): void {
    const view = this.permissionPromptOverlayManager?.getWebContentsViewInstance();
    if (view && this.browserWindowInstance &&
        this.browserWindowInstance.contentView.children.indexOf(view) > -1) {
      this.browserWindowInstance.contentView.removeChildView(view);
    }
  }

  async showIssueReportOverlay(): Promise<void> {
    if (!this.issueReportOverlayManager || !this.browserWindowInstance) return;
    this.hideOptionsMenuOverlay();
    this.hideCommandKOverlay();
    const existingView = this.issueReportOverlayManager.getWebContentsViewInstance();
    if (existingView && this.browserWindowInstance.contentView.children.indexOf(existingView) > -1) {
      return;
    }
    await this.issueReportOverlayManager.whenReady();
    const view = this.issueReportOverlayManager.getWebContentsViewInstance();
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    view.setBounds(parentBounds);
    this.browserWindowInstance.contentView.addChildView(view);
    view.webContents.focus();
  }

  hideIssueReportOverlay(): void {
    const view = this.issueReportOverlayManager?.getWebContentsViewInstance();
    if (view && this.browserWindowInstance &&
        this.browserWindowInstance.contentView.children.indexOf(view) > -1) {
      this.browserWindowInstance.contentView.removeChildView(view);
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

  private isFindInPageVisible(): boolean {
    const view = this.findInPageManager?.getWebContentsViewInstance();
    return view != null && this.browserWindowInstance.contentView.children.indexOf(view) > -1;
  }

  async showFindInPage(): Promise<void> {
    this.hideOptionsMenuOverlay();
    this.hideCommandKOverlay();
    this.hideCommandOOverlay();

    if (this.isFindInPageVisible()) {
      // Already open — toggle it closed
      this.hideFindInPage();
      return;
    }

    await this.findInPageManager.whenReady();

    // Attach to the active tab's webContents (after init so the handler closure can reference the view)
    const activeTab = this.getActiveTab();
    if (activeTab) {
      this.findInPageManager.setActiveTabWebContents(activeTab.getWebContentsViewInstance().webContents);
    }

    const view = this.findInPageManager.getWebContentsViewInstance();
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    const barWidth = Math.min(520, parentBounds.width - 24);
    const barHeight = 48;
    const yOffset = 85; // below the navbar
    view.setBounds({
      x: parentBounds.width - barWidth - 12,
      y: yOffset,
      width: barWidth,
      height: barHeight,
    });
    this.browserWindowInstance.contentView.addChildView(view);
    this.findInPageManager.focusInput();
  }

  hideFindInPage(): void {
    if (this.isFindInPageVisible()) {
      this.findInPageManager.stopFind();
      this.browserWindowInstance.contentView.removeChildView(this.findInPageManager.getWebContentsViewInstance());
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

  private sslInfoDismissedAt = 0;

  private isSSLInfoVisible(): boolean {
    const view = this.sslInfoOverlayManager?.getWebContentsViewInstance();
    return view != null && this.browserWindowInstance.contentView.children.indexOf(view) > -1;
  }

  async showSSLInfoOverlay(data: { sslStatus: string; sslDetails: any; url: string }): Promise<void> {
    if (!this.sslInfoOverlayManager || !this.browserWindowInstance) return;
    this.hideOptionsMenuOverlay();
    this.hideCommandKOverlay();
    this.hideCommandOOverlay();

    if (this.isSSLInfoVisible()) {
      this.hideSSLInfoOverlay();
      return;
    }

    // If overlay was just dismissed by blur (e.g. user clicked the SSL icon to close),
    // the blur fires before the click, so don't reopen immediately.
    if (Date.now() - this.sslInfoDismissedAt < 300) {
      return;
    }

    this.sslInfoOverlayManager.setOnDismiss(() => this.hideSSLInfoOverlay());

    await this.sslInfoOverlayManager.whenReady();
    const view = this.sslInfoOverlayManager.getWebContentsViewInstance();
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    const panelWidth = Math.min(300, parentBounds.width - 24);
    const yOffset = 85;
    // Initial bounds — will be resized after content renders
    view.setBounds({
      x: 12,
      y: yOffset,
      width: panelWidth,
      height: 300,
    });
    this.browserWindowInstance.contentView.addChildView(view);
    this.sslInfoOverlayManager.showInfo(data);

    // Resize to fit content after a short delay for rendering
    setTimeout(async () => {
      try {
        const contentHeight = await this.sslInfoOverlayManager.getContentHeight();
        const maxHeight = parentBounds.height - yOffset - 12;
        const finalHeight = Math.min(contentHeight + 2, maxHeight);
        this.sslInfoOverlayManager.getWebContentsViewInstance()?.setBounds({
          x: 12,
          y: yOffset,
          width: panelWidth,
          height: finalHeight,
        });
      } catch { /* ignore */ }
    }, 50);
  }

  hideSSLInfoOverlay(): void {
    if (this.isSSLInfoVisible()) {
      this.sslInfoDismissedAt = Date.now();
      this.browserWindowInstance.contentView.removeChildView(this.sslInfoOverlayManager.getWebContentsViewInstance());
    }
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