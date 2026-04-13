import './index.css';
import { createIcons, icons } from 'lucide';
import { BrowserSettings, DEFAULT_BROWSER_SETTINGS, DEFAULT_SEARCH_ENGINES, DEFAULT_FILTER_LISTS, DEFAULT_KEYBOARD_SHORTCUTS, USER_AGENT_PRESETS, SearchEngineConfig, FilterListConfig, KeyboardShortcutAction } from '../../../types/settings-types';

// ---- Globals ----
let settings: BrowserSettings = { ...DEFAULT_BROWSER_SETTINGS };
let shortcuts: KeyboardShortcutAction[] = [...DEFAULT_KEYBOARD_SHORTCUTS];
let recordingCell: HTMLElement | null = null;
let activeFilter = 'all';

const isMac = (window as any).DataStoreAPI?.platform === 'darwin';
const modKey = isMac ? 'Cmd' : 'Ctrl';

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  initSidebarNavigation();
  initSearchSettings();
  initCookieSettings();
  initAdBlockerSettings();
  initPopupSettings();
  initDataRetentionSettings();
  initUserAgentSettings();
  initNetworkSettings();
  initKeyboardShortcuts();
  initPermissionsSettings();
  initDeveloperSettings();
  initSettingsSearch();
  createIcons({ icons });
});

// ---- Settings Load/Save ----
async function loadSettings() {
  const stored = await (window as any).DataStoreAPI.get('browser-settings');
  if (stored && typeof stored === 'object') {
    settings = { ...DEFAULT_BROWSER_SETTINGS, ...stored };
  }
}

async function saveSettings() {
  await (window as any).DataStoreAPI.set('browser-settings', settings);
  await (window as any).BrowserAPI.applySettings();
}

function showToast(message: string) {
  const existing = document.querySelector('.settings-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'settings-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// ---- Sidebar Navigation ----
function initSidebarNavigation() {
  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = (link as HTMLElement).dataset.section;
      activateSection(section);
    });
  });
  // Activate first section
  activateSection('search');
}

function activateSection(sectionId: string) {
  document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const section = document.getElementById(`section-${sectionId}`);
  const link = document.querySelector(`.sidebar-link[data-section="${sectionId}"]`);
  if (section) section.classList.add('active');
  if (link) link.classList.add('active');
}

// ---- Developer Settings ----
function initDeveloperSettings() {
  const toggle = document.getElementById('devtools-toggle') as HTMLInputElement;
  if (!toggle) return;
  toggle.checked = settings.devToolsEnabled || false;

  toggle.addEventListener('change', () => {
    settings.devToolsEnabled = toggle.checked;
    saveSettings();
    showToast(toggle.checked ? 'Developer Tools enabled' : 'Developer Tools disabled');
  });
}

// ---- Settings Search ----
function initSettingsSearch() {
  const searchInput = document.getElementById('settings-search') as HTMLInputElement;
  searchInput?.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
      // Show current active section
      document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
      const activeLink = document.querySelector('.sidebar-link.active');
      if (activeLink) {
        const sectionId = (activeLink as HTMLElement).dataset.section;
        const section = document.getElementById(`section-${sectionId}`);
        if (section) section.classList.add('active');
      }
      return;
    }
    // Find matching sections
    document.querySelectorAll('.settings-section').forEach(section => {
      const keywords = (section as HTMLElement).dataset.keywords || '';
      const title = section.querySelector('.section-title')?.textContent || '';
      const allText = (keywords + ' ' + title).toLowerCase();
      if (allText.indexOf(query) >= 0) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });
  });
}

// ---- Search Engine Settings ----
function initSearchSettings() {
  const select = document.getElementById('search-engine-select') as HTMLSelectElement;
  const suggestionsToggle = document.getElementById('search-suggestions-toggle') as HTMLInputElement;

  // Build options (built-in + custom)
  rebuildEngineSelect();

  // Set current value
  select.value = settings.primarySearchEngine || 'DuckDuckGo';
  suggestionsToggle.checked = settings.showSearchSuggestions || false;

  select.addEventListener('change', () => {
    settings.primarySearchEngine = select.value;
    saveSettings();
    showToast(`Search engine set to ${select.value}`);
  });

  suggestionsToggle.addEventListener('change', () => {
    settings.showSearchSuggestions = suggestionsToggle.checked;
    saveSettings();
  });

  // Custom engines
  renderCustomEngines();

  document.getElementById('add-engine-btn')?.addEventListener('click', () => {
    const nameInput = document.getElementById('custom-engine-name') as HTMLInputElement;
    const urlInput = document.getElementById('custom-engine-url') as HTMLInputElement;
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    if (!name || !url || url.indexOf('%s') === -1) {
      showToast('Please enter a name and URL with %s placeholder');
      return;
    }
    const engine: SearchEngineConfig = {
      id: 'custom-' + Date.now(),
      name,
      searchUrlTemplate: url,
      isBuiltIn: false,
    };
    if (!settings.customSearchEngines) settings.customSearchEngines = [];
    settings.customSearchEngines.push(engine);
    saveSettings();
    nameInput.value = '';
    urlInput.value = '';
    renderCustomEngines();
    rebuildEngineSelect();
    showToast(`Added "${name}" search engine`);
  });
}

