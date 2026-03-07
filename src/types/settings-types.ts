export interface SearchEngineConfig {
  id: string;
  name: string;
  searchUrlTemplate: string;
  suggestUrlTemplate?: string;
  faviconUrl?: string;
  isBuiltIn: boolean;
  isHidden?: boolean;
}

export interface FilterListConfig {
  id: string;
  name: string;
  url: string;
  description: string;
  enabled: boolean;
  isBuiltIn: boolean;
  lastUpdated?: string;
}

export interface KeyboardShortcutAction {
  id: string;
  label: string;
  category: string;
  defaultShortcut: string;
  currentShortcut: string;
  isReserved?: boolean;
}

export interface BrowserSettings {
  settings_version: number;

  // Search
  primarySearchEngine: string;
  customSearchEngines: SearchEngineConfig[];
  showSearchSuggestions: boolean;

  // Privacy - Cookies
  cookiePolicy: 'block-all-third-party' | 'block-with-exceptions' | 'allow-all';
  cookieExceptions: string[];
  blockAllCookies: boolean;
  clearCookiesOnClose: boolean;

  // Privacy - Ad Blocker
  adBlockerEnabled: boolean;
  adBlockerFilterLists: FilterListConfig[];
  adBlockerAllowedSites: string[];

  // Network - Proxy
  proxyMode: 'direct' | 'system' | 'manual' | 'pac';
  proxyHttpHost: string;
  proxyHttpPort: string;
  proxyHttpsHost: string;
  proxyHttpsPort: string;
  proxySocksHost: string;
  proxySocksPort: string;
  proxySocksVersion: string;
  proxyBypassList: string;
  proxyPacUrl: string;
  bypassProxyForInternal: boolean;

  // Data Retention
  autoDeleteEnabled: boolean;
  retentionBrowsingHistory: string;
  retentionDownloadHistory: string;
  retentionCookiesSiteData: string;
  retentionCachedFiles: string;
  retentionAutofillData: string;
  clearHistoryOnClose: boolean;
  clearCacheOnClose: boolean;

  // Pop-ups
  popupPolicy: 'block' | 'allow' | 'smart';
  popupAllowedSites: string[];
  popupBlockedSites: string[];

  // Keyboard Shortcuts
  keyboardShortcuts: Record<string, string>;
}

export const DEFAULT_SEARCH_ENGINES: SearchEngineConfig[] = [
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    searchUrlTemplate: 'https://duckduckgo.com/?q=%s',
    suggestUrlTemplate: 'https://duckduckgo.com/ac/?q=%s&type=list',
    isBuiltIn: true,
  },
  {
    id: 'google',
    name: 'Google',
    searchUrlTemplate: 'https://www.google.com/search?q=%s',
    suggestUrlTemplate: 'https://suggestqueries.google.com/complete/search?client=firefox&q=%s',
    isBuiltIn: true,
  },
  {
    id: 'bing',
    name: 'Bing',
    searchUrlTemplate: 'https://www.bing.com/search?q=%s',
    suggestUrlTemplate: 'https://api.bing.com/osjson.aspx?query=%s',
    isBuiltIn: true,
  },
  {
    id: 'brave',
    name: 'Brave Search',
    searchUrlTemplate: 'https://search.brave.com/search?q=%s',
    isBuiltIn: true,
  },
  {
    id: 'startpage',
    name: 'Startpage',
    searchUrlTemplate: 'https://www.startpage.com/search?q=%s',
    isBuiltIn: true,
  },
  {
    id: 'ecosia',
    name: 'Ecosia',
    searchUrlTemplate: 'https://www.ecosia.org/search?q=%s',
    isBuiltIn: true,
  },
];

export const DEFAULT_FILTER_LISTS: FilterListConfig[] = [
  {
    id: 'easylist',
    name: 'EasyList',
    url: 'https://easylist.to/easylist/easylist.txt',
    description: 'Standard ad-blocking rules',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'easyprivacy',
    name: 'EasyPrivacy',
    url: 'https://easylist.to/easylist/easyprivacy.txt',
    description: 'Tracking protection rules',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'peter-lowe',
    name: "Peter Lowe's Ad Server List",
    url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&showintro=1&mimetype=plaintext',
    description: 'Lightweight domain-level blocking',
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'fanboy-annoyances',
    name: "Fanboy's Annoyances",
    url: 'https://secure.fanboy.co.nz/fanboy-annoyance.txt',
    description: 'Cookie notices, social widgets, popups',
    enabled: false,
    isBuiltIn: true,
  },
];

