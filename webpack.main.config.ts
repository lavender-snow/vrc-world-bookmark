import type { Configuration } from 'webpack';

import { alias } from './webpack.alias';
import { plugins } from './webpack.plugins';
import { rules } from './webpack.rules';

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
    alias,
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  externals: {
    'better-sqlite3': 'commonjs2 better-sqlite3',
  },
};