function rebuildEngineSelect() {
  const select = document.getElementById('search-engine-select') as HTMLSelectElement;
  const currentValue = select.value || settings.primarySearchEngine || 'DuckDuckGo';
  select.innerHTML = '';

  DEFAULT_SEARCH_ENGINES.forEach(engine => {
    const opt = document.createElement('option');
    opt.value = engine.name;
    opt.textContent = engine.name;
    select.appendChild(opt);
  });

  (settings.customSearchEngines || []).forEach(engine => {
    const opt = document.createElement('option');
    opt.value = engine.name;
    opt.textContent = engine.name + ' (custom)';
    select.appendChild(opt);
  });

  select.value = currentValue;
}

function renderCustomEngines() {
  const container = document.getElementById('custom-engines-list');
  if (!container) return;
  container.innerHTML = '';

  (settings.customSearchEngines || []).forEach((engine, idx) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div class="list-item-content">
        <div>
          <div class="list-item-text">${engine.name}</div>
          <div class="list-item-description">${engine.searchUrlTemplate}</div>
        </div>
      </div>
      <div class="list-item-actions">
        <button class="list-item-btn" data-idx="${idx}" title="Remove"><i data-lucide="x" width="14" height="14"></i></button>
      </div>
    `;
    item.querySelector('.list-item-btn')?.addEventListener('click', () => {
      // If this was the default, reset to DuckDuckGo
      if (settings.primarySearchEngine === engine.name) {
        settings.primarySearchEngine = 'DuckDuckGo';
        const select = document.getElementById('search-engine-select') as HTMLSelectElement;
        select.value = 'DuckDuckGo';
      }
      settings.customSearchEngines.splice(idx, 1);
      saveSettings();
      renderCustomEngines();
      rebuildEngineSelect();
    });
    container.appendChild(item);
  });

  createIcons({ icons });
}

// ---- Cookie Settings ----
function initCookieSettings() {
  const radios = document.querySelectorAll('input[name="cookie-policy"]') as NodeListOf<HTMLInputElement>;
  const exceptionsContainer = document.getElementById('cookie-exceptions-container');
  const blockAllToggle = document.getElementById('block-all-cookies-toggle') as HTMLInputElement;
  const clearOnCloseToggle = document.getElementById('clear-cookies-close-toggle') as HTMLInputElement;
  const clearCookiesBtn = document.getElementById('clear-cookies-btn');

  // Set initial state
  radios.forEach(r => { if (r.value === settings.cookiePolicy) r.checked = true; });
  blockAllToggle.checked = settings.blockAllCookies || false;
  clearOnCloseToggle.checked = settings.clearCookiesOnClose || false;

  // Show/hide exceptions
  if (settings.cookiePolicy === 'block-with-exceptions') {
    exceptionsContainer.style.display = '';
  }

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      settings.cookiePolicy = radio.value as BrowserSettings['cookiePolicy'];
      exceptionsContainer.style.display = radio.value === 'block-with-exceptions' ? '' : 'none';
      saveSettings();
      showToast('Cookie policy updated');
    });
  });

  blockAllToggle.addEventListener('change', () => {
    settings.blockAllCookies = blockAllToggle.checked;
    saveSettings();
  });

  clearOnCloseToggle.addEventListener('change', () => {
    settings.clearCookiesOnClose = clearOnCloseToggle.checked;
    saveSettings();
  });

  // Cookie exceptions
  renderCookieExceptions();

  document.getElementById('add-cookie-exception-btn')?.addEventListener('click', () => {
    const input = document.getElementById('cookie-exception-input') as HTMLInputElement;
    const domain = input.value.trim();
    if (!domain) return;
    if (!settings.cookieExceptions) settings.cookieExceptions = [];
    if (settings.cookieExceptions.indexOf(domain) === -1) {
      settings.cookieExceptions.push(domain);
      saveSettings();
      input.value = '';
      renderCookieExceptions();
    }
  });

  // Clear cookies button
  clearCookiesBtn?.addEventListener('click', async () => {
    if (confirm('Clear all cookies and site data now?')) {
      await (window as any).BrowserAPI.clearBrowsingData({
        timeRange: 'all-time',
        browsingHistory: false,
        downloadHistory: false,
        cookiesSiteData: true,
        cachedFiles: false,
        autofillData: false,
        savedPasswords: false,
        sitePermissions: false,
      });
      showToast('Cookies cleared');
      updateCookieCount();
    }
  });

  updateCookieCount();
}

async function updateCookieCount() {
  try {
    const result = await (window as any).BrowserAPI.getCookieCount();
    const display = document.getElementById('cookie-count-display');
    if (display && result) {
      display.textContent = `${result.count} cookies stored.`;
    }
  } catch { /* ignore */ }
}

function renderCookieExceptions() {
  const container = document.getElementById('cookie-exceptions-list');
  if (!container) return;
  container.innerHTML = '';

  (settings.cookieExceptions || []).forEach((domain, idx) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div class="list-item-content"><span class="list-item-text">${domain}</span></div>
      <div class="list-item-actions">
        <button class="list-item-btn" title="Remove"><i data-lucide="x" width="14" height="14"></i></button>
      </div>
    `;
    item.querySelector('.list-item-btn')?.addEventListener('click', () => {
      settings.cookieExceptions.splice(idx, 1);
      saveSettings();
      renderCookieExceptions();
    });
    container.appendChild(item);
  });

  createIcons({ icons });
}

