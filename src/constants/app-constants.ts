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

  public static readonly GENERATE_AI_SUMMARY = "browser:generate-ai-summary";
  public static readonly ADD_TO_KNOWLEDGE_HUB = "browser:add-to-knowledge-hub";
  public static readonly UPDATE_BROWSER_VIEW_BOUNDS = "browser:update-browser-view-bounds";
  public static readonly CLOSE_WINDOW = "browser:close-window";
  public static readonly SHOW_OPTIONS_MENU = "browser:show-options-menu";
  public static readonly HIDE_OPTIONS_MENU = "browser:hide-options-menu";
  public static readonly SHOW_COMMAND_K_OVERLAY = "browser:show-command-k-overlay";
  public static readonly HIDE_COMMAND_K_OVERLAY = "browser:hide-command-k-overlay";
  public static readonly CREATE_NEW_APP_WINDOW = "browser:create-new-app-window";
  public static readonly CREATE_NEW_PRIVATE_APP_WINDOW = "browser:create-new-private-app-window";
  public static readonly EXECUTE_JAVASCRIPT = "browser:execute-javascript";
  public static readonly HIDE_AI_SUMMARY_OVERLAY = "browser:hide-ai-summary-overlay";
  public static readonly ASSIGN_TASK_TO_BROWSER_AGENT = "browser:assign-task-to-browser-agent";
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

export abstract class RendererToMainEventsForLLMIPC {
  public static readonly GET_MODEL_INFO = "lmm:get-model-info";
  public static readonly DOWNLOAD_MODEL = "lmm:download-model";
  public static readonly DELETE_MODEL = "lmm:delete-model";

  public static readonly GENERATE_AI_SUMMARY = "lmm:generate-ai-summary";

  public static readonly FETCH_ALL_PROJECT_LIST = "browser:fetch-all-project-list";
  public static readonly CREATE_NEW_PROJECT = "browser:create-new-project";
  public static readonly DELETE_PROJECT = "browser:delete-project";
  public static readonly UPDATE_PROJECT = "browser:update-project";
  public static readonly FETCH_PROJECT = "browser:fetch-project";
  public static readonly FETCH_ALL_CONVERSATION_LIST = "browser:fetch-all-conversation-list";
  public static readonly CREATE_NEW_CONVERSATION = "browser:create-new-conversation";
  public static readonly DELETE_CONVERSATION = "browser:delete-conversation";
  public static readonly FETCH_CONVERSATION = "browser:fetch-conversation";
  public static readonly BRANCH_OUT_CONVERSATION = "browser:branch-out-conversation";
  public static readonly SEND_MESSAGE = "browser:send-message";
  public static readonly PROCESS_MESSAGE = "browser:process-message";
  public static readonly RESEND_MESSAGE = "browser:resend-message";
  public static readonly DELETE_MESSAGE = "browser:delete-message";
}

export abstract class DataStoreConstants {
  public static readonly DEFAULT_KEY = 'default';
  public static readonly DOWNLOADED_LLM_MODELS = "downloaded-llm-models-list";
  public static readonly LLM_CONFIGURATION = "lmm-configuration";
  public static readonly BROWSER_SETTINGS = "browser-settings";
}

export abstract class RendererToMainEventsForDataStoreIPC {
  public static readonly STORE_GET = "store:get";
  public static readonly STORE_SET = "store:set";
  public static readonly STORE_WATCH = "store:watch";
  public static readonly STORE_UNWATCH = "store:unwatch";
}


export abstract class MainToRendererEventsForLLMIPC {
  public static readonly DOWNLOAD_MODEL_PROGRESS = "lmm:download-model-progress";
  public static readonly AI_SUMMARY_GENERATION_CHUNK = "lmm:ai-summary-generation-chunk";
  public static readonly AI_SUMMARY_GENERATION_COMPLETE = "lmm:ai-summary-generation-complete";
  public static readonly AI_SUMMARY_GENERATION_ERROR = "lmm:ai-summary-generation-error";

  public static readonly AI_CONVERSATION_RESPONSE_CHUNK = "lmm:ai-conversation-response-chunk";
}

