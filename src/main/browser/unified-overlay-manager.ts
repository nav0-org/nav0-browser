import { WebContentsView } from "electron";
import { OverlayHandler } from "./overlay-handlers/overlay-handler";
import { CommandKHandler } from "./overlay-handlers/command-k-handler";
import { CommandOHandler } from "./overlay-handlers/command-o-handler";
import { OptionsMenuHandler } from "./overlay-handlers/options-menu-handler";
import { PermissionPromptHandler, PermissionPromptData } from "./overlay-handlers/permission-prompt-handler";
import { IssueReportHandler } from "./overlay-handlers/issue-report-handler";
import { SSLInfoHandler } from "./overlay-handlers/ssl-info-handler";

export type OverlayType = 'command-k' | 'command-o' | 'options-menu' | 'permission-prompt' | 'issue-report' | 'ssl-info';

export class UnifiedOverlayManager {
  private webContentsViewInstance: WebContentsView;
  private visibleOverlays: Set<OverlayType> = new Set();
  private handlers: Map<OverlayType, OverlayHandler> = new Map();
  private readyPromise: Promise<void>;
  private permissionPromptHandler: PermissionPromptHandler;
  private sslInfoHandler: SSLInfoHandler;

  constructor(appWindowId: string, isPrivate: boolean, partitionSetting: string) {
    this.webContentsViewInstance = new WebContentsView({
      webPreferences: {
        preload: OVERLAY_PRELOAD_WEBPACK_ENTRY,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        partition: partitionSetting,
        additionalArguments: [`--app-window-id=${appWindowId}`, `--is-private=${isPrivate}`],
        transparent: true,
      }
    });

    // Set up handlers
    this.handlers.set('command-k', new CommandKHandler());
    this.handlers.set('command-o', new CommandOHandler());
    this.handlers.set('options-menu', new OptionsMenuHandler());

    this.permissionPromptHandler = new PermissionPromptHandler();
    this.handlers.set('permission-prompt', this.permissionPromptHandler);

    this.handlers.set('issue-report', new IssueReportHandler());

    this.sslInfoHandler = new SSLInfoHandler();
    this.handlers.set('ssl-info', this.sslInfoHandler);

    // Set up permission prompt ready listener
    this.permissionPromptHandler.setupReadyListener(this.webContentsViewInstance.webContents);

    // Set up SSL info listeners
    this.sslInfoHandler.setupListeners(this.webContentsViewInstance.webContents);

    this.readyPromise = new Promise<void>((resolve) => {
      this.webContentsViewInstance.webContents.once('did-finish-load', () => resolve());
    });

    this.webContentsViewInstance.webContents.loadURL(OVERLAY_WEBPACK_ENTRY);

    this.webContentsViewInstance.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' as const };
    });

    // this.webContentsViewInstance.webContents.openDevTools({ mode: 'detach' });
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  getWebContentsViewInstance(): WebContentsView {
    return this.webContentsViewInstance;
  }

  showOverlay(type: OverlayType, data?: any): void {
    this.visibleOverlays.add(type);
    const handler = this.handlers.get(type);
    if (handler) {
      handler.onShow(this.webContentsViewInstance.webContents, data);
    }
  }

  hideOverlay(type: OverlayType): void {
    if (!this.visibleOverlays.has(type)) return;
    this.visibleOverlays.delete(type);
    const handler = this.handlers.get(type);
    if (handler) {
      handler.onHide(this.webContentsViewInstance.webContents);
    }
  }

  isVisible(type: OverlayType): boolean {
    return this.visibleOverlays.has(type);
  }

  hasAnyVisible(): boolean {
    return this.visibleOverlays.size > 0;
  }

  // Permission prompt specific
  showPermissionPrompt(data: PermissionPromptData): void {
    this.visibleOverlays.add('permission-prompt');
    this.permissionPromptHandler.showPrompt(this.webContentsViewInstance.webContents, data);
  }

  // SSL info specific
  setSSLInfoOnDismiss(callback: () => void): void {
    this.sslInfoHandler.setOnDismiss(callback);
  }

  async getSSLContentHeight(): Promise<number> {
    return this.sslInfoHandler.getContentHeight(this.webContentsViewInstance.webContents);
  }
}