// ---- Ad-Blocker Settings ----
function initAdBlockerSettings() {
  const toggle = document.getElementById('adblocker-toggle') as HTMLInputElement;
  const details = document.getElementById('adblocker-details');

  toggle.checked = settings.adBlockerEnabled !== false;
  details.style.display = toggle.checked ? '' : 'none';

  toggle.addEventListener('change', () => {
    settings.adBlockerEnabled = toggle.checked;
    details.style.display = toggle.checked ? '' : 'none';
    saveSettings();
    showToast(toggle.checked ? 'Ad-blocker enabled' : 'Ad-blocker disabled');
  });

  renderFilterLists();
  renderAllowedSites();

  // Add custom filter list
  document.getElementById('add-filter-btn')?.addEventListener('click', () => {
    const input = document.getElementById('custom-filter-url') as HTMLInputElement;
    const url = input.value.trim();
    if (!url) return;
    const filterList: FilterListConfig = {
      id: 'custom-' + Date.now(),
      name: new URL(url).hostname,
      url,
      description: 'Custom filter list',
      enabled: true,
      isBuiltIn: false,
    };
    if (!settings.adBlockerFilterLists) settings.adBlockerFilterLists = [...DEFAULT_FILTER_LISTS];
    settings.adBlockerFilterLists.push(filterList);
    saveSettings();
    input.value = '';
    renderFilterLists();
    showToast('Filter list added');
  });

  // Add allowed site
  document.getElementById('add-allowed-site-btn')?.addEventListener('click', () => {
    const input = document.getElementById('allowed-site-input') as HTMLInputElement;
    const site = input.value.trim();
    if (!site) return;
    if (!settings.adBlockerAllowedSites) settings.adBlockerAllowedSites = [];
    if (settings.adBlockerAllowedSites.indexOf(site) === -1) {
      settings.adBlockerAllowedSites.push(site);
      saveSettings();
      input.value = '';
      renderAllowedSites();
    }
  });
}

function renderFilterLists() {
  const container = document.getElementById('filter-lists-container');
  if (!container) return;
  container.innerHTML = '';

  const lists = settings.adBlockerFilterLists || DEFAULT_FILTER_LISTS;
  lists.forEach((list, idx) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div class="list-item-content">
        <label class="toggle" style="margin-right: 8px;">
          <input type="checkbox" ${list.enabled ? 'checked' : ''} data-idx="${idx}">
          <span class="toggle-slider"></span>
        </label>
        <div>
          <div class="list-item-text">${list.name}</div>
          <div class="list-item-description">${list.description}</div>
        </div>
      </div>
      ${!list.isBuiltIn ? `<div class="list-item-actions"><button class="list-item-btn" data-idx="${idx}" title="Remove"><i data-lucide="x" width="14" height="14"></i></button></div>` : ''}
    `;

    const checkbox = item.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox?.addEventListener('change', () => {
      lists[idx].enabled = checkbox.checked;
      settings.adBlockerFilterLists = lists;
      saveSettings();
    });

    if (!list.isBuiltIn) {
      item.querySelector('.list-item-btn')?.addEventListener('click', () => {
        lists.splice(idx, 1);
        settings.adBlockerFilterLists = lists;
        saveSettings();
        renderFilterLists();
      });
    }

    container.appendChild(item);
  });

  createIcons({ icons });
}

function renderAllowedSites() {
  const container = document.getElementById('adblocker-allowed-sites');
  if (!container) return;
  container.innerHTML = '';

  (settings.adBlockerAllowedSites || []).forEach((site, idx) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div class="list-item-content"><span class="list-item-text">${site}</span></div>
      <div class="list-item-actions">
        <button class="list-item-btn" title="Remove"><i data-lucide="x" width="14" height="14"></i></button>
      </div>
    `;
    item.querySelector('.list-item-btn')?.addEventListener('click', () => {
      settings.adBlockerAllowedSites.splice(idx, 1);
      saveSettings();
      renderAllowedSites();
    });
    container.appendChild(item);
  });

  createIcons({ icons });
}

