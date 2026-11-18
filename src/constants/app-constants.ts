export abstract class ElectronAppEvents {
  public static readonly WILL_FINISH_LAUNCHING = 'will-finish-launching';
  public static readonly READY = 'ready';
  public static readonly WINDOW_ALL_CLOSED = 'window-all-closed';
  public static readonly BEFORE_QUIT = 'before-quit';
  public static readonly WILL_QUIT = 'will-quit';
  public static readonly QUIT = 'quit';
  public static readonly OPEN_FILE = 'open-file';
  public static readonly OPEN_URL = 'open-url';
  public static readonly ACTIVATE = 'activate';
  public static readonly DID_BECOME_ACTIVE = 'did-become-active';
  public static readonly DID_RESIGN_ACTIVE = 'did-resign-active';
  public static readonly CONTINUE_ACTIVITY = 'continue-activity';
  public static readonly WILL_CONTINUE_ACTIVITY = 'will-continue-activity';
  public static readonly CONTINUE_ACTIVITY_ERROR = 'continue-activity-error';
  public static readonly ACTIVITY_WAS_CONTINUED = 'activity-was-continued';
  public static readonly UPDATE_ACTIVITY_STATE = 'update-activity-state';
  public static readonly NEW_WINDOW_FOR_TAB = 'new-window-for-tab';
  public static readonly BROWSER_WINDOW_BLUR = 'browser-window-blur';
  public static readonly BROWSER_WINDOW_FOCUS = 'browser-window-focus';
  public static readonly BROWSER_WINDOW_CREATED = 'browser-window-created';
  public static readonly WEB_CONTENTS_CREATED = 'web-contents-created';
  public static readonly CERTIFICATE_ERROR = 'certificate-error';
  public static readonly SELECT_CLIENT_CERTIFICATE = 'select-client-certificate';
  public static readonly LOGIN = 'login';
  public static readonly GPU_INFO_UPDATE = 'gpu-info-update';
  public static readonly RENDER_PROCESS_GONE = 'render-process-gone';
  public static readonly CHILD_PROCESS_GONE = 'child-process-gone';
  public static readonly ACCESSIBILITY_SUPPORT_CHANGED = 'accessibility-support-changed';
  public static readonly SESSION_CREATED = 'session-created';
  public static readonly SECOND_INSTANCE = 'second-instance';
}

