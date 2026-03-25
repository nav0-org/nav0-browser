import { ipcMain, WebContents } from "electron";
import { MainToRendererEventsForBrowserIPC, RendererToMainEventsForBrowserIPC } from "../../../constants/app-constants";
import { OverlayHandler } from "./overlay-handler";

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

export class PermissionPromptHandler implements OverlayHandler {
  private rendererReady = false;
  private pendingPromptData: PermissionPromptData | null = null;
  private webContentsId: number | null = null;

  setupReadyListener(webContents: WebContents): void {
    this.webContentsId = webContents.id;
    const handler = (event: Electron.IpcMainEvent) => {
      if (event.sender.id === this.webContentsId) {
        this.rendererReady = true;
        ipcMain.removeListener(RendererToMainEventsForBrowserIPC.OVERLAY_RENDERER_READY, handler);
        if (this.pendingPromptData) {
          this.sendPrompt(webContents, this.pendingPromptData);
          this.pendingPromptData = null;
        }
      }
    };
    ipcMain.on(RendererToMainEventsForBrowserIPC.OVERLAY_RENDERER_READY, handler);
  }

  onShow(webContents: WebContents, data?: PermissionPromptData): void {
    if (data) {
      this.showPrompt(webContents, data);
    }
  }

  onHide(webContents: WebContents): void {
    webContents.send(MainToRendererEventsForBrowserIPC.HIDE_OVERLAY_PANEL, { type: 'permission-prompt' });
  }

  showPrompt(webContents: WebContents, data: PermissionPromptData): void {
    if (this.rendererReady) {
      this.sendPrompt(webContents, data);
    } else {
      this.pendingPromptData = data;
    }
  }

  private sendPrompt(webContents: WebContents, data: PermissionPromptData): void {
    webContents.send(MainToRendererEventsForBrowserIPC.SHOW_PERMISSION_PROMPT, data);
    webContents.send(MainToRendererEventsForBrowserIPC.SHOW_OVERLAY_PANEL, { type: 'permission-prompt' });
  }
}
