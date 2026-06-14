import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Build outputs, generated copies, and the vanilla-JS extension (linted by its
    // own `apps/extension` eslint script) are excluded from the root TS lint.
    ignores: [
      "**/dist/**",
      "**/dist-ssr/**",
      "supabase",
      "**/public/chrome_extension/**",
      "apps/extension/**",
      "apps/backup_temp/**",
      "**/*.cjs",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "no-control-regex": "off",
      "@typescript-eslint/no-require-imports": "off",
      // Launch posture: keep these visible as warnings (not CI-blocking). Tighten post-launch.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "no-case-declarations": "warn",
      "no-empty": "warn",
      "prefer-const": "warn",
    },
  },
);