// ---- Pop-up Settings ----
function initPopupSettings() {
  const radios = document.querySelectorAll('input[name="popup-policy"]') as NodeListOf<HTMLInputElement>;
  const allowedContainer = document.getElementById('popup-allowed-container');
  const blockedContainer = document.getElementById('popup-blocked-container');

  // Set initial state
  radios.forEach(r => { if (r.value === (settings.popupPolicy || 'block')) r.checked = true; });
  updatePopupContainerVisibility(settings.popupPolicy || 'block');

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      settings.popupPolicy = radio.value as BrowserSettings['popupPolicy'];
      updatePopupContainerVisibility(radio.value);
      saveSettings();
      showToast('Pop-up policy updated');
    });
  });

  function updatePopupContainerVisibility(policy: string) {
    allowedContainer.style.display = (policy === 'block' || policy === 'smart') ? '' : 'none';
    blockedContainer.style.display = policy === 'allow' ? '' : 'none';
  }

  renderPopupAllowedSites();
  renderPopupBlockedSites();

  document.getElementById('add-popup-allowed-btn')?.addEventListener('click', () => {
    const input = document.getElementById('popup-allowed-input') as HTMLInputElement;
    const site = input.value.trim();
    if (!site) return;
    if (!settings.popupAllowedSites) settings.popupAllowedSites = [];
    if (settings.popupAllowedSites.indexOf(site) === -1) {
      settings.popupAllowedSites.push(site);
      saveSettings();
      input.value = '';
      renderPopupAllowedSites();
    }
  });

  document.getElementById('add-popup-blocked-btn')?.addEventListener('click', () => {
    const input = document.getElementById('popup-blocked-input') as HTMLInputElement;
    const site = input.value.trim();
    if (!site) return;
    if (!settings.popupBlockedSites) settings.popupBlockedSites = [];
    if (settings.popupBlockedSites.indexOf(site) === -1) {
      settings.popupBlockedSites.push(site);
      saveSettings();
      input.value = '';
      renderPopupBlockedSites();
    }
  });
}

function renderPopupAllowedSites() {
  const container = document.getElementById('popup-allowed-list');
  if (!container) return;
  container.innerHTML = '';

  (settings.popupAllowedSites || []).forEach((site, idx) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div class="list-item-content"><span class="list-item-text">${site}</span></div>
      <div class="list-item-actions">
        <button class="list-item-btn" title="Remove"><i data-lucide="x" width="14" height="14"></i></button>
      </div>
    `;
    item.querySelector('.list-item-btn')?.addEventListener('click', () => {
      settings.popupAllowedSites.splice(idx, 1);
      saveSettings();
      renderPopupAllowedSites();
    });
    container.appendChild(item);
  });

  createIcons({ icons });
}

function renderPopupBlockedSites() {
  const container = document.getElementById('popup-blocked-list');
  if (!container) return;
  container.innerHTML = '';

  (settings.popupBlockedSites || []).forEach((site, idx) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div class="list-item-content"><span class="list-item-text">${site}</span></div>
      <div class="list-item-actions">
        <button class="list-item-btn" title="Remove"><i data-lucide="x" width="14" height="14"></i></button>
      </div>
    `;
    item.querySelector('.list-item-btn')?.addEventListener('click', () => {
      settings.popupBlockedSites.splice(idx, 1);
      saveSettings();
      renderPopupBlockedSites();
    });
    container.appendChild(item);
  });

  createIcons({ icons });
}

// ---- Data Retention Settings ----
function initDataRetentionSettings() {
  const autoDeleteToggle = document.getElementById('auto-delete-toggle') as HTMLInputElement;
  const retentionSettings = document.getElementById('retention-settings');
  const clearHistoryCloseToggle = document.getElementById('clear-history-close-toggle') as HTMLInputElement;
  const clearCacheCloseToggle = document.getElementById('clear-cache-close-toggle') as HTMLInputElement;

  autoDeleteToggle.checked = settings.autoDeleteEnabled || false;
  retentionSettings.style.display = autoDeleteToggle.checked ? '' : 'none';
  clearHistoryCloseToggle.checked = settings.clearHistoryOnClose || false;
  clearCacheCloseToggle.checked = settings.clearCacheOnClose || false;

  // Retention selectors
  setSelectValue('retention-history', settings.retentionBrowsingHistory || '30');
  setSelectValue('retention-downloads', settings.retentionDownloadHistory || '90');
  setSelectValue('retention-cookies', settings.retentionCookiesSiteData || '30');
  setSelectValue('retention-cache', settings.retentionCachedFiles || '30');
  setSelectValue('retention-autofill', settings.retentionAutofillData || 'never');

  autoDeleteToggle.addEventListener('change', () => {
    settings.autoDeleteEnabled = autoDeleteToggle.checked;
    retentionSettings.style.display = autoDeleteToggle.checked ? '' : 'none';
    saveSettings();
  });

  clearHistoryCloseToggle.addEventListener('change', () => {
    settings.clearHistoryOnClose = clearHistoryCloseToggle.checked;
    saveSettings();
  });

  clearCacheCloseToggle.addEventListener('change', () => {
    settings.clearCacheOnClose = clearCacheCloseToggle.checked;
    saveSettings();
  });

  // Retention period selectors
  ['retention-history', 'retention-downloads', 'retention-cookies', 'retention-cache', 'retention-autofill'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      const select = document.getElementById(id) as HTMLSelectElement;
      switch (id) {
        case 'retention-history': settings.retentionBrowsingHistory = select.value; break;
        case 'retention-downloads': settings.retentionDownloadHistory = select.value; break;
        case 'retention-cookies': settings.retentionCookiesSiteData = select.value; break;
        case 'retention-cache': settings.retentionCachedFiles = select.value; break;
        case 'retention-autofill': settings.retentionAutofillData = select.value; break;
      }
      saveSettings();
    });
  });

  // Clear data dialog
  const clearDataBtn = document.getElementById('clear-data-btn');
  const clearDataDialog = document.getElementById('clear-data-dialog');
  const clearDataCancel = document.getElementById('clear-data-cancel');
  const clearDataConfirm = document.getElementById('clear-data-confirm');

  clearDataBtn?.addEventListener('click', () => {
    clearDataDialog.style.display = 'flex';
  });

  clearDataCancel?.addEventListener('click', () => {
    clearDataDialog.style.display = 'none';
  });

  clearDataDialog?.addEventListener('click', (e) => {
    if (e.target === clearDataDialog) clearDataDialog.style.display = 'none';
  });

  clearDataConfirm?.addEventListener('click', async () => {
    const options = {
      timeRange: (document.getElementById('clear-time-range') as HTMLSelectElement).value,
      browsingHistory: (document.getElementById('clear-history-cb') as HTMLInputElement).checked,
      downloadHistory: (document.getElementById('clear-downloads-cb') as HTMLInputElement).checked,
      cookiesSiteData: (document.getElementById('clear-cookies-cb') as HTMLInputElement).checked,
      cachedFiles: (document.getElementById('clear-cache-cb') as HTMLInputElement).checked,
      autofillData: (document.getElementById('clear-autofill-cb') as HTMLInputElement).checked,
      savedPasswords: (document.getElementById('clear-passwords-cb') as HTMLInputElement).checked,
      sitePermissions: (document.getElementById('clear-permissions-cb') as HTMLInputElement).checked,
    };
    await (window as any).BrowserAPI.clearBrowsingData(options);
    clearDataDialog.style.display = 'none';
    showToast('Browsing data cleared');
    updateCookieCount();
  });
}

