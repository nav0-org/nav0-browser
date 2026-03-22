import { WebContentsView } from "electron";
import { MainToRendererEventsForBrowserIPC } from "../../constants/app-constants";

export class FindInPageManager {
  private webContentsViewInstance: WebContentsView | null = null;
  private lastSearchText: string = '';
  private currentTabWebContents: Electron.WebContents | null = null;
  private foundInPageHandler: ((event: Electron.Event, result: Electron.FoundInPageResult) => void) | null = null;

  setView(view: WebContentsView | null): void {
    this.webContentsViewInstance = view;
  }

  getWebContentsViewInstance(): WebContentsView | null {
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
      if (!this.webContentsViewInstance) return;
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
    if (!this.webContentsViewInstance) return;
    this.webContentsViewInstance.webContents.executeJavaScript(`(() => {
      if (typeof window.resetFindBar === 'function') {
        window.resetFindBar();
      }
    })()`).catch(() => {});
  }

  focusInput(): void {
    if (!this.webContentsViewInstance) return;
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
}
