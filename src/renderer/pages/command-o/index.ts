import './index.css';
import { initTheme } from '../../common/theme';
import { createIcons, icons } from 'lucide';
initTheme();

declare global {
  interface Window {
    __commandOReloadTabs: () => void;
  }
}

type TabInfo = {
  id: string;
  title: string;
  url: string;
  faviconUrl: string | null;
  isActive: boolean;
};

type WindowGroup = {
  windowId: string;
  windowName: string;
  isPrivate: boolean;
  tabs: TabInfo[];
};

const WINDOW_COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];
const GRID_COLS = 4;

let allGroups: WindowGroup[] = [];
let filteredGroups: WindowGroup[] = [];
let flatTabs: { tab: TabInfo; windowId: string }[] = [];
let selectedIndex = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let dragData: { tabId: string; sourceWindowId: string } | null = null;

const init = () => {
  document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const tabsBody = document.getElementById('tabs-body') as HTMLElement;
    const tabCountEl = document.getElementById('tab-count') as HTMLElement;
    const footerPrivate = document.getElementById('footer-private') as HTMLElement;
    const footerDragHint = document.getElementById('footer-drag-hint') as HTMLElement;

    createIcons({ icons });

    if (window.BrowserAPI.isPrivate) {
      footerPrivate.style.display = '';
    }

    searchInput?.focus();

    const escapeHtml = (str: string): string => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };

    const getFaviconLetter = (url: string): string => {
      try {
        const hostname = new URL(url).hostname;
        return hostname.replace('www.', '').charAt(0).toUpperCase();
      } catch {
        return url.charAt(0).toUpperCase() || '?';
      }
    };

    const buildFlatTabs = () => {
      flatTabs = [];
      for (const group of filteredGroups) {
        for (const tab of group.tabs) {
          flatTabs.push({ tab, windowId: group.windowId });
        }
      }
    };

    const render = () => {
      tabsBody.innerHTML = '';
      const totalTabs = allGroups.reduce((sum, g) => sum + g.tabs.length, 0);
      tabCountEl.textContent = `${totalTabs} tab${totalTabs !== 1 ? 's' : ''}`;

      if (flatTabs.length === 0) {
        tabsBody.innerHTML = '<div class="empty-state">No matching tabs found</div>';
        return;
      }

      const showHeaders = allGroups.length > 1;
      const canDrag = !window.BrowserAPI.isPrivate && allGroups.length > 1;
      footerDragHint.style.display = canDrag ? '' : 'none';

      let flatIdx = 0;
      for (let gi = 0; gi < filteredGroups.length; gi++) {
        const group = filteredGroups[gi];
        if (group.tabs.length === 0) continue;

        const groupEl = document.createElement('div');
        groupEl.className = 'window-group';
        groupEl.dataset.windowId = group.windowId;

        if (canDrag) {
          groupEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (dragData && dragData.sourceWindowId !== group.windowId) {
              groupEl.classList.add('drop-target');
            }
          });
          groupEl.addEventListener('dragleave', (e) => {
            const related = e.relatedTarget as HTMLElement | null;
            if (!related || !groupEl.contains(related)) {
              groupEl.classList.remove('drop-target');
            }
          });
          groupEl.addEventListener('drop', async (e) => {
            e.preventDefault();
            groupEl.classList.remove('drop-target');
            if (dragData && dragData.sourceWindowId !== group.windowId) {
              await window.BrowserAPI.moveTabToWindow(dragData.sourceWindowId, dragData.tabId, group.windowId);
              window.BrowserAPI.hideCommandOOverlay(window.BrowserAPI.appWindowId);
            }
          });
        }

        if (showHeaders) {
          const color = WINDOW_COLORS[gi % WINDOW_COLORS.length];
          const header = document.createElement('div');
          header.className = 'window-header';
          header.innerHTML = `
            <span class="window-dot" style="background:${color}"></span>
            <span class="window-name">${escapeHtml(group.windowName)}</span>
            <span class="window-tab-count">&mdash; ${group.tabs.length} tab${group.tabs.length !== 1 ? 's' : ''}</span>
            <span class="window-line" style="background:${color}"></span>
          `;
          groupEl.appendChild(header);
        }

        const grid = document.createElement('div');
        grid.className = 'tab-grid';

        for (const tab of group.tabs) {
          const card = document.createElement('div');
          card.className = 'tab-card';
          if (tab.isActive) card.classList.add('active');
          if (flatIdx === selectedIndex) card.classList.add('selected');
          card.dataset.flatIndex = String(flatIdx);

          let faviconHtml = '';
          if (tab.faviconUrl) {
            faviconHtml = `<div class="tab-favicon"><img src="${escapeHtml(tab.faviconUrl)}" onerror="this.parentElement.innerHTML='<div class=\\'tab-favicon-letter\\'>${getFaviconLetter(tab.url)}</div>'"></div>`;
          } else {
            faviconHtml = `<div class="tab-favicon-letter">${getFaviconLetter(tab.url)}</div>`;
          }

          const titleText = tab.title || tab.url || 'New Tab';
          const truncatedTitle = escapeHtml(titleText);

          card.innerHTML = `
            ${faviconHtml}
            <span class="tab-title" title="${escapeHtml(titleText)}">${truncatedTitle}</span>
            ${tab.isActive ? '<span class="tab-active-dot"></span>' : ''}
          `;

          if (canDrag) {
            card.draggable = true;
            card.addEventListener('dragstart', (e) => {
              dragData = { tabId: tab.id, sourceWindowId: group.windowId };
              card.classList.add('dragging');
              if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
              }
            });
            card.addEventListener('dragend', () => {
              card.classList.remove('dragging');
              dragData = null;
              document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
            });
          }

          card.addEventListener('click', () => {
            switchToTab(tab, group.windowId);
          });

          grid.appendChild(card);
          flatIdx++;
        }

        groupEl.appendChild(grid);
        tabsBody.appendChild(groupEl);
      }

      // Scroll selected into view
      const selectedCard = tabsBody.querySelector('.tab-card.selected') as HTMLElement;
      selectedCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    const switchToTab = (tab: TabInfo, windowId: string) => {
      window.BrowserAPI.activateTab(windowId, tab.id, true);
      window.BrowserAPI.hideCommandOOverlay(window.BrowserAPI.appWindowId);
    };

    const filterTabs = (query: string) => {
      const lowerQuery = query.toLowerCase().trim();
      if (!lowerQuery) {
        filteredGroups = allGroups.map(g => ({ ...g, tabs: [...g.tabs] }));
      } else {
        filteredGroups = allGroups.map(g => ({
          ...g,
          tabs: g.tabs.filter(t => {
            const title = (t.title || '').toLowerCase();
            const url = (t.url || '').toLowerCase();
            return title.includes(lowerQuery) || url.includes(lowerQuery);
          }),
        })).filter(g => g.tabs.length > 0);
      }
      buildFlatTabs();
      selectedIndex = flatTabs.length > 0 ? 0 : -1;
      render();
    };

    const loadTabs = async () => {
      try {
        const result = await window.BrowserAPI.fetchAllWindowsTabs(window.BrowserAPI.isPrivate);
        allGroups = result as WindowGroup[];
        filterTabs(searchInput.value);
      } catch {
        allGroups = [];
        filteredGroups = [];
        flatTabs = [];
        selectedIndex = -1;
        render();
      }
    };

    // Keyboard navigation
    const handleKeydown = (e: KeyboardEvent) => {
      if (flatTabs.length === 0 && e.key !== 'Escape') return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, flatTabs.length - 1);
          render();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, 0);
          render();
          break;
        case 'ArrowDown':
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + GRID_COLS, flatTabs.length - 1);
          render();
          break;
        case 'ArrowUp':
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - GRID_COLS, 0);
          render();
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            selectedIndex = Math.max(selectedIndex - 1, 0);
          } else {
            selectedIndex = Math.min(selectedIndex + 1, flatTabs.length - 1);
          }
          render();
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < flatTabs.length) {
            const { tab, windowId } = flatTabs[selectedIndex];
            switchToTab(tab, windowId);
          }
          break;
        case 'Escape':
          e.preventDefault();
          window.BrowserAPI.hideCommandOOverlay(window.BrowserAPI.appWindowId);
          break;
      }
    };

    document.addEventListener('keydown', handleKeydown);

    // Search input
    searchInput?.addEventListener('input', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filterTabs(searchInput.value);
      }, 100);
    });

    // Click outside to close
    document.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.overlay-container')) {
        window.BrowserAPI.hideCommandOOverlay(window.BrowserAPI.appWindowId);
      }
    });

    // Load tabs on init
    loadTabs();

    // Expose reload function for resetState calls from main process
    (window as any).__commandOReloadTabs = loadTabs;
  });
};

init();
