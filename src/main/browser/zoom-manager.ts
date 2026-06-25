import { WebContents } from 'electron';

/**
 * Per-tab page zoom, modelled on Chrome.
 *
 * Chrome exposes a fixed ladder of zoom factors and the +/- shortcuts step
 * between adjacent rungs rather than scaling by a fixed multiplier. We mirror
 * that ladder here and operate directly on a tab's `WebContents` via
 * `setZoomFactor`/`getZoomFactor`, so each tab keeps its own zoom level.
 */
export abstract class ZoomManager {
  // The exact factor ladder Chrome uses for its zoom controls.
  private static readonly ZOOM_FACTORS: readonly number[] = [
    0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0,
  ];
  private static readonly DEFAULT_FACTOR = 1.0;
  // Tolerance so a current factor that already sits on a rung doesn't get
  // skipped (or double-counted) due to floating-point noise.
  private static readonly EPSILON = 0.001;

  static getFactor(wc: WebContents): number {
    try {
      return wc.getZoomFactor();
    } catch {
      return ZoomManager.DEFAULT_FACTOR;
    }
  }

  static zoomIn(wc: WebContents): number {
    const current = ZoomManager.getFactor(wc);
    const next =
      ZoomManager.ZOOM_FACTORS.find((f) => f > current + ZoomManager.EPSILON) ??
      ZoomManager.ZOOM_FACTORS[ZoomManager.ZOOM_FACTORS.length - 1];
    return ZoomManager.apply(wc, next);
  }

  static zoomOut(wc: WebContents): number {
    const current = ZoomManager.getFactor(wc);
    const lower = ZoomManager.ZOOM_FACTORS.filter((f) => f < current - ZoomManager.EPSILON);
    const next = lower.length ? lower[lower.length - 1] : ZoomManager.ZOOM_FACTORS[0];
    return ZoomManager.apply(wc, next);
  }

  static reset(wc: WebContents): number {
    return ZoomManager.apply(wc, ZoomManager.DEFAULT_FACTOR);
  }

  private static apply(wc: WebContents, factor: number): number {
    try {
      wc.setZoomFactor(factor);
    } catch {
      /* webContents may be gone */
    }
    return factor;
  }

  /**
   * Maps a keyboard `before-input-event` to a zoom action, matching Chrome's
   * shortcuts: Cmd/Ctrl with `=`/`+` zooms in, `-`/`_` zooms out, `0` resets.
   * Returns `null` when the input isn't a zoom shortcut.
   */
  static matchShortcut(input: Electron.Input): 'in' | 'out' | 'reset' | null {
    if (input.type !== 'keyDown') return null;
    // Chrome uses Cmd on macOS, Ctrl elsewhere. Ignore Alt-modified combos.
    const mod = process.platform === 'darwin' ? input.meta : input.control;
    if (!mod || input.alt) return null;
    switch (input.key) {
      case '=':
      case '+':
        return 'in';
      case '-':
      case '_':
        return 'out';
      case '0':
        return 'reset';
      default:
        return null;
    }
  }
}
