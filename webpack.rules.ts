import type { ModuleOptions } from 'webpack';
import path from 'path';

export const rules: Required<ModuleOptions>['rules'] = [
  // Add support for native node modules
  {
    // We're specifying native_modules in the test because the asset relocator loader generates a
    // "fake" .node file which is really a cjs file.
    test: /native_modules[/\\].+\.node$/,
    use: 'node-loader',
  },
  // {
  //   test: /\.node$/,
  //   use: 'node-loader',
  // },
  {
    test: /[/\\]node_modules[/\\](@reflink)[/\\].+\.(node)$/,
    use: 'node-loader',
  },
  {
    test: /[/\\]node_modules[/\\](better-sqlite3|other-module)[/\\].+\.(m?js|node)$/,
    parser: { amd: false },
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: {
        outputAssetBase: 'native_modules',
      },
    },
  },
  {
    test: /[/\\]node_modules[/\\](node-llama-cpp)[/\\]/,
    parser: { amd: false },
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: {
        outputAssetBase: 'native_modules',
      },
    },
  },
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: 'ts-loader',
      options: {
        transpileOnly: true,
      },
    },
  },
  {
    test: /\.html$/,
    use: 'html-loader'
  }
];
