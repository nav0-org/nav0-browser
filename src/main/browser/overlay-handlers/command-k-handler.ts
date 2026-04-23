import { WebContents } from 'electron';
import { MainToRendererEventsForBrowserIPC } from '../../../constants/app-constants';
import { OverlayHandler } from './overlay-handler';

export class CommandKHandler implements OverlayHandler {
  onShow(webContents: WebContents): void {
    webContents.send(MainToRendererEventsForBrowserIPC.SHOW_OVERLAY_PANEL, { type: 'command-k' });
    webContents.focus();
  }

  onHide(webContents: WebContents): void {
    webContents.send(MainToRendererEventsForBrowserIPC.HIDE_OVERLAY_PANEL, { type: 'command-k' });
  }
}
