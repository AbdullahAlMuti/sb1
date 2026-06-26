// ESLint flat config (ESLint 9+).
// Scoped to new code: tests/ + suppliers/
// Legacy directories (common/, content_scripts/, background/, ui/, sidepanel/) are
// intentionally excluded — they will be linted incrementally as they are refactored.

export default [
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        chrome: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
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
