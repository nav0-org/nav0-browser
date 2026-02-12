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
  public static readonly REMOVE_BROWSING_HISTORY = "browser:remove-browsing-history";
  public static readonly REMOVE_ALL_BROWSING_HISTORY = "browser:remove-all-browsing-history";
  public static readonly FETCH_BROWSING_HISTORY = "browser:fetch-browsing-history";

  public static readonly HANDLE_FILE_SELECTION = "browser:handle-file-selection";

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
  // public static readonly CAPTURE_SCREENSHOT = "browser:capture-screenshot";
  // public static readonly SAVE_SCREENSHOT = "browser:save-screenshot";
  // public static readonly SET_DIALOG_VISIBILITY = "browser:set-dialog-visibility";
}

export abstract class MainToRendererEventsForBrowserIPC {
  public static readonly NEW_TAB_CREATED = "browser:new-tab-created";
  public static readonly TAB_ACTIVATED = "browser:tab-activated";
  public static readonly TAB_CLOSED = "browser:tab-closed";
  public static readonly TAB_TITLE_UPDATED = "browser:tab-title-updated";
  public static readonly TAB_FAVICON_UPDATED = "browser:tab-favicon-updated";
  public static readonly TAB_URL_UPDATED =  "browser:tab-url-updated";
  public static readonly NAVIGATION_FAILED = "browser:navigation-failed";
  // public static readonly SET_DIALOG_VISIBILITY = "browser:set-dialog-visibility";
}

export abstract class DataStoreConstants {
  public static readonly DEFAULT_KEY = 'default';
  public static readonly BROWSER_SETTINGS = "browser-settings";
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
  public static readonly FAVICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAArFJREFUOE9Nk1mOG1UYRs+tumONdpfd9JCIAIEdsKksgHekSFFCREtBCoQ3NsQWaJACaqexG7ts13xRVZOQp3q59ekbzi/cyxevQjd/YvQQhs2a0FdIapyTxLEgMgNp5IlMh9MdVjZY2Y7f3oTNa6G/f91pUYVK9lD+RfbJGXI4oJXneLfm4kFKlgicbol0i1Xjz5MAVjW9MFc/e+Usql8TVu+wscUoz1CXZLlC0lAUkkj3RKbFhA3RBycNQl+98do5VPMO60KsFRxX14iu4vKzU9rjjmWhSeIBHdQktseGzeRodDEJKDkg6xtcPiNyAb7aQF1SnMaTE6sH8hTyZJj6SV1/H2cUMM+feznskUGHiWNU2NOVtywvlygqknjM31OVe9J44CQbSGz3v4B99tSHIchhR7S4YNj+iTEB82VKW94xnysS53n7+y1fPDJkcU8WjWt8iPCjV+0tJi8IqhXZosAf11g1EEeCdr+lrY6kacDZImCeDWP7xP8VKcyzp17KAOkPRMUpzkC/u8E3+4mF427Lp48yfFezPBHEtpsc3K/RIty33/hw/hCTpqh6hWi2JLMI0ZSU67+5eJCjwg7f1iyLgFnaTywk5p4Loa9+8jpyGDUg/rnGOgldyfL8hGa3oSgUQ3UkSzzV/sDyBBLXkbmPBXSAVgNs/8BXdyweXpJlmsN6xdl5hAlbDrsS+oYi9xSznjzq38/4wistGVEOmrtpzmyeEUUCX23JMomRLVV5oGtqLs8E5wv/8QpvvNYC2W1QHMmWCyTHqYuQFqN6YuvZb/dY3fPl54pYt7jpJkaQvnvZKa1Cf/Mr+eOvcZbp4Yjr6rdrxNCQ55qha/jqsSN1Hel7DqZj+uGXV8oET3S/Ca0NJ4HRSb25IZ8ZdNDRVfuJyHnmmWc9sZnyT+f8L5gsOe4sMLATAAAAAElFTkSuQmCC';
}

export abstract class AppConstants {
  public static readonly APP_NAME = "Nav0 Browser";
}