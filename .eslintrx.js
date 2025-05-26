module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
      '@typescript-eslint',
      'prettier'
    ],
    extends: [
      'eslint:recommended',
      '@typescript-eslint/recommended',
      '@typescript-eslint/recommended-requiring-type-checking',
      'prettier'
    ],
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      project: './tsconfig.json',
      tsconfigRootDir: __dirname
    },
    env: {
      node: true,
      browser: true,
      es2020: true,
      jest: true
    },
    rules: {
      // TypeScript 特定規則
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/restrict-template-expressions': 'error',
      
      // 一般規則
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      
      // Prettier 整合
      'prettier/prettier': 'error'
    },
    overrides: [
      {
        // 測試文件寬鬆規則
        files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*'],
        rules: {
          '@typescript-eslint/no-explicit-any': 'off',
          '@typescript-eslint/no-non-null-assertion': 'off',
          '@typescript-eslint/explicit-function-return-type': 'off',
          'no-console': 'off'
        }
      },
      {
        // 範例文件寬鬆規則
        files: ['examples/**/*'],
        rules: {
          '@typescript-eslint/explicit-function-return-type': 'off',
          'no-console': 'off'
        }
      },
      {
        // 工具腳本
        files: ['tools/**/*', '*.config.js'],
        env: {
          node: true
        },
        rules: {
          '@typescript-eslint/no-var-requires': 'off'
        }
      }
    ],
    ignorePatterns: [
      'dist/',
      'coverage/',
      'node_modules/',
      '*.d.ts'
    ]
  };