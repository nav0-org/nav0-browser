import { ipcMain, session, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
  RendererToMainEventsForBrowserIPC,
  MainToRendererEventsForBrowserIPC,
  DataStoreConstants,
  ExtensionRecord,
} from '../../constants/app-constants';
import { DataStoreManager } from '../database/data-store-manager';
import { BrowserSettings } from '../../types/settings-types';
import { AppWindowManager } from './app-window-manager';

export abstract class ExtensionManager {
  private static extensions: Map<string, ExtensionRecord> = new Map();
  private static popupWindows: Map<string, BrowserWindow> = new Map();

  public static async init(): Promise<void> {
    ExtensionManager.loadPersistedExtensions();
    ExtensionManager.initListeners();
  }

  private static getSettings(): BrowserSettings {
    return DataStoreManager.get(DataStoreConstants.BROWSER_SETTINGS) as BrowserSettings;
  }

  private static loadPersistedExtensions(): void {
    const settings = ExtensionManager.getSettings();
    if (!settings.extensionsEnabled) return;

    const records: ExtensionRecord[] = DataStoreManager.get(DataStoreConstants.EXTENSIONS) || [];
    const browsingSes = session.fromPartition('persist:browsertabs');
    const privateSes = session.fromPartition('persist:private');

    for (const record of records) {
      if (!record.enabled) {
        ExtensionManager.extensions.set(record.id, record);
        continue;
      }

      if (!fs.existsSync(record.path)) {
        // Mark as disabled if path no longer exists
        record.enabled = false;
        ExtensionManager.extensions.set(record.id, record);
        continue;
      }

      try {
        const loaded = browsingSes.loadExtension(record.path, { allowFileAccess: true });
        loaded.then((ext) => {
          // Update the ID in case it changed
          if (ext.id !== record.id) {
            ExtensionManager.extensions.delete(record.id);
            record.id = ext.id;
          }
          ExtensionManager.extensions.set(record.id, record);

          // Load on private session if allowed
          if (record.allowedInPrivate && settings.extensionsAllowedInPrivate) {
            privateSes.loadExtension(record.path, { allowFileAccess: true }).catch(() => {});
          }
        }).catch(() => {
          record.enabled = false;
          ExtensionManager.extensions.set(record.id, record);
        });
      } catch {
        record.enabled = false;
        ExtensionManager.extensions.set(record.id, record);
      }
    }

    ExtensionManager.persistExtensions();
  }

