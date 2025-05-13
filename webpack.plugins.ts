import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import type { WebpackPluginInstance } from 'webpack';

export const plugins: WebpackPluginInstance[] = [
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
];
