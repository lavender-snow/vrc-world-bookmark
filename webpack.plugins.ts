import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import { DefinePlugin, type WebpackPluginInstance } from 'webpack';
import packageJson from './package.json';

export const plugins: WebpackPluginInstance[] = [
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
  new DefinePlugin({
    'process.env.APP_NAME': JSON.stringify(packageJson.name),
    'process.env.APP_VERSION': JSON.stringify(packageJson.version),
    'process.env.REPOSITORY': JSON.stringify(packageJson.repository?.url),
  }),
];
