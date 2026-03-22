import { WebContentsView } from "electron";

export class OptionsMenuManager {
  private webContentsViewInstance: WebContentsView | null = null;

  setView(view: WebContentsView | null): void {
    this.webContentsViewInstance = view;
  }

  getWebContentsViewInstance(): WebContentsView | null {
    return this.webContentsViewInstance;
  }
}
