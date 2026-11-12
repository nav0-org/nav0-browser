import { app, ipcMain, session, dialog, BrowserWindow, webContents } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { parseCrx, extractZip } from './crx-utils';
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

  private static webStoreInstallsInFlight: Set<string> = new Set();

  public static async init(): Promise<void> {
    ExtensionManager.initListeners();
    await ExtensionManager.loadPersistedExtensions();
  }

  private static getSettings(): BrowserSettings {
    return DataStoreManager.get(DataStoreConstants.BROWSER_SETTINGS) as BrowserSettings;
  }

  private static async loadPersistedExtensions(): Promise<void> {
    const settings = ExtensionManager.getSettings();
    const records: ExtensionRecord[] = DataStoreManager.get(DataStoreConstants.EXTENSIONS) || [];
    for (const record of records) {
      ExtensionManager.extensions.set(record.id, record);
    }
    if (!settings.extensionsEnabled) return;

    const browsingSes = session.fromPartition('persist:browsertabs');
    const privateSes = session.fromPartition('persist:private');

    await Promise.allSettled(records.filter((r) => r.enabled).map(async (record) => {
      if (!fs.existsSync(record.path)) {
        record.enabled = false;
        return;
      }
      try {
        const ext = await browsingSes.loadExtension(record.path, { allowFileAccess: true });
        if (ext.id !== record.id) {
          ExtensionManager.extensions.delete(record.id);
          record.id = ext.id;
          ExtensionManager.extensions.set(record.id, record);
        }
        if (record.allowedInPrivate && settings.extensionsAllowedInPrivate) {
          await privateSes.loadExtension(record.path, { allowFileAccess: true }).catch(() => {});
        }
      } catch {
        record.enabled = false;
      }
    }));

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

    ipcMain.handle(RendererToMainEventsForBrowserIPC.INSTALL_EXTENSION_FROM_WEBSTORE, async (event, extensionIdOrUrl: string) => {
      return await ExtensionManager.installFromWebStore(extensionIdOrUrl);
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
        name: ExtensionManager.localizeManifestString(extensionPath, manifest, manifest.name) || ext.name || 'Unknown Extension',
        version: manifest.version || '0.0.0',
        description: ExtensionManager.localizeManifestString(extensionPath, manifest, manifest.description) || '',
        path: extensionPath,
        enabled: true,
        allowedInPrivate: false,
        installedAt: Date.now(),
        iconDataUrl,
        manifestVersion: manifest.manifest_version || 2,
        source: 'local',
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

    // Clean up extracted files for Web Store extensions
    if (record.source === 'webstore') {
      try { fs.rmSync(record.path, { recursive: true, force: true }); } catch { /* ignore */ }
    }

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

  // ---- Chrome Web Store Installation ----

  private static parseWebStoreInput(input: string): string | null {
    const trimmed = input.trim();

    // Direct extension ID (32 lowercase letters)
    if (/^[a-z]{32}$/.test(trimmed)) {
      return trimmed;
    }

    // Chrome Web Store URL patterns
    const urlPatterns = [
      /chrome\.google\.com\/webstore\/detail\/[^/]*\/([a-z]{32})/,
      /chromewebstore\.google\.com\/detail\/[^/]*\/([a-z]{32})/,
      /chromewebstore\.google\.com\/detail\/([a-z]{32})/,
    ];

    for (const pattern of urlPatterns) {
      const match = trimmed.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  private static async downloadCrx(extensionId: string): Promise<Buffer> {
    const MAX_CRX_BYTES = 200 * 1024 * 1024;
    const chromeVersion = process.versions.chrome || '120.0.0.0';
    const url = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=${chromeVersion}&acceptformat=crx3&x=id%3D${extensionId}%26uc`;

    // Fetch through the browsing session so the user's proxy and user-agent apply.
    const browsingSes = session.fromPartition('persist:browsertabs');
    let response: Response;
    try {
      response = await browsingSes.fetch(url, { signal: AbortSignal.timeout(60_000) });
    } catch (err: any) {
      if (err?.name === 'TimeoutError') throw new Error('Download timed out.');
      throw new Error(`Network request failed: ${err?.message || 'unknown error'}`);
    }

    if (response.status === 204 || response.status === 404) {
      throw new Error('Extension not found or no longer available on the Chrome Web Store.');
    }
    if (!response.ok) {
      throw new Error(`Download failed with HTTP ${response.status}.`);
    }
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_CRX_BYTES) {
      throw new Error('Extension package is too large.');
    }

    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > MAX_CRX_BYTES) {
      throw new Error('Extension package is too large.');
    }
    return body;
  }

  private static async installFromWebStore(input: string): Promise<{ success: boolean; error?: string; extension?: ExtensionRecord }> {
    const settings = ExtensionManager.getSettings();
    if (!settings.extensionsEnabled) {
      return { success: false, error: 'Extensions are disabled in settings.' };
    }

    const webStoreId = ExtensionManager.parseWebStoreInput(input);
    if (!webStoreId) {
      return { success: false, error: 'Invalid extension ID or Chrome Web Store URL. Enter a 32-character extension ID or a Web Store link.' };
    }

    if (ExtensionManager.extensions.has(webStoreId) || Array.from(ExtensionManager.extensions.values()).some((e) => e.webStoreId === webStoreId)) {
      return { success: false, error: 'This extension is already installed. Remove it first to reinstall a newer version.' };
    }
    if (ExtensionManager.webStoreInstallsInFlight.has(webStoreId)) {
      return { success: false, error: 'This extension is already being installed.' };
    }
    ExtensionManager.webStoreInstallsInFlight.add(webStoreId);

    const extensionDir = path.join(app.getPath('userData'), 'extensions', webStoreId);
    const browsingSes = session.fromPartition('persist:browsertabs');
    let loadedId: string | null = null;

    try {
      const crxBuffer = await ExtensionManager.downloadCrx(webStoreId);
      const { zip, publicKey } = parseCrx(crxBuffer, webStoreId);

      fs.rmSync(extensionDir, { recursive: true, force: true });
      fs.mkdirSync(extensionDir, { recursive: true });
      extractZip(zip, extensionDir);

      const manifestPath = path.join(extensionDir, 'manifest.json');
      let manifest: any;
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      } catch {
        throw new Error('Downloaded extension has a missing or invalid manifest.json.');
      }

      // Without "key" Chromium derives the ID from the install path instead of the Web Store key.
      manifest.key = publicKey.toString('base64');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));

      const ext = await browsingSes.loadExtension(extensionDir, { allowFileAccess: true });
      loadedId = ext.id;
      if (ext.id !== webStoreId) {
        throw new Error('Installed extension ID does not match the Chrome Web Store ID.');
      }

      const record: ExtensionRecord = {
        id: ext.id,
        name: ExtensionManager.localizeManifestString(extensionDir, manifest, manifest.name) || ext.name || 'Unknown Extension',
        version: manifest.version || '0.0.0',
        description: ExtensionManager.localizeManifestString(extensionDir, manifest, manifest.description) || '',
        path: extensionDir,
        enabled: true,
        allowedInPrivate: false,
        installedAt: Date.now(),
        iconDataUrl: ExtensionManager.readExtensionIcon(extensionDir, manifest),
        manifestVersion: manifest.manifest_version || 2,
        source: 'webstore',
        webStoreId,
      };

      ExtensionManager.extensions.set(record.id, record);
      ExtensionManager.persistExtensions();
      ExtensionManager.broadcastToAllWindows(MainToRendererEventsForBrowserIPC.EXTENSION_INSTALLED, record);
      ExtensionManager.broadcastToAllWindows(MainToRendererEventsForBrowserIPC.EXTENSIONS_UPDATED, ExtensionManager.fetchExtensions());

      return { success: true, extension: record };
    } catch (err: any) {
      if (loadedId) {
        try { browsingSes.removeExtension(loadedId); } catch { /* ignore */ }
      }
      try { fs.rmSync(extensionDir, { recursive: true, force: true }); } catch { /* ignore */ }
      return { success: false, error: err?.message || 'Failed to install extension from Chrome Web Store.' };
    } finally {
      ExtensionManager.webStoreInstallsInFlight.delete(webStoreId);
    }
  }

  // Resolves "__MSG_key__" placeholders; Chrome matches message keys case-insensitively.
  private static localizeManifestString(extensionDir: string, manifest: any, value: unknown): string {
    if (typeof value !== 'string') return '';
    const match = value.match(/^__MSG_(.+)__$/);
    if (!match || !manifest.default_locale) return value;
    try {
      const messagesPath = path.join(extensionDir, '_locales', manifest.default_locale, 'messages.json');
      const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf-8'));
      const wanted = match[1].toLowerCase();
      for (const key of Object.keys(messages)) {
        if (key.toLowerCase() === wanted && typeof messages[key]?.message === 'string') {
          return messages[key].message;
        }
      }
    } catch { /* fall through */ }
    return value;
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
    // Nav0://extensions runs inside a tab's WebContentsView, not a BrowserWindow.
    for (const wc of webContents.getAllWebContents()) {
      if (!wc.isDestroyed() && wc.getURL().startsWith(EXTENSIONS_WEBPACK_ENTRY)) {
        wc.send(channel, data);
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
