import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fixupConfigRules } from '@eslint/compat';
import { defineConfig, globalIgnores } from '@eslint/config-helpers';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([{
  extends: fixupConfigRules(compat.extends(
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/electron',
    'plugin:import/typescript',
  )),

  plugins: {
    '@stylistic': stylistic,
  },

  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.node,
    },
  },

  ignores: ['node_modules/**', 'out/**', '.webpack/**'],

  rules: {
    '@stylistic/semi': ['error', 'always'],
    '@stylistic/indent': ['error', 2],
    '@stylistic/comma-dangle': ['error', 'always-multiline'],
    '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
    'import/order': ['error', {
      'newlines-between': 'always',
      alphabetize: { order: 'asc', caseInsensitive: true },
    }],
  },
}, globalIgnores([
  '.webpack/**',
])]);
