/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // 基本設定
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // 測試文件查找
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/?(*.)+(spec|test).{ts,tsx}'
  ],

  // TypeScript 轉換 - 更新語法
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      isolatedModules: true
    }]
  },

  // 模組解析
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/core/(.*)$': '<rootDir>/src/core/$1',
    '^@/signals/(.*)$': '<rootDir>/src/signals/$1',
    '^@/entity/(.*)$': '<rootDir>/src/entity/$1',
    '^@/effects/(.*)$': '<rootDir>/src/effects/$1',
    '^@/middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1'
  },

  // 模組文件擴展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // 覆蓋率設定
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],

  // 測試環境設定
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],

  // 移除過時的 globals 設定
  // globals: {
  //   'ts-jest': {
  //     isolatedModules: true,
  //     tsconfig: 'tsconfig.test.json'
  //   }
  // },

  // 測試超時
  testTimeout: 10000,

  // 監視模式設定
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],

  // 清理模擬
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // 詳細輸出
  verbose: true,

  // 並行測試
  maxWorkers: '50%',

  // 錯誤處理
  errorOnDeprecated: true,

  // 自定義環境
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },

  // 特殊文件處理
  projects: [
    // 主要測試項目 (jsdom 環境)
    {
      displayName: 'dom',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/**/*.test.{ts,tsx}',
        '<rootDir>/tests/unit/**/*.test.{ts,tsx}',
        '<rootDir>/tests/integration/**/*.test.{ts,tsx}'
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json'
        }]
      }
    },

    // Node.js 環境測試
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/node/**/*.test.{ts,tsx}'
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup-node.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json'
        }]
      }
    }
  ]
};