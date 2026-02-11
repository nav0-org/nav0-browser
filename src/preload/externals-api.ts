import { contextBridge, ipcRenderer } from 'electron';

export function init(){
  const appWindowId = process.argv.find(arg => arg.startsWith('--app-window-id='))?.split('=')[1];
  const isPrivate = process.argv.find(arg => arg.startsWith('--is-private='))?.split('=')[1] === 'true' || false;
  const platform = process.platform;

  //do not expose anything to external websites unless its absolutely needed
}


init();