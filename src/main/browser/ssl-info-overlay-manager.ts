import { WebContentsView } from "electron";

export class SSLInfoOverlayManager {
  private webContentsViewInstance: WebContentsView | null = null;
  private onDismiss: (() => void) | null = null;
  private blurHandler: (() => void) | null = null;
  private inputHandler: ((event: Electron.Event, input: Electron.Input) => void) | null = null;

  setView(view: WebContentsView | null): void {
    this.webContentsViewInstance = view;
  }

  setOnDismiss(callback: () => void): void {
    this.onDismiss = callback;
  }

  /** Attach blur / Escape listeners to the shared view. */
  setupListeners(): void {
    if (!this.webContentsViewInstance) return;

    this.blurHandler = () => {
      if (this.onDismiss) this.onDismiss();
    };
    this.inputHandler = (_event: Electron.Event, input: Electron.Input) => {
      if (input.key === 'Escape' && input.type === 'keyDown') {
        if (this.onDismiss) this.onDismiss();
      }
    };

    this.webContentsViewInstance.webContents.on('blur', this.blurHandler);
    this.webContentsViewInstance.webContents.on('before-input-event', this.inputHandler);
  }

  /** Remove blur / Escape listeners so they don't fire on other overlays. */
  teardownListeners(): void {
    if (!this.webContentsViewInstance) return;
    if (this.blurHandler) {
      this.webContentsViewInstance.webContents.removeListener('blur', this.blurHandler);
      this.blurHandler = null;
    }
    if (this.inputHandler) {
      this.webContentsViewInstance.webContents.removeListener('before-input-event', this.inputHandler);
      this.inputHandler = null;
    }
  }

  getWebContentsViewInstance(): WebContentsView | null {
    return this.webContentsViewInstance;
  }

  showInfo(data: { sslStatus: string; sslDetails: any; url: string }): void {
    if (!this.webContentsViewInstance) return;
    const serialized = JSON.stringify(data);
    this.webContentsViewInstance.webContents.focus();
    this.webContentsViewInstance.webContents.executeJavaScript(`(() => {
      if (typeof window.showSSLInfo === 'function') {
        window.showSSLInfo(${serialized});
      }
    })()`).catch(() => {});
  }

  async getContentHeight(): Promise<number> {
    if (!this.webContentsViewInstance) return 200;
    try {
      const height = await this.webContentsViewInstance.webContents.executeJavaScript(
        `document.getElementById('ssl-info-panel').scrollHeight`
      );
      return height as number;
    } catch {
      return 200;
    }
  }
}
