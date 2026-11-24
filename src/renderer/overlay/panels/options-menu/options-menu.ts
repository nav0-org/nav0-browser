import './options-menu.css';
import { InAppUrls } from '../../../../constants/app-constants';
import { UrlDisplay } from '../../../common/url-display';
import { FaviconTile } from '../../../common/favicon-tile';

let containerEl: HTMLElement;
let optionsElement: HTMLElement | null = null;
let appWindowId: string;
let isPrivate: boolean;
// The one highlighted row, chosen by the pointer or the arrow keys.
let selectedItem: HTMLElement | null = null;

const OPTIONS_MENU_HTML = `
  <div>
    <div class="options-dropdown" id="om-options-dropdown">
      <div class="dropdown-item" id="om-new-tab-option">
        <i data-lucide="file-plus-2" width="16" height="16"></i>
        <span class="dropdown-item-text">New Tab</span>
        <span id="om-new-tab-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="dropdown-item" id="om-new-window-option">
        <i data-lucide="app-window" width="16" height="16"></i>
        <span class="dropdown-item-text">New Window</span>
        <span id="om-new-window-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="dropdown-item" id="om-new-private-window-option">
        <i data-lucide="eye-off" width="16" height="16"></i>
        <span class="dropdown-item-text">New Private Window</span>
        <span id="om-new-private-window-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="dropdown-item" id="om-open-pdf-option">
        <i data-lucide="file-text" width="16" height="16"></i>
        <span class="dropdown-item-text">Open PDF File</span>
        <span class="keyboard-shortcut"></span>
      </div>

      <div class="divider"></div>

      <div class="dropdown-item" id="om-print-option">
        <i data-lucide="printer" width="16" height="16"></i>
        <span class="dropdown-item-text">Print</span>
        <span id="om-print-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="dropdown-item" id="om-find-in-page-option">
        <i data-lucide="text-search" width="16" height="16"></i>
        <span class="dropdown-item-text">Find in Page</span>
        <span id="om-find-in-page-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="dropdown-item zoom-row" id="om-zoom-row">
        <i data-lucide="search" width="16" height="16"></i>
        <span class="dropdown-item-text">Zoom</span>
        <div class="zoom-controls">
          <button class="zoom-btn" id="om-zoom-out" type="button" aria-label="Zoom out">
            <i data-lucide="minus" width="14" height="14"></i>
          </button>
          <span class="zoom-level" id="om-zoom-level">100%</span>
          <button class="zoom-btn" id="om-zoom-in" type="button" aria-label="Zoom in">
            <i data-lucide="plus" width="14" height="14"></i>
          </button>
          <button class="zoom-btn" id="om-zoom-reset" type="button" aria-label="Reset zoom">
            <i data-lucide="rotate-ccw" width="14" height="14"></i>
          </button>
        </div>
      </div>

      <div class="divider"></div>

      <div class="dropdown-item" id="om-downloads-option">
        <i data-lucide="download" width="16" height="16"></i>
        <span class="dropdown-item-text">Downloads</span>
        <span id="om-downloads-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="dropdown-item has-submenu" id="om-history-submenu-container">
        <i data-lucide="clock" width="16" height="16"></i>
        <span class="dropdown-item-text">History</span>
        <i data-lucide="chevron-right" class="submenu-indicator" width="14" height="14"></i>

        <!-- History Submenu -->
        <div class="submenu history-submenu">
          <!-- Section 1: Show All History -->
          <div class="dropdown-item" id="om-history-option">
            <i data-lucide="clock" width="16" height="16"></i>
            <span class="dropdown-item-text">Show All History</span>
            <span id="om-history-shortcut" class="keyboard-shortcut"></span>
          </div>

          <div class="divider"></div>

          <!-- Section 2: Recently Closed Tabs -->
          <div class="submenu-section-label">Recently Closed</div>
          <div id="om-recently-closed-tabs-list">
            <div class="submenu-empty-state">No recently closed tabs</div>
          </div>

          <div class="divider"></div>

          <!-- Section 3: Recently Closed Windows -->
          <div class="submenu-section-label">Recently Closed Windows</div>
          <div id="om-recently-closed-windows-list">
            <div class="submenu-empty-state">No recently closed windows</div>
          </div>

          <!-- Section 4: Restore Previous Session -->
          <div class="divider" id="om-restore-session-divider" hidden></div>
          <div class="dropdown-item" id="om-restore-session-option" hidden>
            <i data-lucide="rotate-ccw" width="16" height="16"></i>
            <span class="dropdown-item-text">Restore Previous Session</span>
          </div>
        </div>
      </div>

      <div class="dropdown-item" id="om-bookmarks-option">
        <i data-lucide="album" width="16" height="16"></i>
        <span class="dropdown-item-text">Bookmarks</span>
        <span id="om-bookmarks-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="divider"></div>

      <div class="dropdown-item has-submenu">
        <i data-lucide="circle-help" width="16" height="16"></i>
        <span class="dropdown-item-text">Help</span>
        <i data-lucide="chevron-right" class="submenu-indicator" width="14" height="14"></i>

        <!-- options Submenu -->
        <div class="submenu">
          <div class="dropdown-item" id="om-about-Nav0-option">
            <i data-lucide="info" width="16" height="16"></i>
            <span class="dropdown-item-text">About Nav0</span>
          </div>
          <div class="dropdown-item" id="om-privacy-policy-option">
            <i data-lucide="shield-check" width="16" height="16"></i>
            <span class="dropdown-item-text">Privacy Policy</span>
          </div>
          <div class="dropdown-item" id="om-terms-of-use-option">
            <i data-lucide="scale" width="16" height="16"></i>
            <span class="dropdown-item-text">Terms of Use</span>
          </div>
          <div class="dropdown-item" id="om-disclaimer-option">
            <i data-lucide="triangle-alert" width="16" height="16"></i>
            <span class="dropdown-item-text">Disclaimer</span>
          </div>
          <div class="divider"></div>
          <div class="dropdown-item" id="om-report-issue-option">
            <i data-lucide="message-square-warning" width="16" height="16"></i>
            <span class="dropdown-item-text">Report an Issue</span>
          </div>
        </div>
      </div>

      <div class="dropdown-item" id="om-devtools-option">
        <i data-lucide="code" width="16" height="16"></i>
        <span class="dropdown-item-text">Developer Tools</span>
        <span id="om-devtools-shortcut" class="keyboard-shortcut"></span>
      </div>

      <div class="divider"></div>

      <div class="dropdown-item" id="om-settings-option">
        <i data-lucide="settings" width="16" height="16"></i>
        <span class="dropdown-item-text">Settings</span>
        <span id="om-browser-settings-shortcut" class="keyboard-shortcut"></span>
      </div>

    </div>
  </div>
`;