export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcutAction[] = [
  { id: 'new-tab', label: 'New Tab', category: 'Tabs', defaultShortcut: 'mod+T', currentShortcut: 'mod+T' },
  { id: 'close-tab', label: 'Close Tab', category: 'Tabs', defaultShortcut: 'mod+W', currentShortcut: 'mod+W' },
  { id: 'reopen-closed-tab', label: 'Reopen Closed Tab', category: 'Tabs', defaultShortcut: 'mod+Shift+T', currentShortcut: 'mod+Shift+T' },
  { id: 'new-window', label: 'New Window', category: 'Window', defaultShortcut: 'mod+N', currentShortcut: 'mod+N' },
  { id: 'private-window', label: 'Private Window', category: 'Window', defaultShortcut: 'mod+Shift+N', currentShortcut: 'mod+Shift+N' },
  { id: 'focus-url-bar', label: 'Focus URL Bar', category: 'Navigation', defaultShortcut: 'mod+L', currentShortcut: 'mod+L' },
  { id: 'reload-page', label: 'Reload Page', category: 'Navigation', defaultShortcut: 'mod+R', currentShortcut: 'mod+R' },
  { id: 'hard-reload', label: 'Hard Reload', category: 'Navigation', defaultShortcut: 'mod+Shift+R', currentShortcut: 'mod+Shift+R' },
  { id: 'go-back', label: 'Back', category: 'Navigation', defaultShortcut: 'Alt+Left', currentShortcut: 'Alt+Left' },
  { id: 'go-forward', label: 'Forward', category: 'Navigation', defaultShortcut: 'Alt+Right', currentShortcut: 'Alt+Right' },
  { id: 'find-on-page', label: 'Find on Page', category: 'Utilities', defaultShortcut: 'mod+F', currentShortcut: 'mod+F' },
  { id: 'open-settings', label: 'Open Settings', category: 'Utilities', defaultShortcut: 'mod+,', currentShortcut: 'mod+,' },
  { id: 'open-downloads', label: 'Open Downloads', category: 'Utilities', defaultShortcut: 'mod+Shift+D', currentShortcut: 'mod+Shift+D' },
  { id: 'open-history', label: 'Open History', category: 'Utilities', defaultShortcut: 'mod+Shift+H', currentShortcut: 'mod+Shift+H' },
  { id: 'bookmark-page', label: 'Bookmark Page', category: 'Bookmarks', defaultShortcut: 'mod+D', currentShortcut: 'mod+D' },
  { id: 'open-bookmarks', label: 'Open Bookmarks', category: 'Bookmarks', defaultShortcut: 'mod+Shift+B', currentShortcut: 'mod+Shift+B' },
  { id: 'toggle-devtools', label: 'Toggle DevTools', category: 'Developer', defaultShortcut: 'F12', currentShortcut: 'F12' },
  { id: 'zoom-in', label: 'Zoom In', category: 'View', defaultShortcut: 'mod+Shift+=', currentShortcut: 'mod+Shift+=' },
  { id: 'zoom-out', label: 'Zoom Out', category: 'View', defaultShortcut: 'mod+Shift+-', currentShortcut: 'mod+Shift+-' },
  { id: 'reset-zoom', label: 'Reset Zoom', category: 'View', defaultShortcut: 'mod+0', currentShortcut: 'mod+0' },
  { id: 'command-k', label: 'Command Palette', category: 'Utilities', defaultShortcut: 'mod+K', currentShortcut: 'mod+K' },
];

export const DEFAULT_BROWSER_SETTINGS: BrowserSettings = {
  settings_version: 1,

  // Search - DuckDuckGo as default (privacy-aligned)
  primarySearchEngine: 'DuckDuckGo',
  customSearchEngines: [],
  showSearchSuggestions: false,

  // Privacy - Cookies (strict by default)
  cookiePolicy: 'block-all-third-party',
  cookieExceptions: [],
  blockAllCookies: false,
  clearCookiesOnClose: false,

  // Privacy - Ad Blocker (on by default)
  adBlockerEnabled: true,
  adBlockerFilterLists: [...DEFAULT_FILTER_LISTS],
  adBlockerAllowedSites: [],

  // Network - Proxy (direct by default)
  proxyMode: 'direct',
  proxyHttpHost: '',
  proxyHttpPort: '',
  proxyHttpsHost: '',
  proxyHttpsPort: '',
  proxySocksHost: '',
  proxySocksPort: '',
  proxySocksVersion: '5',
  proxyBypassList: 'localhost, 127.0.0.1',
  proxyPacUrl: '',
  bypassProxyForInternal: true,

  // Data Retention (off by default)
  autoDeleteEnabled: false,
  retentionBrowsingHistory: '30',
  retentionDownloadHistory: '90',
  retentionCookiesSiteData: '30',
  retentionCachedFiles: '30',
  retentionAutofillData: 'never',
  clearHistoryOnClose: false,
  clearCacheOnClose: false,

  // Pop-ups (block by default)
  popupPolicy: 'smart',
  popupAllowedSites: [],
  popupBlockedSites: [],

  // Keyboard Shortcuts (empty = use defaults)
  keyboardShortcuts: {},
};
