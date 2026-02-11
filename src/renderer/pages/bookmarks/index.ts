
import { BookmarkRecord } from '../../../types/bookmark-record';
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

document.addEventListener('DOMContentLoaded', async() => {
  const bookmarksData: Array<BookmarkRecord> = await window.BrowserAPI.fetchBookmarks(window.BrowserAPI.appWindowId, '', 50, 0);
  renderBookmarkItems(bookmarksData);

  document.getElementById('delete-all')?.addEventListener('click', async () => {
    await window.BrowserAPI.removeAllBookmarks(window.BrowserAPI.appWindowId);
    bookmarksListContainer.innerHTML = '';
    document.getElementById('no-bookmarks').style.display = 'block';
    document.getElementById('delete-all').style.display = 'none';
  })
});
const bookmarksListContainer = document.getElementById('bookmarks-list') as HTMLElement;


const renderBookmarkItems = (items: BookmarkRecord[]): void => {
  if(items.length === 0) {
    document.getElementById('no-bookmarks').style.display = 'block';
    document.getElementById('delete-all').style.display = 'none';
    return;
  } else { 
    document.getElementById('no-bookmarks').style.display = 'none';
    document.getElementById('delete-all').style.display = 'block';
  }
  
  // Create bookmarks
  items.forEach(item => {
      const bookmarkItem = document.createElement('div');
      bookmarkItem.className = 'bookmark-item';
      
      bookmarkItem.innerHTML = `
        <div><img src="${item.faviconUrl}" alt="" class="bookmark-favicon" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'"></div>
        <div class="bookmark-content">
          <div class="bookmark-title">${item.title}</div>
          <div class="bookmark-domain">${item.url}</div>
        </div>
        <div>
          <button id="delete-bookmark-button" class="bookmark-button">
            <i data-lucide="bookmark-x" width="16" height="16"></i>
          </button>
        </div>
      `;
      bookmarkItem.querySelector('#delete-bookmark-button')?.addEventListener('click', async (e: Event) => {
        e.stopPropagation(); // Prevent opening the URL
        await window.BrowserAPI.removeBookmark(window.BrowserAPI.appWindowId, item.id);
        bookmarkItem.remove();
        items.splice(items.indexOf(item), 1);
        if(items.length === 0) {
          document.getElementById('no-bookmarks').style.display = 'block';
          document.getElementById('delete-all').style.display = 'none';
        }
      });

      bookmarkItem.querySelector('.bookmark-content')?.addEventListener('click', async (e: Event) => {
        e.stopPropagation(); // Prevent opening the URL
        await window.BrowserAPI.createTab(window.BrowserAPI.appWindowId, item.url, true);
      });
      bookmarksListContainer.appendChild(bookmarkItem);
  });
  
  createIcons({ icons });
};