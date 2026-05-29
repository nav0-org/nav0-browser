import {
  session,
  WebContents,
  ipcMain,
  net,
  clipboard,
  desktopCapturer,
  BrowserWindow,
  systemPreferences,
} from 'electron';
import { v4 as uuid } from 'uuid';
import {
  PartitionNames,
  RendererToMainEventsForBrowserIPC,
} from '../../constants/app-constants';
import type { Database as DatabaseType } from 'better-sqlite3';

// Types
type SessionDecision = 'allowed_session' | 'denied_session';
type PersistentDecision = 'allowed_persistent' | 'denied_persistent';

export interface PermissionRequest {
  id: string;
  webContentsId: number;
  tabId: string;
  appWindowId: string;
  origin: string;
  permission: string;
  permissions: Array<{ type: string; label: string; icon: string }>;
  // Union of media types ('video' / 'audio') requested across coalesced media
  // requests. Empty for non-media permissions.
  mediaTypes: string[];
  isSecure: boolean;
  isPrivate: boolean;
  faviconUrl: string | null;
  // Multiple callbacks when concurrent media requests are coalesced into a
  // single prompt (Meet/Zoom/Teams call getUserMedia separately for camera
  // and microphone — both promises must be resolved with the same decision).
  callbacks: Array<(granted: boolean) => void>;
  timestamp: number;
  isInsecureBlocked: boolean;
  isFloodBlocked: boolean;
}

export interface PermissionRecord {
  id: string;
  origin: string;
  permissionType: string;
  decision: string;
  createdAt: string;
  lastAccessedAt: string;
  faviconUrl?: string | null;
}

// Callback type for showing/hiding the prompt UI
type ShowPromptCallback = (appWindowId: string, request: PermissionRequest) => void;
type HidePromptCallback = (appWindowId: string) => void;

// Callback type for finding tab info from a webContents
type FindTabCallback = (
  webContentsId: number
) => { appWindowId: string; tabId: string; isPrivate: boolean } | null;

export class PermissionManager {
  private static db: DatabaseType;
  private static sessionPermissions = new Map<string, SessionDecision>();
  private static initializedSessions = new Set<string>();
  private static activePrompts: Map<string, PermissionRequest> = new Map(); // per-tab active prompt
  private static pendingQueues: Map<string, PermissionRequest[]> = new Map(); // per-tab queue
  private static requestTimestamps = new Map<string, number[]>();

  // Callbacks set by the integration layer
  private static showPromptCallback: ShowPromptCallback | null = null;
  private static hidePromptCallback: HidePromptCallback | null = null;
  private static findTabCallback: FindTabCallback | null = null;

  // Permissions auto-granted without prompting
  static readonly AUTO_GRANT_PERMISSIONS = new Set([
    'fullscreen',
    'clipboard-sanitized-write',
    'pointer-lock',
    'mediaKeySystem',
  ]);

  // Sensitive permissions that require HTTPS
  static readonly SENSITIVE_PERMISSIONS = new Set(['media', 'geolocation', 'display-capture']);

  static readonly FLOOD_LIMIT = 3;
  static readonly FLOOD_WINDOW_MS = 10000;
  static readonly PERMISSION_EXPIRY_DAYS = 90;

  static init(db: DatabaseType): void {
    PermissionManager.db = db;
    PermissionManager.initIPCListeners();
  }

  static setCallbacks(
    showPrompt: ShowPromptCallback,
    hidePrompt: HidePromptCallback,
    findTab: FindTabCallback
  ): void {
    PermissionManager.showPromptCallback = showPrompt;
    PermissionManager.hidePromptCallback = hidePrompt;
    PermissionManager.findTabCallback = findTab;
  }

