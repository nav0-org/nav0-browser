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
  private rendererReady = false;
  private pendingPromptData: PermissionPromptData | null = null;
  private readyHandler: ((event: Electron.IpcMainEvent) => void) | null = null;

  setView(view: WebContentsView | null): void {
    this.webContentsViewInstance = view;
  }

  /**
   * Set up the IPC listener for renderer readiness. Must be called BEFORE
   * the permission-prompt URL is loaded so we don't miss the signal.
   * Returns a promise that resolves once the renderer is ready.
   */
  setupReadyListener(view: WebContentsView): Promise<void> {
    this.webContentsViewInstance = view;
    this.rendererReady = false;
    this.pendingPromptData = null;

    // Clean up any previous handler
    this.teardownReadyListener();

    return new Promise<void>((resolve) => {
      this.readyHandler = (event: Electron.IpcMainEvent) => {
        if (event.sender.id === view.webContents.id) {
          this.rendererReady = true;
          ipcMain.removeListener(RendererToMainEventsForBrowserIPC.PERMISSION_PROMPT_READY, this.readyHandler);
          this.readyHandler = null;
          resolve();
          // Flush any buffered prompt data
          if (this.pendingPromptData) {
            this.sendPrompt(this.pendingPromptData);
            this.pendingPromptData = null;
          }
        }
      };
      ipcMain.on(RendererToMainEventsForBrowserIPC.PERMISSION_PROMPT_READY, this.readyHandler);
    });
  }

  teardownReadyListener(): void {
    if (this.readyHandler) {
      ipcMain.removeListener(RendererToMainEventsForBrowserIPC.PERMISSION_PROMPT_READY, this.readyHandler);
      this.readyHandler = null;
    }
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
