import { WebContentsView } from "electron";

export class CommandKOverlayManager {
  private webContentsViewInstance : WebContentsView;
  private appWindowId: string;
  private isPrivate: boolean;
  private partitionSetting: string;

  constructor(appWindowId: string, isPrivate: boolean, partitionSetting: string) {
    this.appWindowId = appWindowId;
    this.isPrivate = isPrivate;
    this.partitionSetting = partitionSetting;
    this.init();
  }

  private async init(){
    this.webContentsViewInstance = new WebContentsView({
      webPreferences: {
        preload: COMMAND_K_PRELOAD_WEBPACK_ENTRY,
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
    // this.webContentsViewInstance.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    this.webContentsViewInstance.webContents.loadURL(COMMAND_K_WEBPACK_ENTRY);

    this.webContentsViewInstance.webContents.setWindowOpenHandler(({ url }) => {
      return { action: 'deny' };
    });

    // this.webContentsViewInstance.webContents.openDevTools({ mode: 'detach' });
  }

  getWebContentsViewInstance(): WebContentsView {
    return this.webContentsViewInstance;
  }
}