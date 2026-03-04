import { BrowserWindow, session } from "electron";
import { v4 as uuid } from "uuid";
import { Tab } from "./tab";
import { AppConstants, InAppUrls, MainToRendererEventsForBrowserIPC } from "../../constants/app-constants";
import { OptionsMenuManager } from "./options-menu-manager";
import { CommandKOverlayManager } from "./command-k-overlay-manager";
import { DownloadManager } from "./download-manager";
import { PermissionManager } from "./permission-manager";
import { PermissionPromptOverlayManager, PermissionPromptData } from "./permission-prompt-overlay-manager";
import { FindInPageManager } from "./find-in-page-manager";
import { RecentlyClosedManager } from "./recently-closed-manager";
import { ClosedTabRecord } from "../../types/recently-closed-types";
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
  private permissionPromptOverlayManager: PermissionPromptOverlayManager | null = null;
  private findInPageManager: FindInPageManager | null = null;
  private database: DB;
  private recentlyClosedTabs: ClosedTabRecord[] = [];
  private closedWindowRecorded = false;

  constructor(isPrivate = false, database: DB) {
    this.isPrivate = isPrivate;
    this.database = database;
    this.tabs = new Map();
    this.activeTabId = null;
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
    this.permissionPromptOverlayManager = new PermissionPromptOverlayManager(this.id, this.isPrivate, this.partitionSetting);
    this.findInPageManager = new FindInPageManager(this.id, this.isPrivate, this.partitionSetting);

    this.browserWindowInstance.loadURL(BROWSER_LAYOUT_WEBPACK_ENTRY);

      this.browserWindowInstance.webContents.setWindowOpenHandler(({ url }) => {
        return { action: 'deny' };
      });
    
      // Pause all active downloads before the window is destroyed
      // so their resume metadata can be persisted to the DB
      this.browserWindowInstance.on('close', () => {
        DownloadManager.pauseAllDownloads();

        // Record closed window state for "Recently Closed Windows"
        if (!this.isPrivate && !this.closedWindowRecorded) {
          this.closedWindowRecorded = true;
          const tabInfos = this.getTabs().map(tab => ({
            url: tab.getUrl(),
            title: tab.getTitle(),
            faviconUrl: tab.getFaviconUrl(),
          }));
          RecentlyClosedManager.recordClosedWindow(tabInfos, this.isPrivate);
        }
      });

      this.browserWindowInstance.on('closed', () => {
        this.browserWindowInstance = null;
      });

      // Prevent Escape from exiting fullscreen
      this.browserWindowInstance.on('leave-full-screen', () => {
        this.browserWindowInstance?.setFullScreen(true);
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
      });
    
      // this.browserWindowInstance.webContents.openDevTools({mode : 'detach'});
      this.browserWindowInstance.on('resize', this.handleResizing);
  }

  public closeWindow(clearSession: boolean) {
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
    if (this.browserWindowInstance && this.getActiveTab()) {
      this.getActiveTab().getWebContentsViewInstance().setBounds(this.browserWindowInstance.getBounds());
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

  closeTab(id: string, isUserInitiated = true): void {
    const tab = this.tabs.get(id);
    if (tab) {
      // Capture tab state before closing (skip private and internal pages)
      if (!this.isPrivate) {
        const url = tab.getUrl();
        const title = tab.getTitle();
        const faviconUrl = tab.getFaviconUrl();
        if (url && !url.startsWith(InAppUrls.PREFIX) && url !== '') {
          const record: ClosedTabRecord = { url, title, faviconUrl, closedAt: Date.now() };
          this.recentlyClosedTabs.push(record);
          if (this.recentlyClosedTabs.length > 20) {
            this.recentlyClosedTabs.shift();
          }
          RecentlyClosedManager.addClosedTab(record);
        }
      }

      PermissionManager.clearSessionPermissionsForTab(id);
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
  }

  activateTab(id: string, isUserInitiated = true): void {
    if(this.activeTabId && this.getActiveTab()){
      this.browserWindowInstance.contentView.removeChildView(this.getActiveTab().getWebContentsViewInstance());
    }
    if (this.tabs.has(id)) {
      this.activeTabId = id;
      const parentBounds = this.browserWindowInstance.contentView.getBounds();
      const yOffset = 85;
      this.getActiveTab().getWebContentsViewInstance()?.setBounds({x: parentBounds.x, y: yOffset, width: parentBounds.width, height: parentBounds.height - yOffset});
      this.browserWindowInstance.contentView.addChildView(this.getActiveTab().getWebContentsViewInstance());
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

  popRecentlyClosedTab(): ClosedTabRecord | null {
    return this.recentlyClosedTabs.pop() || null;
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

  updateViewBounds(bounds: { x: number, y: number, width: number, height: number }): void {
    this.getBrowserWindowInstance().setBounds(bounds);
  }

  async showOptionsMenuOverlay(): Promise<void> {
    this.hideCommandKOverlay();
    if(this.browserWindowInstance.contentView.children.indexOf(this.optionsMenuManager.getWebContentsViewInstance()) > -1){
      //already open
      return;
    }
    await this.optionsMenuManager.whenReady();
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    this.optionsMenuManager.getWebContentsViewInstance().setBounds(parentBounds);
    this.browserWindowInstance.contentView.addChildView(this.optionsMenuManager.getWebContentsViewInstance());
  }
  hideOptionsMenuOverlay(): void {
    if(this.optionsMenuManager && this.browserWindowInstance.contentView.children.indexOf(this.optionsMenuManager.getWebContentsViewInstance()) > -1){
      this.browserWindowInstance.contentView.removeChildView(this.optionsMenuManager.getWebContentsViewInstance());
    }
  }

  async showCommandKOverlay(): Promise<void> {
    this.hideOptionsMenuOverlay();
    if(this.browserWindowInstance.contentView.children.indexOf(this.commandKOverlayManager.getWebContentsViewInstance()) > -1){
      // Already open — toggle it closed
      this.hideCommandKOverlay();
      return;
    }
    await this.commandKOverlayManager.whenReady();
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    this.commandKOverlayManager.getWebContentsViewInstance().setBounds(parentBounds);
    this.browserWindowInstance.contentView.addChildView(this.commandKOverlayManager.getWebContentsViewInstance());
    this.commandKOverlayManager.resetState();
    this.commandKOverlayManager.getWebContentsViewInstance().webContents.focus();
  }
  hideCommandKOverlay(): void {
    if(this.commandKOverlayManager && this.browserWindowInstance.contentView.children.indexOf(this.commandKOverlayManager.getWebContentsViewInstance()) > -1){
      this.browserWindowInstance.contentView.removeChildView(this.commandKOverlayManager.getWebContentsViewInstance());
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
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    this.permissionPromptOverlayManager.getWebContentsViewInstance().setBounds(parentBounds);
    if (this.browserWindowInstance.contentView.children.indexOf(this.permissionPromptOverlayManager.getWebContentsViewInstance()) === -1) {
      this.browserWindowInstance.contentView.addChildView(this.permissionPromptOverlayManager.getWebContentsViewInstance());
    }
    this.permissionPromptOverlayManager.showPrompt(data);
  }

  hidePermissionPromptOverlay(): void {
    if (this.permissionPromptOverlayManager && this.browserWindowInstance &&
        this.browserWindowInstance.contentView.children.indexOf(this.permissionPromptOverlayManager.getWebContentsViewInstance()) > -1) {
      this.browserWindowInstance.contentView.removeChildView(this.permissionPromptOverlayManager.getWebContentsViewInstance());
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
    return this.findInPageManager && this.browserWindowInstance.contentView.children.indexOf(this.findInPageManager.getWebContentsViewInstance()) > -1;
  }

  async showFindInPage(): Promise<void> {
    this.hideOptionsMenuOverlay();
    this.hideCommandKOverlay();

    if (this.isFindInPageVisible()) {
      // Already open — toggle it closed
      this.hideFindInPage();
      return;
    }

    // Attach to the active tab's webContents
    const activeTab = this.getActiveTab();
    if (activeTab) {
      this.findInPageManager.setActiveTabWebContents(activeTab.getWebContentsViewInstance().webContents);
    }

    await this.findInPageManager.whenReady();
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    const barWidth = Math.min(520, parentBounds.width - 24);
    const barHeight = 48;
    const yOffset = 85; // below the navbar
    this.findInPageManager.getWebContentsViewInstance().setBounds({
      x: parentBounds.width - barWidth - 12,
      y: yOffset,
      width: barWidth,
      height: barHeight,
    });
    this.browserWindowInstance.contentView.addChildView(this.findInPageManager.getWebContentsViewInstance());
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
}