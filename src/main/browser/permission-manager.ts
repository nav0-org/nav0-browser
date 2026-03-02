import { session, WebContents, ipcMain } from 'electron';
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
  private static pendingQueue: PermissionRequest[] = [];
  private static activePrompt: PermissionRequest | null = null;
  private static requestTimestamps = new Map<string, number[]>();
  private static userInteracted = new Set<number>();

  // Callbacks set by the integration layer
  private static showPromptCallback: ShowPromptCallback | null = null;
  private static hidePromptCallback: HidePromptCallback | null = null;
  private static findTabCallback: FindTabCallback | null = null;

  // Permissions auto-granted without prompting
  static readonly AUTO_GRANT_PERMISSIONS = new Set([
    'fullscreen',
    'clipboard-sanitized-write',
    'pointer-lock',
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

      const origin = PermissionManager.extractOrigin(details.requestingUrl);
      const tabInfo = PermissionManager.findTabCallback?.(webContents.id);

      if (!tabInfo) {
        callback(false);
        return;
      }

      const { appWindowId, tabId } = tabInfo;
      const isSecure = PermissionManager.isSecureOrigin(origin);

      // Check for insecure origin blocking
      const isInsecureBlocked = !isSecure && PermissionManager.SENSITIVE_PERMISSIONS.has(permission);

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

      // If flood blocked, auto-deny after showing brief message
      if (isFloodBlocked) {
        PermissionManager.enqueueRequest(request);
        return;
      }

      // Check user gesture requirement: queue until user interaction
      if (!PermissionManager.userInteracted.has(webContents.id)) {
        PermissionManager.pendingQueue.push(request);
        return;
      }

      PermissionManager.enqueueRequest(request);
    });

    ses.setPermissionCheckHandler((
      webContents: WebContents | null,
      permission: string,
      requestingOrigin: string
    ) => {
      if (PermissionManager.AUTO_GRANT_PERMISSIONS.has(permission)) {
        return true;
      }

      // Check persistent decisions
      if (!isPrivate) {
        const persistent = PermissionManager.getPersistentDecision(requestingOrigin, permission);
        if (persistent === 'allowed_persistent') return true;
        if (persistent === 'denied_persistent') return false;
      }

      // Check session decisions
      if (webContents) {
        const tabInfo = PermissionManager.findTabCallback?.(webContents.id);
        if (tabInfo) {
          const sessionKey = PermissionManager.sessionKey(tabInfo.tabId, requestingOrigin, permission);
          const sessionDecision = PermissionManager.sessionPermissions.get(sessionKey);
          if (sessionDecision === 'allowed_session') return true;
          if (sessionDecision === 'denied_session') return false;
        }
      }

      return false;
    });
  }

  // ─── Request Queue ───────────────────────────────────────────────

  private static enqueueRequest(request: PermissionRequest): void {
    if (PermissionManager.activePrompt) {
      PermissionManager.pendingQueue.push(request);
    } else {
      PermissionManager.showPromptForRequest(request);
    }
  }

  private static showPromptForRequest(request: PermissionRequest): void {
    PermissionManager.activePrompt = request;
    PermissionManager.showPromptCallback?.(request.appWindowId, request);
  }

  private static processNextInQueue(): void {
    if (PermissionManager.pendingQueue.length === 0) return;
    const next = PermissionManager.pendingQueue.shift()!;
    PermissionManager.showPromptForRequest(next);
  }

  // ─── Prompt Response ─────────────────────────────────────────────

  static handlePromptResponse(requestId: string, decision: string): void {
    const request = PermissionManager.activePrompt;
    if (!request || request.id !== requestId) return;

    PermissionManager.activePrompt = null;
    const { tabId, origin, permission, callback, isPrivate } = request;
    const sessionKey = PermissionManager.sessionKey(tabId, origin, permission);

    switch (decision) {
      case 'allow_once':
        PermissionManager.sessionPermissions.set(sessionKey, 'allowed_session');
        callback(true);
        break;

      case 'always_allow':
        if (isPrivate) {
          // In private mode, downgrade to session-only
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

    // Hide the prompt overlay
    PermissionManager.hidePromptCallback?.(request.appWindowId);

    // Process next queued request
    setTimeout(() => PermissionManager.processNextInQueue(), 100);
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

  // ─── User Gesture Tracking ───────────────────────────────────────

  static markUserInteraction(webContentsId: number): void {
    if (PermissionManager.userInteracted.has(webContentsId)) return;
    PermissionManager.userInteracted.add(webContentsId);

    // Process any queued requests for this webContents
    const toProcess: PermissionRequest[] = [];
    PermissionManager.pendingQueue = PermissionManager.pendingQueue.filter((req: PermissionRequest) => {
      if (req.webContentsId === webContentsId) {
        toProcess.push(req);
        return false;
      }
      return true;
    });

    for (const req of toProcess) {
      PermissionManager.enqueueRequest(req);
    }
  }

  static clearUserInteraction(webContentsId: number): void {
    PermissionManager.userInteracted.delete(webContentsId);
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
    const cancelled: PermissionRequest[] = [];
    PermissionManager.pendingQueue = PermissionManager.pendingQueue.filter((req: PermissionRequest) => {
      if (req.tabId === tabId) {
        cancelled.push(req);
        return false;
      }
      return true;
    });
    cancelled.forEach((req: PermissionRequest) => req.callback(false));

    // If active prompt is for this tab, auto-deny
    if (PermissionManager.activePrompt?.tabId === tabId) {
      const active = PermissionManager.activePrompt;
      PermissionManager.activePrompt = null;
      active.callback(false);
      PermissionManager.hidePromptCallback?.(active.appWindowId);
      setTimeout(() => PermissionManager.processNextInQueue(), 100);
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
  }
}
