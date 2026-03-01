import path from 'path';
import fs from 'fs';
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

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'src/renderer/assets/logo',
    extraResource: [
    ],
  },
  rebuildConfig: {
    force: true
  },
  makers: [
    new MakerSquirrel({
      name: 'nav0-browser',
    }),
    new MakerZIP({}, ['darwin']),
    new MakerDeb({
      options: {
        icon: 'src/renderer/assets/logo.png',
      },
    }),
    new MakerRpm({}),
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
      },
    },
  ],
  hooks: {
    packageAfterPrune: async (_config, buildPath) => {
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
          {
            html: './src/renderer/options-menu/index.html',
            js: './src/renderer/options-menu/index.ts',
            name: 'options_menu',
            preload: {
              js: './src/preload/internals-api.ts',
            },
          },
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
          {
            html: './src/renderer/pages/command-k/index.html',
            js: './src/renderer/pages/command-k/index.ts',
            name: 'command_k',
            preload: {
              js: './src/preload/internals-api.ts',
            },
          },
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
            html: './src/renderer/permission-prompt/index.html',
            js: './src/renderer/permission-prompt/index.ts',
            name: 'permission_prompt',
            preload: {
              js: './src/preload/internals-api.ts',
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
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