export abstract class InAppUrls {
  public static readonly PREFIX = "ai-browser://";
  public static readonly DOWNLOADS = "ai-browser://downloads";
  public static readonly HISTORY = "ai-browser://history";
  public static readonly BOOKMARKS = "ai-browser://bookmarks";
  public static readonly ABOUT = "ai-browser://about";
  public static readonly PRIVACY_POLICY = "ai-browser://privacy-policy";
  public static readonly EULA = "ai-browser://eula";
  public static readonly HELP_CENTER = "ai-browser://help-center";
  public static readonly REPORT_ISSUE = "ai-browser://report-issue";
  public static readonly BROWSER_SETTINGS = "ai-browser://browser-settings";
  public static readonly AI_SETTINGS = "ai-browser://ai-settings";
  public static readonly NEW_TAB = "ai-browser://new-tab";
  public static readonly KNOWLEDGE_HUB = "ai-browser://knowledge-hub";
  public static readonly LLM_CHAT = "ai-browser://llm-chat";
}

export abstract class ImageBase64Strings {
  public static readonly FAVICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAArFJREFUOE9Nk1mOG1UYRs+tumONdpfd9JCIAIEdsKksgHekSFFCREtBCoQ3NsQWaJACaqexG7ts13xRVZOQp3q59ekbzi/cyxevQjd/YvQQhs2a0FdIapyTxLEgMgNp5IlMh9MdVjZY2Y7f3oTNa6G/f91pUYVK9lD+RfbJGXI4oJXneLfm4kFKlgicbol0i1Xjz5MAVjW9MFc/e+Usql8TVu+wscUoz1CXZLlC0lAUkkj3RKbFhA3RBycNQl+98do5VPMO60KsFRxX14iu4vKzU9rjjmWhSeIBHdQktseGzeRodDEJKDkg6xtcPiNyAb7aQF1SnMaTE6sH8hTyZJj6SV1/H2cUMM+feznskUGHiWNU2NOVtywvlygqknjM31OVe9J44CQbSGz3v4B99tSHIchhR7S4YNj+iTEB82VKW94xnysS53n7+y1fPDJkcU8WjWt8iPCjV+0tJi8IqhXZosAf11g1EEeCdr+lrY6kacDZImCeDWP7xP8VKcyzp17KAOkPRMUpzkC/u8E3+4mF427Lp48yfFezPBHEtpsc3K/RIty33/hw/hCTpqh6hWi2JLMI0ZSU67+5eJCjwg7f1iyLgFnaTywk5p4Loa9+8jpyGDUg/rnGOgldyfL8hGa3oSgUQ3UkSzzV/sDyBBLXkbmPBXSAVgNs/8BXdyweXpJlmsN6xdl5hAlbDrsS+oYi9xSznjzq38/4wistGVEOmrtpzmyeEUUCX23JMomRLVV5oGtqLs8E5wv/8QpvvNYC2W1QHMmWCyTHqYuQFqN6YuvZb/dY3fPl54pYt7jpJkaQvnvZKa1Cf/Mr+eOvcZbp4Yjr6rdrxNCQ55qha/jqsSN1Hel7DqZj+uGXV8oET3S/Ca0NJ4HRSb25IZ8ZdNDRVfuJyHnmmWc9sZnyT+f8L5gsOe4sMLATAAAAAElFTkSuQmCC';
}

export abstract class AppConstants {
  public static readonly APP_NAME = "My Electron App";
}

export abstract class EmbeddingConstants {
  public static readonly EMBEDDING_MODEL = "bge-small-en-v1.5-q8_0.gguf";
  public static readonly EMBEDDING_MODEL_URL = "hf:CompendiumLabs/bge-small-en-v1.5-gguf:Q8_0";
  public static readonly POST_DOWNLOAD_MODEL_NAME = "hf_CompendiumLabs_bge-small-en-v1.5.Q8_0.gguf";
  public static readonly EMBEDDING_DIMENSIONS = 384;
}

