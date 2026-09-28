import { app, autoUpdater, net } from 'electron';
import { UpdateCheckResult, UpdateInstallResult } from '../../types/update-types';

/**
 * UpdateManager — user-triggered "over-the-air" update checks.
 *
 * Nav0 is a zero-telemetry browser, so there is deliberately NO background
 * polling and NO silent auto-install. The only network activity happens when
 * the user explicitly clicks "Check for updates" on the About page:
 *
 *   1. Detection (all platforms): a single HTTPS GET to the public GitHub
 *      Releases API, comparing the latest published stable tag against the
 *      running version. Nothing but a static User-Agent leaves the machine,
 *      and only to GitHub — who already served the original download.
 *
 *   2. Apply (packaged Windows only): the built-in Squirrel autoUpdater pulls
 *      the update from update.electronjs.org (which reads our GitHub Releases)
 *      and stages it; the user then chooses to restart. macOS cannot apply in
 *      place because our builds are unsigned (Squirrel.Mac rejects them), and
 *      Electron's autoUpdater has no Linux backend — on both, the About page
 *      falls back to opening the release page for a manual download.
 */
export abstract class UpdateManager {
  private static readonly OWNER = 'nav0-org';
  private static readonly REPO = 'nav0-browser';
  private static readonly UPDATE_SERVICE_HOST = 'https://update.electronjs.org';

  // Configure the Squirrel feed URL at most once.
  private static feedConfigured = false;
  // Guard against overlapping install flows.
  private static installInFlight = false;

  /**
   * Whether this build can apply an update in place. Only packaged Windows
   * (Squirrel) qualifies today — see the class comment.
   */
  public static canAutoInstall(): boolean {
    return app.isPackaged && process.platform === 'win32';
  }

  /**
   * Detection step. Queries the GitHub Releases API for the latest stable
   * release and compares it with the running version. Never throws — failures
   * are returned as `status: 'error'`.
   */
  public static async checkForUpdates(): Promise<UpdateCheckResult> {
    const currentVersion = app.getVersion();
    const canAutoInstall = UpdateManager.canAutoInstall();

    try {
      const release = await UpdateManager.fetchLatestRelease();
      const latestVersion = UpdateManager.normalizeVersion(release.tag_name);

      if (!latestVersion) {
        return {
          status: 'error',
          currentVersion,
          canAutoInstall,
          error: 'Could not read the latest version from GitHub.',
        };
      }

      const isNewer =
        UpdateManager.compareVersions(
          latestVersion,
          UpdateManager.normalizeVersion(currentVersion) || currentVersion
        ) > 0;

      return {
        status: isNewer ? 'update-available' : 'up-to-date',
        currentVersion,
        latestVersion,
        releaseUrl: release.html_url,
        canAutoInstall,
      };
    } catch (err) {
      return {
        status: 'error',
        currentVersion,
        canAutoInstall,
        error: err instanceof Error ? err.message : 'Update check failed.',
      };
    }
  }

  /**
   * Apply step (packaged Windows only). Points Squirrel at update.electronjs.org,
   * kicks off a check+download, and resolves once the update is staged. Never
   * throws — failures are returned as `{ downloaded: false, error }`.
   */
  public static async downloadAndInstall(): Promise<UpdateInstallResult> {
    if (!UpdateManager.canAutoInstall()) {
      return { downloaded: false, error: 'In-place updates are only available on Windows.' };
    }
    if (UpdateManager.installInFlight) {
      return { downloaded: false, error: 'An update is already being downloaded.' };
    }

    UpdateManager.installInFlight = true;
    try {
      UpdateManager.configureFeedURL();

      return await new Promise<UpdateInstallResult>((resolve) => {
        const cleanup = () => {
          autoUpdater.removeListener('update-downloaded', onDownloaded);
          autoUpdater.removeListener('update-not-available', onNotAvailable);
          autoUpdater.removeListener('error', onError);
        };
        const onDownloaded = (_event: Electron.Event, _notes: string, releaseName: string) => {
          cleanup();
          resolve({
            downloaded: true,
            version: UpdateManager.normalizeVersion(releaseName) || undefined,
          });
        };
        const onNotAvailable = () => {
          cleanup();
          resolve({ downloaded: false });
        };
        const onError = (error: Error) => {
          cleanup();
          resolve({
            downloaded: false,
            error: error?.message || 'The update could not be downloaded.',
          });
        };

        autoUpdater.on('update-downloaded', onDownloaded);
        autoUpdater.on('update-not-available', onNotAvailable);
        autoUpdater.on('error', onError);

        autoUpdater.checkForUpdates();
      });
    } finally {
      UpdateManager.installInFlight = false;
    }
  }

  /** Restart and apply the staged update (packaged Windows only). */
  public static quitAndInstall(): void {
    if (!UpdateManager.canAutoInstall()) return;
    autoUpdater.quitAndInstall();
  }

  private static configureFeedURL(): void {
    if (UpdateManager.feedConfigured) return;
    const feedUrl =
      `${UpdateManager.UPDATE_SERVICE_HOST}/${UpdateManager.OWNER}/${UpdateManager.REPO}/` +
      `${process.platform}-${process.arch}/${app.getVersion()}`;
    autoUpdater.setFeedURL({ url: feedUrl });
    UpdateManager.feedConfigured = true;
  }

  private static fetchLatestRelease(): Promise<{ tag_name: string; html_url: string }> {
    const url = `https://api.github.com/repos/${UpdateManager.OWNER}/${UpdateManager.REPO}/releases/latest`;

    return new Promise((resolve, reject) => {
      const request = net.request({ method: 'GET', url });
      // GitHub requires a User-Agent; we send a static, version-less one so the
      // check reveals nothing beyond "a Nav0 update check".
      request.setHeader('User-Agent', 'Nav0-Browser');
      request.setHeader('Accept', 'application/vnd.github+json');

      let body = '';
      request.on('response', (response) => {
        const status = response.statusCode;
        response.on('data', (chunk) => {
          body += chunk.toString();
        });
        response.on('end', () => {
          if (status < 200 || status >= 300) {
            reject(new Error(`GitHub responded with HTTP ${status}.`));
            return;
          }
          try {
            const parsed = JSON.parse(body);
            if (typeof parsed?.tag_name !== 'string') {
              reject(new Error('Unexpected response from GitHub.'));
              return;
            }
            resolve({
              tag_name: parsed.tag_name,
              html_url:
                typeof parsed.html_url === 'string'
                  ? parsed.html_url
                  : `https://github.com/${UpdateManager.OWNER}/${UpdateManager.REPO}/releases/latest`,
            });
          } catch {
            reject(new Error('Could not parse the GitHub response.'));
          }
        });
        response.on('error', (error: Error) => reject(error));
      });
      request.on('error', (error: Error) => reject(error));
      request.end();
    });
  }

  /** Strip a leading "v" and any pre-release/build suffix → "1.2.3". */
  private static normalizeVersion(raw: string | undefined | null): string | null {
    if (!raw) return null;
    const match = /(\d+)\.(\d+)\.(\d+)/.exec(raw);
    return match ? `${match[1]}.${match[2]}.${match[3]}` : null;
  }

  /** Numeric MAJOR.MINOR.PATCH compare. >0 if a>b, <0 if a<b, 0 if equal. */
  private static compareVersions(a: string, b: string): number {
    const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
    const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }
}
