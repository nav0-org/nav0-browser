import { app, ipcMain, session, dialog, BrowserWindow, net } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
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
        name: manifest.name || ext.name || 'Unknown Extension',
        version: manifest.version || '0.0.0',
        description: manifest.description || '',
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

  private static getExtensionsDir(): string {
    const dir = path.join(app.getPath('userData'), 'extensions');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private static async downloadCrx(extensionId: string): Promise<Buffer> {
    const chromeVersion = process.versions.chrome || '120.0.0.0';
    const url = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=${chromeVersion}&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`;

    return new Promise<Buffer>((resolve, reject) => {
      const request = net.request(url);

      request.on('response', (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          reject(new Error(`Extension not found or unavailable (HTTP ${response.statusCode}).`));
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with HTTP ${response.statusCode}.`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        response.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        response.on('error', (err) => {
          reject(new Error(`Download stream error: ${err.message}`));
        });
      });

      request.on('error', (err) => {
        reject(new Error(`Network request failed: ${err.message}`));
      });

      request.end();
    });
  }

  private static extractCrxToZip(crxBuffer: Buffer): Buffer {
    // CRX magic number: "Cr24" = 0x43723234
    if (crxBuffer.length < 12) {
      throw new Error('File too small to be a CRX.');
    }

    const magic = crxBuffer.toString('ascii', 0, 4);
    if (magic !== 'Cr24') {
      throw new Error('Not a valid CRX file (bad magic number).');
    }

    const version = crxBuffer.readUInt32LE(4);

    if (version === 3) {
      // CRX3: 4 magic + 4 version + 4 header_length + header + ZIP
      const headerLength = crxBuffer.readUInt32LE(8);
      const zipStart = 12 + headerLength;
      if (zipStart >= crxBuffer.length) {
        throw new Error('CRX3 header extends past end of file.');
      }
      return crxBuffer.subarray(zipStart);
    } else if (version === 2) {
      // CRX2: 4 magic + 4 version + 4 pubkey_len + 4 sig_len + pubkey + sig + ZIP
      const pubKeyLength = crxBuffer.readUInt32LE(8);
      const sigLength = crxBuffer.readUInt32LE(12);
      const zipStart = 16 + pubKeyLength + sigLength;
      if (zipStart >= crxBuffer.length) {
        throw new Error('CRX2 header extends past end of file.');
      }
      return crxBuffer.subarray(zipStart);
    } else {
      throw new Error(`Unsupported CRX version: ${version}.`);
    }
  }

  private static async unzipBuffer(zipBuffer: Buffer, destDir: string): Promise<void> {
    // Use Node.js built-in zlib with a simple ZIP parser
    // ZIP files end with a central directory; we parse local file headers from the start
    const { Readable } = await import('stream');
    const { createInflateRaw } = await import('zlib');

    let offset = 0;
    while (offset < zipBuffer.length - 4) {
      const sig = zipBuffer.readUInt32LE(offset);
      if (sig !== 0x04034b50) break; // Not a local file header

      const compressionMethod = zipBuffer.readUInt16LE(offset + 8);
      const compressedSize = zipBuffer.readUInt32LE(offset + 18);
      const uncompressedSize = zipBuffer.readUInt32LE(offset + 22);
      const fileNameLength = zipBuffer.readUInt16LE(offset + 26);
      const extraFieldLength = zipBuffer.readUInt16LE(offset + 28);

      const fileName = zipBuffer.toString('utf-8', offset + 30, offset + 30 + fileNameLength);
      const dataStart = offset + 30 + fileNameLength + extraFieldLength;

      // Skip entries with path traversal
      if (fileName.includes('..') || path.isAbsolute(fileName)) {
        offset = dataStart + compressedSize;
        continue;
      }

      const filePath = path.join(destDir, fileName);

      if (fileName.endsWith('/')) {
        fs.mkdirSync(filePath, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });

        if (compressionMethod === 0) {
          // Stored (no compression)
          const fileData = zipBuffer.subarray(dataStart, dataStart + compressedSize);
          fs.writeFileSync(filePath, fileData);
        } else if (compressionMethod === 8) {
          // Deflate
          const compressedData = zipBuffer.subarray(dataStart, dataStart + compressedSize);
          const decompressed = await new Promise<Buffer>((resolve, reject) => {
            const inflate = createInflateRaw();
            const chunks: Buffer[] = [];
            inflate.on('data', (chunk: Buffer) => chunks.push(chunk));
            inflate.on('end', () => resolve(Buffer.concat(chunks)));
            inflate.on('error', reject);
            inflate.end(compressedData);
          });
          fs.writeFileSync(filePath, decompressed);
        }
      }

      offset = dataStart + compressedSize;
    }
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

    // Check if already installed from Web Store with same ID
    for (const [, existing] of ExtensionManager.extensions) {
      if (existing.webStoreId === webStoreId) {
        return { success: false, error: 'This extension is already installed.' };
      }
    }

    try {
      // 1. Download CRX
      const crxBuffer = await ExtensionManager.downloadCrx(webStoreId);

      // 2. Extract ZIP from CRX
      const zipBuffer = ExtensionManager.extractCrxToZip(crxBuffer);

      // 3. Unpack to extensions directory
      const extensionsDir = ExtensionManager.getExtensionsDir();
      const extensionDir = path.join(extensionsDir, webStoreId);

      // Clean up any existing directory
      if (fs.existsSync(extensionDir)) {
        fs.rmSync(extensionDir, { recursive: true, force: true });
      }
      fs.mkdirSync(extensionDir, { recursive: true });

      await ExtensionManager.unzipBuffer(zipBuffer, extensionDir);

      // 4. Validate manifest.json exists
      const manifestPath = path.join(extensionDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        fs.rmSync(extensionDir, { recursive: true, force: true });
        return { success: false, error: 'Downloaded extension does not contain a manifest.json.' };
      }

      let manifest: any;
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      } catch {
        fs.rmSync(extensionDir, { recursive: true, force: true });
        return { success: false, error: 'Failed to parse manifest.json from downloaded extension.' };
      }

      // 5. Load extension
      const browsingSes = session.fromPartition('persist:browsertabs');
      const ext = await browsingSes.loadExtension(extensionDir, { allowFileAccess: true });

      const iconDataUrl = ExtensionManager.readExtensionIcon(extensionDir, manifest);

      // Chrome Web Store extensions often use __MSG_xxx__ for names
      let extName = manifest.name || ext.name || 'Unknown Extension';
      if (extName.startsWith('__MSG_') && manifest.default_locale) {
        try {
          const messagesPath = path.join(extensionDir, '_locales', manifest.default_locale, 'messages.json');
          const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf-8'));
          const msgKey = extName.replace(/^__MSG_/, '').replace(/__$/, '');
          extName = messages[msgKey]?.message || messages[msgKey.toLowerCase()]?.message || extName;
        } catch { /* keep __MSG_ name */ }
      }

      let extDescription = manifest.description || '';
      if (extDescription.startsWith('__MSG_') && manifest.default_locale) {
        try {
          const messagesPath = path.join(extensionDir, '_locales', manifest.default_locale, 'messages.json');
          const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf-8'));
          const msgKey = extDescription.replace(/^__MSG_/, '').replace(/__$/, '');
          extDescription = messages[msgKey]?.message || messages[msgKey.toLowerCase()]?.message || extDescription;
        } catch { /* keep __MSG_ description */ }
      }

      const record: ExtensionRecord = {
        id: ext.id,
        name: extName,
        version: manifest.version || '0.0.0',
        description: extDescription,
        path: extensionDir,
        enabled: true,
        allowedInPrivate: false,
        installedAt: Date.now(),
        iconDataUrl,
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
      return { success: false, error: err?.message || 'Failed to install extension from Chrome Web Store.' };
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
