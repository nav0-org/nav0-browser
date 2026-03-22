import { WebContentsView } from "electron";

export class IssueReportOverlayManager {
  private webContentsViewInstance: WebContentsView | null = null;

  setView(view: WebContentsView | null): void {
    this.webContentsViewInstance = view;
  }

  getWebContentsViewInstance(): WebContentsView | null {
    return this.webContentsViewInstance;
  }
}