function initializeDomElements(): void {
  optionsElement = containerEl.querySelector('#om-options-dropdown') as HTMLElement;
  const isMac = window.BrowserAPI.platform === 'darwin';
  const modKey = isMac ? 'Cmd' : 'Ctrl';

  // Menu-item shortcuts are muted text, not keycap boxes (DESIGN.md §4.4). On
  // macOS they are glyphs ordered ⌃⌥⇧⌘ before the key with no plus signs
  // (e.g. "⇧⌘N"); on Windows/Linux the "Ctrl+Shift+N" text form.
  const MAC_GLYPHS: Record<string, string> = {
    Ctrl: '⌃',
    Alt: '⌥',
    Opt: '⌥',
    Option: '⌥',
    Shift: '⇧',
    Cmd: '⌘',
  };
  const MAC_MODIFIER_ORDER = ['⌃', '⌥', '⇧', '⌘'];

  const setShortcut = (id: string, keys: string[]) => {
    const el = containerEl.querySelector(`#${id}`) as HTMLElement;
    if (!el) return;
    if (isMac) {
      const glyphs: string[] = [];
      const rest: string[] = [];
      for (const k of keys) {
        if (k in MAC_GLYPHS) glyphs.push(MAC_GLYPHS[k]);
        else rest.push(k);
      }
      glyphs.sort((a, b) => MAC_MODIFIER_ORDER.indexOf(a) - MAC_MODIFIER_ORDER.indexOf(b));
      el.textContent = glyphs.join('') + rest.join('');
    } else {
      el.textContent = keys.join('+');
    }
  };

  setShortcut('om-new-tab-shortcut', [modKey, 'T']);
  setShortcut('om-new-window-shortcut', [modKey, 'N']);
  setShortcut('om-new-private-window-shortcut', [modKey, 'Shift', 'N']);
  setShortcut('om-print-shortcut', [modKey, 'P']);
  setShortcut('om-find-in-page-shortcut', [modKey, 'F']);
  setShortcut('om-downloads-shortcut', [modKey, 'Shift', 'D']);
  setShortcut('om-history-shortcut', [modKey, 'Shift', 'H']);
  setShortcut('om-bookmarks-shortcut', [modKey, 'Shift', 'B']);
  setShortcut('om-browser-settings-shortcut', [modKey, ',']);
  const devtoolsMod = isMac ? 'Opt' : 'Shift';
  setShortcut('om-devtools-shortcut', [modKey, devtoolsMod, 'I']);

  // Populate history submenu when hovering
  const historyContainer = containerEl.querySelector('#om-history-submenu-container');
  if (historyContainer) {
    historyContainer.addEventListener('mouseenter', () => populateHistorySubmenu());
  }
}

