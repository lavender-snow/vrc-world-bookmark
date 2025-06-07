import { defineConfig } from "@eslint/config-helpers";
import { fixupConfigRules } from "@eslint/compat";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import stylistic from '@stylistic/eslint-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default defineConfig([{
  extends: fixupConfigRules(compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/electron",
    "plugin:import/typescript",
  )),

  plugins: {
    "@stylistic": stylistic
  },

  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.node,
    },
  },

  ignores: ["node_modules/**", "out/**", ".webpack/**"],

  rules: {
    "@stylistic/semi": ["error", "always"],
    "@stylistic/indent": ["error", 2],
  }
}]);
