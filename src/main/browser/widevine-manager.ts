import * as electron from 'electron';

// castLabs' "Electron for Content Security" (ECS) fork extends the `electron`
// module with a `components` object that installs and updates Google's Widevine
// Content Decryption Module (CDM) at runtime via Chromium's Component Updater.
// The CDM is what lets DRM-protected media (Netflix, Spotify, Amazon Prime, …)
// decrypt and play — stock Electron ships without it.
//
// `components` is not part of upstream Electron's type definitions, so we
// describe only the slice we use and read it off the module with a narrow cast.
// That keeps this file (and the whole app) type-checking cleanly whether it is
// built against the ECS fork or the upstream `electron` package.
interface EcsComponents {
  /**
   * Resolves once every managed component — the Widevine CDM in particular —
   * has been installed/updated. Forces an immediate install when no CDM is
   * present yet, so the first DRM-protected page can decrypt without a reload.
   */
  whenReady(): Promise<void>;
  /** Per-component status map, e.g. `{ WIDEVINE_CDM: 'ready' }`. */
  status(): Record<string, string>;
}

const components = (electron as unknown as { components?: EcsComponents }).components;

/**
 * Drives the Widevine CDM lifecycle for the ECS Electron fork. Must be awaited
 * after `app.whenReady()` and before any window (WebContentsView) loads content,
 * so protected playback works on the very first navigation.
 */
export class WidevineManager {
  private static initialized = false;

  /**
   * Whether this build is running on the ECS fork (i.e. the `components` API is
   * present). On stock Electron this is `false` and Widevine playback is
   * unavailable.
   */
  static get isSupported(): boolean {
    return !!components;
  }

  /**
   * Wait for the Widevine CDM to be installed and ready. Safe to call more than
   * once — the underlying install only runs on the first invocation. On stock
   * Electron (no `components` API) this resolves immediately so the browser
   * still boots, just without DRM playback.
   */
  static async whenReady(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (!components) {
      console.warn(
        '[widevine] `components` API unavailable — running on stock Electron. ' +
          'DRM-protected media (Netflix, Spotify, …) will not play. Build against ' +
          "castLabs' Electron for Content Security (ECS) to enable Widevine."
      );
      return;
    }

    try {
      await components.whenReady();
      console.log('[widevine] Widevine CDM ready:', components.status());
    } catch (err) {
      // A failed CDM install must not take the browser down — everything except
      // DRM playback still works. Surface it in the log and carry on.
      console.error('[widevine] failed to initialize the Widevine CDM:', err);
    }
  }
}
