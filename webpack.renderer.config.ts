import path from 'path';

import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import type { Configuration } from 'webpack';

import { alias } from './webpack.alias';
import { plugins } from './webpack.plugins';
import { rules } from './webpack.rules';

rules.push(
  {
    test: /\.(scss|css)$/,
    use: [
      {
        loader: MiniCssExtractPlugin.loader,
      },
      {
        loader: 'css-loader',
        options: {
          modules: {
            localIdentName: '[name]__[local]__[hash:base64:5]',
            exportLocalsConvention: 'camelCase',
            mode: 'global',
          },
        },
      },
      {
        loader: 'sass-loader',
        options: {
          sassOptions: {
            includePaths: [path.resolve(__dirname, 'assets')],
          },
        },
      },
    ],
  },{
    test: /\.svg$/,
    use: [
      {
        loader: '@svgr/webpack',
        options: {
          titleProp: true,
          replaceAttrValues: { '#000': 'currentColor' },
          exportType: 'named',
          svgo: true,
          svgoConfig: {
            plugins: [
              {
                name: 'preset-default',
                params: {
                  overrides: {
                    removeViewBox: false,
                    mergePaths: false,
                    convertShapeToPath: false,
                    removeHiddenElems: false,
                  },
                },
              },
            ],
          },
        },
      },
    ],
  },
);

plugins.push(
  new MiniCssExtractPlugin({
    filename: 'assets/styles/index-[name].css',
  }),
);

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  devtool: process.env.NODE_ENV === 'development' ? 'source-map' : false,
  plugins,
  resolve: {
    alias,
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};
