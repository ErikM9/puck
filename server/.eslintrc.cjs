/* ESLint 8 config format, kept as .cjs because the server itself is CommonJS */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parserOptions: { ecmaVersion: 2022 },
  extends: ['eslint:recommended'],
  overrides: [
    {
      /* The tests are ES modules and lean on Vitest's globals, which the linter cannot infer */
      files: ['tests/**/*.js', 'vitest.config.mjs'],
      parserOptions: { sourceType: 'module' },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
  ],
};