export abstract class WebContentsEvents {
  public static readonly DID_FINISH_LOAD = 'did-finish-load';
  public static readonly DID_FAIL_LOAD = 'did-fail-load';
  public static readonly DID_FAIL_PROVISIONAL_LOAD = 'did-fail-provisional-load';
  public static readonly DID_FRAME_FINISH_LOAD = 'did-frame-finish-load';
  public static readonly DID_START_LOADING = 'did-start-loading';
  public static readonly DID_STOP_LOADING = 'did-stop-loading';
  public static readonly DOM_READY = 'dom-ready';
  public static readonly PAGE_TITLE_UPDATED = 'page-title-updated';
  public static readonly PAGE_FAVICON_UPDATED = 'page-favicon-updated';
  public static readonly CONTENT_BOUNDS_UPDATED = 'content-bounds-updated';
  public static readonly DID_CREATE_WINDOW = 'did-create-window';
  public static readonly WILL_NAVIGATE = 'will-navigate';
  public static readonly WILL_FRAME_NAVIGATE = 'will-frame-navigate';
  public static readonly DID_START_NAVIGATION = 'did-start-navigation';
  public static readonly WILL_REDIRECT = 'will-redirect';
  public static readonly DID_REDIRECT_NAVIGATION = 'did-redirect-navigation';
  public static readonly DID_NAVIGATE = 'did-navigate';
  public static readonly DID_FRAME_NAVIGATE = 'did-frame-navigate';
  public static readonly DID_NAVIGATE_IN_PAGE = 'did-navigate-in-page';
  public static readonly WILL_PREVENT_UNLOAD = 'will-prevent-unload';
  public static readonly RENDER_PROCESS_GONE = 'render-process-gone';
  public static readonly UNRESPONSIVE = 'unresponsive';
  public static readonly RESPONSIVE = 'responsive';
  public static readonly PLUGIN_CRASHED = 'plugin-crashed';
  public static readonly DESTROYED = 'destroyed';
  public static readonly INPUT_EVENT = 'input-event';
  public static readonly BEFORE_INPUT_EVENT = 'before-input-event';
  public static readonly ENTER_HTML_FULL_SCREEN = 'enter-html-full-screen';
  public static readonly LEAVE_HTML_FULL_SCREEN = 'leave-html-full-screen';
  public static readonly ZOOM_CHANGED = 'zoom-changed';
  public static readonly BLUR = 'blur';
  public static readonly FOCUS = 'focus';
  public static readonly DEVTOOLS_OPEN_URL = 'devtools-open-url';
  public static readonly DEVTOOLS_SEARCH_QUERY = 'devtools-search-query';
  public static readonly DEVTOOLS_OPENED = 'devtools-opened';
  public static readonly DEVTOOLS_CLOSED = 'devtools-closed';
  public static readonly DEVTOOLS_FOCUSED = 'devtools-focused';
  public static readonly CERTIFICATE_ERROR = 'certificate-error';
  public static readonly SELECT_CLIENT_CERTIFICATE = 'select-client-certificate';
  public static readonly LOGIN = 'login';
  public static readonly FOUND_IN_PAGE = 'found-in-page';
  public static readonly MEDIA_STARTED_PLAYING = 'media-started-playing';
  public static readonly MEDIA_PAUSED = 'media-paused';
  public static readonly AUDIO_STATE_CHANGED = 'audio-state-changed';
  public static readonly DID_CHANGE_THEME_COLOR = 'did-change-theme-color';
  public static readonly UPDATE_TARGET_URL = 'update-target-url';
  public static readonly CURSOR_CHANGED = 'cursor-changed';
  public static readonly CONTEXT_MENU = 'context-menu';
  public static readonly SELECT_BLUETOOTH_DEVICE = 'select-bluetooth-device';
  public static readonly PAINT = 'paint';
  public static readonly DEVTOOLS_RELOAD_PAGE = 'devtools-reload-page';
  public static readonly WILL_ATTACH_WEBVIEW = 'will-attach-webview';
  public static readonly DID_ATTACH_WEBVIEW = 'did-attach-webview';
  public static readonly CONSOLE_MESSAGE = 'console-message';
  public static readonly PRELOAD_ERROR = 'preload-error';
  public static readonly IPC_MESSAGE = 'ipc-message';
  public static readonly IPC_MESSAGE_SYNC = 'ipc-message-sync';
  public static readonly PREFERRED_SIZE_CHANGED = 'preferred-size-changed';
  public static readonly FRAME_CREATED = 'frame-created';
}

export abstract class RendererToMainEventsForBrowserIPC {
  public static readonly CREATE_TAB = 'browser:create-tab';
  public static readonly ACTIVATE_TAB = 'browser:activate-tab';
  public static readonly CLOSE_TAB = 'browser:close-tab';
  public static readonly NAVIGATE = 'browser:navigate';
  public static readonly GET_ACTIVE_APP_WINDOW_ID = 'browser:get-active-app-window-id';
  public static readonly GO_BACK = 'browser:go-back';
  public static readonly GO_FORWARD = 'browser:go-forward';
  public static readonly REFRESH = 'browser:refresh';
  public static readonly HARD_RELOAD = 'browser:hard-reload';
  public static readonly STOP_LOADING = 'browser:stop-loading';
  public static readonly ADD_BOOKMARK = 'browser:add-bookmark';
  public static readonly REMOVE_BOOKMARK = 'browser:remove-bookmark';
  public static readonly REMOVE_ALL_BOOKMARKS = 'browser:remove-all-bookmarks';
  public static readonly FETCH_BOOKMARK = 'browser:fetch-bookmark';
  public static readonly UPDATE_BOOKMARK_TYPE = 'browser:update-bookmark-type';
  public static readonly FETCH_BOOKMARKS_WITH_STATS = 'browser:fetch-bookmarks-with-stats';
  // public static readonly ADD_DOWNLOAD = "browser:add-download";
  public static readonly REMOVE_DOWNLOAD = 'browser:remove-download';
  public static readonly REMOVE_ALL_DOWNLOADS = 'browser:remove-all-downloads';
  public static readonly FETCH_DOWNLOAD = 'browser:fetch-download';
  public static readonly FETCH_ACTIVE_DOWNLOADS = 'browser:fetch-active-downloads';
  public static readonly PAUSE_DOWNLOAD = 'browser:pause-download';
  public static readonly RESUME_DOWNLOAD = 'browser:resume-download';
  public static readonly CANCEL_DOWNLOAD = 'browser:cancel-download';
  public static readonly OPEN_DOWNLOADED_FILE = 'browser:open-downloaded-file';
  public static readonly SHOW_ITEM_IN_FOLDER = 'browser:show-item-in-folder';
  public static readonly SELECT_DOWNLOAD_FOLDER = 'browser:select-download-folder';
  public static readonly REMOVE_BROWSING_HISTORY = 'browser:remove-browsing-history';
  public static readonly REMOVE_ALL_BROWSING_HISTORY = 'browser:remove-all-browsing-history';
  public static readonly FETCH_BROWSING_HISTORY = 'browser:fetch-browsing-history';
  public static readonly FETCH_BROWSING_HISTORY_STATS = 'browser:fetch-browsing-history-stats';
  public static readonly FETCH_TOP_SITES = 'browser:fetch-top-sites';

