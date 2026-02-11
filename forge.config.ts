import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';
import path from 'path';
import fs from 'fs';

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
  // Specify which files should not be bundled into asar
  // asarUnpack: [
  //   '**/node_modules/node-llama-cpp/bins/**',
  //   '**/node_modules/node-llama-cpp/llama/localBuilds/**',
  //   '**/node_modules/@node-llama-cpp/**'
  // ],
  makers: [
    new MakerZIP({}, ['win32']),
    new MakerZIP({}, ['darwin']), 
    new MakerRpm({}), 
    new MakerDeb({}),
    {
      name: '@electron-forge/maker-deb',
        config: {
          options: {
            icon: 'src/renderer/assets/logo.png'
          }
      }
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO'
      }
    }
  ],
  hooks: {
    packageAfterCopy: async (config, buildPath, electronVersion, platform, arch) => {
      const targetDir = path.join(buildPath, '../node_modules');
      try {
        fs.mkdirSync(targetDir, { recursive: true });
        fs.cpSync(path.join(process.cwd(), 'node_modules/@node-llama-cpp'), path.join(targetDir, '@node-llama-cpp'), { recursive: true });
        fs.cpSync(path.join(process.cwd(), 'node_modules/@reflink'), path.join(targetDir, '@reflink'), { recursive: true });
      } catch (error) {
        console.error('Error in packageAfterCopy :', error);
      }
    }
  },
  plugins: [
    // new AutoUnpackNativesPlugin({
    //   unpackGlob: [
    //     "./node_modules/node-llama-cpp/bins",
    //     "./node_modules/node-llama-cpp/llama/localBuilds",
    //     "./node_modules/@node-llama-cpp/**/*.*"
    //   ]
    // }),
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
            html: './src/renderer/pages/about/index.html',
            js: './src/renderer/pages/about/index.ts',
            name: 'about',
          },
          {
            html: './src/renderer/pages/ai-settings/index.html',
            js: './src/renderer/pages/ai-settings/index.ts',
            name: 'ai_settings',
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
            html: './src/renderer/pages/eula/index.html',
            js: './src/renderer/pages/eula/index.ts',
            name: 'eula',
          },
          {
            html: './src/renderer/pages/help-center/index.html',
            js: './src/renderer/pages/help-center/index.ts',
            name: 'help_center',
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
            html: './src/renderer/pages/knowledge-hub/index.html',
            js: './src/renderer/pages/knowledge-hub/index.ts',
            name: 'knowledge_hub',
            preload: {
              js: './src/preload/internals-api.ts',
            },
          },
          {
            html: './src/renderer/pages/llm-chat/index.html',
            js: './src/renderer/pages/llm-chat/index.ts',
            name: 'llm_chat',
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
            html: './src/renderer/pages/privacy-policy/index.html',
            js: './src/renderer/pages/privacy-policy/index.ts',
            name: 'privacy_policy',
          },
          {
            html: './src/renderer/pages/report-issue/index.html',
            js: './src/renderer/pages/report-issue/index.ts',
            name: 'report_issue',
          },
          {
            html: './src/renderer/pages/ai-summary/index.html',
            js: './src/renderer/pages/ai-summary/index.ts',
            name: 'ai_summary',
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
