import { createIcons, icons } from 'lucide';
import TabTemplate from './tab.html';
import { ImageBase64Strings, InAppUrls } from '../../constants/app-constants';

// A tab with no favicon (or one that fails to load) keeps an empty 16 px slot:
// never a broken-image glyph or a placeholder box. A 1 × 1 transparent GIF
// fills the <img> so it stays blank.
const EMPTY_FAVICON =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Built-in pages (nav0://…, and the New Tab page, whose URL is '') show the
// Nav0 compass: they never report a favicon of their own.
const isBuiltInUrl = (url: string): boolean => url === '' || url.startsWith(InAppUrls.PREFIX);

export class Tab {
  public id: string;
  public url: string;
  public title: string;
  public faviconUrl: string | null = null;
  private tabElement: HTMLElement | null = null;
  public canGoBack = false;
  public canGoForward = false;
  public isLoading = false;
  public isBookmark = false;
  public bookmarkId: string | null = null;
  public bookmarkType: 'reference' | 'queue' | null = null;
  public isReaderModeEligible = false;
  public isReaderModeActive = false;
  public isPinned = false;
  // The last load failed (the error page is showing). Set after the failure's
  // own handleUrlChange(); cleared by the next one.
  public loadFailed = false;
  public sslStatus: 'secure' | 'insecure' | 'internal' = 'internal';
  public sslDetails: {
    issuer: string;
    validFrom: string;
    validTo: string;
    subjectName: string;
  } | null = null;

  constructor(id: string, url: string, title?: string) {
    this.id = id;
    this.url = url;
    this.title = title ?? 'New Tab';
  }

  createTabElement(appWindowId: string): void {
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = TabTemplate;

    // Get the tab element
    this.tabElement = tempContainer.firstElementChild as HTMLElement;
    this.tabElement.dataset.tabId = this.id;

    // Set the title
    const titleSpan = this.tabElement.querySelector('#tab-title');
    if (titleSpan) {
      titleSpan.textContent = this.title || 'New Tab';
    }
    this.tabElement.title = this.title || 'New Tab';

    // Add close button event listener
    const closeButton = this.tabElement.querySelector('#tab-close-button') as HTMLElement | null;
    if (closeButton) {
      const isMac = window.BrowserAPI.platform === 'darwin';
      closeButton.title = `Close tab (${isMac ? '⌘W' : 'Ctrl+W'})`;
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        window.BrowserAPI.closeTab(appWindowId, this.id, true);
      });
    }

    // Add click event to activate tab
    this.tabElement.addEventListener('click', () => {
      window.BrowserAPI.activateTab(appWindowId, this.id, true);
    });

    // Add right-click context menu
    this.tabElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.BrowserAPI.showTabContextMenu(appWindowId, this.id, this.isPinned);
    });

    // Set default favicon so the <img> never shows a broken image icon
    const faviconElement = this.tabElement.querySelector('.tab-favicon') as HTMLImageElement;
    if (faviconElement) {
      faviconElement.src = EMPTY_FAVICON;
    }
    if (isBuiltInUrl(this.url)) {
      this.updateTabFavicon(ImageBase64Strings.FAVICON);
    }

    setTimeout(() => {
      createIcons({ icons });
    }, 10);
  }

  updateTabTitle(title: string): void {
    this.title = title;
    if (this.tabElement) {
      const titleSpan = this.tabElement.querySelector('#tab-title');
      if (titleSpan) {
        titleSpan.textContent = title || 'New Tab';
      }
      this.tabElement.title = title || 'New Tab';
    }
  }

  handleUrlChange(
    url: string,
    isBookmark: boolean,
    bookmarkId: string | null,
    bookmarkType: 'reference' | 'queue' | null,
    canGoBack: boolean,
    canGoForward: boolean
  ): void {
    const wasBuiltIn = isBuiltInUrl(this.url);
    this.url = url;
    this.loadFailed = false;
    this.isBookmark = isBookmark;
    this.bookmarkId = bookmarkId;
    this.bookmarkType = bookmarkType;
    this.canGoBack = canGoBack;
    this.canGoForward = canGoForward;
    if (isBuiltInUrl(this.url)) {
      this.updateTabFavicon(ImageBase64Strings.FAVICON);
    } else if (wasBuiltIn) {
      // Leaving a built-in page: drop the compass until the site reports its
      // own favicon, so a site without one isn't shown (or bookmarked) with it.
      this.clearFavicon();
    }
  }

  // Back to the empty slot, with no favicon to bookmark: for a page that hasn't
  // reported one yet, or an error page, which never does. A built-in page
  // keeps the compass.
  clearFavicon(): void {
    if (isBuiltInUrl(this.url)) {
      this.updateTabFavicon(ImageBase64Strings.FAVICON);
      return;
    }
    this.faviconUrl = null;
    this.setFaviconSource(EMPTY_FAVICON);
  }

  setLoading(isLoading: boolean): void {
    this.isLoading = isLoading;
    if (this.tabElement) {
      const faviconElement = this.tabElement.querySelector('.tab-favicon') as HTMLElement;
      const loaderElement = this.tabElement.querySelector('.tab-loader') as HTMLElement;
      if (faviconElement && loaderElement) {
        if (isLoading) {
          faviconElement.style.display = 'none';
          loaderElement.style.display = 'block';
        } else {
          faviconElement.style.display = '';
          loaderElement.style.display = 'none';
        }
      }
    }
  }

  updateTabFavicon(faviconUrl: string): void {
    // A site's favicon can arrive after the tab has moved on to a built-in
    // page; the compass wins there.
    if (isBuiltInUrl(this.url)) {
      this.faviconUrl = ImageBase64Strings.FAVICON;
    } else {
      this.faviconUrl = faviconUrl;
    }
    this.setFaviconSource(this.faviconUrl);
  }

  private setFaviconSource(source: string): void {
    if (this.tabElement) {
      const faviconElement = this.tabElement.querySelector('.tab-favicon') as HTMLImageElement;
      if (faviconElement) {
        faviconElement.onerror = () => {
          faviconElement.onerror = null;
          faviconElement.src = EMPTY_FAVICON;
        };
        faviconElement.src = source;
      }
    }
  }

  activateTab(): void {
    if (this.tabElement) {
      this.tabElement.classList.add('active');
    }
  }
  deactivateTab(): void {
    if (this.tabElement) {
      this.tabElement.classList.remove('active');
    }
  }

  pinTab(): void {
    this.isPinned = true;
    if (this.tabElement) {
      this.tabElement.classList.add('pinned');
      const titleSpan = this.tabElement.querySelector('#tab-title') as HTMLElement;
      if (titleSpan) titleSpan.style.display = 'none';
      const closeButton = this.tabElement.querySelector('#tab-close-button') as HTMLElement;
      if (closeButton) closeButton.style.display = 'none';
    }
  }

  unpinTab(): void {
    this.isPinned = false;
    if (this.tabElement) {
      this.tabElement.classList.remove('pinned');
      const titleSpan = this.tabElement.querySelector('#tab-title') as HTMLElement;
      if (titleSpan) titleSpan.style.display = '';
      const closeButton = this.tabElement.querySelector('#tab-close-button') as HTMLElement;
      if (closeButton) closeButton.style.display = '';
    }
  }

  public getTabElement(): HTMLElement | null {
    return this.tabElement;
  }
}
