import { app, ipcMain } from 'electron';
import { AppWindowManager } from './browser/app-window-manager';
import { LLMModelSelector } from './llm/llm-model-selector';
import { DataStoreManager } from './database/data-store-manager';
import { LLMInferenceManager } from './llm/llm-inference-manager';
import { LLMConversationAndProjectManager } from './llm/llm-conversation-and-project-manager';


// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Initialize main window when app is ready
app.whenReady().then(async() => {
  await DataStoreManager.init();
  await AppWindowManager.init();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Re-create window when dock icon is clicked (macOS)
app.on('activate', () => {
  AppWindowManager.createWindow(false);
});

// Handle webview permission requests
ipcMain.handle('browser:permission-request', async (event, permission, details) => {
  //@todo - implement permission handling logic
  return true;
});