  static setupSession(partitionName: string): void {
    if (PermissionManager.initializedSessions.has(partitionName)) return;
    PermissionManager.initializedSessions.add(partitionName);

    const isPrivate = partitionName === PartitionNames.PRIVATE;
    const ses = session.fromPartition(partitionName);

    ses.setPermissionRequestHandler(
      (
        webContents: WebContents,
        permission: string,
        callback: (granted: boolean) => void,
        details:
          | Electron.PermissionRequest
          | Electron.MediaAccessPermissionRequest
          | Electron.FilesystemPermissionRequest
          | Electron.OpenExternalPermissionRequest
      ) => {
        // Auto-grant certain permissions
        if (PermissionManager.AUTO_GRANT_PERMISSIONS.has(permission)) {
          callback(true);
          return;
        }

        const iframeOrigin = PermissionManager.extractOrigin(details.requestingUrl);
        // Iframe delegation: when the request originates from a sub-frame, key
        // the prompt + persistent decision against the top-frame origin the user
        // recognises. Still require the iframe itself to be on a secure origin
        // so we don't let a mixed-content embed inherit a stored grant.
        const detailsAny = details as unknown as { isMainFrame?: boolean };
        const isSubFrame = detailsAny.isMainFrame === false;
        let topOrigin = iframeOrigin;
        if (isSubFrame) {
          try {
            const topUrl = webContents.getURL();
            if (topUrl) topOrigin = PermissionManager.extractOrigin(topUrl);
          } catch {
            /* fall through to iframe origin */
          }
        }
        const origin = topOrigin;
        const iframeIsSecure = PermissionManager.isSecureOrigin(iframeOrigin);
        const topIsSecure = PermissionManager.isSecureOrigin(topOrigin);

        const tabInfo = PermissionManager.findTabCallback?.(webContents.id);

        if (!tabInfo) {
          callback(false);
          return;
        }

        const { appWindowId, tabId } = tabInfo;
        const isSecure = topIsSecure;

        // Block sensitive permissions unless BOTH the top frame and the
        // requesting sub-frame are on secure origins.
        const isInsecureBlocked =
          PermissionManager.SENSITIVE_PERMISSIONS.has(permission) &&
          (!topIsSecure || !iframeIsSecure);

        // Extract media types up-front — needed both for the prompt UI and
        // for the macOS TCC check on stored-grant fast paths below.
        const mediaTypes = PermissionManager.extractMediaTypes(permission, details);

        // Check stored persistent decisions (not in private mode)
        if (!isPrivate && !isInsecureBlocked) {
          const persistent = PermissionManager.getPersistentDecision(origin, permission);
          if (persistent === 'allowed_persistent') {
            PermissionManager.touchPersistentDecision(origin, permission);
            PermissionManager.grantCallbacks([callback], permission, mediaTypes);
            return;
          }
          if (persistent === 'denied_persistent') {
            callback(false);
            return;
          }
        }

        // Check session decisions
        const sessionKey = PermissionManager.sessionKey(tabId, origin, permission);
        const sessionDecision = PermissionManager.sessionPermissions.get(sessionKey);
        if (sessionDecision === 'allowed_session') {
          PermissionManager.grantCallbacks([callback], permission, mediaTypes);
          return;
        }
        if (sessionDecision === 'denied_session') {
          callback(false);
          return;
        }

        // Check flooding
        const isFloodBlocked = PermissionManager.isFlooding(origin);

        // Build permission info
        const permInfo = PermissionManager.getPermissionInfo(permission, details);

        // Create request
        const request: PermissionRequest = {
          id: uuid(),
          webContentsId: webContents.id,
          tabId,
          appWindowId,
          origin,
          permission,
          permissions: [permInfo],
          mediaTypes,
          isSecure,
          isPrivate,
          faviconUrl: null,
          callbacks: [callback],
          timestamp: Date.now(),
          isInsecureBlocked,
          isFloodBlocked,
        };

        // Track request timestamp for flood detection
        PermissionManager.trackRequestTimestamp(origin);

        PermissionManager.enqueueRequest(request);
      }
    );

    // Note: setPermissionCheckHandler is intentionally not used. Electron's boolean
    // return can't express "undecided — please prompt". Returning false maps to
    // PermissionStatus::DENIED in Chromium, which prevents setPermissionRequestHandler
    // from being called for some permissions (notably geolocation). Without a check
    // handler, Electron defaults all permissions to "ask", ensuring every request
    // flows through our prompt UI above.

    // getDisplayMedia() — Chromium delegates screen/window selection to the host
    // app. Without this handler screen sharing silently fails in Meet/Zoom/Teams.
    ses.setDisplayMediaRequestHandler(async (_request, callback) => {
      try {
        const source = await PermissionManager.showDisplayMediaPicker();
        if (source) {
          callback({ video: source });
        } else {
          // Deny: pass undefined so the renderer promise rejects with NotAllowedError
          (callback as (s?: Electron.Streams) => void)(undefined);
        }
      } catch (err) {
        console.error('display-media picker failed:', err);
        (callback as (s?: Electron.Streams) => void)(undefined);
      }
    });
  }

  // ─── Display-Media Source Picker ─────────────────────────────────
  //
  // Each getDisplayMedia() request opens a dedicated BrowserWindow rendering
  // the display-capture-picker webpack entry. The renderer fetches the source
  // list via IPC (DISPLAY_CAPTURE_PICKER_GET_SOURCES) and returns the chosen
  // index via DISPLAY_CAPTURE_PICKER_SELECT. Per-request state is held in a
  // Map keyed by the picker window's webContents id so concurrent requests
  // (one per session) don't interfere.

  private static pendingPickers: Map<
    number,
    {
      sources: Electron.DesktopCapturerSource[];
      resolve: (source: Electron.DesktopCapturerSource | null) => void;
    }
  > = new Map();