function setSelectValue(id: string, value: string) {
  const select = document.getElementById(id) as HTMLSelectElement;
  if (select) select.value = value;
}

// ---- User Agent Settings ----
function initUserAgentSettings() {
  const select = document.getElementById('user-agent-select') as HTMLSelectElement;
  const customContainer = document.getElementById('custom-ua-container');
  const customInput = document.getElementById('custom-ua-input') as HTMLInputElement;
  const preview = document.getElementById('ua-preview');

  // Set initial values
  const defaultPreset = process.platform === 'darwin' ? 'chrome-mac' : process.platform === 'linux' ? 'chrome-linux' : 'chrome-windows';
  select.value = settings.userAgentPreset || defaultPreset;
  customInput.value = settings.userAgentCustomValue || '';
  customContainer.style.display = select.value === 'custom' ? '' : 'none';
  updateUAPreview();

  select.addEventListener('change', () => {
    settings.userAgentPreset = select.value as BrowserSettings['userAgentPreset'];
    customContainer.style.display = select.value === 'custom' ? '' : 'none';
    updateUAPreview();
    saveSettings();
    showToast('User agent updated');
  });

  customInput.addEventListener('change', () => {
    settings.userAgentCustomValue = customInput.value;
    updateUAPreview();
    saveSettings();
    showToast('Custom user agent saved');
  });

  function updateUAPreview() {
    const preset = select.value;
    let ua: string;
    if (preset === 'custom') {
      ua = customInput.value || navigator.userAgent;
    } else {
      ua = USER_AGENT_PRESETS[preset]?.value || navigator.userAgent;
    }
    preview.textContent = `Current: ${ua}`;
  }
}