// --- Selection: one highlighted row, moved by the pointer and the keys ---

const ITEM_SELECTOR = '.dropdown-item, .closed-tab-item, .closed-window-item';

// Rows that can be selected: not hidden, not disabled, and not the zoom row
// (its buttons are separate controls).
function isSelectable(item: HTMLElement): boolean {
  return (
    !item.hidden &&
    !item.classList.contains('zoom-row') &&
    item.getAttribute('aria-disabled') !== 'true'
  );
}

// The selectable rows of one menu (the main menu or a submenu), in order;
// separators and section labels aren't rows.
function itemsIn(menu: Element): HTMLElement[] {
  return Array.from(
    menu.querySelectorAll<HTMLElement>(
      ':scope > .dropdown-item, :scope > div > .closed-tab-item, :scope > div > .closed-window-item'
    )
  ).filter(isSelectable);
}

// Highlights item (or nothing). `within` is what the pointer is over, or the
// selected row itself: a submenu row holding it keeps its submenu open and
// stays highlighted as the open submenu's row.
function select(item: HTMLElement | null, within: Element | null = item, reveal = false): void {
  selectedItem?.classList.remove('is-selected');
  selectedItem = item;
  item?.classList.add('is-selected');
  containerEl.querySelectorAll('.has-submenu').forEach((row) => {
    row.classList.toggle('submenu-active', !!within && row !== within && row.contains(within));
  });
  if (reveal) item?.scrollIntoView({ block: 'nearest' });
}

function openSubmenu(row: HTMLElement): void {
  const submenu = row.querySelector(':scope > .submenu');
  if (!submenu) return;
  if (row.id === 'om-history-submenu-container') populateHistorySubmenu();
  const first = itemsIn(submenu)[0] ?? null;
  select(first, first ?? submenu, true);
}

