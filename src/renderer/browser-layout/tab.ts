import { createIcons, icons } from 'lucide';
import TabTemplate from './tab.html';
import { ImageBase64Strings, InAppUrls } from '../../constants/app-constants';
import { FaviconTile } from '../common/favicon-tile';

// Built-in pages (nav0://…, and the New Tab page, whose URL is '') show the
// Nav0 compass: they never report a favicon of their own.
const isBuiltInUrl = (url: string): boolean => url === '' || url.startsWith(InAppUrls.PREFIX);

export class Tab {
  public id: string;
  public url: string;
  public title: string;
  public faviconUrl: string | null = null;
  private tabElement: HTMLElement | null = null;
  // A tab with no favicon, or one that fails to load, shows the favicon
  // fallback tile (DESIGN.md §5.3): never a broken-image glyph or a blank slot.
  private showFaviconTile = true;
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

    // The tile until the tab has a favicon to show.
    if (isBuiltInUrl(this.url)) {
      this.updateTabFavicon(ImageBase64Strings.FAVICON);
    } else {
      this.setFaviconSource(null);
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
    // The tile's letter follows the page's host.
    this.syncFaviconSlot();
  }

  // Back to the tile, with no favicon to bookmark: for a page that hasn't
  // reported one yet, or an error page, which never does. A built-in page
  // keeps the compass.
  clearFavicon(): void {
    if (isBuiltInUrl(this.url)) {
      this.updateTabFavicon(ImageBase64Strings.FAVICON);
      return;
    }
    this.faviconUrl = null;
    this.setFaviconSource(null);
  }

  setLoading(isLoading: boolean): void {
    this.isLoading = isLoading;
    if (this.tabElement) {
      const loaderElement = this.tabElement.querySelector('.tab-loader') as HTMLElement;
      if (loaderElement) {
        loaderElement.hidden = !isLoading;
      }
      this.syncFaviconSlot();
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

  // The favicon takes the tile's place once it has loaded; with none, or if it
  // fails to load, the tile shows.
  private setFaviconSource(source: string | null): void {
    const faviconElement = this.tabElement?.querySelector('.tab-favicon') as HTMLImageElement;
    if (!faviconElement) return;
    if (source) {
      faviconElement.onload = () => {
        this.showFaviconTile = false;
        this.syncFaviconSlot();
      };
      faviconElement.onerror = () => {
        this.showFaviconTile = true;
        this.syncFaviconSlot();
      };
      faviconElement.src = source;
    } else {
      faviconElement.onload = null;
      faviconElement.onerror = null;
      faviconElement.removeAttribute('src');
      this.showFaviconTile = true;
    }
    this.syncFaviconSlot();
  }

  // Shows the favicon or the tile, and neither while the loader spins.
  private syncFaviconSlot(): void {
    if (!this.tabElement) return;
    const faviconElement = this.tabElement.querySelector('.tab-favicon') as HTMLElement;
    const tile = this.tabElement.querySelector('.tab-favicon-tile') as HTMLElement;
    if (faviconElement) faviconElement.hidden = this.isLoading || this.showFaviconTile;
    if (tile) {
      tile.textContent = FaviconTile.letter(this.url);
      tile.hidden = this.isLoading || !this.showFaviconTile;
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
      if (titleSpan) titleSpan.hidden = true;
      const closeButton = this.tabElement.querySelector('#tab-close-button') as HTMLElement;
      if (closeButton) closeButton.hidden = true;
    }
  }

  unpinTab(): void {
    this.isPinned = false;
    if (this.tabElement) {
      this.tabElement.classList.remove('pinned');
      const titleSpan = this.tabElement.querySelector('#tab-title') as HTMLElement;
      if (titleSpan) titleSpan.hidden = false;
      const closeButton = this.tabElement.querySelector('#tab-close-button') as HTMLElement;
      if (closeButton) closeButton.hidden = false;
    }
  }

  public getTabElement(): HTMLElement | null {
    return this.tabElement;
  }
}