  private static async showDisplayMediaPicker(): Promise<Electron.DesktopCapturerSource | null> {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 200 },
      fetchWindowIcons: false,
    });
    if (sources.length === 0) return null;

    return new Promise<Electron.DesktopCapturerSource | null>((resolve) => {
      const parent = BrowserWindow.getFocusedWindow() ?? undefined;
      const pickerWin = new BrowserWindow({
        width: 720,
        height: 540,
        title: 'Share your screen',
        parent,
        modal: !!parent,
        resizable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        useContentSize: true,
        show: false,
        webPreferences: {
          preload: DISPLAY_CAPTURE_PICKER_PRELOAD_WEBPACK_ENTRY,
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
        },
      });

      const wcId = pickerWin.webContents.id;
      let resolved = false;
      const done = (idx: number | null) => {
        if (resolved) return;
        resolved = true;
        PermissionManager.pendingPickers.delete(wcId);
        if (!pickerWin.isDestroyed()) pickerWin.destroy();
        resolve(idx !== null && idx >= 0 && idx < sources.length ? sources[idx] : null);
      };

      PermissionManager.pendingPickers.set(wcId, {
        sources,
        resolve: (source) => done(source ? sources.indexOf(source) : null),
      });

      pickerWin.on('closed', () => done(null));

      pickerWin
        .loadURL(DISPLAY_CAPTURE_PICKER_WEBPACK_ENTRY)
        .then(() => {
          if (!pickerWin.isDestroyed()) pickerWin.show();
        })
        .catch(() => done(null));
    });
  }

  private static getSourcesForPicker(
    webContentsId: number
  ): Array<{ idx: number; name: string; type: 'Screen' | 'Window'; thumbnail: string }> {
    const pending = PermissionManager.pendingPickers.get(webContentsId);
    if (!pending) return [];
    return pending.sources.map((s, i) => ({
      idx: i,
      name: s.name,
      type: s.id.startsWith('screen:') ? 'Screen' : 'Window',
      thumbnail: s.thumbnail.toDataURL(),
    }));
  }

  private static resolvePicker(webContentsId: number, idx: number | null): void {
    const pending = PermissionManager.pendingPickers.get(webContentsId);
    if (!pending) return;
    const source =
      idx !== null && idx >= 0 && idx < pending.sources.length ? pending.sources[idx] : null;
    pending.resolve(source);
  }

  // ─── Request Queue ───────────────────────────────────────────────

  private static enqueueRequest(request: PermissionRequest): void {
    const tabId = request.tabId;

    // Coalesce concurrent media requests for the same origin into a single
    // prompt. Meet/Zoom/Teams call getUserMedia separately for camera and
    // microphone in quick succession; if we queue them as two prompts, the
    // second getUserMedia call typically times out before the user reaches
    // its prompt, leaving the page stuck on "permission not granted".
    const active = PermissionManager.activePrompts.get(tabId);
    if (active && PermissionManager.canCoalesce(active, request)) {
      PermissionManager.coalesceInto(active, request);
      return;
    }
    const queue = PermissionManager.pendingQueues.get(tabId) || [];
    for (const queued of queue) {
      if (PermissionManager.canCoalesce(queued, request)) {
        PermissionManager.coalesceInto(queued, request);
        return;
      }
    }

    if (active) {
      queue.push(request);
      PermissionManager.pendingQueues.set(tabId, queue);
    } else {
      PermissionManager.showPromptForRequest(request);
    }
  }

  // Two requests can share one prompt when they're both media requests from
  // the same top-level origin. Non-media permissions (geolocation,
  // notifications, etc.) are never coalesced.
  private static canCoalesce(existing: PermissionRequest, incoming: PermissionRequest): boolean {
    return (
      existing.permission === 'media' &&
      incoming.permission === 'media' &&
      existing.origin === incoming.origin
    );
  }

  private static coalesceInto(existing: PermissionRequest, incoming: PermissionRequest): void {
    const merged = new Set([...existing.mediaTypes, ...incoming.mediaTypes]);
    existing.mediaTypes = Array.from(merged);
    existing.permissions = [PermissionManager.buildMediaPermissionInfo(existing.mediaTypes)];
    existing.callbacks.push(...incoming.callbacks);
    // If the coalesced-into request is the one currently being shown, refresh
    // the strip so the label reflects the merged media types (e.g. switch from
    // "microphone" to "camera and microphone").
    if (PermissionManager.activePrompts.get(existing.tabId) === existing) {
      PermissionManager.showPromptCallback?.(existing.appWindowId, existing);
    }
  }

  private static showPromptForRequest(request: PermissionRequest): void {
    PermissionManager.activePrompts.set(request.tabId, request);
    PermissionManager.showPromptCallback?.(request.appWindowId, request);
  }

  private static processNextInQueue(tabId: string): void {
    const queue = PermissionManager.pendingQueues.get(tabId);
    if (!queue || queue.length === 0) return;
    const next = queue.shift()!;
    if (queue.length === 0) PermissionManager.pendingQueues.delete(tabId);

    // A decision recorded by the just-completed prompt may now satisfy this
    // queued request (e.g. user picked "always allow" for media — any queued
    // media request for the same origin should auto-resolve, not re-prompt).
    const decided = PermissionManager.evaluateStoredDecision(next);
    if (decided !== null) {
      if (decided) {
        PermissionManager.grantCallbacks(next.callbacks, next.permission, next.mediaTypes);
      } else {
        for (const cb of next.callbacks) cb(false);
      }
      // Continue draining the queue without forcing a UI roundtrip.
      setTimeout(() => PermissionManager.processNextInQueue(tabId), 0);
      return;
    }

    PermissionManager.showPromptForRequest(next);
  }

  // Returns true/false if a stored session or persistent decision applies,
  // null if the request still needs to prompt.
  private static evaluateStoredDecision(request: PermissionRequest): boolean | null {
    const { tabId, origin, permission, isPrivate, isInsecureBlocked } = request;
    if (isInsecureBlocked) return null;
    if (!isPrivate) {
      const persistent = PermissionManager.getPersistentDecision(origin, permission);
      if (persistent === 'allowed_persistent') {
        PermissionManager.touchPersistentDecision(origin, permission);
        return true;
      }
      if (persistent === 'denied_persistent') return false;
    }
    const sessionKey = PermissionManager.sessionKey(tabId, origin, permission);
    const sessionDecision = PermissionManager.sessionPermissions.get(sessionKey);
    if (sessionDecision === 'allowed_session') return true;
    if (sessionDecision === 'denied_session') return false;
    return null;
  }

  // ─── Prompt Response ─────────────────────────────────────────────

  static handlePromptResponse(requestId: string, decision: string): void {
    // Find the active prompt by requestId across all tabs
    let request: PermissionRequest | null = null;
    for (const [, prompt] of PermissionManager.activePrompts) {
      if (prompt.id === requestId) {
        request = prompt;
        break;
      }
    }
    if (!request) return;

    PermissionManager.activePrompts.delete(request.tabId);
    const { tabId, origin, permission, callbacks, mediaTypes, isPrivate } = request;
    const sessionKey = PermissionManager.sessionKey(tabId, origin, permission);
    const grantAll = (): void => {
      PermissionManager.grantCallbacks(callbacks, permission, mediaTypes);
    };
    const denyAll = (): void => {
      for (const cb of callbacks) cb(false);
    };

    switch (decision) {
      case 'allow_once':
        PermissionManager.sessionPermissions.set(sessionKey, 'allowed_session');
        grantAll();
        break;

      case 'always_allow':
        if (isPrivate) {
          PermissionManager.sessionPermissions.set(sessionKey, 'allowed_session');
        } else {
          PermissionManager.storePersistentDecision(origin, permission, 'allowed_persistent');
        }
        grantAll();
        break;

      case 'deny_once':
        PermissionManager.sessionPermissions.set(sessionKey, 'denied_session');
        denyAll();
        break;

      case 'always_deny':
        if (isPrivate) {
          PermissionManager.sessionPermissions.set(sessionKey, 'denied_session');
        } else {
          PermissionManager.storePersistentDecision(origin, permission, 'denied_persistent');
        }
        denyAll();
        break;

      default:
        denyAll();
        break;
    }

    // Hide the prompt
    PermissionManager.hidePromptCallback?.(request.appWindowId);

    // Process next queued request for this tab
    const respondedTabId = request.tabId;
    setTimeout(() => PermissionManager.processNextInQueue(respondedTabId), 100);
  }

  // ─── Flood Detection ─────────────────────────────────────────────

  private static trackRequestTimestamp(origin: string): void {
    const now = Date.now();
    let timestamps = PermissionManager.requestTimestamps.get(origin);
    if (!timestamps) {
      timestamps = [];
      PermissionManager.requestTimestamps.set(origin, timestamps);
    }
    timestamps.push(now);
    const cutoff = now - PermissionManager.FLOOD_WINDOW_MS;
    PermissionManager.requestTimestamps.set(
      origin,
      timestamps.filter((t: number) => t > cutoff)
    );
  }

  private static isFlooding(origin: string): boolean {
    const timestamps = PermissionManager.requestTimestamps.get(origin);
    if (!timestamps) return false;
    const cutoff = Date.now() - PermissionManager.FLOOD_WINDOW_MS;
    const recent = timestamps.filter((t: number) => t > cutoff);
    return recent.length >= PermissionManager.FLOOD_LIMIT;
  }

  // ─── Session Permission Management ───────────────────────────────

  private static sessionKey(tabId: string, origin: string, permission: string): string {
    return `${tabId}::${origin}::${permission}`;
  }

  static clearSessionPermissionsForTab(tabId: string): void {
    const keysToDelete: string[] = [];
    PermissionManager.sessionPermissions.forEach((_: SessionDecision, key: string) => {
      if (key.startsWith(`${tabId}::`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key: string) => PermissionManager.sessionPermissions.delete(key));

    // Cancel any pending/active requests for this tab
    PermissionManager.cancelRequestsForTab(tabId);
  }

  static clearSessionPermissionsForTabOrigin(tabId: string, origin: string): void {
    const prefix = `${tabId}::${origin}::`;
    const keysToDelete: string[] = [];
    PermissionManager.sessionPermissions.forEach((_: SessionDecision, key: string) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key: string) => PermissionManager.sessionPermissions.delete(key));
  }

  private static cancelRequestsForTab(tabId: string): void {
    // Cancel pending queue for this tab
    const queue = PermissionManager.pendingQueues.get(tabId);
    if (queue) {
      queue.forEach((req: PermissionRequest) => req.callbacks.forEach((cb) => cb(false)));
      PermissionManager.pendingQueues.delete(tabId);
    }

    // Cancel active prompt for this tab
    const active = PermissionManager.activePrompts.get(tabId);
    if (active) {
      PermissionManager.activePrompts.delete(tabId);
      active.callbacks.forEach((cb) => cb(false));
      PermissionManager.hidePromptCallback?.(active.appWindowId);
    }
  }

  // ─── Persistent Permission Storage (SQLite) ──────────────────────

  private static getPersistentDecision(
    origin: string,
    permissionType: string
  ): PersistentDecision | null {
    if (!PermissionManager.db) return null;
    try {
      const row = PermissionManager.db
        .prepare(
          'SELECT decision, lastAccessedAt FROM site_permission WHERE origin = ? AND permissionType = ?'
        )
        .get(origin, permissionType) as PermissionRecord | undefined;

      if (!row) return null;

      // Check expiry for allowed_persistent (90 days without use)
      if (row.decision === 'allowed_persistent' && row.lastAccessedAt) {
        const lastAccessed = new Date(row.lastAccessedAt).getTime();
        const daysSinceAccess = (Date.now() - lastAccessed) / (1000 * 60 * 60 * 24);
        if (daysSinceAccess > PermissionManager.PERMISSION_EXPIRY_DAYS) {
          PermissionManager.db
            .prepare('DELETE FROM site_permission WHERE origin = ? AND permissionType = ?')
            .run(origin, permissionType);
          return null;
        }
      }

      return row.decision as PersistentDecision;
    } catch {
      return null;
    }
  }

  private static storePersistentDecision(
    origin: string,
    permissionType: string,
    decision: PersistentDecision
  ): void {
    if (!PermissionManager.db) return;
    try {
      const now = new Date().toISOString();
      const existing = PermissionManager.db
        .prepare('SELECT id FROM site_permission WHERE origin = ? AND permissionType = ?')
        .get(origin, permissionType) as { id: string } | undefined;

      if (existing) {
        PermissionManager.db
          .prepare('UPDATE site_permission SET decision = ?, lastAccessedAt = ? WHERE id = ?')
          .run(decision, now, existing.id);
      } else {
        PermissionManager.db
          .prepare(
            'INSERT INTO site_permission (id, origin, permissionType, decision, createdAt, lastAccessedAt) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .run(uuid(), origin, permissionType, decision, now, now);
      }
    } catch (err) {
      console.error('Failed to store permission decision:', err);
    }
  }

  private static touchPersistentDecision(origin: string, permissionType: string): void {
    if (!PermissionManager.db) return;
    try {
      PermissionManager.db
        .prepare(
          'UPDATE site_permission SET lastAccessedAt = ? WHERE origin = ? AND permissionType = ?'
        )
        .run(new Date().toISOString(), origin, permissionType);
    } catch {
      // Ignore
    }
  }

  // ─── Settings Page APIs ──────────────────────────────────────────

  static getAllPersistentPermissions(searchTerm?: string): PermissionRecord[] {
    if (!PermissionManager.db) return [];
    try {
      const baseSelect = `
        SELECT p.*,
          (SELECT h.faviconUrl FROM browsingHistory h
           WHERE h.faviconUrl IS NOT NULL
             AND (h.url = p.origin OR h.url LIKE p.origin || '/%')
           ORDER BY h.createdDate DESC LIMIT 1) AS faviconUrl
        FROM site_permission p
      `;
      if (searchTerm) {
        return PermissionManager.db
          .prepare(
            `${baseSelect} WHERE p.origin LIKE ? OR p.permissionType LIKE ? ORDER BY p.origin, p.permissionType`
          )
          .all(`%${searchTerm}%`, `%${searchTerm}%`) as PermissionRecord[];
      }
      return PermissionManager.db
        .prepare(`${baseSelect} ORDER BY p.origin, p.permissionType`)
        .all() as PermissionRecord[];
    } catch {
      return [];
    }
  }

  static removePersistentPermission(id: string): void {
    if (!PermissionManager.db) return;
    try {
      PermissionManager.db.prepare('DELETE FROM site_permission WHERE id = ?').run(id);
    } catch (err) {
      console.error('Failed to remove permission:', err);
    }
  }

  static removeAllPermissionsForOrigin(origin: string): void {
    if (!PermissionManager.db) return;
    try {
      PermissionManager.db.prepare('DELETE FROM site_permission WHERE origin = ?').run(origin);
    } catch (err) {
      console.error('Failed to remove permissions for origin:', err);
    }
  }

  static updatePersistentPermissionDecision(id: string, decision: PersistentDecision): boolean {
    if (!PermissionManager.db) return false;
    try {
      const now = new Date().toISOString();
      const result = PermissionManager.db
        .prepare('UPDATE site_permission SET decision = ?, lastAccessedAt = ? WHERE id = ?')
        .run(decision, now, id);
      return result.changes > 0;
    } catch (err) {
      console.error('Failed to update permission decision:', err);
      return false;
    }
  }

  static clearAllPersistentPermissions(): void {
    if (!PermissionManager.db) return;
    try {
      PermissionManager.db.prepare('DELETE FROM site_permission').run();
    } catch (err) {
      console.error('Failed to clear permissions:', err);
    }
  }

  static clearMemoryPermissions(): void {
    PermissionManager.sessionPermissions.clear();
    PermissionManager.requestTimestamps.clear();
    PermissionManager.activePrompts.clear();
    PermissionManager.pendingQueues.clear();
  }

  // ─── Programmatic Permission API ──────────────────────────────────

  /**
   * Check the current permission state for a given webContents and permission type.
   * Returns 'granted', 'denied', or 'default'.
   */
  static checkPermissionState(webContentsId: number, origin: string, permission: string): string {
    const tabInfo = PermissionManager.findTabCallback?.(webContentsId);
    if (!tabInfo) return 'denied';

    const { tabId, isPrivate } = tabInfo;

    if (!isPrivate) {
      const persistent = PermissionManager.getPersistentDecision(origin, permission);
      if (persistent === 'allowed_persistent') return 'granted';
      if (persistent === 'denied_persistent') return 'denied';
    }

    const sessionKey = PermissionManager.sessionKey(tabId, origin, permission);
    const sessionDecision = PermissionManager.sessionPermissions.get(sessionKey);
    if (sessionDecision === 'allowed_session') return 'granted';
    if (sessionDecision === 'denied_session') return 'denied';

    return 'default';
  }

  /**
   * Programmatically request a permission (e.g. for notifications from polyfill).
   * Creates a PermissionRequest and enqueues it through the normal prompt flow.
   */
  static programmaticPermissionRequest(
    webContentsId: number,
    origin: string,
    permission: string,
    callback: (granted: boolean) => void
  ): void {
    const tabInfo = PermissionManager.findTabCallback?.(webContentsId);
    if (!tabInfo) {
      callback(false);
      return;
    }

    const { appWindowId, tabId, isPrivate } = tabInfo;
    const isSecure = PermissionManager.isSecureOrigin(origin);
    const isInsecureBlocked = !isSecure && PermissionManager.SENSITIVE_PERMISSIONS.has(permission);

    // Check existing persistent decisions
    if (!isPrivate && !isInsecureBlocked) {
      const persistent = PermissionManager.getPersistentDecision(origin, permission);
      if (persistent === 'allowed_persistent') {
        PermissionManager.touchPersistentDecision(origin, permission);
        PermissionManager.grantCallbacks([callback], permission, []);
        return;
      }
      if (persistent === 'denied_persistent') {
        callback(false);
        return;
      }
    }

    // Check session decisions
    const sessionKey = PermissionManager.sessionKey(tabId, origin, permission);
    const sessionDecision = PermissionManager.sessionPermissions.get(sessionKey);
    if (sessionDecision === 'allowed_session') {
      PermissionManager.grantCallbacks([callback], permission, []);
      return;
    }
    if (sessionDecision === 'denied_session') {
      callback(false);
      return;
    }

    const isFloodBlocked = PermissionManager.isFlooding(origin);
    const permInfo = PermissionManager.getPermissionInfo(permission);

    const request: PermissionRequest = {
      id: uuid(),
      webContentsId,
      tabId,
      appWindowId,
      origin,
      permission,
      permissions: [permInfo],
      mediaTypes: [],
      isSecure,
      isPrivate,
      faviconUrl: null,
      callbacks: [callback],
      timestamp: Date.now(),
      isInsecureBlocked,
      isFloodBlocked,
    };

    PermissionManager.trackRequestTimestamp(origin);
    PermissionManager.enqueueRequest(request);
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  // Granting `media` via setPermissionRequestHandler is necessary but not
  // sufficient on macOS: TCC also has to grant the app itself access to the
  // mic/camera, and that dialog doesn't fire automatically just because we
  // returned true. Without this step, getUserMedia silently hangs on
  // unsigned builds — Chromium waits on the OS, the OS never resolves,
  // and pages like Zoom retry until they hit their internal timeout.
  // askForMediaAccess() triggers the TCC dialog on first use; on subsequent
  // calls it short-circuits to the cached decision.
  private static async invokeMediaCallbacks(
    callbacks: Array<(granted: boolean) => void>,
    mediaTypes: string[]
  ): Promise<void> {
    const grant = (value: boolean): void => {
      for (const cb of callbacks) cb(value);
    };

    if (process.platform !== 'darwin') {
      grant(true);
      return;
    }

    const types: Array<'microphone' | 'camera'> = [];
    if (mediaTypes.includes('audio')) types.push('microphone');
    if (mediaTypes.includes('video')) types.push('camera');
    if (types.length === 0) {
      grant(true);
      return;
    }

    try {
      for (const type of types) {
        const status = systemPreferences.getMediaAccessStatus(type);
        if (status === 'granted') continue;
        if (status === 'denied' || status === 'restricted') {
          console.warn(
            `Nav0: macOS ${type} access is ${status}. Enable Nav0 in ` +
              `System Settings > Privacy & Security > ${
                type === 'microphone' ? 'Microphone' : 'Camera'
              }.`
          );
          grant(false);
          return;
        }
        const granted = await systemPreferences.askForMediaAccess(type);
        if (!granted) {
          grant(false);
          return;
        }
      }
      grant(true);
    } catch (err) {
      console.error('macOS media access check failed:', err);
      grant(false);
    }
  }

  // Single funnel for granting a permission to one or more queued callbacks.
  // Routes `media` through the macOS TCC check; everything else grants
  // synchronously like before.
  private static grantCallbacks(
    callbacks: Array<(granted: boolean) => void>,
    permission: string,
    mediaTypes: string[]
  ): void {
    if (permission === 'media') {
      void PermissionManager.invokeMediaCallbacks(callbacks, mediaTypes);
      return;
    }
    for (const cb of callbacks) cb(true);
  }

  private static extractOrigin(url: string): string {
    try {
      return new URL(url).origin;
    } catch {
      return 'unknown';
    }
  }

  private static isSecureOrigin(origin: string): boolean {
    try {
      const url = new URL(origin);
      if (url.protocol === 'https:') return true;
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
      return false;
    } catch {
      return false;
    }
  }

  static extractMediaTypes(
    permission: string,
    details: unknown
  ): string[] {
    if (permission !== 'media') return [];
    const mediaDetails = details as Electron.MediaAccessPermissionRequest | undefined;
    const types = mediaDetails?.mediaTypes;
    if (Array.isArray(types) && types.length > 0) return [...types];
    return [];
  }

  static buildMediaPermissionInfo(mediaTypes: string[]): {
    type: string;
    label: string;
    icon: string;
  } {
    const hasVideo = mediaTypes.includes('video');
    const hasAudio = mediaTypes.includes('audio');
    if (hasVideo && hasAudio) {
      return { type: 'media', label: 'camera and microphone', icon: 'camera' };
    }
    if (hasVideo) return { type: 'media', label: 'camera', icon: 'camera' };
    if (hasAudio) return { type: 'media', label: 'microphone', icon: 'mic' };
    return { type: 'media', label: 'camera/microphone', icon: 'camera' };
  }

  static getPermissionInfo(
    permission: string,
    details?: Electron.PermissionRequest | Electron.MediaAccessPermissionRequest
  ): { type: string; label: string; icon: string } {
    if (permission === 'media') {
      return PermissionManager.buildMediaPermissionInfo(
        PermissionManager.extractMediaTypes(permission, details)
      );
    }

    const info: Record<string, { label: string; icon: string }> = {
      geolocation: { label: 'location', icon: 'map-pin' },
      notifications: { label: 'notifications', icon: 'bell' },
      midi: { label: 'MIDI devices', icon: 'music' },
      midiSysex: { label: 'MIDI system exclusive', icon: 'music' },
      pointerLock: { label: 'pointer lock', icon: 'lock' },
      openExternal: { label: 'external application', icon: 'app-window' },
      'clipboard-read': { label: 'clipboard', icon: 'clipboard' },
      'idle-detection': { label: 'idle detection', icon: 'moon' },
      'display-capture': { label: 'screen sharing', icon: 'monitor' },
      mediaKeySystem: { label: 'protected content', icon: 'hard-drive' },
      'accessibility-events': { label: 'accessibility events', icon: 'eye' },
      'storage-access': { label: 'storage access', icon: 'hard-drive' },
      'window-management': { label: 'window management', icon: 'app-window' },
      'local-fonts': { label: 'local fonts', icon: 'type' },
      'screen-wake-lock': { label: 'screen wake lock', icon: 'monitor' },
      'speaker-selection': { label: 'speaker selection', icon: 'speaker' },
      'keyboard-lock': { label: 'keyboard lock', icon: 'keyboard' },
      usb: { label: 'USB devices', icon: 'usb' },
      serial: { label: 'serial ports', icon: 'usb' },
      bluetooth: { label: 'Bluetooth devices', icon: 'bluetooth' },
      hid: { label: 'HID devices', icon: 'keyboard' },
    };

    const found = info[permission];
    if (found) return { type: permission, ...found };
    return { type: permission, label: permission, icon: 'shield-alert' };
  }

  // ─── IPC Listeners ───────────────────────────────────────────────

  private static initIPCListeners(): void {
    ipcMain.on(
      RendererToMainEventsForBrowserIPC.PERMISSION_PROMPT_RESPONSE,
      (
        _event: Electron.IpcMainEvent,
        _appWindowId: string,
        requestId: string,
        decision: string
      ) => {
        PermissionManager.handlePromptResponse(requestId, decision);
      }
    );

    ipcMain.handle(
      RendererToMainEventsForBrowserIPC.FETCH_PERMISSIONS,
      (_event: Electron.IpcMainInvokeEvent, searchTerm?: string) => {
        return PermissionManager.getAllPersistentPermissions(searchTerm);
      }
    );

    ipcMain.handle(
      RendererToMainEventsForBrowserIPC.REMOVE_PERMISSION,
      (_event: Electron.IpcMainInvokeEvent, permissionId: string) => {
        PermissionManager.removePersistentPermission(permissionId);
        return true;
      }
    );

    ipcMain.handle(
      RendererToMainEventsForBrowserIPC.REMOVE_ALL_PERMISSIONS_FOR_ORIGIN,
      (_event: Electron.IpcMainInvokeEvent, origin: string) => {
        PermissionManager.removeAllPermissionsForOrigin(origin);
        return true;
      }
    );

    ipcMain.handle(RendererToMainEventsForBrowserIPC.CLEAR_ALL_PERMISSIONS, () => {
      PermissionManager.clearAllPersistentPermissions();
      return true;
    });

    ipcMain.handle(
      RendererToMainEventsForBrowserIPC.UPDATE_PERMISSION_DECISION,
      (_event: Electron.IpcMainInvokeEvent, permissionId: string, decision: string) => {
        return PermissionManager.updatePersistentPermissionDecision(
          permissionId,
          decision as PersistentDecision
        );
      }
    );

    ipcMain.handle(
      RendererToMainEventsForBrowserIPC.DISPLAY_CAPTURE_PICKER_GET_SOURCES,
      (event: Electron.IpcMainInvokeEvent) => {
        return PermissionManager.getSourcesForPicker(event.sender.id);
      }
    );

    ipcMain.on(
      RendererToMainEventsForBrowserIPC.DISPLAY_CAPTURE_PICKER_SELECT,
      (event: Electron.IpcMainEvent, idx: number | null) => {
        PermissionManager.resolvePicker(event.sender.id, idx);
      }
    );

    ipcMain.handle('get-ip-geolocation', async () => {
      const services = [
        {
          url: 'https://ipapi.co/json/',
          parse: (d: Record<string, unknown>) => ({
            lat: d.latitude as number,
            lon: d.longitude as number,
          }),
        },
        {
          url: 'https://ipwho.is/',
          parse: (d: Record<string, unknown>) => ({
            lat: d.latitude as number,
            lon: d.longitude as number,
          }),
        },
        {
          url: 'https://freeipapi.com/api/json',
          parse: (d: Record<string, unknown>) => ({
            lat: d.latitude as number,
            lon: d.longitude as number,
          }),
        },
      ];
      for (const svc of services) {
        try {
          const resp = await net.fetch(svc.url);
          if (!resp.ok) continue;
          const data = await resp.json();
          const { lat, lon } = svc.parse(data);
          if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
            return { latitude: lat, longitude: lon };
          }
        } catch {
          continue;
        }
      }
      return null;
    });

    ipcMain.handle(
      'web-share',
      async (
        _event: Electron.IpcMainInvokeEvent,
        data: { title?: string; text?: string; url?: string }
      ) => {
        try {
          const parts: string[] = [];
          if (data.title) parts.push(data.title);
          if (data.text) parts.push(data.text);
          if (data.url) parts.push(data.url);

          const textToCopy = parts.join('\n');
          if (!textToCopy) {
            return { success: false, error: 'Nothing to share' };
          }

          clipboard.writeText(textToCopy);
          return { success: true };
        } catch {
          return { success: false, error: 'Failed to copy to clipboard' };
        }
      }
    );
  }
}