  private static initListeners(): void {
    ipcMain.handle(RendererToMainEventsForBrowserIPC.INSTALL_EXTENSION, async (event, appWindowId: string) => {
      return await ExtensionManager.installExtension(appWindowId);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.UNINSTALL_EXTENSION, async (event, extensionId: string) => {
      return ExtensionManager.uninstallExtension(extensionId);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.ENABLE_EXTENSION, async (event, extensionId: string) => {
      return await ExtensionManager.enableExtension(extensionId);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.DISABLE_EXTENSION, async (event, extensionId: string) => {
      return ExtensionManager.disableExtension(extensionId);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.FETCH_EXTENSIONS, async () => {
      return ExtensionManager.fetchExtensions();
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.TOGGLE_EXTENSION_PRIVATE, async (event, extensionId: string) => {
      return await ExtensionManager.toggleExtensionPrivate(extensionId);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.OPEN_EXTENSION_POPUP, async (event, extensionId: string, bounds: { x: number; y: number }) => {
      return ExtensionManager.openExtensionPopup(extensionId, bounds);
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.GET_TOOLBAR_EXTENSIONS, async () => {
      return ExtensionManager.getToolbarExtensions();
    });
  }

  private static async installExtension(appWindowId: string): Promise<{ success: boolean; error?: string; extension?: ExtensionRecord }> {
    const settings = ExtensionManager.getSettings();
    if (!settings.extensionsEnabled) {
      return { success: false, error: 'Extensions are disabled in settings.' };
    }

    const window = AppWindowManager.getWindowById(appWindowId);
    const parentBW = window?.getBrowserWindowInstance();

    const result = await dialog.showOpenDialog(parentBW ? { defaultPath: undefined, properties: ['openDirectory'] } : { properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'No directory selected.' };
    }

    const extensionPath = result.filePaths[0];
    const manifestPath = path.join(extensionPath, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      return { success: false, error: 'Selected directory does not contain a manifest.json file.' };
    }

    let manifest: any;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch {
      return { success: false, error: 'Failed to parse manifest.json.' };
    }

    // Check for duplicate
    for (const [, existing] of ExtensionManager.extensions) {
      if (existing.path === extensionPath) {
        return { success: false, error: 'This extension is already installed.' };
      }
    }

    try {
      const browsingSes = session.fromPartition('persist:browsertabs');
      const ext = await browsingSes.loadExtension(extensionPath, { allowFileAccess: true });

      const iconDataUrl = ExtensionManager.readExtensionIcon(extensionPath, manifest);

      const record: ExtensionRecord = {
        id: ext.id,
        name: manifest.name || ext.name || 'Unknown Extension',
        version: manifest.version || '0.0.0',
        description: manifest.description || '',
        path: extensionPath,
        enabled: true,
        allowedInPrivate: false,
        installedAt: Date.now(),
        iconDataUrl,
        manifestVersion: manifest.manifest_version || 2,
      };

      ExtensionManager.extensions.set(record.id, record);
      ExtensionManager.persistExtensions();
      ExtensionManager.broadcastToAllWindows(MainToRendererEventsForBrowserIPC.EXTENSION_INSTALLED, record);
      ExtensionManager.broadcastToAllWindows(MainToRendererEventsForBrowserIPC.EXTENSIONS_UPDATED, ExtensionManager.fetchExtensions());

      return { success: true, extension: record };
    } catch (err: any) {
      return { success: false, error: `Failed to load extension: ${err?.message || 'Unknown error'}` };
    }
  }

  private static uninstallExtension(extensionId: string): { success: boolean; error?: string } {
    const record = ExtensionManager.extensions.get(extensionId);
    if (!record) {
      return { success: false, error: 'Extension not found.' };
    }

    try {
      const browsingSes = session.fromPartition('persist:browsertabs');
      const privateSes = session.fromPartition('persist:private');

      if (record.enabled) {
        browsingSes.removeExtension(extensionId);
        if (record.allowedInPrivate) {
          try { privateSes.removeExtension(extensionId); } catch { /* may not be loaded */ }
        }
      }
    } catch { /* extension may not be loaded in session */ }

    ExtensionManager.extensions.delete(extensionId);
    ExtensionManager.persistExtensions();
    ExtensionManager.broadcastToAllWindows(MainToRendererEventsForBrowserIPC.EXTENSION_UNINSTALLED, { id: extensionId });
    ExtensionManager.broadcastToAllWindows(MainToRendererEventsForBrowserIPC.EXTENSIONS_UPDATED, ExtensionManager.fetchExtensions());

    return { success: true };
  }

  private static async enableExtension(extensionId: string): Promise<{ success: boolean; error?: string }> {
    const settings = ExtensionManager.getSettings();
    if (!settings.extensionsEnabled) {
      return { success: false, error: 'Extensions are disabled in settings.' };
    }

    const record = ExtensionManager.extensions.get(extensionId);
    if (!record) {
      return { success: false, error: 'Extension not found.' };
    }

    if (!fs.existsSync(record.path)) {
      return { success: false, error: 'Extension directory no longer exists.' };
    }

    try {
      const browsingSes = session.fromPartition('persist:browsertabs');
      await browsingSes.loadExtension(record.path, { allowFileAccess: true });

      if (record.allowedInPrivate && settings.extensionsAllowedInPrivate) {
        const privateSes = session.fromPartition('persist:private');
        await privateSes.loadExtension(record.path, { allowFileAccess: true }).catch(() => {});
      }

      record.enabled = true;
      ExtensionManager.persistExtensions();
      ExtensionManager.broadcastToAllWindows(MainToRendererEventsForBrowserIPC.EXTENSION_STATE_CHANGED, record);
      ExtensionManager.broadcastToAllWindows(MainToRendererEventsForBrowserIPC.EXTENSIONS_UPDATED, ExtensionManager.fetchExtensions());

      return { success: true };
    } catch (err: any) {
      return { success: false, error: `Failed to enable extension: ${err?.message || 'Unknown error'}` };
    }
  }

  private static disableExtension(extensionId: string): { success: boolean; error?: string } {
    const record = ExtensionManager.extensions.get(extensionId);
    if (!record) {
      return { success: false, error: 'Extension not found.' };
    }

    try {
      const browsingSes = session.fromPartition('persist:browsertabs');
      const privateSes = session.fromPartition('persist:private');

      browsingSes.removeExtension(extensionId);
      try { privateSes.removeExtension(extensionId); } catch { /* may not be loaded */ }
    } catch { /* extension may not be loaded */ }

    record.enabled = false;
    ExtensionManager.persistExtensions();
    ExtensionManager.broadcastToAllWindows(MainToRendererEventsForBrowserIPC.EXTENSION_STATE_CHANGED, record);
    ExtensionManager.broadcastToAllWindows(MainToRendererEventsForBrowserIPC.EXTENSIONS_UPDATED, ExtensionManager.fetchExtensions());

    return { success: true };
  }

  public static fetchExtensions(): ExtensionRecord[] {
    return Array.from(ExtensionManager.extensions.values());
  }

  private static async toggleExtensionPrivate(extensionId: string): Promise<{ success: boolean; error?: string }> {
    const record = ExtensionManager.extensions.get(extensionId);
    if (!record) {
      return { success: false, error: 'Extension not found.' };
    }

    const settings = ExtensionManager.getSettings();
    record.allowedInPrivate = !record.allowedInPrivate;

    if (record.enabled && settings.extensionsAllowedInPrivate) {
      const privateSes = session.fromPartition('persist:private');
      if (record.allowedInPrivate) {
        try {
          await privateSes.loadExtension(record.path, { allowFileAccess: true });
        } catch { /* ignore */ }
      } else {
        try { privateSes.removeExtension(extensionId); } catch { /* ignore */ }
      }
    }

    ExtensionManager.persistExtensions();
    ExtensionManager.broadcastToAllWindows(MainToRendererEventsForBrowserIPC.EXTENSION_STATE_CHANGED, record);

    return { success: true };
  }

  public static getToolbarExtensions(): Array<{ id: string; name: string; iconDataUrl?: string; hasPopup: boolean }> {
    const result: Array<{ id: string; name: string; iconDataUrl?: string; hasPopup: boolean }> = [];
    const browsingSes = session.fromPartition('persist:browsertabs');

    for (const [id, record] of ExtensionManager.extensions) {
      if (!record.enabled) continue;

      const ext = browsingSes.getExtension(id);
      if (!ext) continue;

      const manifest = ext.manifest as any;
      const action = manifest.action || manifest.browser_action;
      if (!action) continue;

      result.push({
        id: record.id,
        name: record.name,
        iconDataUrl: record.iconDataUrl,
        hasPopup: !!(action.default_popup),
      });
    }

    return result;
  }

  private static openExtensionPopup(extensionId: string, bounds: { x: number; y: number }): { success: boolean; error?: string } {
    // Close any existing popup for this extension
    const existingPopup = ExtensionManager.popupWindows.get(extensionId);
    if (existingPopup && !existingPopup.isDestroyed()) {
      existingPopup.close();
      ExtensionManager.popupWindows.delete(extensionId);
      return { success: true };
    }

    const browsingSes = session.fromPartition('persist:browsertabs');
    const ext = browsingSes.getExtension(extensionId);
    if (!ext) {
      return { success: false, error: 'Extension not loaded in session.' };
    }

    const manifest = ext.manifest as any;
    const action = manifest.action || manifest.browser_action;
    if (!action?.default_popup) {
      return { success: false, error: 'Extension has no popup defined.' };
    }

    const popupUrl = `chrome-extension://${extensionId}/${action.default_popup}`;

    const activeWindow = AppWindowManager.getActiveWindow();
    const parentBW = activeWindow?.getBrowserWindowInstance();

    const popup = new BrowserWindow({
      width: 400,
      height: 600,
      x: bounds.x,
      y: bounds.y,
      frame: false,
      resizable: true,
      skipTaskbar: true,
      parent: parentBW || undefined,
      webPreferences: {
        session: browsingSes,
        contextIsolation: true,
        sandbox: true,
      },
    });

    popup.loadURL(popupUrl);

    popup.on('blur', () => {
      if (!popup.isDestroyed()) {
        popup.close();
      }
    });

    popup.on('closed', () => {
      ExtensionManager.popupWindows.delete(extensionId);
    });

    ExtensionManager.popupWindows.set(extensionId, popup);

    return { success: true };
  }

  // Called when a new private window is created to reload extensions on the private session
  public static async loadExtensionsOnPrivateSession(): Promise<void> {
    const settings = ExtensionManager.getSettings();
    if (!settings.extensionsEnabled || !settings.extensionsAllowedInPrivate) return;

    const privateSes = session.fromPartition('persist:private');

    for (const [, record] of ExtensionManager.extensions) {
      if (!record.enabled || !record.allowedInPrivate) continue;
      if (!fs.existsSync(record.path)) continue;

      try {
        await privateSes.loadExtension(record.path, { allowFileAccess: true });
      } catch { /* ignore load failures on private session */ }
    }
  }

  // Called from SettingsEnforcer when extension settings change
  public static async disableAll(): Promise<void> {
    const browsingSes = session.fromPartition('persist:browsertabs');
    const privateSes = session.fromPartition('persist:private');

    for (const [id, record] of ExtensionManager.extensions) {
      if (record.enabled) {
        try { browsingSes.removeExtension(id); } catch { /* ignore */ }
        try { privateSes.removeExtension(id); } catch { /* ignore */ }
      }
    }

    ExtensionManager.broadcastToAllWindows(MainToRendererEventsForBrowserIPC.EXTENSIONS_UPDATED, ExtensionManager.fetchExtensions());
  }

  public static async enableAll(): Promise<void> {
    const browsingSes = session.fromPartition('persist:browsertabs');
    const settings = ExtensionManager.getSettings();

    for (const [, record] of ExtensionManager.extensions) {
      if (!record.enabled) continue;
      if (!fs.existsSync(record.path)) continue;

      try {
        await browsingSes.loadExtension(record.path, { allowFileAccess: true });

        if (record.allowedInPrivate && settings.extensionsAllowedInPrivate) {
          const privateSes = session.fromPartition('persist:private');
          await privateSes.loadExtension(record.path, { allowFileAccess: true }).catch(() => {});
        }
      } catch { /* ignore */ }
    }

    ExtensionManager.broadcastToAllWindows(MainToRendererEventsForBrowserIPC.EXTENSIONS_UPDATED, ExtensionManager.fetchExtensions());
  }

  public static async refreshPrivateSession(): Promise<void> {
    const settings = ExtensionManager.getSettings();
    const privateSes = session.fromPartition('persist:private');

    // Remove all from private first
    for (const [id] of ExtensionManager.extensions) {
      try { privateSes.removeExtension(id); } catch { /* ignore */ }
    }

    if (!settings.extensionsEnabled || !settings.extensionsAllowedInPrivate) return;

    // Re-load those that are allowed
    for (const [, record] of ExtensionManager.extensions) {
      if (!record.enabled || !record.allowedInPrivate) continue;
      if (!fs.existsSync(record.path)) continue;

      try {
        await privateSes.loadExtension(record.path, { allowFileAccess: true });
      } catch { /* ignore */ }
    }
  }

  private static persistExtensions(): void {
    const records = Array.from(ExtensionManager.extensions.values());
    DataStoreManager.set(DataStoreConstants.EXTENSIONS, records);
  }

  private static broadcastToAllWindows(channel: string, data: any): void {
    for (const bw of BrowserWindow.getAllWindows()) {
      if (!bw.isDestroyed()) {
        bw.webContents.send(channel, data);
      }
    }
  }

  private static readExtensionIcon(extensionPath: string, manifest: any): string | undefined {
    const icons = manifest.icons;
    if (!icons) return undefined;

    // Prefer smaller icons for toolbar use (16, 32, 48)
    const preferredSizes = ['32', '16', '48', '128'];
    for (const size of preferredSizes) {
      if (icons[size]) {
        const iconFilePath = path.join(extensionPath, icons[size]);
        if (fs.existsSync(iconFilePath)) {
          try {
            const data = fs.readFileSync(iconFilePath);
            const ext = path.extname(iconFilePath).toLowerCase();
            const mimeType = ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : 'image/jpeg';
            return `data:${mimeType};base64,${data.toString('base64')}`;
          } catch {
            continue;
          }
        }
      }
    }

    return undefined;
  }
}