function handleMenuKey(e: KeyboardEvent): void {
  if (!optionsElement) return;
  // A focused zoom button handles its own Enter and Space.
  if (e.key === 'Enter' && document.activeElement?.closest('.zoom-controls')) return;
  const submenu = selectedItem?.closest('.submenu') ?? null;
  switch (e.key) {
    case 'Escape':
      // Closes the whole menu; focus goes back to the ⋮ button.
      window.BrowserAPI.hideOptionsMenu(appWindowId, true);
      break;
    case 'ArrowDown':
    case 'ArrowUp': {
      const items = itemsIn(submenu ?? optionsElement);
      if (items.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const index = selectedItem ? items.indexOf(selectedItem) : -1;
      const next =
        index < 0
          ? items[step > 0 ? 0 : items.length - 1]
          : items[(index + step + items.length) % items.length];
      select(next, next, true);
      break;
    }
    case 'ArrowRight':
      if (!selectedItem?.classList.contains('has-submenu')) return;
      openSubmenu(selectedItem);
      break;
    case 'ArrowLeft': {
      const row = submenu?.closest<HTMLElement>('.has-submenu');
      if (!row) return;
      select(row, row, true);
      break;
    }
    case 'Enter':
      if (!selectedItem) return;
      if (selectedItem.classList.contains('has-submenu')) openSubmenu(selectedItem);
      else selectedItem.click();
      break;
    default:
      return;
  }
  e.preventDefault();
}

function renderZoomLevel(factor: number): void {
  const el = containerEl?.querySelector('#om-zoom-level') as HTMLElement | null;
  if (el) el.textContent = `${Math.round(factor * 100)}%`;
}

async function populateHistorySubmenu(): Promise<void> {
  // Populate recently closed tabs (not in private mode)
  const tabsList = containerEl.querySelector('#om-recently-closed-tabs-list') as HTMLElement;
  if (tabsList && !isPrivate) {
    const closedTabs = await window.BrowserAPI.fetchRecentlyClosedTabs(appWindowId);
    tabsList.innerHTML = '';
    if (closedTabs && closedTabs.length > 0) {
      for (let i = 0; i < closedTabs.length; i++) {
        const tab = closedTabs[i];
        const item = document.createElement('div');
        item.className = 'closed-tab-item';

        // The site's icon, or the favicon fallback tile.
        const favicon = FaviconTile.icon(tab.faviconUrl, tab.url || '');
        if (tab.faviconUrl) favicon.classList.add('closed-tab-favicon');
        item.appendChild(favicon);

        const title = document.createElement('span');
        title.className = 'closed-tab-title';
        title.textContent = UrlDisplay.format(tab.title || tab.url || '');
        title.title = UrlDisplay.format(tab.url || '');
        item.appendChild(title);

        const index = i;
        item.addEventListener('click', async (e) => {
          e.stopPropagation();
          await window.BrowserAPI.restoreClosedTabByIndex(appWindowId, index);
          await window.BrowserAPI.hideOptionsMenu(appWindowId);
        });

        tabsList.appendChild(item);
      }
    } else {
      tabsList.innerHTML = '<div class="submenu-empty-state">No recently closed tabs</div>';
    }
  } else if (tabsList && isPrivate) {
    tabsList.innerHTML = '<div class="submenu-empty-state">Not available in private mode</div>';
  }

  // Populate recently closed windows
  const windowsList = containerEl.querySelector('#om-recently-closed-windows-list') as HTMLElement;
  if (windowsList && !isPrivate) {
    const closedWindows = await window.BrowserAPI.fetchClosedWindows();
    windowsList.innerHTML = '';
    if (closedWindows && closedWindows.length > 0) {
      for (let i = 0; i < closedWindows.length; i++) {
        const win = closedWindows[i];
        const item = document.createElement('div');
        item.className = 'closed-window-item';

        const title = document.createElement('span');
        title.className = 'closed-window-title';
        const firstTab = win.tabs && win.tabs.length > 0 ? win.tabs[0] : null;
        title.textContent = firstTab
          ? UrlDisplay.format(firstTab.title || firstTab.url || '')
          : 'Window';
        item.appendChild(title);

        const count = document.createElement('span');
        count.className = 'closed-window-tab-count';
        count.textContent = `${win.tabCount} tab${win.tabCount !== 1 ? 's' : ''}`;
        item.appendChild(count);

        const index = i;
        item.addEventListener('click', async (e) => {
          e.stopPropagation();
          await window.BrowserAPI.restoreClosedWindow(index);
          await window.BrowserAPI.hideOptionsMenu(appWindowId);
        });

        windowsList.appendChild(item);
      }
    } else {
      windowsList.innerHTML = '<div class="submenu-empty-state">No recently closed windows</div>';
    }
  } else if (windowsList && isPrivate) {
    windowsList.innerHTML = '<div class="submenu-empty-state">Not available in private mode</div>';
  }

  // Populate "Restore Previous Session" option
  const restoreSessionDivider = containerEl.querySelector(
    '#om-restore-session-divider'
  ) as HTMLElement;
  const restoreSessionItem = containerEl.querySelector('#om-restore-session-option') as HTMLElement;
  if (restoreSessionItem && restoreSessionDivider && !isPrivate) {
    const sessionState = await window.BrowserAPI.fetchSessionState();
    if (sessionState) {
      restoreSessionDivider.hidden = false;
      restoreSessionItem.hidden = false;
      const newItem = restoreSessionItem.cloneNode(true) as HTMLElement;
      restoreSessionItem.parentNode?.replaceChild(newItem, restoreSessionItem);
      newItem.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.BrowserAPI.restorePreviousSession();
        await window.BrowserAPI.hideOptionsMenu(appWindowId);
      });
    } else {
      restoreSessionDivider.hidden = true;
      restoreSessionItem.hidden = true;
    }
  } else if (restoreSessionItem && restoreSessionDivider) {
    restoreSessionDivider.hidden = true;
    restoreSessionItem.hidden = true;
  }
}