  public static readonly HANDLE_FILE_SELECTION = 'browser:handle-file-selection';
  public static readonly OPEN_PDF_FILE = 'browser:open-pdf-file';

  public static readonly UPDATE_BROWSER_VIEW_BOUNDS = 'browser:update-browser-view-bounds';
  public static readonly CLOSE_WINDOW = 'browser:close-window';
  public static readonly TOGGLE_FULLSCREEN_WINDOW = 'browser:toggle-fullscreen-window';
  public static readonly SHOW_OPTIONS_MENU = 'browser:show-options-menu';
  public static readonly HIDE_OPTIONS_MENU = 'browser:hide-options-menu';
  public static readonly SHOW_COMMAND_K_OVERLAY = 'browser:show-command-k-overlay';
  public static readonly HIDE_COMMAND_K_OVERLAY = 'browser:hide-command-k-overlay';
  public static readonly SHOW_COMMAND_O_OVERLAY = 'browser:show-command-o-overlay';
  public static readonly HIDE_COMMAND_O_OVERLAY = 'browser:hide-command-o-overlay';
  public static readonly SHOW_URL_AUTOCOMPLETE_OVERLAY = 'browser:show-url-autocomplete-overlay';
  public static readonly UPDATE_URL_AUTOCOMPLETE_OVERLAY =
    'browser:update-url-autocomplete-overlay';
  public static readonly HIDE_URL_AUTOCOMPLETE_OVERLAY = 'browser:hide-url-autocomplete-overlay';
  public static readonly DISMISS_URL_AUTOCOMPLETE_OVERLAY =
    'browser:dismiss-url-autocomplete-overlay';
  public static readonly URL_AUTOCOMPLETE_RESULT_CLICKED =
    'browser:url-autocomplete-result-clicked';
  public static readonly FETCH_ALL_WINDOWS_TABS = 'browser:fetch-all-windows-tabs';
  public static readonly MOVE_TAB_TO_WINDOW = 'browser:move-tab-to-window';
  public static readonly REORDER_TABS = 'browser:reorder-tabs';
  public static readonly CREATE_NEW_APP_WINDOW = 'browser:create-new-app-window';
  public static readonly CREATE_NEW_PRIVATE_APP_WINDOW = 'browser:create-new-private-app-window';
  public static readonly EXECUTE_JAVASCRIPT = 'browser:execute-javascript';
  public static readonly GET_SEARCH_URL = 'browser:get-search-url';
  public static readonly FETCH_OPEN_TABS = 'browser:fetch-open-tabs';
  public static readonly FETCH_RECENTLY_CLOSED_TABS = 'browser:fetch-recently-closed-tabs';
  public static readonly RESTORE_CLOSED_TAB = 'browser:restore-closed-tab';
  public static readonly RESTORE_CLOSED_TAB_BY_INDEX = 'browser:restore-closed-tab-by-index';
  public static readonly FETCH_CLOSED_WINDOWS = 'browser:fetch-closed-windows';
  public static readonly RESTORE_CLOSED_WINDOW = 'browser:restore-closed-window';
  public static readonly FETCH_SESSION_STATE = 'browser:fetch-session-state';
  public static readonly RESTORE_PREVIOUS_SESSION = 'browser:restore-previous-session';
  public static readonly SHOW_ABOUT_PANEL = 'browser:show-about-panel';
  public static readonly GET_ABOUT_INFO = 'browser:get-about-info';
  public static readonly TOGGLE_READER_MODE = 'browser:toggle-reader-mode';
  public static readonly DOWNLOAD_CURRENT_PDF = 'browser:download-current-pdf';
  public static readonly SHOW_FIND_IN_PAGE = 'browser:show-find-in-page';
  public static readonly HIDE_FIND_IN_PAGE = 'browser:hide-find-in-page';
  public static readonly FIND_IN_PAGE = 'browser:find-in-page';
  public static readonly FIND_IN_PAGE_NEXT = 'browser:find-in-page-next';
  public static readonly FIND_IN_PAGE_PREVIOUS = 'browser:find-in-page-previous';
  public static readonly STOP_FIND_IN_PAGE = 'browser:stop-find-in-page';

