import { WebContents } from 'electron';
import { MainToRendererEventsForBrowserIPC } from '../../../constants/app-constants';
import { OverlayHandler } from './overlay-handler';

export type UrlAutocompleteSuggestion = {
  type: 'tab' | 'bookmark' | 'history' | 'search';
  title: string;
  url: string;
  faviconUrl?: string | null;
  meta?: string;
  tabId?: string;
};

export type UrlAutocompleteShowData = {
  bounds: { x: number; y: number; width: number; height: number };
  results: UrlAutocompleteSuggestion[];
  activeIndex: number;
};

export class UrlAutocompleteHandler implements OverlayHandler {
  onShow(webContents: WebContents, data?: UrlAutocompleteShowData): void {
    webContents.send(MainToRendererEventsForBrowserIPC.SHOW_OVERLAY_PANEL, {
      type: 'url-autocomplete',
      data,
    });
    // Do NOT call webContents.focus() — the URL input in browser-layout must keep focus.
  }

  onHide(webContents: WebContents): void {
    webContents.send(MainToRendererEventsForBrowserIPC.HIDE_OVERLAY_PANEL, {
      type: 'url-autocomplete',
    });
  }

  update(
    webContents: WebContents,
    data: { results: UrlAutocompleteSuggestion[]; activeIndex: number }
  ): void {
    webContents.send(MainToRendererEventsForBrowserIPC.URL_AUTOCOMPLETE_UPDATE, data);
  }
}
