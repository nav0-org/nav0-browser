import { ipcMain, WebContentsView } from "electron";
import { MainToRendererEventsForBrowserIPC, RendererToMainEventsForBrowserIPC } from "../../constants/app-constants";

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
  private webContentsViewInstance: WebContentsView | null = null;
  private appWindowId: string;
  private isPrivate: boolean;
  private partitionSetting: string;
  private readyPromise: Promise<void> | null = null;
  private pendingPromptData: PermissionPromptData | null = null;
  private rendererReady = false;
  private initialized = false;

  constructor(appWindowId: string, isPrivate: boolean, partitionSetting: string) {
    this.appWindowId = appWindowId;
    this.isPrivate = isPrivate;
    this.partitionSetting = partitionSetting;
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
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

    // Wait for the renderer to signal that its IPC listeners are registered,
    // rather than relying on did-finish-load which may fire before the
    // webpack bundle has finished executing.
    this.readyPromise = new Promise<void>((resolve) => {
      const handler = (event: Electron.IpcMainEvent) => {
        if (event.sender.id === this.webContentsViewInstance.webContents.id) {
          this.rendererReady = true;
          ipcMain.removeListener(RendererToMainEventsForBrowserIPC.PERMISSION_PROMPT_READY, handler);
          resolve();
          // Flush any buffered prompt data
          if (this.pendingPromptData) {
            this.sendPrompt(this.pendingPromptData);
            this.pendingPromptData = null;
          }
        }
      };
      ipcMain.on(RendererToMainEventsForBrowserIPC.PERMISSION_PROMPT_READY, handler);
    });

    this.webContentsViewInstance.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' as const };
    });

    this.webContentsViewInstance.webContents.loadURL(PERMISSION_PROMPT_WEBPACK_ENTRY);
  }

  whenReady(): Promise<void> {
    this.ensureInitialized();
    return this.readyPromise;
  }

  showPrompt(data: PermissionPromptData): void {
    if (this.rendererReady) {
      this.sendPrompt(data);
    } else {
      // Buffer until the renderer signals ready
      this.pendingPromptData = data;
    }
  }

  private sendPrompt(data: PermissionPromptData): void {
    if (!this.webContentsViewInstance) return;
    this.webContentsViewInstance.webContents.send(
      MainToRendererEventsForBrowserIPC.SHOW_PERMISSION_PROMPT,
      data
    );
  }

  getWebContentsViewInstance(): WebContentsView | null {
    return this.webContentsViewInstance;
  }
}
