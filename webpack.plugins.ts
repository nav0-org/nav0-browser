import type { WebpackPluginInstance } from 'webpack';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

// fork-ts-checker spawns IPC workers that can outlive `electron-forge start`
// and flood stderr with EPIPE errors. Only run the type checker for builds;
// rely on the IDE and `npm run lint` / `npm run typecheck` during dev.
const isDevServerCommand =
  process.env.npm_lifecycle_event === 'start' || process.argv[2] === 'start';

export const plugins: WebpackPluginInstance[] = isDevServerCommand
  ? []
  : [
      new ForkTsCheckerWebpackPlugin({
        logger: 'webpack-infrastructure',
      }),
    ];
