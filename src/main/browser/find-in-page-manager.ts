import { BrowserWindow } from 'electron';
import { MainToRendererEventsForBrowserIPC } from '../../constants/app-constants';

export class FindInPageManager {
  private appWindowId: string;
  private lastSearchText: string = '';
  private currentTabWebContents: Electron.WebContents | null = null;
  private browserWindowWebContents: Electron.WebContents | null = null;
  private foundInPageHandler:
    | ((event: Electron.Event, result: Electron.FoundInPageResult) => void)
    | null = null;
  private _isVisible = false;

  constructor(appWindowId: string) {
    this.appWindowId = appWindowId;
  }

  setBrowserWindow(browserWindow: BrowserWindow): void {
    this.browserWindowWebContents = browserWindow.webContents;
  }

  get isVisible(): boolean {
    return this._isVisible;
  }

  show(searchText?: string): void {
    this._isVisible = true;
    this.browserWindowWebContents?.send(MainToRendererEventsForBrowserIPC.SHOW_FIND_IN_PAGE_BAR, {
      searchText,
    });
  }

  hide(): void {
    this._isVisible = false;
    this.stopFind();
    this.browserWindowWebContents?.send(MainToRendererEventsForBrowserIPC.HIDE_FIND_IN_PAGE_BAR);
  }

  setActiveTabWebContents(webContents: Electron.WebContents | null): void {
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
      this.browserWindowWebContents?.send(MainToRendererEventsForBrowserIPC.FIND_IN_PAGE_RESULT, {
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

  getLastSearchText(): string {
    return this.lastSearchText;
  }
}
