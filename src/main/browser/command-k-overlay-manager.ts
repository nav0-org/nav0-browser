import { WebContentsView } from "electron";

export class CommandKOverlayManager {
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
        input.dispatchEvent(new Event('input'));
      }
      document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('primary'));
      document.querySelector('.action-btn[data-filter="all"]')?.classList.add('primary');
    })()`).catch(() => {});
  }

  getWebContentsViewInstance(): WebContentsView | null {
    return this.webContentsViewInstance;
  }
}
