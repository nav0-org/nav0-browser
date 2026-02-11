import { BrowserWindow, session, shell } from "electron";
import { v4 as uuid } from "uuid";
import { Tab } from "./tab";
import { AppConstants, InAppUrls, MainToRendererEventsForBrowserIPC } from "../../constants/app-constants";
import { OptionsMenuManager } from "./options-menu-manager";
import { CommandKOverlayManager } from "./command-k-overlay-manager";
import type { Database as DB } from 'better-sqlite3';
import { WebLLMInteractionManager } from "../llm/web-llm-interaction-manager";

export class AppWindow {
  public readonly id: string = uuid();
  private browserWindowInstance: BrowserWindow | null = null;
  private tabs: Map<string, Tab>;
  private activeTabId: string | null;
  public isPrivate = false;
  private partitionSetting: string;
  private optionsMenuManager: OptionsMenuManager | null = null;
  private commandKOverlayManager: CommandKOverlayManager | null = null;
  private database: DB;

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

    this.browserWindowInstance.loadURL(BROWSER_LAYOUT_WEBPACK_ENTRY);

      this.browserWindowInstance.webContents.setWindowOpenHandler(({ url }) => {
        return { action: 'deny' };
      });
    
      this.browserWindowInstance.on('closed', () => {
        this.browserWindowInstance = null;
      });
    
      this.browserWindowInstance.webContents.on('did-finish-load', () => {
        const firstTab = this.createTab(InAppUrls.NEW_TAB);
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

  createTab(url: string, activateNewTab = true): Tab {
    const tab = new Tab(this, url, this.partitionSetting);
    this.tabs.set(tab.getId(), tab);

    this.browserWindowInstance?.webContents.send(MainToRendererEventsForBrowserIPC.NEW_TAB_CREATED, {
      id: tab.id,
      title: tab.getTitle(),
      url: tab.getUrl()
    });

    if(activateNewTab){
      this.activateTab(tab.getId(), true);
    }

    return tab;
  }

  closeTab(id: string, isUserInitiated = true): void {
    this.tabs.get(id)?.getWebContentsViewInstance().removeAllListeners();
    this.tabs.get(id)?.getWebContentsViewInstance().webContents.close();
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

  showOptionsMenuOverlay(): void {
    this.hideCommandKOverlay();
    if(this.browserWindowInstance.contentView.children.indexOf(this.optionsMenuManager.getWebContentsViewInstance()) > -1){
      //already open
      return;
    }
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    this.optionsMenuManager.getWebContentsViewInstance().setBounds(parentBounds);
    this.browserWindowInstance.contentView.addChildView(this.optionsMenuManager.getWebContentsViewInstance());
  }
  hideOptionsMenuOverlay(): void {
    if(this.optionsMenuManager.getWebContentsViewInstance()){
      this.browserWindowInstance.contentView.removeChildView(this.optionsMenuManager.getWebContentsViewInstance());
    }
  }

  showCommandKOverlay(): void { 
    this.hideOptionsMenuOverlay();
    if(this.commandKOverlayManager && this.browserWindowInstance.contentView.children.indexOf(this.commandKOverlayManager.getWebContentsViewInstance()) > -1){
      //already open
      return;
    }
    this.commandKOverlayManager = new CommandKOverlayManager(this.id, this.isPrivate, this.partitionSetting);
    const parentBounds = this.browserWindowInstance.contentView.getBounds();
    this.commandKOverlayManager.getWebContentsViewInstance().setBounds(parentBounds);
    this.browserWindowInstance.contentView.addChildView(this.commandKOverlayManager.getWebContentsViewInstance());
  }
  hideCommandKOverlay(): void {
    if(this.commandKOverlayManager){
      this.browserWindowInstance.contentView.removeChildView(this.commandKOverlayManager.getWebContentsViewInstance());
      this.commandKOverlayManager.getWebContentsViewInstance().webContents.close();
      this.commandKOverlayManager = null;
    }
  }
  
  executeAssignedTaskByBrowserAgent(task: string): void {
    WebLLMInteractionManager.excecuteTaskByBrowserAgent(this, task);
  }
}