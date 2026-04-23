import { WebContents } from 'electron';
import { MainToRendererEventsForBrowserIPC } from '../../../constants/app-constants';
import { DialogRequest } from '../../../types/dialog-types';
import { OverlayHandler } from './overlay-handler';

export class AlertHandler implements OverlayHandler {
  onShow(webContents: WebContents, data?: DialogRequest): void {
    webContents.send(MainToRendererEventsForBrowserIPC.SHOW_OVERLAY_PANEL, { type: 'alert', data });
    webContents.focus();
  }

  onHide(webContents: WebContents): void {
    webContents.send(MainToRendererEventsForBrowserIPC.HIDE_OVERLAY_PANEL, { type: 'alert' });
  }
}
