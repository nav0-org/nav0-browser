import { WebContentsView } from "electron";

export class SSLInfoOverlayManager {
  private webContentsViewInstance: WebContentsView | null = null;
  private appWindowId: string;
  private isPrivate: boolean;
  private partitionSetting: string;
  private readyPromise: Promise<void> | null = null;
  private onDismiss: (() => void) | null = null;
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

  private init() {
    this.webContentsViewInstance = new WebContentsView({
      webPreferences: {
        preload: SSL_INFO_PRELOAD_WEBPACK_ENTRY,
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

    this.readyPromise = new Promise<void>((resolve) => {
      this.webContentsViewInstance.webContents.once('did-finish-load', () => resolve());
    });

    this.webContentsViewInstance.webContents.loadURL(SSL_INFO_WEBPACK_ENTRY);

    this.webContentsViewInstance.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });

    // Close when user clicks outside (focus moves away from overlay)
    this.webContentsViewInstance.webContents.on('blur', () => {
      if (this.onDismiss) this.onDismiss();
    });

    // Close on Escape key
    this.webContentsViewInstance.webContents.on('before-input-event', (_event, input) => {
      if (input.key === 'Escape' && input.type === 'keyDown') {
        if (this.onDismiss) this.onDismiss();
      }
    });
  }

  setOnDismiss(callback: () => void): void {
    this.onDismiss = callback;
  }

  whenReady(): Promise<void> {
    this.ensureInitialized();
    return this.readyPromise;
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
