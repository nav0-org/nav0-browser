export abstract class ElectronAppEvents {
  public static readonly WILL_FINISH_LAUNCHING = "will-finish-launching";
  public static readonly READY = "ready";
  public static readonly WINDOW_ALL_CLOSED = "window-all-closed";
  public static readonly BEFORE_QUIT = "before-quit";
  public static readonly WILL_QUIT = "will-quit";
  public static readonly QUIT = "quit";
  public static readonly OPEN_FILE = "open-file";
  public static readonly OPEN_URL = "open-url";
  public static readonly ACTIVATE = "activate";
  public static readonly DID_BECOME_ACTIVE = "did-become-active";
  public static readonly DID_RESIGN_ACTIVE = "did-resign-active";
  public static readonly CONTINUE_ACTIVITY = "continue-activity";
  public static readonly WILL_CONTINUE_ACTIVITY = "will-continue-activity";
  public static readonly CONTINUE_ACTIVITY_ERROR = "continue-activity-error";
  public static readonly ACTIVITY_WAS_CONTINUED = "activity-was-continued";
  public static readonly UPDATE_ACTIVITY_STATE = "update-activity-state";
  public static readonly NEW_WINDOW_FOR_TAB = "new-window-for-tab";
  public static readonly BROWSER_WINDOW_BLUR = "browser-window-blur";
  public static readonly BROWSER_WINDOW_FOCUS = "browser-window-focus";
  public static readonly BROWSER_WINDOW_CREATED = "browser-window-created";
  public static readonly WEB_CONTENTS_CREATED = "web-contents-created";
  public static readonly CERTIFICATE_ERROR = "certificate-error";
  public static readonly SELECT_CLIENT_CERTIFICATE = "select-client-certificate";
  public static readonly LOGIN = "login";
  public static readonly GPU_INFO_UPDATE = "gpu-info-update";
  public static readonly RENDER_PROCESS_GONE = "render-process-gone";
  public static readonly CHILD_PROCESS_GONE = "child-process-gone";
  public static readonly ACCESSIBILITY_SUPPORT_CHANGED = "accessibility-support-changed";
  public static readonly SESSION_CREATED = "session-created";
  public static readonly SECOND_INSTANCE = "second-instance";
}