export abstract class SystemPrompts {
  public static readonly CONVERSE_WITH_AI_NON_RAG = `You are a helpful, knowledgeable, and honest AI assistant. Your primary goal is to provide accurate, useful, and thoughtful responses to user queries while maintaining high ethical standards.
    ## Core Principles
    - Prioritize accuracy and truthfulness in all responses
    - Be transparent about limitations and uncertainty when you don't know something
    - Maintain a respectful, professional, and empathetic tone
    - Refuse requests that could cause harm or violate ethical guidelines

    ## Response Guidelines
    - Give clear, well-structured answers that directly address the user's question
    - Provide relevant context and explanations when helpful
    - Use examples, analogies, or step-by-step breakdowns for complex topics
    - Acknowledge multiple perspectives on subjective or controversial topics
    - Adjust your communication style to match the complexity and formality appropriate for the query

    ## Handling Uncertainty
    - Clearly state when you're uncertain or when information may be outdated
    - Distinguish between established facts and your best estimates or reasoning
    - Admit mistakes if corrected and provide accurate information

    ## Safety and Ethics
    - Decline requests for harmful, illegal, or unethical content
  `;
  public static readonly CONVERSE_WITH_AI_RAG = `You are an AI assistant that strictly answers questions using retrieved document context chunks provided in the prompt itself.
    Large part of the first prompt contains the retrieved context chunks from the knowledge base.
    Query is added towards the end of the prompt.
    The prompt follows XML format, only for structuring purposes.
    You are not allowed to use any other information outside of the retrieved document context provided in the prompt.
    You are not allowed to use any information from the retrieved documents that is not directly related to the query.
    Be specific and concise in your responses.
    Your primary goal is to provide accurate, well-sourced / well-cited responses to user queries while maintaining high ethical standards.
    Do not provide citations or references
    Do not mention to user that context chunks are provided in the prompt.
  `;
  public static readonly CONVERSE_WITH_AI_WEB_RESEARCH = `You are an AI assistant that strictly answers questions using web-search results given in the prompt itself. 
    Large part of the first prompt is the web search results. 
    Query is added towards the end of the prompt. 
    The prompt follows XML format, only for structuring purposes.
    You are not allowed to use any other information outside of the web search results provided in the prompt.
    You are not allowed to use any information from the web search results that is not directly related to the query. 
    Be specific and concise in your responses.
    Do not provide citations or references to the web search results.
    If the query is not related to the web search results, respond with "I could not find any relevant information on the web for this query."
    Your primary goal is to provide accurate responses to user queries while maintaining high ethical standards.
    Do not mention to user that web search results are provided in the prompt.
  `;
}

// export static const APP_NAME = "My Electron App";
// export static const APP_VERSION = "1.0.0";
// export static const APP_AUTHOR = "Your Name";
// export static const APP_DESCRIPTION = "A simple Electron application.";
// export static const APP_COPYRIGHT = "© 2023 Your Name";
// export static const APP_LICENSE = "MIT";
// export static const APP_URL = "https://example.com";
// export static const APP_ICON = "assets/icon.png";
// export static const APP_WINDOW_WIDTH = 1200;
// export static const APP_WINDOW_HEIGHT = 800;
// export static const APP_WINDOW_MIN_WIDTH = 800;
// export static const APP_WINDOW_MIN_HEIGHT = 600;
// export static const APP_WINDOW_MAX_WIDTH = 1920;
// export static const APP_WINDOW_MAX_HEIGHT = 1080;
// export static const APP_WINDOW_RESIZABLE = true;
// export static const APP_WINDOW_FULLSCREEN = false;
// export static const APP_WINDOW_FULLSCREENABLE = true;
// export static const APP_WINDOW_CLOSEABLE = true;
// export static const APP_WINDOW_MAXIMIZABLE = true;
// export static const APP_WINDOW_MINIMIZABLE = true;
// export static const APP_WINDOW_ALWAYS_ON_TOP = false;
// export static const APP_WINDOW_FRAMELESS = false;
// export static const APP_WINDOW_TITLE_BAR_STYLE = "default";
// export static const APP_WINDOW_TITLE = APP_NAME;
// export static const APP_WINDOW_BACKGROUND_COLOR = "#FFFFFF";
// export static const APP_WINDOW_TITLE_BAR_COLOR = "#000000";
// export static const APP_WINDOW_TITLE_BAR_TEXT_COLOR = "#FFFFFF";
// export static const APP_WINDOW_CONTENT_COLOR = "#FFFFFF";
// export static const APP_WINDOW_CONTENT_TEXT_COLOR = "#000000";
// export static const APP_WINDOW_CONTENT_LINK_COLOR = "#0000FF";
// export static const APP_WINDOW_CONTENT_LINK_HOVER_COLOR = "#FF0000";
// export static const APP_WINDOW_CONTENT_LINK_ACTIVE_COLOR = "#00FF00";
// export static const APP_WINDOW_CONTENT_LINK_VISITED_COLOR = "#800080";
// export static const APP_WINDOW_CONTENT_LINK_UNDERLINE = true;