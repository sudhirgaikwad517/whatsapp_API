// Flat ESLint config (ESLint 9) covering both workspaces. Run from anywhere in
// the monorepo — `eslint src` inside apps/backend or apps/frontend picks this
// up automatically since ESLint's flat config searches upward from cwd.
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.config.js', '**/*.config.ts'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // The codebase has a real, tracked backlog of `any` usage (see the
      // Phase 4 typing cleanup) — warn for now rather than blocking every
      // build, and tighten to 'error' once that backlog is worked down.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['apps/backend/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['apps/frontend/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  eslintConfigPrettier
);
