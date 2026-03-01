import { WebContentsView } from "electron";
import { MainToRendererEventsForBrowserIPC } from "../../constants/app-constants";

export interface PermissionPromptData {
  requestId: string;
  origin: string;
  permissions: Array<{ type: string; label: string; icon: string }>;
  isSecure: boolean;
  isPrivate: boolean;
  faviconUrl: string | null;
  isInsecureBlocked: boolean;
  isFloodBlocked: boolean;
}

export class PermissionPromptOverlayManager {
  private webContentsViewInstance: WebContentsView;
  private appWindowId: string;
  private isPrivate: boolean;
  private partitionSetting: string;
  private readyPromise: Promise<void>;

  constructor(appWindowId: string, isPrivate: boolean, partitionSetting: string) {
    this.appWindowId = appWindowId;
    this.isPrivate = isPrivate;
    this.partitionSetting = partitionSetting;
    this.init();
  }

  private init(): void {
    this.webContentsViewInstance = new WebContentsView({
      webPreferences: {
        preload: PERMISSION_PROMPT_PRELOAD_WEBPACK_ENTRY,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        partition: this.partitionSetting,
        additionalArguments: [`--app-window-id=${this.appWindowId}`, `--is-private=${this.isPrivate}`],
        transparent: true,
      }
    });

    this.readyPromise = new Promise<void>((resolve) => {
      this.webContentsViewInstance.webContents.once('did-finish-load', () => resolve());
    });

    this.webContentsViewInstance.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' as const };
    });

    this.webContentsViewInstance.webContents.loadURL(PERMISSION_PROMPT_WEBPACK_ENTRY);
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  showPrompt(data: PermissionPromptData): void {
    this.webContentsViewInstance.webContents.send(
      MainToRendererEventsForBrowserIPC.SHOW_PERMISSION_PROMPT,
      data
    );
  }

  getWebContentsViewInstance(): WebContentsView {
    return this.webContentsViewInstance;
  }
}