export abstract class WebContentsEvents {
  public static readonly DID_FINISH_LOAD = "did-finish-load";
  public static readonly DID_FAIL_LOAD = "did-fail-load";
  public static readonly DID_FAIL_PROVISIONAL_LOAD = "did-fail-provisional-load";
  public static readonly DID_FRAME_FINISH_LOAD = "did-frame-finish-load";
  public static readonly DID_START_LOADING = "did-start-loading";
  public static readonly DID_STOP_LOADING = "did-stop-loading";
  public static readonly DOM_READY = "dom-ready";
  public static readonly PAGE_TITLE_UPDATED = "page-title-updated";
  public static readonly PAGE_FAVICON_UPDATED = "page-favicon-updated";
  public static readonly CONTENT_BOUNDS_UPDATED = "content-bounds-updated";
  public static readonly DID_CREATE_WINDOW = "did-create-window";
  public static readonly WILL_NAVIGATE = "will-navigate";
  public static readonly WILL_FRAME_NAVIGATE = "will-frame-navigate";
  public static readonly DID_START_NAVIGATION = "did-start-navigation";
  public static readonly WILL_REDIRECT = "will-redirect";
  public static readonly DID_REDIRECT_NAVIGATION = "did-redirect-navigation";
  public static readonly DID_NAVIGATE = "did-navigate";
  public static readonly DID_FRAME_NAVIGATE = "did-frame-navigate";
  public static readonly DID_NAVIGATE_IN_PAGE = "did-navigate-in-page";
  public static readonly WILL_PREVENT_UNLOAD = "will-prevent-unload";
  public static readonly RENDER_PROCESS_GONE = "render-process-gone";
  public static readonly UNRESPONSIVE = "unresponsive";
  public static readonly RESPONSIVE = "responsive";
  public static readonly PLUGIN_CRASHED = "plugin-crashed";
  public static readonly DESTROYED = "destroyed";
  public static readonly INPUT_EVENT = "input-event";
  public static readonly BEFORE_INPUT_EVENT = "before-input-event";
  public static readonly ENTER_HTML_FULL_SCREEN = "enter-html-full-screen";
  public static readonly LEAVE_HTML_FULL_SCREEN = "leave-html-full-screen";
  public static readonly ZOOM_CHANGED = "zoom-changed";
  public static readonly BLUR = "blur";
  public static readonly FOCUS = "focus";
  public static readonly DEVTOOLS_OPEN_URL = "devtools-open-url";
  public static readonly DEVTOOLS_SEARCH_QUERY = "devtools-search-query";
  public static readonly DEVTOOLS_OPENED = "devtools-opened";
  public static readonly DEVTOOLS_CLOSED = "devtools-closed";
  public static readonly DEVTOOLS_FOCUSED = "devtools-focused";
  public static readonly CERTIFICATE_ERROR = "certificate-error";
  public static readonly SELECT_CLIENT_CERTIFICATE = "select-client-certificate";
  public static readonly LOGIN = "login";
  public static readonly FOUND_IN_PAGE = "found-in-page";
  public static readonly MEDIA_STARTED_PLAYING = "media-started-playing";
  public static readonly MEDIA_PAUSED = "media-paused";
  public static readonly AUDIO_STATE_CHANGED = "audio-state-changed";
  public static readonly DID_CHANGE_THEME_COLOR = "did-change-theme-color";
  public static readonly UPDATE_TARGET_URL = "update-target-url";
  public static readonly CURSOR_CHANGED = "cursor-changed";
  public static readonly CONTEXT_MENU = "context-menu";
  public static readonly SELECT_BLUETOOTH_DEVICE = "select-bluetooth-device";
  public static readonly PAINT = "paint";
  public static readonly DEVTOOLS_RELOAD_PAGE = "devtools-reload-page";
  public static readonly WILL_ATTACH_WEBVIEW = "will-attach-webview";
  public static readonly DID_ATTACH_WEBVIEW = "did-attach-webview";
  public static readonly CONSOLE_MESSAGE = "console-message";
  public static readonly PRELOAD_ERROR = "preload-error";
  public static readonly IPC_MESSAGE = "ipc-message";
  public static readonly IPC_MESSAGE_SYNC = "ipc-message-sync";
  public static readonly PREFERRED_SIZE_CHANGED = "preferred-size-changed";
  public static readonly FRAME_CREATED = "frame-created";
}

export abstract class RendererToMainEventsForBrowserIPC {
  public static readonly CREATE_TAB = "browser:create-tab";
  public static readonly ACTIVATE_TAB = "browser:activate-tab";
  public static readonly CLOSE_TAB = "browser:close-tab";
  public static readonly NAVIGATE = "browser:navigate";
  public static readonly GET_ACTIVE_APP_WINDOW_ID = "browser:get-active-app-window-id";
  public static readonly GO_BACK = "browser:go-back";
  public static readonly GO_FORWARD = "browser:go-forward";
  public static readonly REFRESH = "browser:refresh";
  public static readonly ADD_BOOKMARK = "browser:add-bookmark";
  public static readonly REMOVE_BOOKMARK = "browser:remove-bookmark";
  public static readonly REMOVE_ALL_BOOKMARKS = "browser:remove-all-bookmarks";
  public static readonly FETCH_BOOKMARK = "browser:fetch-bookmark";
  // public static readonly ADD_DOWNLOAD = "browser:add-download";
  public static readonly REMOVE_DOWNLOAD = "browser:remove-download";
  public static readonly REMOVE_ALL_DOWNLOADS = "browser:remove-all-downloads";
  public static readonly FETCH_DOWNLOAD = "browser:fetch-download";
  public static readonly FETCH_ACTIVE_DOWNLOADS = "browser:fetch-active-downloads";
  public static readonly PAUSE_DOWNLOAD = "browser:pause-download";
  public static readonly RESUME_DOWNLOAD = "browser:resume-download";
  public static readonly CANCEL_DOWNLOAD = "browser:cancel-download";
  public static readonly OPEN_DOWNLOADED_FILE = "browser:open-downloaded-file";
  public static readonly REMOVE_BROWSING_HISTORY = "browser:remove-browsing-history";
  public static readonly REMOVE_ALL_BROWSING_HISTORY = "browser:remove-all-browsing-history";
  public static readonly FETCH_BROWSING_HISTORY = "browser:fetch-browsing-history";

