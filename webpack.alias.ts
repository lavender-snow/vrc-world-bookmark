import path from 'path';

import type { ResolveOptions } from 'webpack';

export const alias: Required<ResolveOptions>['alias'] = {
  src: path.resolve(__dirname, './src'),
  assets: path.resolve(__dirname, './assets'),
  commonComponents: path.resolve(__dirname, './src/react-components/common'),
};
