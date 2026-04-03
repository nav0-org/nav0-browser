import { Notification as ElectronNotification, ipcMain, webContents, BrowserWindow } from 'electron';
import { PermissionManager } from './permission-manager';

type FindTabCallback = (webContentsId: number) => {
  appWindowId: string;
  tabId: string;
  isPrivate: boolean;
} | null;

type FocusTabCallback = (appWindowId: string, tabId: string) => void;

interface ActiveNotification {
  notification: ElectronNotification;
  webContentsId: number;
  origin: string;
  tag: string;
}

export class NotificationManager {
  private static activeNotifications = new Map<string, ActiveNotification>();
  private static tagMap = new Map<string, string>(); // "origin::tag" → notification id
  private static findTabCallback: FindTabCallback | null = null;
  private static focusTabCallback: FocusTabCallback | null = null;

  static init(): void {
    NotificationManager.initIPCListeners();
  }

  static setCallbacks(findTab: FindTabCallback, focusTab: FocusTabCallback): void {
    NotificationManager.findTabCallback = findTab;
    NotificationManager.focusTabCallback = focusTab;
  }

  private static getOriginFromWebContents(wc: Electron.WebContents): string {
    try {
      return new URL(wc.getURL()).origin;
    } catch {
      return 'unknown';
    }
  }

  private static sendEvent(webContentsId: number, notifId: string, type: string): void {
    try {
      const wc = webContents.fromId(webContentsId);
      if (wc && !wc.isDestroyed()) {
        wc.send('notification:event', { id: notifId, type });
      }
    } catch {
      // WebContents may have been destroyed
    }
  }

  private static cleanup(id: string): void {
    const active = NotificationManager.activeNotifications.get(id);
    if (active?.tag) {
      NotificationManager.tagMap.delete(`${active.origin}::${active.tag}`);
    }
    NotificationManager.activeNotifications.delete(id);
  }

  private static initIPCListeners(): void {
    // Synchronous permission check (called on page load for Notification.permission)
    ipcMain.on('notification:check-permission', (event) => {
      const origin = NotificationManager.getOriginFromWebContents(event.sender);
      event.returnValue = PermissionManager.checkPermissionState(
        event.sender.id,
        origin,
        'notifications'
      );
    });

    // Request notification permission (triggers the permission prompt flow)
    ipcMain.handle('notification:request-permission', (event) => {
      return new Promise<string>((resolve) => {
        const origin = NotificationManager.getOriginFromWebContents(event.sender);

        // Check current state first
        const currentState = PermissionManager.checkPermissionState(
          event.sender.id,
          origin,
          'notifications'
        );
        if (currentState !== 'default') {
          resolve(currentState);
          return;
        }

        // Trigger the permission prompt through PermissionManager
        PermissionManager.programmaticPermissionRequest(
          event.sender.id,
          origin,
          'notifications',
          (granted: boolean) => {
            resolve(granted ? 'granted' : 'denied');
          }
        );
      });
    });

    // Show a notification
    ipcMain.handle('notification:show', (event, data: {
      id: string;
      title: string;
      body: string;
      icon: string;
      tag: string;
      silent: boolean;
      requireInteraction: boolean;
    }) => {
      const sender = event.sender;
      const origin = NotificationManager.getOriginFromWebContents(sender);

      // Verify permission is granted
      const state = PermissionManager.checkPermissionState(sender.id, origin, 'notifications');
      if (state !== 'granted') {
        return { error: 'permission_denied' };
      }

      // Check platform support
      if (!ElectronNotification.isSupported()) {
        return { error: 'not_supported' };
      }

      // Handle tag-based replacement: close existing notification with same origin+tag
      if (data.tag) {
        const tagKey = `${origin}::${data.tag}`;
        const existingId = NotificationManager.tagMap.get(tagKey);
        if (existingId) {
          const existing = NotificationManager.activeNotifications.get(existingId);
          if (existing) {
            existing.notification.close();
          }
          NotificationManager.cleanup(existingId);
        }
      }

      try {
        const notification = new ElectronNotification({
          title: data.title || '',
          body: data.body || '',
          silent: data.silent || false,
          urgency: data.requireInteraction ? 'critical' : 'normal',
          timeoutType: data.requireInteraction ? 'never' : 'default',
        });

        const notifId = data.id;
        const webContentsId = sender.id;

        NotificationManager.activeNotifications.set(notifId, {
          notification,
          webContentsId,
          origin,
          tag: data.tag || '',
        });

        if (data.tag) {
          NotificationManager.tagMap.set(`${origin}::${data.tag}`, notifId);
        }

        notification.on('show', () => {
          NotificationManager.sendEvent(webContentsId, notifId, 'show');
        });

        notification.on('click', () => {
          // Focus the originating tab and window
          const tabInfo = NotificationManager.findTabCallback?.(webContentsId);
          if (tabInfo) {
            NotificationManager.focusTabCallback?.(tabInfo.appWindowId, tabInfo.tabId);
          }
          NotificationManager.sendEvent(webContentsId, notifId, 'click');
        });

        notification.on('close', () => {
          NotificationManager.sendEvent(webContentsId, notifId, 'close');
          NotificationManager.cleanup(notifId);
        });

        notification.on('failed', () => {
          NotificationManager.sendEvent(webContentsId, notifId, 'error');
          NotificationManager.cleanup(notifId);
        });

        notification.show();
        return { success: true };
      } catch {
        return { error: 'show_failed' };
      }
    });

    // Close a notification programmatically
    ipcMain.on('notification:close', (_event, id: string) => {
      const active = NotificationManager.activeNotifications.get(id);
      if (active) {
        active.notification.close();
        NotificationManager.cleanup(id);
      }
    });
  }

  /**
   * Clean up all active notifications for a specific webContents (e.g. when a tab closes).
   */
  static clearNotificationsForWebContents(webContentsId: number): void {
    const toDelete: string[] = [];
    for (const [id, active] of NotificationManager.activeNotifications) {
      if (active.webContentsId === webContentsId) {
        active.notification.close();
        toDelete.push(id);
      }
    }
    for (const id of toDelete) {
      NotificationManager.cleanup(id);
    }
  }
}