  // Settings enforcement
  public static readonly CLEAR_BROWSING_DATA = 'browser:clear-browsing-data';
  public static readonly GET_COOKIE_COUNT = 'browser:get-cookie-count';
  public static readonly APPLY_SETTINGS = 'browser:apply-settings';
  public static readonly GET_STORAGE_ESTIMATE = 'browser:get-storage-estimate';

  // Permission system
  public static readonly PERMISSION_PROMPT_RESPONSE = 'browser:permission-prompt-response';
  public static readonly FETCH_PERMISSIONS = 'browser:fetch-permissions';
  public static readonly REMOVE_PERMISSION = 'browser:remove-permission';
  public static readonly REMOVE_ALL_PERMISSIONS_FOR_ORIGIN =
    'browser:remove-all-permissions-for-origin';
  public static readonly CLEAR_ALL_PERMISSIONS = 'browser:clear-all-permissions';
  public static readonly UPDATE_PERMISSION_DECISION = 'browser:update-permission-decision';
  public static readonly PERMISSION_PROMPT_READY = 'browser:permission-prompt-ready';
  public static readonly OVERLAY_RENDERER_READY = 'overlay:renderer-ready';
  // Display-capture source picker
  public static readonly DISPLAY_CAPTURE_PICKER_GET_SOURCES =
    'browser:display-capture-picker-get-sources';
  public static readonly DISPLAY_CAPTURE_PICKER_SELECT = 'browser:display-capture-picker-select';
  public static readonly SHOW_TAB_CONTEXT_MENU = 'browser:show-tab-context-menu';
  public static readonly PRINT_PAGE = 'browser:print-page';
  public static readonly PIN_TAB = 'browser:pin-tab';
  public static readonly UNPIN_TAB = 'browser:unpin-tab';
  // SSL info overlay
  public static readonly SHOW_SSL_INFO = 'browser:show-ssl-info';
  public static readonly HIDE_SSL_INFO = 'browser:hide-ssl-info';

  // Developer Tools
  public static readonly TOGGLE_DEV_TOOLS = 'browser:toggle-dev-tools';

  // Page zoom
  public static readonly ZOOM_IN = 'browser:zoom-in';
  public static readonly ZOOM_OUT = 'browser:zoom-out';
  public static readonly ZOOM_RESET = 'browser:zoom-reset';
  public static readonly GET_ZOOM_FACTOR = 'browser:get-zoom-factor';
  // Two-finger trackpad pinch, forwarded from the web-content preload as a
  // discrete 'in'/'out' step (the native gesture reaches only the page's DOM).
  public static readonly PINCH_ZOOM = 'browser:pinch-zoom';

  // Issue report
  public static readonly SHOW_ISSUE_REPORT = 'browser:show-issue-report';
  public static readonly HIDE_ISSUE_REPORT = 'browser:hide-issue-report';

  // Alert / confirm / prompt overlay
  public static readonly HIDE_ALERT_OVERLAY = 'browser:hide-alert-overlay';
  public static readonly DIALOG_RESPONSE = 'browser:dialog-response';
  public static readonly WEB_CONTENT_DIALOG_REQUEST = 'webcontent:dialog-request';

