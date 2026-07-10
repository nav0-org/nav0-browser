import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const ICON_BASE = path.resolve(__dirname, 'src/renderer/assets/logo');
const ICON_PNG = `${ICON_BASE}.png`;
const ICON_ICNS = `${ICON_BASE}.icns`;
const ICON_ICO = path.resolve(__dirname, 'src/renderer/assets/favicon.ico');
const MAC_ENTITLEMENTS = path.resolve(__dirname, 'build/entitlements.mac.plist');

// macOS code signing. Camera/microphone (and screen capture) only work in a
// packaged build if the .app carries a VALID code signature plus the
// hardened-runtime camera/audio-input entitlements — macOS TCC binds the user's
// consent to a stable code-signing identity, and an unsigned/invalid bundle is
// silently denied (and on Apple Silicon may not launch at all). In dev this is a
// non-issue because we run Electron's own pre-signed binary.
//
// Identity is env-driven so the same config works two ways:
//   • APPLE_SIGNING_IDENTITY set  → Developer ID signing (robust, distributable;
//     notarized too when the APPLE_ID/APPLE_TEAM_ID secrets are present).
//   • not set                     → ad-hoc signing ("-"), which still produces a
//     valid, internally-consistent signature so camera/mic work on the build
//     machine. Ad-hoc apps are not notarized, so distributed copies still need
//     the quarantine flag stripped (install.sh already does `xattr -cr`), and on
//     the newest macOS ad-hoc capture can be unreliable — ship a Developer ID +
//     notarized build for end users.
const APPLE_SIGNING_IDENTITY = process.env.APPLE_SIGNING_IDENTITY;
const canNotarize =
  !!process.env.APPLE_ID &&
  !!process.env.APPLE_APP_SPECIFIC_PASSWORD &&
  !!process.env.APPLE_TEAM_ID;

// Widevine VMP (Verified Media Path) signing — castLabs "Electron for Content
// Security" (ECS). A Widevine *production* license server only trusts an ECS app
// whose Electron framework/executable carries a valid VMP signature, issued by
// castLabs' EVS service via the `castlabs-evs` Python package. Signing is gated
// on the EVS credentials so local/dev/unsigned builds still succeed — those keep
// the fork's built-in *development* signature, which works against Widevine UAT /
// dev license servers but not production ones (Netflix, etc.).
//
// Ordering vs. code-signing is platform-specific: on macOS the VMP signature
// must be applied BEFORE code-signing (so osxSign seals it in), so we sign in
// packageAfterPrune (which runs before osxSign). On Windows it must be applied
// AFTER code-signing, so we sign in postPackage (after packaging completes).
// Linux has no VMP signing (Widevine on Linux uses the built-in signature).
// See https://github.com/castlabs/electron-releases/wiki/EVS
const EVS_CONFIGURED = !!process.env.EVS_ACCOUNT_NAME && !!process.env.EVS_PASSWD;