  public static readonly HANDLE_FILE_SELECTION = "browser:handle-file-selection";
  public static readonly OPEN_PDF_FILE = "browser:open-pdf-file";

  public static readonly UPDATE_BROWSER_VIEW_BOUNDS = "browser:update-browser-view-bounds";
  public static readonly CLOSE_WINDOW = "browser:close-window";
  public static readonly SHOW_OPTIONS_MENU = "browser:show-options-menu";
  public static readonly HIDE_OPTIONS_MENU = "browser:hide-options-menu";
  public static readonly SHOW_COMMAND_K_OVERLAY = "browser:show-command-k-overlay";
  public static readonly HIDE_COMMAND_K_OVERLAY = "browser:hide-command-k-overlay";
  public static readonly CREATE_NEW_APP_WINDOW = "browser:create-new-app-window";
  public static readonly CREATE_NEW_PRIVATE_APP_WINDOW = "browser:create-new-private-app-window";
  public static readonly EXECUTE_JAVASCRIPT = "browser:execute-javascript";
  public static readonly GET_SEARCH_URL = "browser:get-search-url";
  public static readonly FETCH_OPEN_TABS = "browser:fetch-open-tabs";
  public static readonly FETCH_RECENTLY_CLOSED_TABS = "browser:fetch-recently-closed-tabs";
  public static readonly RESTORE_CLOSED_TAB = "browser:restore-closed-tab";
  public static readonly RESTORE_CLOSED_TAB_BY_INDEX = "browser:restore-closed-tab-by-index";
  public static readonly FETCH_CLOSED_WINDOWS = "browser:fetch-closed-windows";
  public static readonly RESTORE_CLOSED_WINDOW = "browser:restore-closed-window";
  public static readonly SHOW_ABOUT_PANEL = "browser:show-about-panel";
  public static readonly TOGGLE_READER_MODE = "browser:toggle-reader-mode";
  public static readonly SET_DARK_MODE = "browser:set-dark-mode";
  public static readonly SHOW_FIND_IN_PAGE = "browser:show-find-in-page";
  public static readonly HIDE_FIND_IN_PAGE = "browser:hide-find-in-page";
  public static readonly FIND_IN_PAGE = "browser:find-in-page";
  public static readonly FIND_IN_PAGE_NEXT = "browser:find-in-page-next";
  public static readonly FIND_IN_PAGE_PREVIOUS = "browser:find-in-page-previous";
  public static readonly STOP_FIND_IN_PAGE = "browser:stop-find-in-page";

  // Settings enforcement
  public static readonly CLEAR_BROWSING_DATA = "browser:clear-browsing-data";
  public static readonly GET_COOKIE_COUNT = "browser:get-cookie-count";
  public static readonly APPLY_SETTINGS = "browser:apply-settings";
  public static readonly GET_STORAGE_ESTIMATE = "browser:get-storage-estimate";

  // Permission system
  public static readonly PERMISSION_PROMPT_RESPONSE = "browser:permission-prompt-response";
  public static readonly FETCH_PERMISSIONS = "browser:fetch-permissions";
  public static readonly REMOVE_PERMISSION = "browser:remove-permission";
  public static readonly REMOVE_ALL_PERMISSIONS_FOR_ORIGIN = "browser:remove-all-permissions-for-origin";
  public static readonly CLEAR_ALL_PERMISSIONS = "browser:clear-all-permissions";
  public static readonly PERMISSION_PROMPT_READY = "browser:permission-prompt-ready";
  public static readonly SHOW_TAB_CONTEXT_MENU = "browser:show-tab-context-menu";
  public static readonly PIN_TAB = "browser:pin-tab";
  public static readonly UNPIN_TAB = "browser:unpin-tab";
}