  // Basic auth overlay
  public static readonly HIDE_BASIC_AUTH_OVERLAY = 'browser:hide-basic-auth-overlay';
  public static readonly BASIC_AUTH_RESPONSE = 'browser:basic-auth-response';
}

export abstract class MainToRendererEventsForBrowserIPC {
  public static readonly NEW_TAB_CREATED = 'browser:new-tab-created';
  public static readonly TAB_ACTIVATED = 'browser:tab-activated';
  public static readonly TAB_CLOSED = 'browser:tab-closed';
  public static readonly TAB_TITLE_UPDATED = 'browser:tab-title-updated';
  public static readonly TAB_FAVICON_UPDATED = 'browser:tab-favicon-updated';
  public static readonly TAB_URL_UPDATED = 'browser:tab-url-updated';
  public static readonly TAB_BACK_FORWARD_UPDATED = 'browser:tab-back-forward-updated';
  public static readonly NAVIGATION_FAILED = 'browser:navigation-failed';
  public static readonly DOWNLOAD_STARTED = 'browser:download-started';
  public static readonly DOWNLOAD_PROGRESS = 'browser:download-progress';
  public static readonly DOWNLOAD_COMPLETED = 'browser:download-completed';
  public static readonly DOWNLOAD_PAUSED = 'browser:download-paused';
  public static readonly DOWNLOAD_RESUMED = 'browser:download-resumed';
  public static readonly READER_MODE_AVAILABILITY_CHANGED =
    'browser:reader-mode-availability-changed';
  public static readonly READER_MODE_STATE_CHANGED = 'browser:reader-mode-state-changed';
  public static readonly FIND_IN_PAGE_RESULT = 'browser:find-in-page-result';
  public static readonly SHOW_FIND_IN_PAGE_BAR = 'browser:show-find-in-page-bar';
  public static readonly HIDE_FIND_IN_PAGE_BAR = 'browser:hide-find-in-page-bar';
  public static readonly SHOW_PERMISSION_PROMPT = 'browser:show-permission-prompt';
  public static readonly HIDE_PERMISSION_PROMPT = 'browser:hide-permission-prompt';
  public static readonly SHOW_PERMISSION_STRIP = 'browser:show-permission-strip';
  public static readonly HIDE_PERMISSION_STRIP = 'browser:hide-permission-strip';

  // Unified overlay
  public static readonly SHOW_OVERLAY_PANEL = 'overlay:show-panel';
  public static readonly HIDE_OVERLAY_PANEL = 'overlay:hide-panel';
  public static readonly URL_AUTOCOMPLETE_UPDATE = 'overlay:url-autocomplete-update';
  public static readonly URL_AUTOCOMPLETE_RESULT_FORWARDED =
    'browser:url-autocomplete-result-forwarded';
  public static readonly TAB_LOADING_CHANGED = 'browser:tab-loading-changed';
  public static readonly TAB_PINNED = 'browser:tab-pinned';
  public static readonly TAB_UNPINNED = 'browser:tab-unpinned';
  public static readonly TABS_REORDERED = 'browser:tabs-reordered';
  public static readonly FULLSCREEN_CHANGED = 'browser:fullscreen-changed';
  public static readonly OVERLAY_VISIBILITY_CHANGED = 'browser:overlay-visibility-changed';
  public static readonly FOCUS_URL_BAR = 'browser:focus-url-bar';
}

export abstract class DataStoreConstants {
  public static readonly DEFAULT_KEY = 'default';
  public static readonly BROWSER_SETTINGS = 'browser-settings';
  public static readonly CLOSED_WINDOWS = 'closed-windows';
  public static readonly SESSION_STATE = 'session-state';
}

export interface ClosedTabRecord {
  url: string;
  title: string;
  faviconUrl: string | null;
  closedAt: number;
}

export interface ClosedWindowRecord {
  tabCount: number;
  tabs: { url: string; title: string }[];
  closedAt: number;
}

export interface SessionTabRecord {
  url: string;
  title: string;
  faviconUrl: string | null;
  isPinned: boolean;
}

