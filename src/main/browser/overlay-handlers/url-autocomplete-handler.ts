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

type Rect = { x: number; y: number; width: number; height: number };

export type UrlAutocompleteShowData = {
  bounds: Rect;
  results: UrlAutocompleteSuggestion[];
  activeIndex: number;
};

// Room the overlay view keeps around the dropdown so the panel's
// --n-menu-shadow shows in full: the blur radius of its 0 24px 60px layer on
// either side, and that layer's offset plus blur radius below. Past that the
// shadow shifts no pixel by more than 1/255 (measured in Chromium). Above, it
// reaches only the 6 px up to the toolbar's bottom line, where the cut-off
// shadow meets the chrome line; it never covers the address field.
// url-autocomplete.css pads the panel by the same amounts, which keeps it on
// the dropdown's box.
const SHADOW_ROOM_SIDE = 60;
const SHADOW_ROOM_ABOVE = 6;
const SHADOW_ROOM_BELOW = 84;

export class UrlAutocompleteHandler implements OverlayHandler {
  // The overlay view's bounds while the dropdown is the only overlay showing:
  // the dropdown's box (from the browser-layout renderer) plus the shadow
  // room, clamped to the window. The toolbar leaves more than
  // SHADOW_ROOM_SIDE px of window beside the address field, so only the bottom
  // can meet the window's edge (a short window); the panel then ends higher,
  // keeping its padding for the shadow, and its rows scroll.
  static getViewBounds(dropdown: Rect, parent: Rect): Rect {
    const left = Math.max(0, Math.round(dropdown.x) - SHADOW_ROOM_SIDE);
    const top = Math.max(0, Math.round(dropdown.y) - SHADOW_ROOM_ABOVE);
    const right = Math.min(
      parent.width,
      Math.round(dropdown.x + dropdown.width) + SHADOW_ROOM_SIDE
    );
    const bottom = Math.min(
      parent.height,
      Math.round(dropdown.y + dropdown.height) + SHADOW_ROOM_BELOW
    );
    return {
      x: left,
      y: top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }

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
