import { WebContents } from "electron";
import { MainToRendererEventsForBrowserIPC } from "../../../constants/app-constants";
import { OverlayHandler } from "./overlay-handler";

export class SSLInfoHandler implements OverlayHandler {
  private onDismiss: (() => void) | null = null;
  private _isVisible = false;

  setOnDismiss(callback: () => void): void {
    this.onDismiss = callback;
  }

  setupListeners(webContents: WebContents): void {
    // Close on Escape key — only when ssl-info is the active overlay
    webContents.on('before-input-event', (_event, input) => {
      if (this._isVisible && input.key === 'Escape' && input.type === 'keyDown') {
        if (this.onDismiss) this.onDismiss();
      }
    });

    // Dismiss on blur (user clicked outside the overlay view)
    webContents.on('blur', () => {
      if (this._isVisible && this.onDismiss) {
        this.onDismiss();
      }
    });
  }

  onShow(webContents: WebContents, data?: { sslStatus: string; sslDetails: any; url: string }): void {
    if (data) {
      this._isVisible = true;
      webContents.send(MainToRendererEventsForBrowserIPC.SHOW_OVERLAY_PANEL, { type: 'ssl-info', data });
      webContents.focus();
    }
  }

  onHide(webContents: WebContents): void {
    this._isVisible = false;
    webContents.send(MainToRendererEventsForBrowserIPC.HIDE_OVERLAY_PANEL, { type: 'ssl-info' });
  }

  async getContentHeight(webContents: WebContents): Promise<number> {
    try {
      const height = await webContents.executeJavaScript(
        `document.querySelector('#overlay-ssl-info .ssl-info-panel')?.scrollHeight || 200`
      );
      return height as number;
    } catch {
      return 200;
    }
  }
}
