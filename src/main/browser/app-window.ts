import { BrowserWindow, screen, session, WebContentsView } from "electron";
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

  // Single shared WebContentsView for all overlays. Since overlays are
  // mutually exclusive, one renderer process handles all 7 overlay UIs.
  // Content is swapped via loadURL(); the process stays alive across
  // navigations so there is no spawn/kill overhead.
  private sharedOverlayView: WebContentsView | null = null;
  private sharedOverlayLoadedUrl: string | null = null;
  private currentOverlayType: string | null = null;

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

    // Create the single shared overlay view. All overlays use the same
    // preload (internals-api.ts), so one WebContentsView can serve them all.
    this.sharedOverlayView = new WebContentsView({
      webPreferences: {
        preload: COMMAND_K_PRELOAD_WEBPACK_ENTRY,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        partition: this.partitionSetting,
        additionalArguments: [`--app-window-id=${this.id}`, `--is-private=${this.isPrivate}`],
        transparent: true,
      }
    });
    this.sharedOverlayView.webContents.setWindowOpenHandler(() => ({ action: 'deny' as const }));

    // Overlay-specific managers (thin wrappers for overlay-specific logic)
    this.optionsMenuManager = new OptionsMenuManager();
    this.commandKOverlayManager = new CommandKOverlayManager();
    this.commandOOverlayManager = new CommandOOverlayManager();
    this.permissionPromptOverlayManager = new PermissionPromptOverlayManager();
    this.findInPageManager = new FindInPageManager();
    this.issueReportOverlayManager = new IssueReportOverlayManager();
    this.sslInfoOverlayManager = new SSLInfoOverlayManager();

    this.browserWindowInstance.loadURL(BROWSER_LAYOUT_WEBPACK_ENTRY);

    // Pre-load Command K (most frequently used overlay) into the shared view
    // after the window is visible so it doesn't compete with initial page load.
    this.browserWindowInstance.once('show', () => {
      this.sharedOverlayView.webContents.loadURL(COMMAND_K_WEBPACK_ENTRY);
      this.sharedOverlayLoadedUrl = COMMAND_K_WEBPACK_ENTRY;
    });

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

  // ── Shared overlay helpers ──────────────────────────────────────────

  /** Whether the shared overlay view is currently attached to the window. */
  private isOverlayVisible(): boolean {
    return this.sharedOverlayView != null &&
      this.browserWindowInstance?.contentView?.children?.includes(this.sharedOverlayView) === true;
  }

  /** Load a URL into the shared overlay view if it isn't already loaded. */
  private async loadOverlayUrl(url: string): Promise<void> {
    if (this.sharedOverlayLoadedUrl === url) return;
    await new Promise<void>((resolve) => {
      this.sharedOverlayView.webContents.once('did-finish-load', () => resolve());
      this.sharedOverlayView.webContents.loadURL(url);
    });
    this.sharedOverlayLoadedUrl = url;
  }

  /** Remove the shared overlay from children and clean up overlay-specific state. */
  private hideCurrentOverlay(): void {
    if (!this.isOverlayVisible()) return;

    // Overlay-specific teardown
    if (this.currentOverlayType === 'find-in-page') {
      this.findInPageManager.stopFind();
    }
    if (this.currentOverlayType === 'ssl-info') {
      this.sslInfoOverlayManager.teardownListeners();
    }
    if (this.currentOverlayType === 'permission-prompt') {
      this.permissionPromptOverlayManager.teardownReadyListener();
    }

    this.browserWindowInstance.contentView.removeChildView(this.sharedOverlayView);
    this.currentOverlayType = null;
  }

  // ── Window lifecycle ────────────────────────────────────────────────

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

    // Resize the shared overlay view if it's currently visible
    if (this.isOverlayVisible()) {
      if (this.currentOverlayType === 'find-in-page') {
        const barWidth = Math.min(520, parentBounds.width - 24);
        this.sharedOverlayView.setBounds({
          x: parentBounds.width - barWidth - 12,
          y: yOffset,
          width: barWidth,
          height: 48,
        });
      } else if (this.currentOverlayType !== 'ssl-info') {
        // Full-size overlays (command-k, command-o, options-menu, etc.)
        this.sharedOverlayView.setBounds(parentBounds);
      }
      // SSL info panel has dynamic height — skip resize
    }
  }

  // ── Tab management ──────────────────────────────────────────────────

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

  // ── Overlay show/hide methods ───────────────────────────────────────

  async showOptionsMenuOverlay(): Promise<void> {
    // Already open — do nothing
    if (this.currentOverlayType === 'options-menu' && this.isOverlayVisible()) {
      return;
    }
    this.hideCurrentOverlay();
    await this.loadOverlayUrl(OPTIONS_MENU_WEBPACK_ENTRY);
    this.currentOverlayType = 'options-menu';
    this.optionsMenuManager.setView(this.sharedOverlayView);
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    this.sharedOverlayView.setBounds(parentBounds);
    this.browserWindowInstance.contentView.addChildView(this.sharedOverlayView);
  }

  hideOptionsMenuOverlay(): void {
    if (this.currentOverlayType === 'options-menu') {
      this.hideCurrentOverlay();
    }
  }

  async showCommandKOverlay(): Promise<void> {
    // Toggle: if already open, close it
    if (this.currentOverlayType === 'command-k' && this.isOverlayVisible()) {
      this.hideCurrentOverlay();
      return;
    }
    this.hideCurrentOverlay();
    await this.loadOverlayUrl(COMMAND_K_WEBPACK_ENTRY);
    this.currentOverlayType = 'command-k';
    this.commandKOverlayManager.setView(this.sharedOverlayView);
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    this.sharedOverlayView.setBounds(parentBounds);
    this.browserWindowInstance.contentView.addChildView(this.sharedOverlayView);
    this.commandKOverlayManager.resetState();
    this.sharedOverlayView.webContents.focus();
  }

  hideCommandKOverlay(): void {
    if (this.currentOverlayType === 'command-k') {
      this.hideCurrentOverlay();
    }
  }

  async showCommandOOverlay(): Promise<void> {
    // Toggle: if already open, close it
    if (this.currentOverlayType === 'command-o' && this.isOverlayVisible()) {
      this.hideCurrentOverlay();
      return;
    }
    this.hideCurrentOverlay();
    await this.loadOverlayUrl(COMMAND_O_WEBPACK_ENTRY);
    this.currentOverlayType = 'command-o';
    this.commandOOverlayManager.setView(this.sharedOverlayView);
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    this.sharedOverlayView.setBounds(parentBounds);
    this.browserWindowInstance.contentView.addChildView(this.sharedOverlayView);
    this.commandOOverlayManager.resetState();
    this.sharedOverlayView.webContents.focus();
  }

  hideCommandOOverlay(): void {
    if (this.currentOverlayType === 'command-o') {
      this.hideCurrentOverlay();
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
    this.hideCurrentOverlay();

    const needsLoad = this.sharedOverlayLoadedUrl !== PERMISSION_PROMPT_WEBPACK_ENTRY;
    if (needsLoad) {
      // Set up IPC listener BEFORE loading so we don't miss the ready signal
      const readyPromise = this.permissionPromptOverlayManager.setupReadyListener(this.sharedOverlayView);
      await this.loadOverlayUrl(PERMISSION_PROMPT_WEBPACK_ENTRY);
      await readyPromise;
    }

    this.currentOverlayType = 'permission-prompt';
    this.permissionPromptOverlayManager.setView(this.sharedOverlayView);
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    this.sharedOverlayView.setBounds(parentBounds);
    if (!this.isOverlayVisible()) {
      this.browserWindowInstance.contentView.addChildView(this.sharedOverlayView);
    }
    this.permissionPromptOverlayManager.showPrompt(data);
  }

  hidePermissionPromptOverlay(): void {
    if (this.currentOverlayType === 'permission-prompt') {
      this.hideCurrentOverlay();
    }
  }

  async showIssueReportOverlay(): Promise<void> {
    if (!this.issueReportOverlayManager || !this.browserWindowInstance) return;
    // Already open — do nothing
    if (this.currentOverlayType === 'issue-report' && this.isOverlayVisible()) {
      return;
    }
    this.hideCurrentOverlay();
    await this.loadOverlayUrl(ISSUE_REPORT_WEBPACK_ENTRY);
    this.currentOverlayType = 'issue-report';
    this.issueReportOverlayManager.setView(this.sharedOverlayView);
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    this.sharedOverlayView.setBounds(parentBounds);
    this.browserWindowInstance.contentView.addChildView(this.sharedOverlayView);
    this.sharedOverlayView.webContents.focus();
  }

  hideIssueReportOverlay(): void {
    if (this.currentOverlayType === 'issue-report') {
      this.hideCurrentOverlay();
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
    return this.currentOverlayType === 'find-in-page' && this.isOverlayVisible();
  }

  async showFindInPage(): Promise<void> {
    // Toggle: if already open, close it
    if (this.isFindInPageVisible()) {
      this.hideFindInPage();
      return;
    }
    this.hideCurrentOverlay();
    await this.loadOverlayUrl(FIND_IN_PAGE_WEBPACK_ENTRY);
    this.currentOverlayType = 'find-in-page';
    this.findInPageManager.setView(this.sharedOverlayView);

    // Attach to the active tab's webContents
    const activeTab = this.getActiveTab();
    if (activeTab) {
      this.findInPageManager.setActiveTabWebContents(activeTab.getWebContentsViewInstance().webContents);
    }

    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    const barWidth = Math.min(520, parentBounds.width - 24);
    const barHeight = 48;
    const yOffset = 85; // below the navbar
    this.sharedOverlayView.setBounds({
      x: parentBounds.width - barWidth - 12,
      y: yOffset,
      width: barWidth,
      height: barHeight,
    });
    this.browserWindowInstance.contentView.addChildView(this.sharedOverlayView);
    this.findInPageManager.focusInput();
  }

  hideFindInPage(): void {
    if (this.currentOverlayType === 'find-in-page') {
      this.hideCurrentOverlay();
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
    return this.currentOverlayType === 'ssl-info' && this.isOverlayVisible();
  }

  async showSSLInfoOverlay(data: { sslStatus: string; sslDetails: any; url: string }): Promise<void> {
    if (!this.sslInfoOverlayManager || !this.browserWindowInstance) return;

    if (this.isSSLInfoVisible()) {
      this.hideSSLInfoOverlay();
      return;
    }

    // If overlay was just dismissed by blur (e.g. user clicked the SSL icon to close),
    // the blur fires before the click, so don't reopen immediately.
    if (Date.now() - this.sslInfoDismissedAt < 300) {
      return;
    }

    this.hideCurrentOverlay();

    this.sslInfoOverlayManager.setOnDismiss(() => this.hideSSLInfoOverlay());

    await this.loadOverlayUrl(SSL_INFO_WEBPACK_ENTRY);
    this.currentOverlayType = 'ssl-info';
    this.sslInfoOverlayManager.setView(this.sharedOverlayView);
    this.sslInfoOverlayManager.setupListeners();

    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    const panelWidth = Math.min(300, parentBounds.width - 24);
    const yOffset = 85;
    // Initial bounds — will be resized after content renders
    this.sharedOverlayView.setBounds({
      x: 12,
      y: yOffset,
      width: panelWidth,
      height: 300,
    });
    this.browserWindowInstance.contentView.addChildView(this.sharedOverlayView);
    this.sslInfoOverlayManager.showInfo(data);

    // Resize to fit content after a short delay for rendering
    setTimeout(async () => {
      try {
        const contentHeight = await this.sslInfoOverlayManager.getContentHeight();
        const maxHeight = parentBounds.height - yOffset - 12;
        const finalHeight = Math.min(contentHeight + 2, maxHeight);
        this.sharedOverlayView?.setBounds({
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
      this.hideCurrentOverlay();
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
