import { WebContentsView } from "electron";

export class CommandOOverlayManager {
  private webContentsViewInstance : WebContentsView;
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

  private init(){
    this.webContentsViewInstance = new WebContentsView({
      webPreferences: {
        preload: COMMAND_O_PRELOAD_WEBPACK_ENTRY,
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

    this.webContentsViewInstance.webContents.loadURL(COMMAND_O_WEBPACK_ENTRY);

    this.webContentsViewInstance.webContents.setWindowOpenHandler(({ url }) => {
      return { action: 'deny' };
    });

    // this.webContentsViewInstance.webContents.openDevTools({ mode: 'detach' });
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  resetState(): void {
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

  getWebContentsViewInstance(): WebContentsView {
    return this.webContentsViewInstance;
  }
}
