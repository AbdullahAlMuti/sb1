// ESLint flat config (ESLint 9+).
// Scoped to new code: tests/ + suppliers/
// Legacy directories (common/, content_scripts/, background/, ui/, sidepanel/) are
// intentionally excluded — they will be linted incrementally as they are refactored.

export default [
  {
    files: ['tests/**/*.js', 'suppliers/**/*.js'],
    linterOptions: {
      // Suppress warnings about disable directives inherited from files written
      // before this lint config existed.
      reportUnusedDisableDirectives: 'off',
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals (content script context)
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        // Base64 — available natively in browsers and Node 18+ (we run Node 22)
        btoa: 'readonly',
        atob: 'readonly',
        // Chrome extension API
        chrome: 'readonly',
        // Node.js (test files only)
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      // Correctness
      'no-undef': 'error',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          // catch clause variables: `catch (_)` is a common intentional-ignore pattern
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'eqeqeq': ['error', 'always', { null: 'ignore' }],

      // Modern JS
      'no-var': 'error',
      'prefer-const': 'error',

      // Style (non-conflicting with Prettier)
      'no-console': 'off',
    },
  },
];
