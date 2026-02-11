import { ipcMain, webContents, BrowserWindow } from 'electron';
import Store from 'electron-store';
import { DataStoreConstants, RendererToMainEventsForDataStoreIPC } from '../../constants/app-constants';
import { LLMInferenceManager } from '../llm/llm-inference-manager';

// Define interface for watcher data
interface WatcherData {
  storeName: string;
  keys: Set<string>;
  cleanup: () => void;
}

export abstract class DataStoreManager {
  private static stores: Map<string, Store> = new Map();
  private static watchers: Map<number, WatcherData> = new Map();
  private static UNIVERSAL_KEY = DataStoreConstants.DEFAULT_KEY;


  public static init(){
    DataStoreManager.initStores();
    DataStoreManager.initListeners();
  }

  private static initStores(): void {
    DataStoreManager.stores.set(DataStoreConstants.DOWNLOADED_LLM_MODELS, new Store({ name: DataStoreConstants.DOWNLOADED_LLM_MODELS, defaults: { 'default' : DataStoreManager.getDefaultValue(DataStoreConstants.DOWNLOADED_LLM_MODELS)} as Record<string, any> }));
    DataStoreManager.stores.set(DataStoreConstants.BROWSER_SETTINGS, new Store({ name: DataStoreConstants.BROWSER_SETTINGS, defaults: {'default' : DataStoreManager.getDefaultValue(DataStoreConstants.BROWSER_SETTINGS)}  as Record<string, any>}));
    DataStoreManager.stores.set(DataStoreConstants.LLM_CONFIGURATION, new Store({ name: DataStoreConstants.LLM_CONFIGURATION, defaults: { 'default' : DataStoreManager.getDefaultValue(DataStoreConstants.LLM_CONFIGURATION)}  as Record<string, any> }));
  }


  private static initListeners(): void {
    ipcMain.handle(RendererToMainEventsForDataStoreIPC.STORE_GET, (event, storeName) => {
      return DataStoreManager.stores.get(storeName)?.get(DataStoreManager.UNIVERSAL_KEY);
    });

    // Set store handler
    ipcMain.handle(RendererToMainEventsForDataStoreIPC.STORE_SET, (event, storeName, value) => {
      DataStoreManager.stores.get(storeName)?.set(DataStoreManager.UNIVERSAL_KEY, value);
      if(storeName === DataStoreConstants.LLM_CONFIGURATION){
        LLMInferenceManager.init();
      }
      
      // // Notify all watchers except sender
      // for (const [watcherId, watchData] of DataStore.watchers.entries()) {
      //   if (watcherId !== event.sender.id && 
      //       watchData.storeName === storeName &&
      //       watchData.keys.has(key)) {
      //     try {
      //       const wc = webContents.fromId(watcherId);
      //       if (wc && !wc.isDestroyed()) {
      //         wc.send('store:changed', storeName, key, value);
      //       }
      //     } catch (e) {
      //       // WebContents might have been destroyed
      //       DataStore.watchers.delete(watcherId);
      //     }
      //   }
      // }
      
      return true;
    });

    // Watch handler
    // ipcMain.on('store:watch', (event, storeName, key) => {
    //   const watcherId = event.sender.id;
      
    //   if (!DataStore.watchers.has(watcherId)) {
    //     DataStore.watchers.set(watcherId, {
    //       storeName,
    //       keys: new Set([key]),
    //       cleanup: () => DataStore.watchers.delete(watcherId)
    //     });
        
    //     // Clean up when webContents is destroyed
    //     event.sender.once('destroyed', () => {
    //       if (DataStore.watchers.has(watcherId)) {
    //         DataStore.watchers.delete(watcherId);
    //       }
    //     });
    //   } else {
    //     // Just add this key to the existing watcher
    //     DataStore.watchers.get(watcherId)?.keys.add(key);
    //   }
    // });

    // // Unwatch handler
    // ipcMain.on('store:unwatch', (event, storeName, key) => {
    //   const watcherId = event.sender.id;
      
    //   if (DataStore.watchers.has(watcherId)) {
    //     const watcher = DataStore.watchers.get(watcherId);
    //     if (watcher) {
    //       watcher.keys.delete(key);
          
    //       // If no more keys, remove the watcher
    //       if (watcher.keys.size === 0) {
    //         DataStore.watchers.delete(watcherId);
    //       }
    //     }
    //   }
    // });
  }

  // Get a value from the store
  public static get(storeName: string): any {
    return DataStoreManager.stores.get(storeName)?.get(DataStoreManager.UNIVERSAL_KEY);
  }

  // Set a value in the store
  public static set(storeName: string, value: any): void {
    DataStoreManager.stores.get(storeName)?.set(DataStoreManager.UNIVERSAL_KEY, value);
    //@todo - notify all watchers
  }

  // // Notify all watchers about a change
  // private notifyWatchers(storeName: string, key: string, value: any): void {
  //   for (const window of BrowserWindow.getAllWindows()) {
  //     const watcherId = window.webContents.id;
  //     const watchData = DataStoreManager.watchers.get(watcherId);
      
  //     if (watchData && watchData.storeName === storeName && watchData.keys.has(key)) {
  //       window.webContents.send('store:changed', storeName, key, value);
  //     }
  //   }
  // }

  private static getDefaultValue(storeName: string): any{
    let returnValue;
    switch (storeName) {
      case DataStoreConstants.DOWNLOADED_LLM_MODELS:
        returnValue = [];
        break;
      case DataStoreConstants.LLM_CONFIGURATION:
        returnValue = {
          minP: 0.05,
          topP: 0.9,
          topK: 40,
          randomSeed : 1742883981,
          temperature: 0.7,
          primarySearchEngine: 'Google',
          maxTokens: 4 * 1024
        };
        break;
      case DataStoreConstants.BROWSER_SETTINGS:
        returnValue = {};
        break;
      default:
        break;
    }
    return returnValue;
  }
}