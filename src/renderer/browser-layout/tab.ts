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

  updateTabFavicon(faviconUrl: string): void {
    if(this.url.startsWith(InAppUrls.PREFIX)) {
      this.faviconUrl = ImageBase64Strings.FAVICON;
    } else {
      this.faviconUrl = faviconUrl;
    }
    if (this.tabElement) {
      const faviconElement = this.tabElement.querySelector('.tab-favicon');
      if (faviconElement) {
        faviconElement.setAttribute('src', faviconUrl);
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

  public getTabElement(): HTMLElement | null {
    return this.tabElement;
  }
}