// ---- Network / Proxy Settings ----
function initNetworkSettings() {
  const radios = document.querySelectorAll('input[name="proxy-mode"]') as NodeListOf<HTMLInputElement>;
  const manualForm = document.getElementById('manual-proxy-form');
  const pacForm = document.getElementById('pac-proxy-form');
  const bypassToggle = document.getElementById('bypass-internal-toggle') as HTMLInputElement;

  // Set initial values
  radios.forEach(r => { if (r.value === settings.proxyMode) r.checked = true; });
  updateProxyFormVisibility(settings.proxyMode);

  (document.getElementById('proxy-http-host') as HTMLInputElement).value = settings.proxyHttpHost || '';
  (document.getElementById('proxy-http-port') as HTMLInputElement).value = settings.proxyHttpPort || '';
  (document.getElementById('proxy-https-host') as HTMLInputElement).value = settings.proxyHttpsHost || '';
  (document.getElementById('proxy-https-port') as HTMLInputElement).value = settings.proxyHttpsPort || '';
  (document.getElementById('proxy-socks-host') as HTMLInputElement).value = settings.proxySocksHost || '';
  (document.getElementById('proxy-socks-port') as HTMLInputElement).value = settings.proxySocksPort || '';
  (document.getElementById('proxy-socks-version') as HTMLSelectElement).value = settings.proxySocksVersion || '5';
  (document.getElementById('proxy-bypass') as HTMLInputElement).value = settings.proxyBypassList || '';
  (document.getElementById('proxy-pac-url') as HTMLInputElement).value = settings.proxyPacUrl || '';
  bypassToggle.checked = settings.bypassProxyForInternal !== false;

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      settings.proxyMode = radio.value as BrowserSettings['proxyMode'];
      updateProxyFormVisibility(radio.value);
      saveSettings();
      showToast('Proxy settings updated');
    });
  });

  // Save proxy fields on change (debounced)
  const proxyFields = ['proxy-http-host', 'proxy-http-port', 'proxy-https-host', 'proxy-https-port', 'proxy-socks-host', 'proxy-socks-port', 'proxy-bypass', 'proxy-pac-url'];
  proxyFields.forEach(fieldId => {
    const el = document.getElementById(fieldId) as HTMLInputElement;
    el?.addEventListener('change', () => {
      switch (fieldId) {
        case 'proxy-http-host': settings.proxyHttpHost = el.value; break;
        case 'proxy-http-port': settings.proxyHttpPort = el.value; break;
        case 'proxy-https-host': settings.proxyHttpsHost = el.value; break;
        case 'proxy-https-port': settings.proxyHttpsPort = el.value; break;
        case 'proxy-socks-host': settings.proxySocksHost = el.value; break;
        case 'proxy-socks-port': settings.proxySocksPort = el.value; break;
        case 'proxy-bypass': settings.proxyBypassList = el.value; break;
        case 'proxy-pac-url': settings.proxyPacUrl = el.value; break;
      }
      saveSettings();
    });
  });

  document.getElementById('proxy-socks-version')?.addEventListener('change', () => {
    settings.proxySocksVersion = (document.getElementById('proxy-socks-version') as HTMLSelectElement).value;
    saveSettings();
  });

  bypassToggle.addEventListener('change', () => {
    settings.bypassProxyForInternal = bypassToggle.checked;
    saveSettings();
  });
}

function updateProxyFormVisibility(mode: string) {
  const manualForm = document.getElementById('manual-proxy-form');
  const pacForm = document.getElementById('pac-proxy-form');
  manualForm.style.display = mode === 'manual' ? '' : 'none';
  pacForm.style.display = mode === 'pac' ? '' : 'none';
}

// ---- Keyboard Shortcuts ----
function initKeyboardShortcuts() {
  // Build shortcuts list from defaults + overrides
  shortcuts = DEFAULT_KEYBOARD_SHORTCUTS.map(s => ({
    ...s,
    currentShortcut: settings.keyboardShortcuts?.[s.id] || s.defaultShortcut,
  }));

  renderShortcutsTable();

  // Category filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = (btn as HTMLElement).dataset.filter;
      renderShortcutsTable();
    });
  });

  // Search filter
  document.getElementById('shortcut-search')?.addEventListener('input', () => {
    renderShortcutsTable();
  });

  // Reset all
  document.getElementById('reset-all-shortcuts-btn')?.addEventListener('click', () => {
    if (confirm('Reset all keyboard shortcuts to defaults?')) {
      settings.keyboardShortcuts = {};
      saveSettings();
      shortcuts = DEFAULT_KEYBOARD_SHORTCUTS.map(s => ({ ...s }));
      renderShortcutsTable();
      showToast('All shortcuts reset to defaults');
    }
  });

  // Global key listener for recording
  document.addEventListener('keydown', handleShortcutRecording);
}

