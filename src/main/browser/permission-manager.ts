import { session, WebContents, ipcMain, net, clipboard, desktopCapturer, BrowserWindow } from 'electron';
import { v4 as uuid } from 'uuid';
import { RendererToMainEventsForBrowserIPC } from '../../constants/app-constants';
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
  isSecure: boolean;
  isPrivate: boolean;
  faviconUrl: string | null;
  callback: (granted: boolean) => void;
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
}

// Callback type for showing/hiding the prompt UI
type ShowPromptCallback = (appWindowId: string, request: PermissionRequest) => void;
type HidePromptCallback = (appWindowId: string) => void;

// Callback type for finding tab info from a webContents
type FindTabCallback = (webContentsId: number) => { appWindowId: string; tabId: string; isPrivate: boolean } | null;

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
  static readonly SENSITIVE_PERMISSIONS = new Set([
    'media',
    'geolocation',
    'display-capture',
  ]);

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

    const isPrivate = partitionName === 'persist:private';
    const ses = session.fromPartition(partitionName);

    ses.setPermissionRequestHandler((
      webContents: WebContents,
      permission: string,
      callback: (granted: boolean) => void,
      details: Electron.PermissionRequest | Electron.MediaAccessPermissionRequest | Electron.FilesystemPermissionRequest | Electron.OpenExternalPermissionRequest
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
        } catch { /* fall through to iframe origin */ }
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
      const isInsecureBlocked = PermissionManager.SENSITIVE_PERMISSIONS.has(permission)
        && (!topIsSecure || !iframeIsSecure);

      // Check stored persistent decisions (not in private mode)
      if (!isPrivate && !isInsecureBlocked) {
        const persistent = PermissionManager.getPersistentDecision(origin, permission);
        if (persistent === 'allowed_persistent') {
          PermissionManager.touchPersistentDecision(origin, permission);
          callback(true);
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
        callback(true);
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
        isSecure,
        isPrivate,
        faviconUrl: null,
        callback,
        timestamp: Date.now(),
        isInsecureBlocked,
        isFloodBlocked,
      };

      // Track request timestamp for flood detection
      PermissionManager.trackRequestTimestamp(origin);

      PermissionManager.enqueueRequest(request);
    });

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

  private static async showDisplayMediaPicker(): Promise<Electron.DesktopCapturerSource | null> {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 200 },
      fetchWindowIcons: false,
    });
    if (sources.length === 0) return null;

    const thumbs = sources.map((s, i) => ({
      idx: i,
      name: s.name,
      type: s.id.startsWith('screen:') ? 'Screen' : 'Window',
      thumbnail: s.thumbnail.toDataURL(),
    }));

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Share your screen</title>
<style>
html,body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f5f5;color:#222;height:100%;}
body{padding:16px;box-sizing:border-box;display:flex;flex-direction:column;}
h1{font-size:15px;margin:0 0 12px;font-weight:600;}
.grid{flex:1;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;overflow-y:auto;align-content:start;}
.src{background:#fff;border:2px solid transparent;border-radius:8px;padding:8px;cursor:pointer;text-align:center;user-select:none;}
.src:hover{border-color:#aaa;}
.src.selected{border-color:#2a7cff;}
.src img{width:100%;height:auto;border-radius:4px;display:block;background:#000;}
.src .name{font-size:12px;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.src .type{font-size:10px;color:#888;margin-top:4px;}
.actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px;}
button{padding:8px 16px;font-size:13px;border:1px solid #ccc;background:#fff;border-radius:4px;cursor:pointer;}
button.primary{background:#2a7cff;color:#fff;border-color:#2a7cff;}
button.primary:disabled{background:#88b4ff;cursor:not-allowed;}
</style>
</head>
<body>
<h1>Choose what to share</h1>
<div class="grid" id="sources"></div>
<div class="actions">
<button id="cancel">Cancel</button>
<button id="share" class="primary" disabled>Share</button>
</div>
<script>
var sources = ${JSON.stringify(thumbs)};
var selectedIdx = -1;
var grid = document.getElementById('sources');
var shareBtn = document.getElementById('share');
sources.forEach(function(s, i) {
  var el = document.createElement('div');
  el.className = 'src';
  var img = document.createElement('img'); img.src = s.thumbnail;
  var type = document.createElement('div'); type.className = 'type'; type.textContent = s.type;
  var name = document.createElement('div'); name.className = 'name'; name.title = s.name; name.textContent = s.name;
  el.appendChild(img); el.appendChild(type); el.appendChild(name);
  el.addEventListener('click', function() {
    selectedIdx = i;
    Array.prototype.forEach.call(grid.querySelectorAll('.src'), function(c) { c.classList.remove('selected'); });
    el.classList.add('selected');
    shareBtn.disabled = false;
  });
  el.addEventListener('dblclick', function() {
    selectedIdx = i;
    document.title = 'nav0-picker:select:' + i;
  });
  grid.appendChild(el);
});
document.getElementById('cancel').addEventListener('click', function() {
  document.title = 'nav0-picker:cancel';
});
shareBtn.addEventListener('click', function() {
  if (selectedIdx >= 0) document.title = 'nav0-picker:select:' + selectedIdx;
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') document.title = 'nav0-picker:cancel';
});
</script>
</body>
</html>`;

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
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
        },
      });

      let resolved = false;
      const done = (idx: number | null) => {
        if (resolved) return;
        resolved = true;
        if (!pickerWin.isDestroyed()) pickerWin.destroy();
        resolve(idx !== null && idx >= 0 && idx < sources.length ? sources[idx] : null);
      };

      pickerWin.webContents.on('page-title-updated', (event, title) => {
        if (!title || !title.startsWith('nav0-picker:')) return;
        event.preventDefault();
        const body = title.slice('nav0-picker:'.length);
        if (body === 'cancel') { done(null); return; }
        const m = body.match(/^select:(\d+)$/);
        done(m ? parseInt(m[1], 10) : null);
      });
      pickerWin.on('closed', () => done(null));

      pickerWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
        .then(() => { if (!pickerWin.isDestroyed()) pickerWin.show(); })
        .catch(() => done(null));
    });
  }

  // ─── Request Queue ───────────────────────────────────────────────

  private static enqueueRequest(request: PermissionRequest): void {
    const tabId = request.tabId;
    if (PermissionManager.activePrompts.has(tabId)) {
      // Same tab already has an active prompt — queue for that tab
      const queue = PermissionManager.pendingQueues.get(tabId) || [];
      queue.push(request);
      PermissionManager.pendingQueues.set(tabId, queue);
    } else {
      PermissionManager.showPromptForRequest(request);
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
    PermissionManager.showPromptForRequest(next);
  }

  // ─── Prompt Response ─────────────────────────────────────────────

  static handlePromptResponse(requestId: string, decision: string): void {
    // Find the active prompt by requestId across all tabs
    let request: PermissionRequest | null = null;
    for (const [, prompt] of PermissionManager.activePrompts) {
      if (prompt.id === requestId) { request = prompt; break; }
    }
    if (!request) return;

    PermissionManager.activePrompts.delete(request.tabId);
    const { tabId, origin, permission, callback, isPrivate } = request;
    const sessionKey = PermissionManager.sessionKey(tabId, origin, permission);

    switch (decision) {
      case 'allow_once':
        PermissionManager.sessionPermissions.set(sessionKey, 'allowed_session');
        callback(true);
        break;

      case 'always_allow':
        if (isPrivate) {
          PermissionManager.sessionPermissions.set(sessionKey, 'allowed_session');
        } else {
          PermissionManager.storePersistentDecision(origin, permission, 'allowed_persistent');
        }
        callback(true);
        break;

      case 'deny_once':
        PermissionManager.sessionPermissions.set(sessionKey, 'denied_session');
        callback(false);
        break;

      case 'always_deny':
        if (isPrivate) {
          PermissionManager.sessionPermissions.set(sessionKey, 'denied_session');
        } else {
          PermissionManager.storePersistentDecision(origin, permission, 'denied_persistent');
        }
        callback(false);
        break;

      default:
        callback(false);
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
      queue.forEach((req: PermissionRequest) => req.callback(false));
      PermissionManager.pendingQueues.delete(tabId);
    }

    // Cancel active prompt for this tab
    const active = PermissionManager.activePrompts.get(tabId);
    if (active) {
      PermissionManager.activePrompts.delete(tabId);
      active.callback(false);
      PermissionManager.hidePromptCallback?.(active.appWindowId);
    }
  }

  // ─── Persistent Permission Storage (SQLite) ──────────────────────

  private static getPersistentDecision(origin: string, permissionType: string): PersistentDecision | null {
    if (!PermissionManager.db) return null;
    try {
      const row = PermissionManager.db.prepare(
        'SELECT decision, lastAccessedAt FROM site_permission WHERE origin = ? AND permissionType = ?'
      ).get(origin, permissionType) as PermissionRecord | undefined;

      if (!row) return null;

      // Check expiry for allowed_persistent (90 days without use)
      if (row.decision === 'allowed_persistent' && row.lastAccessedAt) {
        const lastAccessed = new Date(row.lastAccessedAt).getTime();
        const daysSinceAccess = (Date.now() - lastAccessed) / (1000 * 60 * 60 * 24);
        if (daysSinceAccess > PermissionManager.PERMISSION_EXPIRY_DAYS) {
          PermissionManager.db.prepare(
            'DELETE FROM site_permission WHERE origin = ? AND permissionType = ?'
          ).run(origin, permissionType);
          return null;
        }
      }

      return row.decision as PersistentDecision;
    } catch {
      return null;
    }
  }

  private static storePersistentDecision(origin: string, permissionType: string, decision: PersistentDecision): void {
    if (!PermissionManager.db) return;
    try {
      const now = new Date().toISOString();
      const existing = PermissionManager.db.prepare(
        'SELECT id FROM site_permission WHERE origin = ? AND permissionType = ?'
      ).get(origin, permissionType) as { id: string } | undefined;

      if (existing) {
        PermissionManager.db.prepare(
          'UPDATE site_permission SET decision = ?, lastAccessedAt = ? WHERE id = ?'
        ).run(decision, now, existing.id);
      } else {
        PermissionManager.db.prepare(
          'INSERT INTO site_permission (id, origin, permissionType, decision, createdAt, lastAccessedAt) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(uuid(), origin, permissionType, decision, now, now);
      }
    } catch (err) {
      console.error('Failed to store permission decision:', err);
    }
  }

  private static touchPersistentDecision(origin: string, permissionType: string): void {
    if (!PermissionManager.db) return;
    try {
      PermissionManager.db.prepare(
        'UPDATE site_permission SET lastAccessedAt = ? WHERE origin = ? AND permissionType = ?'
      ).run(new Date().toISOString(), origin, permissionType);
    } catch {
      // Ignore
    }
  }

  // ─── Settings Page APIs ──────────────────────────────────────────

  static getAllPersistentPermissions(searchTerm?: string): PermissionRecord[] {
    if (!PermissionManager.db) return [];
    try {
      if (searchTerm) {
        return PermissionManager.db.prepare(
          'SELECT * FROM site_permission WHERE origin LIKE ? OR permissionType LIKE ? ORDER BY origin, permissionType'
        ).all(`%${searchTerm}%`, `%${searchTerm}%`) as PermissionRecord[];
      }
      return PermissionManager.db.prepare(
        'SELECT * FROM site_permission ORDER BY origin, permissionType'
      ).all() as PermissionRecord[];
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
      const result = PermissionManager.db.prepare(
        'UPDATE site_permission SET decision = ?, lastAccessedAt = ? WHERE id = ?'
      ).run(decision, now, id);
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
    callback: (granted: boolean) => void,
  ): void {
    const tabInfo = PermissionManager.findTabCallback?.(webContentsId);
    if (!tabInfo) { callback(false); return; }

    const { appWindowId, tabId, isPrivate } = tabInfo;
    const isSecure = PermissionManager.isSecureOrigin(origin);
    const isInsecureBlocked = !isSecure && PermissionManager.SENSITIVE_PERMISSIONS.has(permission);

    // Check existing persistent decisions
    if (!isPrivate && !isInsecureBlocked) {
      const persistent = PermissionManager.getPersistentDecision(origin, permission);
      if (persistent === 'allowed_persistent') {
        PermissionManager.touchPersistentDecision(origin, permission);
        callback(true);
        return;
      }
      if (persistent === 'denied_persistent') { callback(false); return; }
    }

    // Check session decisions
    const sessionKey = PermissionManager.sessionKey(tabId, origin, permission);
    const sessionDecision = PermissionManager.sessionPermissions.get(sessionKey);
    if (sessionDecision === 'allowed_session') { callback(true); return; }
    if (sessionDecision === 'denied_session') { callback(false); return; }

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
      isSecure,
      isPrivate,
      faviconUrl: null,
      callback,
      timestamp: Date.now(),
      isInsecureBlocked,
      isFloodBlocked,
    };

    PermissionManager.trackRequestTimestamp(origin);
    PermissionManager.enqueueRequest(request);
  }

  // ─── Helpers ─────────────────────────────────────────────────────

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

  static getPermissionInfo(
    permission: string,
    details?: Electron.PermissionRequest | Electron.MediaAccessPermissionRequest
  ): { type: string; label: string; icon: string } {
    const mediaDetails = details as Electron.MediaAccessPermissionRequest | undefined;
    if (permission === 'media' && mediaDetails?.mediaTypes) {
      const types = mediaDetails.mediaTypes;
      if (types.includes('video') && types.includes('audio')) {
        return { type: 'media', label: 'camera and microphone', icon: 'camera' };
      }
      if (types.includes('video')) return { type: 'media', label: 'camera', icon: 'camera' };
      if (types.includes('audio')) return { type: 'media', label: 'microphone', icon: 'mic' };
    }

    const info: Record<string, { label: string; icon: string }> = {
      'media': { label: 'camera/microphone', icon: 'camera' },
      'geolocation': { label: 'location', icon: 'map-pin' },
      'notifications': { label: 'notifications', icon: 'bell' },
      'midi': { label: 'MIDI devices', icon: 'music' },
      'midiSysex': { label: 'MIDI system exclusive', icon: 'music' },
      'pointerLock': { label: 'pointer lock', icon: 'lock' },
      'openExternal': { label: 'external application', icon: 'app-window' },
      'clipboard-read': { label: 'clipboard', icon: 'clipboard' },
      'idle-detection': { label: 'idle detection', icon: 'moon' },
      'display-capture': { label: 'screen sharing', icon: 'monitor' },
      'mediaKeySystem': { label: 'protected content', icon: 'hard-drive' },
      'accessibility-events': { label: 'accessibility events', icon: 'eye' },
      'storage-access': { label: 'storage access', icon: 'hard-drive' },
      'window-management': { label: 'window management', icon: 'app-window' },
      'local-fonts': { label: 'local fonts', icon: 'type' },
      'screen-wake-lock': { label: 'screen wake lock', icon: 'monitor' },
      'speaker-selection': { label: 'speaker selection', icon: 'speaker' },
      'keyboard-lock': { label: 'keyboard lock', icon: 'keyboard' },
      'usb': { label: 'USB devices', icon: 'usb' },
      'serial': { label: 'serial ports', icon: 'usb' },
      'bluetooth': { label: 'Bluetooth devices', icon: 'bluetooth' },
      'hid': { label: 'HID devices', icon: 'keyboard' },
    };

    const found = info[permission];
    if (found) return { type: permission, ...found };
    return { type: permission, label: permission, icon: 'shield-alert' };
  }

  // ─── IPC Listeners ───────────────────────────────────────────────

  private static initIPCListeners(): void {
    ipcMain.on(RendererToMainEventsForBrowserIPC.PERMISSION_PROMPT_RESPONSE, (
      _event: Electron.IpcMainEvent,
      _appWindowId: string,
      requestId: string,
      decision: string
    ) => {
      PermissionManager.handlePromptResponse(requestId, decision);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.FETCH_PERMISSIONS, (
      _event: Electron.IpcMainInvokeEvent,
      searchTerm?: string
    ) => {
      return PermissionManager.getAllPersistentPermissions(searchTerm);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.REMOVE_PERMISSION, (
      _event: Electron.IpcMainInvokeEvent,
      permissionId: string
    ) => {
      PermissionManager.removePersistentPermission(permissionId);
      return true;
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.REMOVE_ALL_PERMISSIONS_FOR_ORIGIN, (
      _event: Electron.IpcMainInvokeEvent,
      origin: string
    ) => {
      PermissionManager.removeAllPermissionsForOrigin(origin);
      return true;
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.CLEAR_ALL_PERMISSIONS, () => {
      PermissionManager.clearAllPersistentPermissions();
      return true;
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.UPDATE_PERMISSION_DECISION, (
      _event: Electron.IpcMainInvokeEvent,
      permissionId: string,
      decision: string
    ) => {
      return PermissionManager.updatePersistentPermissionDecision(permissionId, decision as PersistentDecision);
    });

    ipcMain.handle('get-ip-geolocation', async () => {
      const services = [
        {
          url: 'https://ipapi.co/json/',
          parse: (d: Record<string, unknown>) => ({ lat: d.latitude as number, lon: d.longitude as number }),
        },
        {
          url: 'https://ipwho.is/',
          parse: (d: Record<string, unknown>) => ({ lat: d.latitude as number, lon: d.longitude as number }),
        },
        {
          url: 'https://freeipapi.com/api/json',
          parse: (d: Record<string, unknown>) => ({ lat: d.latitude as number, lon: d.longitude as number }),
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

    ipcMain.handle('web-share', async (
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
    });
  }
}
