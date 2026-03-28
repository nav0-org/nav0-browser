import { WebContents } from "electron";

export interface OverlayHandler {
  onShow(webContents: WebContents, data?: any): void;
  onHide(webContents: WebContents): void;
  onReady?(webContents: WebContents): void;
  onBlur?(): void;
  onEscapeKey?(): void;
}