function renderShortcutsTable() {
  const tbody = document.getElementById('shortcuts-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const searchTerm = ((document.getElementById('shortcut-search') as HTMLInputElement)?.value || '').toLowerCase();

  const filtered = shortcuts.filter(s => {
    if (activeFilter !== 'all' && s.category !== activeFilter) return false;
    if (searchTerm && s.label.toLowerCase().indexOf(searchTerm) === -1 && s.currentShortcut.toLowerCase().indexOf(searchTerm) === -1) return false;
    return true;
  });

  filtered.forEach(shortcut => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${shortcut.label}</td>
      <td><span class="shortcut-category-badge">${shortcut.category}</span></td>
      <td>${formatShortcutDisplay(shortcut.defaultShortcut)}</td>
      <td class="shortcut-key-cell" data-action-id="${shortcut.id}">
        <span class="shortcut-key">${formatShortcutDisplay(shortcut.currentShortcut)}</span>
      </td>
      <td>
        <button class="shortcut-reset-btn" data-action-id="${shortcut.id}" title="Reset to default">&#8634;</button>
      </td>
    `;

    // Click to record
    const keyCell = tr.querySelector('.shortcut-key-cell') as HTMLElement;
    keyCell?.addEventListener('click', () => startRecording(keyCell, shortcut));

    // Reset button
    const resetBtn = tr.querySelector('.shortcut-reset-btn') as HTMLElement;
    resetBtn?.addEventListener('click', () => {
      shortcut.currentShortcut = shortcut.defaultShortcut;
      if (settings.keyboardShortcuts?.[shortcut.id]) {
        delete settings.keyboardShortcuts[shortcut.id];
      }
      saveSettings();
      renderShortcutsTable();
    });

    tbody.appendChild(tr);
  });
}

function startRecording(cell: HTMLElement, shortcut: KeyboardShortcutAction) {
  // Cancel previous recording
  if (recordingCell) {
    recordingCell.classList.remove('recording');
  }
  recordingCell = cell;
  cell.classList.add('recording');
  cell.dataset.recordingFor = shortcut.id;
}

function handleShortcutRecording(e: KeyboardEvent) {
  if (!recordingCell) return;

  e.preventDefault();
  e.stopPropagation();

  // Allow clearing with Backspace/Delete
  if (e.key === 'Backspace' || e.key === 'Delete') {
    const actionId = recordingCell.dataset.recordingFor;
    const shortcut = shortcuts.find(s => s.id === actionId);
    if (shortcut) {
      shortcut.currentShortcut = '';
      if (!settings.keyboardShortcuts) settings.keyboardShortcuts = {};
      settings.keyboardShortcuts[actionId] = '';
      saveSettings();
    }
    recordingCell.classList.remove('recording');
    recordingCell = null;
    renderShortcutsTable();
    return;
  }

  // Escape cancels recording
  if (e.key === 'Escape') {
    recordingCell.classList.remove('recording');
    recordingCell = null;
    return;
  }

  // Ignore standalone modifier keys
  if (['Control', 'Shift', 'Alt', 'Meta'].indexOf(e.key) >= 0) return;

  // Build key combination
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('mod');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');

  // Must have modifier (except for function keys)
  const isFunctionKey = /^F\d+$/.test(e.key);
  if (parts.length === 0 && !isFunctionKey && e.key !== 'Escape') {
    showToast('Shortcuts must include a modifier key (Ctrl/Cmd)');
    return;
  }

  // Get key name
  let keyName = e.key;
  if (keyName === ' ') keyName = 'Space';
  if (keyName.length === 1) keyName = keyName.toUpperCase();
  if (keyName === 'ArrowLeft') keyName = 'Left';
  if (keyName === 'ArrowRight') keyName = 'Right';
  if (keyName === 'ArrowUp') keyName = 'Up';
  if (keyName === 'ArrowDown') keyName = 'Down';

  parts.push(keyName);
  const combo = parts.join('+');

  // Check for conflicts
  const actionId = recordingCell.dataset.recordingFor;
  const conflicting = shortcuts.find(s => s.id !== actionId && s.currentShortcut === combo);

  if (conflicting) {
    const swap = confirm(`"${combo}" is already assigned to "${conflicting.label}". Swap bindings?`);
    if (swap) {
      const currentShortcut = shortcuts.find(s => s.id === actionId);
      conflicting.currentShortcut = currentShortcut?.currentShortcut || '';
      if (!settings.keyboardShortcuts) settings.keyboardShortcuts = {};
      settings.keyboardShortcuts[conflicting.id] = conflicting.currentShortcut;
    } else {
      recordingCell.classList.remove('recording');
      recordingCell = null;
      return;
    }
  }

  // Apply new binding
  const shortcut = shortcuts.find(s => s.id === actionId);
  if (shortcut) {
    shortcut.currentShortcut = combo;
    if (!settings.keyboardShortcuts) settings.keyboardShortcuts = {};
    settings.keyboardShortcuts[actionId] = combo;
    saveSettings();
  }

  recordingCell.classList.remove('recording');
  recordingCell = null;
  renderShortcutsTable();
  showToast(`Shortcut updated: ${combo}`);
}

function formatShortcutDisplay(combo: string): string {
  if (!combo) return '<span style="color: var(--text-secondary); font-style: italic;">None</span>';
  return combo.split('+').map(part => {
    let display = part;
    if (part === 'mod') display = modKey;
    return `<span class="keycap">${display}</span>`;
  }).join('');
}

// ---- Permissions Settings ----
const PERMISSION_INFO: Record<string, { label: string; icon: string }> = {
  'media': { label: 'Camera/Microphone', icon: 'camera' },
  'geolocation': { label: 'Location', icon: 'map-pin' },
  'notifications': { label: 'Notifications', icon: 'bell' },
  'midi': { label: 'MIDI Devices', icon: 'music' },
  'midiSysex': { label: 'MIDI System Exclusive', icon: 'music' },
  'display-capture': { label: 'Screen Sharing', icon: 'monitor' },
  'clipboard-read': { label: 'Clipboard', icon: 'clipboard' },
  'idle-detection': { label: 'Idle Detection', icon: 'moon' },
  'storage-access': { label: 'Storage Access', icon: 'hard-drive' },
  'window-management': { label: 'Window Management', icon: 'app-window' },
  'local-fonts': { label: 'Local Fonts', icon: 'type' },
  'screen-wake-lock': { label: 'Screen Wake Lock', icon: 'monitor' },
  'speaker-selection': { label: 'Speaker Selection', icon: 'speaker' },
  'keyboard-lock': { label: 'Keyboard Lock', icon: 'keyboard' },
  'usb': { label: 'USB Devices', icon: 'usb' },
  'serial': { label: 'Serial Ports', icon: 'usb' },
  'bluetooth': { label: 'Bluetooth Devices', icon: 'bluetooth' },
  'hid': { label: 'HID Devices', icon: 'keyboard' },
};

function getPermLabel(permissionType: string): string {
  return PERMISSION_INFO[permissionType]?.label || permissionType;
}

function getPermIcon(permissionType: string): string {
  return PERMISSION_INFO[permissionType]?.icon || 'shield-alert';
}

interface PermissionRecord {
  id: string;
  origin: string;
  permissionType: string;
  decision: string;
  createdAt: string;
  lastAccessedAt: string;
}

let permissionsSearchTimeout: ReturnType<typeof setTimeout> | null = null;

async function initPermissionsSettings() {
  await loadAndRenderPermissions();

  const searchInput = document.getElementById('permissions-search') as HTMLInputElement;
  searchInput?.addEventListener('input', () => {
    if (permissionsSearchTimeout) clearTimeout(permissionsSearchTimeout);
    permissionsSearchTimeout = setTimeout(() => {
      loadAndRenderPermissions(searchInput.value.trim());
    }, 300);
  });

  document.getElementById('clear-all-permissions-btn')?.addEventListener('click', async () => {
    if (!confirm('Remove all site permissions? Sites will need to request permissions again.')) return;
    await (window as any).BrowserAPI.clearAllPermissions();
    showToast('All permissions cleared');
    loadAndRenderPermissions();
  });
}

async function loadAndRenderPermissions(searchTerm?: string) {
  const permissions: PermissionRecord[] = await (window as any).BrowserAPI.fetchPermissions(searchTerm || '');
  renderPermissions(permissions);
}

function renderPermissions(permissions: PermissionRecord[]) {
  const container = document.getElementById('permissions-list')!;
  const emptyState = document.getElementById('permissions-empty')!;
  const footer = document.getElementById('permissions-footer')!;

  container.innerHTML = '';

  if (permissions.length === 0) {
    emptyState.style.display = '';
    footer.style.display = 'none';
    createIcons({ icons });
    return;
  }

  emptyState.style.display = 'none';
  footer.style.display = '';

  // Group by origin
  const grouped = new Map<string, PermissionRecord[]>();
  for (const perm of permissions) {
    const list = grouped.get(perm.origin) || [];
    list.push(perm);
    grouped.set(perm.origin, list);
  }

  for (const [origin, perms] of grouped) {
    const group = document.createElement('div');
    group.className = 'permission-origin-group';

    // Header
    const header = document.createElement('div');
    header.className = 'permission-origin-header';
    header.innerHTML = `
      <span class="permission-origin-name">${escapeHtml(origin)}</span>
      <span class="permission-origin-actions">
        <button class="btn btn-sm btn-secondary permission-remove-all-btn"><i data-lucide="trash-2" width="12" height="12"></i> Remove All</button>
      </span>
    `;
    header.querySelector('.permission-remove-all-btn')!.addEventListener('click', async () => {
      await (window as any).BrowserAPI.removeAllPermissionsForOrigin(origin);
      group.remove();
      showToast(`Permissions removed for ${origin}`);
      // Check if list is now empty
      if (container.children.length === 0) {
        emptyState.style.display = '';
        footer.style.display = 'none';
        createIcons({ icons });
      }
    });
    group.appendChild(header);

    // Permission entries
    for (const perm of perms) {
      const entry = document.createElement('div');
      entry.className = 'permission-entry';

      const iconName = getPermIcon(perm.permissionType);
      const label = getPermLabel(perm.permissionType);
      const isAllowed = perm.decision === 'allowed_persistent';

      entry.innerHTML = `
        <i data-lucide="${iconName}" class="permission-entry-icon" width="18" height="18"></i>
        <span class="permission-entry-label">${escapeHtml(label)}</span>
        <span class="permission-entry-decision">
          <select class="form-select-sm permission-decision-select">
            <option value="allowed_persistent" ${isAllowed ? 'selected' : ''}>Allow</option>
            <option value="denied_persistent" ${!isAllowed ? 'selected' : ''}>Deny</option>
          </select>
        </span>
        <button class="permission-entry-remove" title="Remove permission"><i data-lucide="x" width="14" height="14"></i></button>
      `;

      // Decision change handler
      const select = entry.querySelector('.permission-decision-select') as HTMLSelectElement;
      select.addEventListener('change', async () => {
        await (window as any).BrowserAPI.updatePermissionDecision(perm.id, select.value);
        showToast(`${label} ${select.value === 'allowed_persistent' ? 'allowed' : 'denied'} for ${origin}`);
      });

      // Remove handler
      entry.querySelector('.permission-entry-remove')!.addEventListener('click', async () => {
        await (window as any).BrowserAPI.removePermission(perm.id);
        entry.remove();
        showToast(`${label} permission removed`);
        // If group is now empty (only header remains), remove group
        if (group.querySelectorAll('.permission-entry').length === 0) {
          group.remove();
          if (container.children.length === 0) {
            emptyState.style.display = '';
            footer.style.display = 'none';
            createIcons({ icons });
          }
        }
      });

      group.appendChild(entry);
    }

    container.appendChild(group);
  }

  createIcons({ icons });
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

createIcons({ icons });
