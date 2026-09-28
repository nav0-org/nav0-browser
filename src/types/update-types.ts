/**
 * Types for Nav0's user-triggered update checks.
 *
 * Nav0 is a zero-telemetry browser, so there is deliberately no background
 * polling and no silent auto-install. The only outbound traffic happens when
 * the user explicitly clicks "Check for updates" on the About page. See
 * `src/main/browser/update-manager.ts` for the full flow.
 */

/** Outcome of an update check. */
export type UpdateAvailability = 'up-to-date' | 'update-available' | 'error';

export interface UpdateCheckResult {
  /** Outcome of the check. */
  status: UpdateAvailability;
  /** The version currently running (from `app.getVersion()`). */
  currentVersion: string;
  /** The latest published stable version, when the check succeeded. */
  latestVersion?: string;
  /** URL of the latest GitHub release page (for "View release" / manual download). */
  releaseUrl?: string;
  /**
   * True only when this platform + build can apply the update in place —
   * packaged Windows (Squirrel) today. macOS is blocked without Developer ID
   * signing (Squirrel.Mac rejects unsigned bundles) and Electron's autoUpdater
   * has no Linux backend, so both fall back to opening the release page.
   */
  canAutoInstall: boolean;
  /** Human-readable error message when `status` is `'error'`. */
  error?: string;
}

/** Result of the Windows in-place download step. */
export interface UpdateInstallResult {
  /** True once Squirrel has staged the update and it is ready to apply on restart. */
  downloaded: boolean;
  /** The version that was downloaded, when known. */
  version?: string;
  /** Human-readable error message when the download failed. */
  error?: string;
}
