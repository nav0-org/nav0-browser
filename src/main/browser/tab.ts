import { app, BrowserWindow, dialog, Menu, MenuItem, WebContentsView } from "electron";
import { InAppUrls, MainToRendererEventsForBrowserIPC, WebContentsEvents } from "../../constants/app-constants";
import { v4 as uuid } from "uuid";
import { AppWindow } from "./app-window";
import { BookmarkManager } from "./bookmark-manager";
import { BookmarkRecord } from "../../types/bookmark-record";
import { BrowsingHistoryManager } from "./browsing-history-manager";
import { DownloadManager } from "./download-manager";
import path from "path";
import { Utils } from "../browser/utils";
import { SearchEngine } from "../web/search-engine";
const domainPattern = /^[^\s]+\.[^\s]+$/;

export class Tab {
  public readonly id: string = uuid();
  private url: string;
  private title: string;
  private faviconUrl: string | null = null;
  private webContentsViewInstance : WebContentsView;
  private partitionSetting: string;
  private preloadScript: string | null = null;
  private parentAppWindow: AppWindow | null = null;
  private bookmark: BookmarkRecord | null = null;

  constructor(parentAppWindow: AppWindow, url: string , partitionSetting: string) {
    this.parentAppWindow = parentAppWindow;
    this.id = uuid();
    this.url = url || '';
    this.title = 'New Tab';
    this.partitionSetting = partitionSetting;
    this.loadURL();
  }

  private async loadURL(url?: string){
    let urlToLoad;
    let preloadScriptToLoad;
    this.url = url ?? this.url;
    this.url = this.url.trim();
    if (this.url.startsWith(InAppUrls.ABOUT)){
      urlToLoad = ABOUT_WEBPACK_ENTRY;
      preloadScriptToLoad = ABOUT_PRELOAD_WEBPACK_ENTRY;
    } else if (this.url.startsWith(InAppUrls.BOOKMARKS)){
      urlToLoad = BOOKMARKS_WEBPACK_ENTRY;
      preloadScriptToLoad = BOOKMARKS_PRELOAD_WEBPACK_ENTRY;
    } else if (this.url.startsWith(InAppUrls.BROWSER_SETTINGS)){
      urlToLoad = BROWSER_SETTINGS_WEBPACK_ENTRY;
      preloadScriptToLoad = BROWSER_SETTINGS_PRELOAD_WEBPACK_ENTRY;
    } else if (this.url.startsWith(InAppUrls.DOWNLOADS)){
      urlToLoad = DOWNLOADS_WEBPACK_ENTRY;
      preloadScriptToLoad = DOWNLOADS_PRELOAD_WEBPACK_ENTRY;
    } else if (this.url.startsWith(InAppUrls.EULA)){
      urlToLoad = EULA_WEBPACK_ENTRY;
      preloadScriptToLoad = EULA_PRELOAD_WEBPACK_ENTRY;
    } else if (this.url.startsWith(InAppUrls.HELP_CENTER)){
      urlToLoad = HELP_CENTER_WEBPACK_ENTRY;
      preloadScriptToLoad = HELP_CENTER_PRELOAD_WEBPACK_ENTRY;
    } else if (this.url.startsWith(InAppUrls.HISTORY)){
      urlToLoad = HISTORY_WEBPACK_ENTRY;
      preloadScriptToLoad = HISTORY_PRELOAD_WEBPACK_ENTRY;
    } else if (this.url.startsWith(InAppUrls.NEW_TAB)){
      urlToLoad = NEW_TAB_WEBPACK_ENTRY;
      preloadScriptToLoad = NEW_TAB_PRELOAD_WEBPACK_ENTRY;
      this.url = '';
    } else if (this.url.startsWith(InAppUrls.PRIVACY_POLICY)){
      urlToLoad = PRIVACY_POLICY_WEBPACK_ENTRY;
      preloadScriptToLoad = PRIVACY_POLICY_PRELOAD_WEBPACK_ENTRY;
    } else if (this.url.startsWith(InAppUrls.REPORT_ISSUE)){
      urlToLoad = REPORT_ISSUE_WEBPACK_ENTRY;
      preloadScriptToLoad = REPORT_ISSUE_PRELOAD_WEBPACK_ENTRY;
    } else if (this.url.startsWith('http://') || this.url.startsWith('https://')) {
      urlToLoad = this.url;
      preloadScriptToLoad = null;
    } else if (domainPattern.test(this.url)) {
      this.url = 'https://' + this.url;
      urlToLoad = this.url;
      preloadScriptToLoad = null;
    } else {
      this.url = await SearchEngine.getSearchUrl(this.url);
      urlToLoad = this.url;
      preloadScriptToLoad = null;
    }
    if(this.preloadScript !== preloadScriptToLoad || !this.webContentsViewInstance){
      this.preloadScript = preloadScriptToLoad;
      this.initWebContentsView();
    }
    if(urlToLoad){
      this.webContentsViewInstance.webContents.loadURL(urlToLoad);
    }
  }

