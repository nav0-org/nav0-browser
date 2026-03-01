import { session, dialog, BrowserWindow, WebContents } from 'electron';
import Store from 'electron-store';

type PermissionDecision = 'always_allow' | 'always_deny';

export class PermissionManager {
  private static permissionStore = new Store<Record<string, PermissionDecision>>({ name: 'site-permissions' });
  private static memoryPermissions = new Map<string, PermissionDecision>();
  private static initializedSessions = new Set<string>();

  // Permissions that should be auto-granted without prompting
  private static readonly AUTO_GRANT_PERMISSIONS = new Set([
    'fullscreen',
    'clipboard-sanitized-write',
    'pointer-lock',
  ]);

  static setupSession(partitionName: string): void {
    if (PermissionManager.initializedSessions.has(partitionName)) return;
    PermissionManager.initializedSessions.add(partitionName);

    const isPrivate = partitionName === 'persist:private';
    const ses = session.fromPartition(partitionName);

    ses.setPermissionRequestHandler((webContents: WebContents, permission: string, callback: (granted: boolean) => void, details: Electron.PermissionRequestHandlerHandlerDetails) => {
      // Auto-grant certain permissions
      if (PermissionManager.AUTO_GRANT_PERMISSIONS.has(permission)) {
        callback(true);
        return;
      }

      const origin = PermissionManager.extractOrigin(details.requestingUrl);
      const key = `${origin}::${permission}`;

      // Check stored decisions
      const stored = isPrivate
        ? PermissionManager.memoryPermissions.get(key)
        : PermissionManager.permissionStore.get(key);

      if (stored === 'always_allow') {
        callback(true);
        return;
      }
      if (stored === 'always_deny') {
        callback(false);
        return;
      }

      // Show permission dialog
      PermissionManager.showPermissionDialog(origin, permission, details, isPrivate, key)
        .then(granted => callback(granted))
        .catch(() => callback(false));
    });

    ses.setPermissionCheckHandler((webContents: WebContents | null, permission: string, requestingOrigin: string) => {
      if (PermissionManager.AUTO_GRANT_PERMISSIONS.has(permission)) {
        return true;
      }

      const key = `${requestingOrigin}::${permission}`;
      const stored = isPrivate
        ? PermissionManager.memoryPermissions.get(key)
        : PermissionManager.permissionStore.get(key);

      if (stored === 'always_allow') return true;
      if (stored === 'always_deny') return false;

      // Not yet decided — report as not granted (site must request via the async API)
      return false;
    });
  }

  private static async showPermissionDialog(
    origin: string,
    permission: string,
    details: Electron.PermissionRequestHandlerHandlerDetails,
    isPrivate: boolean,
    key: string
  ): Promise<boolean> {
    const parentWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    const permissionLabel = PermissionManager.getPermissionLabel(permission, details);

    const result = await dialog.showMessageBox(parentWindow, {
      type: 'question',
      title: 'Permission Request',
      message: `${origin} wants to access your ${permissionLabel}`,
      detail: 'Choose how to handle this permission request.',
      buttons: ['Allow this time', 'Always Allow', 'Deny this time', 'Always Deny'],
      defaultId: 2,
      cancelId: 2,
      noLink: true,
    });

    switch (result.response) {
      case 0: // Allow this time
        return true;
      case 1: // Always Allow
        if (isPrivate) {
          PermissionManager.memoryPermissions.set(key, 'always_allow');
        } else {
          PermissionManager.permissionStore.set(key, 'always_allow');
        }
        return true;
      case 2: // Deny this time
        return false;
      case 3: // Always Deny
        if (isPrivate) {
          PermissionManager.memoryPermissions.set(key, 'always_deny');
        } else {
          PermissionManager.permissionStore.set(key, 'always_deny');
        }
        return false;
      default:
        return false;
    }
  }

  private static extractOrigin(url: string): string {
    try {
      return new URL(url).origin;
    } catch {
      return 'unknown';
    }
  }

  private static getPermissionLabel(permission: string, details?: Electron.PermissionRequestHandlerHandlerDetails): string {
    // For media permissions, provide specific labels based on requested media types
    if (permission === 'media' && details?.mediaTypes) {
      const types = details.mediaTypes;
      if (types.includes('video') && types.includes('audio')) {
        return 'camera and microphone';
      }
      if (types.includes('video')) return 'camera';
      if (types.includes('audio')) return 'microphone';
    }

    const labels: Record<string, string> = {
      'media': 'camera/microphone',
      'geolocation': 'location',
      'notifications': 'notifications',
      'midi': 'MIDI devices',
      'midiSysex': 'MIDI system exclusive messages',
      'pointerLock': 'pointer lock',
      'openExternal': 'external application',
      'clipboard-read': 'clipboard',
      'idle-detection': 'idle detection',
      'display-capture': 'screen sharing',
      'mediaKeySystem': 'protected content playback',
      'accessibility-events': 'accessibility events',
      'storage-access': 'storage access',
      'window-management': 'window management',
      'local-fonts': 'local fonts',
      'screen-wake-lock': 'screen wake lock',
      'speaker-selection': 'speaker selection',
      'keyboard-lock': 'keyboard lock',
      'usb': 'USB devices',
      'serial': 'serial ports',
      'bluetooth': 'Bluetooth devices',
      'hid': 'HID devices',
    };

    return labels[permission] || permission;
  }

  static clearStoredPermissions(): void {
    PermissionManager.permissionStore.clear();
  }

  static clearMemoryPermissions(): void {
    PermissionManager.memoryPermissions.clear();
  }
}
