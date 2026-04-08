import { createIcons, icons } from 'lucide';
import TabTemplate from './tab.html';
import { ImageBase64Strings, InAppUrls } from '../../constants/app-constants';

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
  public isReaderModeEligible = false;
  public isReaderModeActive = false;
  public isPinned = false;
  public sslStatus: 'secure' | 'insecure' | 'internal' = 'internal';
  public sslDetails: { issuer: string; validFrom: string; validTo: string; subjectName: string } | null = null;

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
    const closeButton = this.tabElement.querySelector('#tab-close-button');
    if (closeButton) {
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

    setTimeout(() => {
      createIcons({icons});
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

  handleUrlChange(url: string, isBookmark: boolean, bookmarkId: string | null, canGoBack: boolean, canGoForward: boolean): void {
    this.url = url;
    this.isBookmark = isBookmark;
    this.bookmarkId = bookmarkId;
    this.canGoBack = canGoBack;
    this.canGoForward = canGoForward;
    if(this.url.startsWith(InAppUrls.PREFIX)) {
      this.updateTabFavicon(ImageBase64Strings.FAVICON);
    }
  }

  setLoading(isLoading: boolean): void {
    this.isLoading = isLoading;
    if (this.tabElement) {
      const faviconElement = this.tabElement.querySelector('.tab-favicon') as HTMLImageElement;
      const loaderElement = this.tabElement.querySelector('.tab-loader') as HTMLElement;
      if (faviconElement && loaderElement) {
        if (isLoading) {
          faviconElement.style.display = 'none';
          loaderElement.style.display = 'block';
        } else {
          // Only show the favicon if it has a src set, otherwise keep it hidden
          // to avoid showing the browser's broken image icon
          faviconElement.style.display = faviconElement.src ? '' : 'none';
          loaderElement.style.display = 'none';
        }
      }
    }
  }

  updateTabFavicon(faviconUrl: string): void {
    if(this.url.startsWith(InAppUrls.PREFIX)) {
      this.faviconUrl = ImageBase64Strings.FAVICON;
    } else {
      this.faviconUrl = faviconUrl;
    }
    if (this.tabElement) {
      const faviconElement = this.tabElement.querySelector('.tab-favicon') as HTMLImageElement;
      if (faviconElement) {
        faviconElement.onerror = () => {
          faviconElement.onerror = null;
          faviconElement.src = "data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>";
        };
        faviconElement.src = faviconUrl;
        if (!this.isLoading) {
          faviconElement.style.display = '';
        }
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