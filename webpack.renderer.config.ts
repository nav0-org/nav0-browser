import { type Configuration, DefinePlugin } from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

rules.push({
  test: /\.css$/,
  use: [{ loader: MiniCssExtractPlugin.loader }, { loader: 'css-loader' }],
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins: [
    ...plugins,
    new MiniCssExtractPlugin(),
    new DefinePlugin({
      'process.env.NAV0_ISSUE_API_KEY': JSON.stringify(process.env.NAV0_ISSUE_API_KEY || ''),
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};
