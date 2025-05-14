import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

rules.push({
  test: /\.(scss|css)$/,
  use: [
    {
        loader: MiniCssExtractPlugin.loader
    },
   {
      loader: 'css-loader',
      options: {
        modules: {
          localIdentName: '[name]__[local]__[hash:base64:5]',
          exportLocalsConvention: "camelCase",
          mode: 'global'
        }
      }
    },
    'sass-loader'
  ],
});

plugins.push(
  new MiniCssExtractPlugin({
    filename: 'assets/styles/index-[name].css',
  }
));

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  devtool: process.env.NODE_ENV === "development" ? 'source-map' : false,
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};