  private async initWebContentsView(){
    if(this.webContentsViewInstance) {
      this.webContentsViewInstance.webContents.close();
    }
    this.webContentsViewInstance = new WebContentsView({
      webPreferences: {
        preload: this.preloadScript,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        additionalArguments: [`--app-window-id=${this.parentAppWindow.id}`, `--is-private=${this.parentAppWindow.isPrivate}`, `--tab-id=${this.id}`],
        allowRunningInsecureContent: false,
        partition: this.partitionSetting
      }
    });
    // this.webContentsViewInstance.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    // this.webContentsViewInstance.webContents.openDevTools({mode : 'detach'});
    if(this.parentAppWindow.getActiveTabId() === this.id){
      this.parentAppWindow.activateTab(this.id);
    }
    this.initEventHandlers();
  }

  private initEventHandlers() {
    //@todo - implement a debouncer for this.
    //for hard navigation
    this.webContentsViewInstance.webContents.on(WebContentsEvents.DID_NAVIGATE, async (event, url: string) => {
      this.handleNavigationCompletion(url);
    });
    //for soft navigation
    this.webContentsViewInstance.webContents.on(WebContentsEvents.DID_NAVIGATE_IN_PAGE, async (event, url: string) => {
      this.handleNavigationCompletion(url);
    });

    this.webContentsViewInstance.webContents.session.on('will-download', async (event, item, webContents) => {
      await this.handleDownload(item);
    });
    this.webContentsViewInstance.webContents.on(WebContentsEvents.PAGE_TITLE_UPDATED, (event, title: string) => {
      this.title = title;
      this.parentAppWindow.getBrowserWindowInstance().webContents.send(MainToRendererEventsForBrowserIPC.TAB_TITLE_UPDATED, {
        id: this.id,
        title: this.title
      });
    });
    // @todo - revisit this.
    this.webContentsViewInstance.webContents.on(WebContentsEvents.PAGE_FAVICON_UPDATED, (event, faviconUrls: string[]) => {
      if(!this.url.startsWith(InAppUrls.PREFIX) && this.url !== '') {
        this.faviconUrl = faviconUrls[faviconUrls.length - 1];
        this.parentAppWindow.getBrowserWindowInstance().webContents.send(MainToRendererEventsForBrowserIPC.TAB_FAVICON_UPDATED, {
          id: this.id,
          faviconUrl: this.faviconUrl
        });
      }
    });
    this.webContentsViewInstance.webContents.on(WebContentsEvents.DID_FAIL_LOAD, (event) => {
      console.error('Failed to load URL:', this.url);
      this.parentAppWindow.getBrowserWindowInstance().webContents.send(MainToRendererEventsForBrowserIPC.NAVIGATION_FAILED, {
        id: this.id,
      });
    });

    this.webContentsViewInstance.webContents.on('context-menu', (event, params) => {
      this.handleContextMenuEvent(this.parentAppWindow, event, params)
    });

    this.webContentsViewInstance.webContents.setWindowOpenHandler(({ url, disposition }) => {
      if (url === 'about:blank') {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            frame: false,
            fullscreenable: false,
            backgroundColor: 'black',
          }
        }
      } else if (disposition === 'foreground-tab' || disposition === 'background-tab'){
        this.parentAppWindow.createTab(url);
      }
      return { action: 'deny' }
    });
  }

  async handleDownload(item: Electron.DownloadItem): Promise<void> {
    const downloadPath = app.getPath('downloads') + '/' + item.getFilename();
    item.setSavePath(downloadPath);
    item.once('done', async (event, state) => {
      if (state === 'completed') {
        await DownloadManager.addRecord(this.parentAppWindow.id, item.getURL(), item.getFilename(), path.extname(item.getFilename()), Utils.getFileType(path.extname(item.getFilename())), item.getTotalBytes(), downloadPath);
      } else {
        console.error(`Download failed: ${state}`);
      }
    });
    console.log('Download started:', downloadPath);
  } 

  async handleNavigationCompletion(url: string): Promise<void> {
    if(!this.url.startsWith(InAppUrls.PREFIX) && this.url !== '') {
      this.url = url;
    }
    let urlObject: URL | null = null;
    try {
      urlObject = new URL(this.url);
    } catch (error) {
      //do nothing
    }
    const foundBookmarkRecord = await BookmarkManager.isBookmark(this.parentAppWindow.id, url);
    this.bookmark = foundBookmarkRecord;
    this.parentAppWindow.getBrowserWindowInstance().webContents.send(MainToRendererEventsForBrowserIPC.TAB_URL_UPDATED, {
      id: this.id,
      url: this.url,
      isBookmark: (this.bookmark? true : false),
      bookmarkId: this.bookmark ? this.bookmark.id : null,
      canGoBack: this.webContentsViewInstance.webContents.navigationHistory.canGoBack(),
      canGoForward: this.webContentsViewInstance.webContents.navigationHistory.canGoForward()
    });

    if(!this.url.startsWith(InAppUrls.PREFIX) && this.url !== '') {
      BrowsingHistoryManager.addRecord(this.parentAppWindow.id, url, this.title, urlObject ? urlObject.hostname: '', urlObject ? `${urlObject.protocol}//${urlObject.hostname}/favicon.ico` : '');
    }
  }

  getId(): string {
    return this.id;
  }

  getUrl(): string {
    return this.url;
  }

  setUrl(url: string): void {
    this.url = url;
  }

  getTitle(): string {
    return this.title;
  }

  setTitle(title: string): void {
    this.title = title;
  }

  async handleFileSelection(extensions: string[]): Promise<string[] | null> {
    const result = await dialog.showOpenDialog({properties: ['openFile', 'multiSelections'], filters: [{ name: 'Files', extensions }]});
    console.log(result);
    if (result.canceled) {
      return null;
    }
    return result.filePaths;
  }

  getWebContentsViewInstance(): WebContentsView {
    return this.webContentsViewInstance;
  }

  navigate(url: string): void {
    this.loadURL(url);
  }

  //for handling right clicks
  handleContextMenuEvent(parentAppWindow: AppWindow, event: any, params: any) {
    const { editFlags, linkURL, srcURL, selectionText, mediaType, isEditable, x, y } = params;
    const template: (Electron.MenuItemConstructorOptions | MenuItem)[] = [];
    
    if (isEditable) { // Handle editable text fields (textarea, input, etc.)
      if (editFlags.canCut) {
        template.push({
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        });
      }      
      // if (editFlags.canCopy) {
      //   template.push({
      //     label: 'Copy',
      //     accelerator: 'CmdOrCtrl+C',
      //     role: 'copy'
      //   });
      // }
      if (editFlags.canPaste) {
        template.push({
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        });
      }
      // if (editFlags.canPaste) {
      //   template.push({
      //     label: 'Paste as Plain Text',
      //     click: () => {
      //       this.webContentsViewInstance.webContents.pa({ plainText: true });
      //     }
      //   });
      // }
      if (editFlags.canDelete) {
        template.push({
          label: 'Delete',
          role: 'delete'
        });
      }
      if (editFlags.canSelectAll) {
        template.push({
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectAll'
        });
      }
      // if (editFlags.canEditRichly) {
      //   template.push(
      //     { type: 'separator' },
      //     { 
      //       label: 'Spelling and Grammar',
      //       submenu: [
      //         { label: 'Check Document', role: 'checkSpelling' },
      //         { type: 'separator' },
      //         { label: 'Check Spelling While Typing', type: 'checkbox', checked: true }
      //       ]
      //     }
      //   );
      // }
    }
    if (linkURL) { //for clicking on hyperlinks
      template.push(
        { label: 'Open link in new tab', click: () => {
          parentAppWindow.createTab(linkURL);
        }},
        { label: 'Open link in new window', click: () => {
          //@todo - implement this
        }},
        { label: 'Copy link address', click: () => {
          this.webContentsViewInstance.webContents.executeJavaScript(`
            navigator.clipboard.writeText("${linkURL}");
          `);
        }},
        { type:  'separator'}
      );
    }
    if (srcURL) { //for clicking on image
      template.push(
        { label: 'Save Image As...', click: async () => {
          this.webContentsViewInstance.webContents.downloadURL(srcURL);
        }},
        { label: 'Copy Image', click: () => {
          this.webContentsViewInstance.webContents.copyImageAt(params.x, params.y);
        }},
        { type:  'separator'}
      );
    } 
    if (selectionText) { //for selected text
      template.push(
        { label: 'Copy', click: () => {
          this.webContentsViewInstance.webContents.copy();
        }},
        { label: 'Search', click: () => {
          this.parentAppWindow.createTab(selectionText, true);
        }}
      );
      template.push(
        { type:  'separator'}
      );
    } 

    
    template.push(
      { label: 'Back', click: () => {
        if (this.webContentsViewInstance.webContents.navigationHistory.canGoBack()) {
          this.webContentsViewInstance.webContents.navigationHistory.goBack();
        }
      }},
      { label: 'Forward', click: () => {
        if (this.webContentsViewInstance.webContents.navigationHistory.canGoForward()) {
          this.webContentsViewInstance.webContents.navigationHistory.goForward();
        }
      }},
      { label: 'Reload', click: () => {
        this.webContentsViewInstance.webContents.reload();
      }},
    );
  
    
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: parentAppWindow.getBrowserWindowInstance()});
  }
}