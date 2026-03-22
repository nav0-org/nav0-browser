import { WebContentsView } from "electron";

export class CommandOOverlayManager {
  private webContentsViewInstance: WebContentsView | null = null;

  setView(view: WebContentsView | null): void {
    this.webContentsViewInstance = view;
  }

  resetState(): void {
    if (!this.webContentsViewInstance) return;
    this.webContentsViewInstance.webContents.executeJavaScript(`(() => {
      const input = document.getElementById('search-input');
      if (input) {
        input.value = '';
        input.focus();
      }
      if (typeof window.__commandOReloadTabs === 'function') {
        window.__commandOReloadTabs();
      }
    })()`).catch(() => {});
  }

  getWebContentsViewInstance(): WebContentsView | null {
    return this.webContentsViewInstance;
  }
}
