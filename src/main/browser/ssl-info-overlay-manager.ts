import { WebContentsView } from "electron";

export class SSLInfoOverlayManager {
  private webContentsViewInstance: WebContentsView;
  private appWindowId: string;
  private isPrivate: boolean;
  private partitionSetting: string;
  private readyPromise: Promise<void>;

  constructor(appWindowId: string, isPrivate: boolean, partitionSetting: string) {
    this.appWindowId = appWindowId;
    this.isPrivate = isPrivate;
    this.partitionSetting = partitionSetting;
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
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  getWebContentsViewInstance(): WebContentsView {
    return this.webContentsViewInstance;
  }

  showInfo(data: { sslStatus: string; sslDetails: any; url: string }): void {
    const serialized = JSON.stringify(data);
    this.webContentsViewInstance.webContents.executeJavaScript(`(() => {
      if (typeof window.showSSLInfo === 'function') {
        window.showSSLInfo(${serialized});
      }
    })()`).catch(() => {});
  }
}
