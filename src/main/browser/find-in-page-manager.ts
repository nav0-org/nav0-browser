import { WebContentsView } from "electron";
import { MainToRendererEventsForBrowserIPC } from "../../constants/app-constants";

export class FindInPageManager {
  private webContentsViewInstance: WebContentsView;
  private appWindowId: string;
  private isPrivate: boolean;
  private partitionSetting: string;
  private readyPromise: Promise<void>;
  private lastSearchText: string = '';
  private lastMatchCase: boolean = false;
  private currentTabWebContents: Electron.WebContents | null = null;
  private foundInPageHandler: ((event: Electron.Event, result: Electron.FoundInPageResult) => void) | null = null;

  constructor(appWindowId: string, isPrivate: boolean, partitionSetting: string) {
    this.appWindowId = appWindowId;
    this.isPrivate = isPrivate;
    this.partitionSetting = partitionSetting;
    this.init();
  }

  private init() {
    this.webContentsViewInstance = new WebContentsView({
      webPreferences: {
        preload: FIND_IN_PAGE_PRELOAD_WEBPACK_ENTRY,
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

    this.webContentsViewInstance.webContents.loadURL(FIND_IN_PAGE_WEBPACK_ENTRY);

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

  setActiveTabWebContents(webContents: Electron.WebContents | null): void {
    // Skip if already attached to the same webContents
    if (this.currentTabWebContents === webContents && this.foundInPageHandler) return;
    this.detachFoundInPageListener();
    this.currentTabWebContents = webContents;
    if (webContents) {
      this.attachFoundInPageListener();
    }
  }

  private attachFoundInPageListener(): void {
    if (!this.currentTabWebContents) return;
    this.foundInPageHandler = (_event: Electron.Event, result: Electron.FoundInPageResult) => {
      this.webContentsViewInstance.webContents.send(MainToRendererEventsForBrowserIPC.FIND_IN_PAGE_RESULT, {
        activeMatchOrdinal: result.activeMatchOrdinal,
        matches: result.matches,
        finalUpdate: result.finalUpdate,
      });
    };
    this.currentTabWebContents.on('found-in-page', this.foundInPageHandler);
  }

  private detachFoundInPageListener(): void {
    if (this.currentTabWebContents && this.foundInPageHandler) {
      this.currentTabWebContents.removeListener('found-in-page', this.foundInPageHandler);
      this.foundInPageHandler = null;
    }
  }

  find(text: string, options?: { matchCase?: boolean; forward?: boolean }): void {
    if (!this.currentTabWebContents || !text) return;
    this.lastSearchText = text;
    this.lastMatchCase = options?.matchCase || false;
    this.currentTabWebContents.findInPage(text, {
      forward: options?.forward !== false,
      matchCase: options?.matchCase || false,
    });
  }

  findNext(text: string, options?: { matchCase?: boolean }): void {
    if (!this.currentTabWebContents || !text) return;
    this.lastSearchText = text;
    this.currentTabWebContents.findInPage(text, {
      forward: true,
      findNext: true,
      matchCase: options?.matchCase || false,
    });
  }

  findPrevious(text: string, options?: { matchCase?: boolean }): void {
    if (!this.currentTabWebContents || !text) return;
    this.lastSearchText = text;
    this.currentTabWebContents.findInPage(text, {
      forward: false,
      findNext: true,
      matchCase: options?.matchCase || false,
    });
  }

  clearHighlights(): void {
    if (this.currentTabWebContents) {
      this.currentTabWebContents.stopFindInPage('clearSelection');
    }
    this.lastSearchText = '';
  }

  stopFind(): void {
    this.clearHighlights();
    this.detachFoundInPageListener();
    this.currentTabWebContents = null;
  }

  resetState(): void {
    this.webContentsViewInstance.webContents.executeJavaScript(`(() => {
      if (typeof window.resetFindBar === 'function') {
        window.resetFindBar();
      }
    })()`).catch(() => {});
  }

  focusInput(): void {
    this.webContentsViewInstance.webContents.focus();
    this.webContentsViewInstance.webContents.executeJavaScript(`(() => {
      if (typeof window.focusFindInput === 'function') {
        window.focusFindInput();
      }
    })()`).catch(() => {});
  }

  getLastSearchText(): string {
    return this.lastSearchText;
  }

  replaySearchOnActiveTab(): void {
    if (this.lastSearchText) {
      this.find(this.lastSearchText, { matchCase: this.lastMatchCase });
    }
  }
}
