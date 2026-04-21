/**
 * Preload for the display-capture source picker window.
 *
 * Exposes a narrow bridge — just enough for the picker UI to fetch the list
 * of DesktopCapturerSource entries and return the user's selection back to
 * the main process. Does NOT expose the full browser API: the picker is a
 * transient dialog, not a tab.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { RendererToMainEventsForBrowserIPC } from '../constants/app-constants';

interface PickerSource {
  idx: number;
  name: string;
  type: 'Screen' | 'Window';
  thumbnail: string;
}

contextBridge.exposeInMainWorld('DisplayCapturePickerAPI', {
  getSources: (): Promise<PickerSource[]> =>
    ipcRenderer.invoke(RendererToMainEventsForBrowserIPC.DISPLAY_CAPTURE_PICKER_GET_SOURCES),
  select: (idx: number | null): void => {
    ipcRenderer.send(RendererToMainEventsForBrowserIPC.DISPLAY_CAPTURE_PICKER_SELECT, idx);
  },
});