export abstract class MainToRendererEventsForBrowserIPC {
  public static readonly NEW_TAB_CREATED = "browser:new-tab-created";
  public static readonly TAB_ACTIVATED = "browser:tab-activated";
  public static readonly TAB_CLOSED = "browser:tab-closed";
  public static readonly TAB_TITLE_UPDATED = "browser:tab-title-updated";
  public static readonly TAB_FAVICON_UPDATED = "browser:tab-favicon-updated";
  public static readonly TAB_URL_UPDATED =  "browser:tab-url-updated";
  public static readonly NAVIGATION_FAILED = "browser:navigation-failed";
  public static readonly DOWNLOAD_STARTED = "browser:download-started";
  public static readonly DOWNLOAD_PROGRESS = "browser:download-progress";
  public static readonly DOWNLOAD_COMPLETED = "browser:download-completed";
  public static readonly DOWNLOAD_PAUSED = "browser:download-paused";
  public static readonly DOWNLOAD_RESUMED = "browser:download-resumed";
  public static readonly READER_MODE_AVAILABILITY_CHANGED = "browser:reader-mode-availability-changed";
  public static readonly READER_MODE_STATE_CHANGED = "browser:reader-mode-state-changed";
  public static readonly FIND_IN_PAGE_RESULT = "browser:find-in-page-result";
  public static readonly SHOW_PERMISSION_PROMPT = "browser:show-permission-prompt";
  public static readonly HIDE_PERMISSION_PROMPT = "browser:hide-permission-prompt";
  public static readonly TAB_PINNED = "browser:tab-pinned";
  public static readonly TAB_UNPINNED = "browser:tab-unpinned";
}

export abstract class DataStoreConstants {
  public static readonly DEFAULT_KEY = 'default';
  public static readonly BROWSER_SETTINGS = "browser-settings";
  public static readonly CLOSED_WINDOWS = "closed-windows";
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

export abstract class RendererToMainEventsForDataStoreIPC {
  public static readonly STORE_GET = "store:get";
  public static readonly STORE_SET = "store:set";
  public static readonly STORE_WATCH = "store:watch";
  public static readonly STORE_UNWATCH = "store:unwatch";
}


export abstract class InAppUrls {
  public static readonly PREFIX = "nav0://";
  public static readonly DOWNLOADS = "nav0://downloads";
  public static readonly HISTORY = "nav0://history";
  public static readonly BOOKMARKS = "nav0://bookmarks";
  public static readonly BROWSER_SETTINGS = "nav0://browser-settings";
  public static readonly NEW_TAB = "nav0://new-tab";
}

export abstract class ImageBase64Strings {
  public static readonly FAVICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACPElEQVR4nIWTT2iSYRzHv07YYAZilxw2GuEttXZQ6tKfg6UgtlEXLfQkKAqb7TDooijt0Gn+KYVAPOShIjZDFA/KtkMHYSiErh0yYtRarekgNwS1fs/7ovlCYx/4vvB9fzzf53l+z/OIwDNDmiPdBHFmZAS/ez2IxWJyQLfbpa+ANQAh0ioLYINXSAOmJRLMLi7CYDBwg/P5PPx+P/7DLAsok66QBrxaWMDrrS28zWYhEolgNpuh1+vh8XioKmCdBfwhDQgGg9jZ2MDR5iZeHhzQHx6TyQStVgufz0fuH4IAtVoNp9MJt9uN5clJPNndxc9Ohyo88XgckUgE1WqVHI8ggC2x0WgglUohoFBg7/gYz4ZWYbPZIKH+xGIxcjyCgHA4jEQigUqlgvsyGTSjo0g1m9hut6kKbgtWqxVer5ccjyCgUCjA4XCgXq/jPA2+MzGBtVYLn/b3qQoolUpudtbQPicGMORTaozKruLbdhado6+nB4RCISSTSZTL7GQB6dR1nNXM40c5idbOO+h0OlgslpO3wLrfpD2zJva5aHqBwy+f8evDEux2O8bHx7lV9BEEqFQquFwuLqjPmPQCZJce4fv7Oe4YWaNrtRpVeAQBjEAggFKphEwmQ47nnPYxNPI9XJtWcPVhWECFdJk0IBqNolgsIp1OkwPu3nsAufI2ni89JCeAu8ozpBWSAHZljUYjevQqc7kcnkbfoN34SBUBt1gAg4XMk26QBgw/Z/GYFN32ITmOddIyafUvSpzUF9nkZkwAAAAASUVORK5CYII=';
}

export abstract class AppConstants {
  public static readonly APP_NAME = "Nav0 Browser";
}