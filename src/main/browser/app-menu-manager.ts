import { Menu } from "electron";
import { AppConstants, InAppUrls } from "../../constants/app-constants";
import { AppWindowManager } from "./app-window-manager";


export abstract class AppMenuManager {
  private static menu: Electron.Menu;

  public static async init() {
    const isMac = process.platform === 'darwin';
    const template = [
      ...(isMac ? [{
        label: AppConstants.APP_NAME,
        submenu: [
          { role: 'about'  as const},
          { type: 'separator' as const },
          { role: 'services' as const },
          { type: 'separator' as const },
          { role: 'hide' as const },
          { role: 'hideOthers' as const },
          { role: 'unhide' as const },
          { type: 'separator' as const },
          { role: 'quit' as const }
        ]
      }] : []),
      {
        label: 'File',
        submenu: [
          {label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: async() => { AppWindowManager.getActiveWindow().createTab(InAppUrls.NEW_TAB, true) }},
          {label: 'New Window', accelerator: 'CmdOrCtrl+N', click: async() => { AppWindowManager.createWindow(false); }},
          {label: 'New Private Window', accelerator: 'CmdOrCtrl+Shift+N', click: async() => { AppWindowManager.createWindow(true); }},
          {type: 'separator' as const},
          {label: 'Close Tab', click: async() => { AppWindowManager.getActiveWindow().closeTab(AppWindowManager.getActiveWindow().getActiveTabId(), true); }},
          {label: 'Close Window', click: async() => { AppWindowManager.closeWindow(AppWindowManager.getActiveWindowId()); }},
        ]
      },
      {
        label: 'Go To',
        submenu: [
          {label: 'Bookmarks', accelerator: 'CmdOrCtrl+Shift+B', click: async() => { AppWindowManager.getActiveWindow().createTab(InAppUrls.BOOKMARKS, true) }},
          {label: 'History', accelerator: 'CmdOrCtrl+Shift+H', click: async() => { AppWindowManager.getActiveWindow().createTab(InAppUrls.HISTORY, true) }},
          {label: 'Downloads', accelerator: 'CmdOrCtrl+Shift+D',click: async() => { AppWindowManager.getActiveWindow().createTab(InAppUrls.DOWNLOADS, true) }},
          {type: 'separator' as const},
          {label: 'Command K Interface', accelerator: 'CmdOrCtrl+K', click: async() => { AppWindowManager.getActiveWindow().showCommandKOverlay() }},
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' as const, accelerator: 'CmdOrCtrl+Z', },
          { role: 'redo' as const, accelerator: 'CmdOrCtrl+Z', },
          { type: 'separator' as const },
          { role: 'cut' as const, accelerator: 'CmdOrCtrl+X', },
          { role: 'copy' as const, accelerator: 'CmdOrCtrl+C', },
          { role: 'paste' as const, accelerator: 'CmdOrCtrl+V', },
          ...(isMac ? [
            { role: 'pasteAndMatchStyle' as const },
            { role: 'delete' as const },
            { role: 'selectAll' as const },
            // { type: 'separator' as const },
            // { label: 'Speech', submenu: [
            //   { role: 'startSpeaking' as const },
            //   { role: 'stopSpeaking' as const }
            // ]}
          ] : [
            { role: 'delete' as const },
            { type: 'separator' as const },
            { role: 'selectAll' as const }
          ])
        ]
      },
      {
        label: 'View',
        submenu: [
          // { role: 'reload' as const},
          // { role: 'toggleDevTools' as const},
          // { type: 'separator' as const},
          { role: 'resetZoom' as const},
          { role: 'zoomIn' as const, accelerator: 'CmdOrCtrl+Shift+=',},
          { role: 'zoomOut' as const, accelerator: 'CmdOrCtrl+Shift+-',},
          { type: 'separator' as const},
          { role: 'togglefullscreen' as const}
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' as const},
          { role: 'zoom' as const},
          ...(isMac ? [
            { type: 'separator' as const},
            { role: 'front' as const},
            { type: 'separator' as const},
            { role: 'window' as const}
          ] : [
            { role: 'close' as const}
          ])
        ]
      },
      {
        label: 'Help and More',
        submenu: [
          {label: 'About', click: async() => { AppWindowManager.getActiveWindow().createTab(InAppUrls.ABOUT, true) }},
          {label: 'Privacy Policy', click: async() => { AppWindowManager.getActiveWindow().createTab(InAppUrls.PRIVACY_POLICY, true) }},
          {label: 'EULA', click: async() => { AppWindowManager.getActiveWindow().createTab(InAppUrls.EULA, true) }},
          {label: 'Help Center', click: async() => { AppWindowManager.getActiveWindow().createTab(InAppUrls.HELP_CENTER, true) }},
          {label: 'Report an Issue', click: async() => { AppWindowManager.getActiveWindow().createTab(InAppUrls.REPORT_ISSUE, true) }},
        ]
      }
    ];
    AppMenuManager.menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(AppMenuManager.menu)
  }
}