function vmpSign(packageDir: string): void {
  // `castlabs_evs.vmp sign-pkg` expects the directory that CONTAINS the .app/.exe,
  // not the bundle/executable itself. It re-signs the Electron framework in place.
  const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  console.log(`[vmp] VMP-signing package at ${packageDir}`);
  execFileSync(python, ['-m', 'castlabs_evs.vmp', 'sign-pkg', packageDir], {
    stdio: 'inherit',
    // EVS_NO_ASK keeps the CLI non-interactive; it reads EVS_ACCOUNT_NAME /
    // EVS_PASSWD from the environment to authenticate.
    env: { ...process.env, EVS_NO_ASK: '1' },
  });
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: process.platform === 'linux' ? 'nav0' : 'Nav0',
    icon: ICON_BASE,
    extraResource: [],
    // Download the Widevine-enabled ECS binaries from castLabs' GitHub releases
    // instead of the upstream electron.org mirror. @electron/get derives the
    // "v<version>/electron-v<version>-<platform>-<arch>.zip" path from the
    // installed electron version (41.9.2+wvcus), so only the mirror base needs
    // overriding. Required for packaging every arch — including cross-compiled
    // ones (e.g. the macOS x64 build produced on an arm64 runner), which pull a
    // fresh binary rather than reusing the host's node_modules/electron.
    download: {
      mirrorOptions: {
        mirror: 'https://github.com/castlabs/electron-releases/releases/download/',
      },
    },
    extendInfo: {
      NSAudioCaptureUsageDescription:
        'Nav0 needs audio capture access to share system audio during screen sharing.',
      NSCameraUsageDescription: 'Nav0 needs camera access when a website you visit requests it.',
      NSMicrophoneUsageDescription:
        'Nav0 needs microphone access when a website you visit requests it.',
    },
    // Sign the macOS bundle (and every Electron Helper) with the camera/mic
    // entitlements. The same entitlements file is applied to every file via
    // optionsForFile so the device entitlements land on the Helper
    // (Renderer/GPU) processes that actually open the camera/mic — applying them
    // only to the top-level app is the classic "works unsigned, breaks signed"
    // trap. osxSign is ignored on non-darwin packaging targets.
    osxSign: {
      identity: APPLE_SIGNING_IDENTITY || '-',
      // Skip the keychain identity lookup for ad-hoc ("-") builds.
      identityValidation: !!APPLE_SIGNING_IDENTITY,
      optionsForFile: () => ({
        entitlements: MAC_ENTITLEMENTS,
        hardenedRuntime: true,
      }),
    },
    // Notarize only when real Apple credentials are available (skipped for
    // ad-hoc/local builds, which can't be notarized).
    ...(canNotarize
      ? {
          osxNotarize: {
            appleId: process.env.APPLE_ID as string,
            appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD as string,
            teamId: process.env.APPLE_TEAM_ID as string,
          },
        }
      : {}),
  },
  rebuildConfig: {
    force: true,
  },
  makers: [
    new MakerSquirrel({
      name: 'Nav0',
      setupIcon: ICON_ICO,
    }),
    new MakerZIP({}, ['darwin']),
    new MakerDeb({
      options: {
        icon: ICON_PNG,
        bin: 'nav0',
        // Place Nav0 under "Internet" (not "Accessories"). Without this the
        // installer defaults the .desktop Categories to Utility, which Linux
        // Mint / GNOME map to Accessories.
        categories: ['Network', 'WebBrowser'],
      },
    }),
    new MakerRpm({
      options: {
        icon: ICON_PNG,
        bin: 'nav0',
        // Same as deb: surface Nav0 in the Internet menu group.
        categories: ['Network', 'WebBrowser'],
      },
    }),
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
        icon: ICON_ICNS,
      },
    },
  ],
  hooks: {
    packageAfterPrune: async (_config, buildPath, _electronVersion, platform) => {
      // Electron 35+ uses ESM resolution for the main entry point.
      // ESM does not support directory imports like ".webpack/main" —
      // it requires the full file path ".webpack/main/index.js".
      // The webpack plugin hardcodes ".webpack/main", so we patch it here
      // in packageAfterPrune (not packageAfterCopy) because the config hooks
      // run before plugin hooks, and the package.json isn't written yet during afterCopy.
      const packageJsonPath = path.join(buildPath, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (pkg.main === '.webpack/main') {
        pkg.main = '.webpack/main/index.js';
        fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
      }

      // macOS: apply the Widevine VMP signature BEFORE osxSign runs (osxSign
      // happens later in the packaging step, so packageAfterPrune is the last
      // safe point). buildPath is "<dir>/<App>.app/Contents/Resources/app"; the
      // directory that contains the .app is four levels up, which is what
      // sign-pkg expects.
      if (platform === 'darwin') {
        if (EVS_CONFIGURED) {
          vmpSign(path.resolve(buildPath, '../../../..'));
        } else {
          console.log(
            '[vmp] EVS_ACCOUNT_NAME/EVS_PASSWD not set — skipping macOS VMP signing ' +
              '(dev build; production Widevine playback will be unavailable).'
          );
        }
      }
    },
    postPackage: async (_config, packageResult) => {
      // Windows: apply the Widevine VMP signature AFTER packaging (and any
      // code-signing) completes. Each outputPath is the directory that directly
      // contains Nav0.exe, which is what sign-pkg expects.
      if (packageResult.platform === 'win32') {
        if (EVS_CONFIGURED) {
          for (const outputPath of packageResult.outputPaths) {
            vmpSign(outputPath);
          }
        } else {
          console.log(
            '[vmp] EVS_ACCOUNT_NAME/EVS_PASSWD not set — skipping Windows VMP signing ' +
              '(dev build; production Widevine playback will be unavailable).'
          );
        }
      }
    },
  },
  plugins: [
    new WebpackPlugin({
      mainConfig,
      devContentSecurityPolicy: "connect-src 'self' * 'unsafe-eval'",
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/renderer/browser-layout/index.html',
            js: './src/renderer/browser-layout/index.ts',
            name: 'browser_layout',
            preload: {
              js: './src/preload/internals-api.ts',
            },
          },
          // options_menu, command_k, command_o, permission_prompt, issue_report, ssl_info
          // entries removed — now consolidated into the unified 'overlay' entry below
          {
            html: './src/renderer/pages/bookmarks/index.html',
            js: './src/renderer/pages/bookmarks/index.ts',
            name: 'bookmarks',
            preload: {
              js: './src/preload/internals-api.ts',
            },
          },
          {
            html: './src/renderer/pages/browser-settings/index.html',
            js: './src/renderer/pages/browser-settings/index.ts',
            name: 'browser_settings',
            preload: {
              js: './src/preload/internals-api.ts',
            },
          },
          // command_k and command_o entries removed — consolidated into overlay
          {
            html: './src/renderer/pages/downloads/index.html',
            js: './src/renderer/pages/downloads/index.ts',
            name: 'downloads',
            preload: {
              js: './src/preload/internals-api.ts',
            },
          },
          {
            html: './src/renderer/pages/history/index.html',
            js: './src/renderer/pages/history/index.ts',
            name: 'history',
            preload: {
              js: './src/preload/internals-api.ts',
            },
          },
          {
            html: './src/renderer/pages/new-tab/index.html',
            js: './src/renderer/pages/new-tab/index.ts',
            name: 'new_tab',
            preload: {
              js: './src/preload/internals-api.ts',
            },
          },
          {
            html: './src/renderer/pages/about/index.html',
            js: './src/renderer/pages/about/index.ts',
            name: 'about',
            preload: {
              js: './src/preload/internals-api.ts',
            },
          },
          // permission_prompt and issue_report entries removed — consolidated into overlay
          {
            html: './src/renderer/web-content/index.html',
            js: './src/renderer/web-content/index.ts',
            name: 'web_content',
            preload: {
              js: './src/preload/web-content-preload.ts',
            },
          },
          // find_in_page entry removed — now embedded in browser_layout
          // ssl_info entry removed — consolidated into overlay
          {
            html: './src/renderer/overlay/index.html',
            js: './src/renderer/overlay/index.ts',
            name: 'overlay',
            preload: {
              js: './src/preload/internals-api.ts',
            },
          },
          {
            html: './src/renderer/pages/display-capture-picker/index.html',
            js: './src/renderer/pages/display-capture-picker/index.ts',
            name: 'display_capture_picker',
            preload: {
              js: './src/preload/display-capture-picker-preload.ts',
            },
          },
        ],
      },
    }),

    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      // Disabled on macOS: without an Apple Developer ID, OSCrypt can't
      // reliably persist its key in the Keychain, so cookies become
      // unreadable on the next launch and users get logged out. Windows
      // (DPAPI) and Linux (libsecret) don't need a signed binary, so we
      // keep encryption on there.
      [FuseV1Options.EnableCookieEncryption]: process.platform !== 'darwin',
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