function setupEventListeners(): void {
  // Click on the overlay background (not the dropdown) to close
  containerEl.addEventListener('click', async (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.options-dropdown')) {
      await window.BrowserAPI.hideOptionsMenu(appWindowId);
    }
  });

  optionsElement?.querySelector('#om-new-tab-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, InAppUrls.NEW_TAB, true);
  });

  optionsElement?.querySelector('#om-new-window-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createNewAppWindow();
  });

  optionsElement
    ?.querySelector('#om-new-private-window-option')
    ?.addEventListener('click', async () => {
      await window.BrowserAPI.createNewPrivateAppWindow();
    });

  optionsElement?.querySelector('#om-open-pdf-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.openPdfFile(appWindowId);
  });

  optionsElement?.querySelector('#om-print-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.printPage(appWindowId);
  });

  optionsElement?.querySelector('#om-find-in-page-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.showFindInPage(appWindowId);
  });

  // Zoom controls — keep the menu open while stepping zoom, like Chrome.
  const zoomRow = optionsElement?.querySelector('#om-zoom-row');
  zoomRow?.addEventListener('click', (e) => e.stopPropagation());
  optionsElement?.querySelector('#om-zoom-out')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    renderZoomLevel(await window.BrowserAPI.zoomOut(appWindowId));
  });
  optionsElement?.querySelector('#om-zoom-in')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    renderZoomLevel(await window.BrowserAPI.zoomIn(appWindowId));
  });
  optionsElement?.querySelector('#om-zoom-reset')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    renderZoomLevel(await window.BrowserAPI.resetZoom(appWindowId));
  });

  optionsElement?.querySelector('#om-downloads-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, InAppUrls.DOWNLOADS, true);
  });

  optionsElement?.querySelector('#om-history-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, InAppUrls.HISTORY, true);
  });

  optionsElement?.querySelector('#om-bookmarks-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, InAppUrls.BOOKMARKS, true);
  });

  optionsElement?.querySelector('#om-devtools-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.toggleDevTools(appWindowId);
    await window.BrowserAPI.hideOptionsMenu(appWindowId);
  });

  optionsElement?.querySelector('#om-settings-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, InAppUrls.BROWSER_SETTINGS, true);
  });

  optionsElement?.querySelector('#om-about-Nav0-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, InAppUrls.ABOUT, true);
  });

  optionsElement
    ?.querySelector('#om-privacy-policy-option')
    ?.addEventListener('click', async () => {
      await window.BrowserAPI.createTab(appWindowId, 'https://nav0.org/privacy-policy', true);
    });

  optionsElement?.querySelector('#om-terms-of-use-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, 'https://nav0.org/terms-of-use', true);
    await window.BrowserAPI.hideOptionsMenu(appWindowId);
  });

  optionsElement?.querySelector('#om-disclaimer-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.createTab(appWindowId, 'https://nav0.org/disclaimer', true);
    await window.BrowserAPI.hideOptionsMenu(appWindowId);
  });

  optionsElement?.querySelector('#om-report-issue-option')?.addEventListener('click', async () => {
    await window.BrowserAPI.hideOptionsMenu(appWindowId);
    await window.BrowserAPI.showIssueReport(appWindowId);
  });
}

export function init(container: HTMLElement): void {
  containerEl = container;
  appWindowId = window.BrowserAPI.appWindowId;
  isPrivate = window.BrowserAPI.isPrivate;

  container.innerHTML = OPTIONS_MENU_HTML;
  initializeDomElements();
  setupEventListeners();

  // Arrow keys, Enter and Esc while the menu is open (it has keyboard focus).
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!containerEl.hasAttribute('hidden')) handleMenuKey(e);
  });

  // The pointer moves the same selection, so only one row is ever highlighted.
  optionsElement?.addEventListener('mousemove', (e: MouseEvent) => {
    const target = e.target as Element;
    const item = target.closest<HTMLElement>(ITEM_SELECTOR);
    select(item && isSelectable(item) ? item : null, target);
  });
  optionsElement?.addEventListener('mouseleave', () => select(null));
}

export function show(_data?: any): void {
  select(null);

  // Reflect the active tab's current zoom level in the zoom control.
  window.BrowserAPI.getZoomFactor(appWindowId)
    .then((factor) => renderZoomLevel(factor))
    .catch(() => {
      /* ignore */
    });

  // Hide the Developer Tools option when devtools is disabled in settings.
  window.DataStoreAPI.get('browser-settings')
    .then((stored: unknown) => {
      const devToolsEnabled =
        stored && typeof stored === 'object' && 'devToolsEnabled' in stored
          ? !!(stored as { devToolsEnabled?: boolean }).devToolsEnabled
          : true;
      const devtoolsItem = containerEl?.querySelector('#om-devtools-option') as HTMLElement | null;
      if (devtoolsItem) {
        devtoolsItem.hidden = !devToolsEnabled;
      }
    })
    .catch(() => {
      /* ignore */
    });
}

export function hide(): void {
  select(null);
}
