import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main/index.ts',
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json', '.html'],
  },
  // externals: [/^@node-llama-cpp\/.*/, /^@reflink\/.*/],
  // externals: {
  //   'node-llama-cpp': 'commonjs2 node-llama-cpp',
  //   'better-sqlite3': 'commonjs2 better-sqlite3',
  // },
  // target: 'electron-main',
  // node: false,
  // experiments: {
  //   // Enable top-level await for ESM modules
  //   topLevelAwait: true,
  //   outputModule: true,
  // },
  // output: {
  //   module: true, // Enable ES module output
  //   chunkFormat: 'module',
  // },
};