export interface SessionWindowRecord {
  tabs: SessionTabRecord[];
  activeTabIndex: number;
}

export interface SessionState {
  windows: SessionWindowRecord[];
  savedAt: number;
  restored: boolean;
}

export abstract class RendererToMainEventsForDataStoreIPC {
  public static readonly STORE_GET = 'store:get';
  public static readonly STORE_SET = 'store:set';
  public static readonly STORE_WATCH = 'store:watch';
  public static readonly STORE_UNWATCH = 'store:unwatch';
}

/**
 * Streaming/video sites where JS and CSS ad blocking is skipped.
 * Network-level ad blocking (domain and URL pattern blocking) still applies.
 */
export const STREAMING_SITES: readonly string[] = [
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'spotify.com',
  'netflix.com',
  'hulu.com',
  'disneyplus.com',
  'twitch.tv',
  'vimeo.com',
  'dailymotion.com',
  'crunchyroll.com',
  'primevideo.com',
  'peacocktv.com',
  'music.apple.com',
  'tv.apple.com',
];

/**
 * Website category colors — shared palette for bookmarks, history, and other pages.
 */
export const WEBSITE_CATEGORY_COLORS: Record<string, string> = {
  dev: '#6366f1', // indigo
  news: '#06b6d4', // cyan
  media: '#ec4899', // pink
  social: '#8b5cf6', // purple
  productivity: '#f59e0b', // amber
  tools: '#22d3ee', // light cyan
  finance: '#10b981', // green
  shopping: '#f97316', // orange
  reference: '#6366f1', // indigo
  search: '#a1a1aa', // gray
  design: '#14b8a6', // teal
  health: '#34d399', // emerald
  gaming: '#e879f9', // fuchsia
  travel: '#38bdf8', // sky
  education: '#a78bfa', // violet
  entertainment: '#fb923c', // light orange
  jobs: '#0ea5e9', // bright sky
  lifestyle: '#f472b6', // rose
  other: '#a1a1aa', // gray
};

/**
 * Known multi-part country-code TLDs for correct eTLD+1 extraction.
 * Used by cookie third-party detection to avoid misclassifying subdomains.
 */
export const MULTI_PART_TLDS: ReadonlySet<string> = new Set([
  'co.uk',
  'co.jp',
  'co.kr',
  'co.nz',
  'co.za',
  'co.in',
  'co.id',
  'com.au',
  'com.br',
  'com.cn',
  'com.mx',
  'com.tw',
  'com.sg',
  'com.hk',
  'org.uk',
  'org.au',
  'net.au',
  'net.br',
  'ac.uk',
  'gov.uk',
  'gov.au',
  'ne.jp',
  'or.jp',
  'ac.jp',
]);

export abstract class InAppUrls {
  public static readonly PREFIX = 'Nav0://';
  public static readonly DOWNLOADS = 'Nav0://downloads';
  public static readonly HISTORY = 'Nav0://history';
  public static readonly BOOKMARKS = 'Nav0://bookmarks';
  public static readonly BROWSER_SETTINGS = 'Nav0://browser-settings';
  public static readonly NEW_TAB = 'Nav0://new-tab';
  public static readonly ABOUT = 'Nav0://about';
}

export abstract class ImageBase64Strings {
  // The compass from src/renderer/assets/favicon.ico at 32 × 32, so the 16 px
  // favicon of a built-in page stays sharp on Retina screens.
  public static readonly FAVICON =
    'data:image/png;base64,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';
}

export abstract class AppConstants {
  public static readonly APP_NAME = 'Nav0';
}

// Session partition names. The `persist:` prefix tells Electron to persist
// session data to disk under <userData>/Partitions/<rest>/. Private mode
// intentionally omits the prefix so the session is in-memory only and is
// wiped automatically when the last private window closes — nothing about
// the private session is ever written to disk.
export abstract class PartitionNames {
  public static readonly BROWSING = 'persist:browsertabs';
  public static readonly PRIVATE = 'private';
  // Directory name (under <userData>/Partitions/) used by older builds that
  // used the persistent `persist:private` partition. Kept so we can delete
  // any leftover data on startup after upgrading.
  public static readonly LEGACY_PRIVATE_DIRNAME = 'private';
}
