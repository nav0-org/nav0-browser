import { WebContents } from "electron";
import { MainToRendererEventsForBrowserIPC } from "../../../constants/app-constants";
import { BasicAuthRequest } from "../../../types/dialog-types";
import { OverlayHandler } from "./overlay-handler";

export class BasicAuthHandler implements OverlayHandler {
  onShow(webContents: WebContents, data?: BasicAuthRequest): void {
    webContents.send(MainToRendererEventsForBrowserIPC.SHOW_OVERLAY_PANEL, { type: 'basic-auth', data });
    webContents.focus();
  }

  onHide(webContents: WebContents): void {
    webContents.send(MainToRendererEventsForBrowserIPC.HIDE_OVERLAY_PANEL, { type: 'basic-auth' });
  }
}
