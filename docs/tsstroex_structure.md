# TsStoreX - 完整檔案架構

## 📁 檔案結構

```
TsStoreX/
├── 📁 src/                           # 源碼目錄
│   ├── 📁 core/                      # 核心模組
│   │   ├── 📄 index.ts               # 核心模組導出
│   │   ├── 📄 store.ts               # Store 實現
│   │   ├── 📄 action.ts              # Action 系統
│   │   ├── 📄 reducer.ts             # Reducer 系統
│   │   ├── 📄 middleware.ts          # 中間件系統
│   │   └── 📄 types.ts               # 核心型別定義
│   │
│   ├── 📁 signals/                   # Signal 投影系統
│   │   ├── 📄 index.ts               # Signal 模組導出
│   │   ├── 📄 projector.ts           # Signal 投影器
│   │   ├── 📄 selectors.ts           # Signal Selectors
│   │   └── 📄 types.ts               # Signal 型別定義
│   │
│   ├── 📁 entity/                    # Entity Adapter
│   │   ├── 📄 index.ts               # Entity 模組導出
│   │   ├── 📄 adapter.ts             # Entity Adapter 實現
│   │   ├── 📄 selectors.ts           # Entity Selectors
│   │   └── 📄 types.ts               # Entity 型別定義
│   │
│   ├── 📁 effects/                   # Effects 系統
│   │   ├── 📄 index.ts               # Effects 模組導出
│   │   ├── 📄 manager.ts             # Effect Manager
│   │   ├── 📄 operators.ts           # 自定義 RxJS 操作符
│   │   └── 📄 types.ts               # Effects 型別定義
│   │
│   ├── 📁 selectors/                 # Selector 系統
│   │   ├── 📄 index.ts               # Selectors 模組導出
│   │   ├── 📄 memoized.ts            # 記憶化 Selectors
│   │   ├── 📄 utils.ts               # Selector 工具函數
│   │   └── 📄 types.ts               # Selector 型別定義
│   │
│   ├── 📁 middlewares/               # 內建中間件
│   │   ├── 📄 index.ts               # 中間件模組導出
│   │   ├── 📄 logger.ts              # Logger 中間件
│   │   ├── 📄 error.ts               # 錯誤處理中間件
│   │   ├── 📄 performance.ts         # 性能監控中間件
│   │   └── 📄 persistence.ts         # 持久化中間件
│   │
│   ├── 📁 utils/                     # 工具函數
│   │   ├── 📄 index.ts               # 工具模組導出
│   │   ├── 📄 environment.ts         # 環境檢測
│   │   ├── 📄 logger.ts              # Logger 工具
│   │   └── 📄 compose.ts             # 函數組合工具
│   │
│   ├── 📄 index.ts                   # 主要導出文件
│   └── 📄 public-api.ts              # 公共 API 導出
│
├── 📁 dist/                          # 編譯輸出目錄
│   ├── 📄 index.js                   # CJS 版本
│   ├── 📄 index.mjs                  # ESM 版本
│   ├── 📄 index.d.ts                 # TypeScript 聲明文件
│   ├── 📄 index.umd.js               # UMD 版本（瀏覽器）
│   └── 📁 types/                     # 詳細型別聲明
│
├── 📁 examples/                      # 使用範例
│   ├── 📁 basic/                     # 基礎範例
│   ├── 📁 entity/                    # Entity 範例
│   ├── 📁 effects/                   # Effects 範例
│   ├── 📁 signals/                   # Signal 範例
│   └── 📁 ssr/                       # SSR 範例
│
├── 📁 docs/                          # 文檔
│   ├── 📄 README.md                  # 主要文檔
│   ├── 📄 GETTING_STARTED.md         # 快速開始
│   ├── 📄 API.md                     # API 文檔
│   ├── 📄 MIGRATION.md               # 遷移指南
│   └── 📄 BEST_PRACTICES.md          # 最佳實踐
│
├── 📁 tests/                         # 測試文件
│   ├── 📁 unit/                      # 單元測試
│   ├── 📁 integration/               # 整合測試
│   └── 📄 setup.ts                   # 測試設置
│
├── 📁 tools/                         # 構建工具
│   ├── 📄 build.js                   # 構建腳本
│   ├── 📄 bundle.config.js           # Bundle 配置
│   └── 📄 release.js                 # 發布腳本
│
├── 📄 package.json                   # NPM 配置
├── 📄 tsconfig.json                  # TypeScript 配置
├── 📄 tsconfig.build.json            # 構建專用 TS 配置
├── 📄 rollup.config.js               # Rollup 配置
├── 📄 jest.config.js                 # Jest 測試配置
├── 📄 .gitignore                     # Git 忽略文件
├── 📄 .npmignore                     # NPM 忽略文件
├── 📄 LICENSE                        # 授權文件
└── 📄 README.md                      # 項目說明
```

## 📦 package.json

```json
{
  "name": "@TsStoreXx",
  "version": "0.0.1",
  "description": "A modern state management library with RxJS core and Signal projections",
  "keywords": [
    "state-management",
    "rxjs",
    "signals",
    "solidjs",
    "typescript",
    "reactive",
    "ngrx-like"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "homepage": "https://github.com/TsStoreXx#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/TsStoreXx.git"
  },
  "bugs": {
    "url": "https://github.com/TsStoreXx/issues"
  },
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./core": {
      "import": "./dist/core/index.mjs",
      "require": "./dist/core/index.js",
      "types": "./dist/core/index.d.ts"
    },
    "./signals": {
      "import": "./dist/signals/index.mjs",
      "require": "./dist/signals/index.js",
      "types": "./dist/signals/index.d.ts"
    },
    "./entity": {
      "import": "./dist/entity/index.mjs",
      "require": "./dist/entity/index.js",
      "types": "./dist/entity/index.d.ts"
    },
    "./effects": {
      "import": "./dist/effects/index.mjs",
      "require": "./dist/effects/index.js",
      "types": "./dist/effects/index.d.ts"
    },
    "./middlewares": {
      "import": "./dist/middlewares/index.mjs",
      "require": "./dist/middlewares/index.js",
      "types": "./dist/middlewares/index.d.ts"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "sideEffects": false,
  "engines": {
    "node": ">=16.0.0"
  },
  "scripts": {
    "build": "npm run clean && npm run build:types && npm run build:bundle",
    "build:types": "tsc -p tsconfig.build.json",
    "build:bundle": "rollup -c",
    "clean": "rimraf dist",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "prepublishOnly": "npm run test && npm run build",
    "release": "node tools/release.js",
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs"
  },
  "peerDependencies": {
    "rxjs": ">=7.0.0",
    "immer": ">=9.0.0"
  },
  "optionalDependencies": {
    "solid-js": ">=1.6.0"
  },
  "devDependencies": {
    "@rollup/plugin-node-resolve": "^15.0.0",
    "@rollup/plugin-typescript": "^11.0.0",
    "@types/jest": "^29.0.0",
    "@types/node": "^18.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "eslint-config-prettier": "^8.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "immer": "^10.0.0",
    "jest": "^29.0.0",
    "prettier": "^3.0.0",
    "rimraf": "^5.0.0",
    "rollup": "^3.0.0",
    "rollup-plugin-dts": "^6.0.0",
    "rollup-plugin-terser": "^7.0.0",
    "rxjs": "^7.8.0",
    "solid-js": "^1.8.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 🔧 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests", "examples"]
}
```

## 🔧 tsconfig.build.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": true
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts", "src/**/*.spec.ts"]
}
```

## 📦 rollup.config.js

```javascript
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import dts from 'rollup-plugin-dts';

const external = ['rxjs', 'immer', 'solid-js'];

const createConfig = (input, output, format) => ({
  input,
  output: {
    file: output,
    format,
    sourcemap: true,
    ...(format === 'umd' && {
      name: 'RxjsStateManager',
      globals: {
        'rxjs': 'rxjs',
        'immer': 'immer',
        'solid-js': 'SolidJS'
      }
    })
  },
  external,
  plugins: [
    nodeResolve({
      preferBuiltins: true
    }),
    typescript({
      tsconfig: './tsconfig.build.json',
      declaration: false,
      declarationMap: false
    }),
    terser({
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    })
  ]
});

export default [
  // Main bundle - ESM
  createConfig('src/index.ts', 'dist/index.mjs', 'es'),
  
  // Main bundle - CJS
  createConfig('src/index.ts', 'dist/index.js', 'cjs'),
  
  // Main bundle - UMD (browser)
  createConfig('src/index.ts', 'dist/index.umd.js', 'umd'),
  
  // Core module
  createConfig('src/core/index.ts', 'dist/core/index.mjs', 'es'),
  createConfig('src/core/index.ts', 'dist/core/index.js', 'cjs'),
  
  // Signals module
  createConfig('src/signals/index.ts', 'dist/signals/index.mjs', 'es'),
  createConfig('src/signals/index.ts', 'dist/signals/index.js', 'cjs'),
  
  // Entity module
  createConfig('src/entity/index.ts', 'dist/entity/index.mjs', 'es'),
  createConfig('src/entity/index.ts', 'dist/entity/index.js', 'cjs'),
  
  // Effects module
  createConfig('src/effects/index.ts', 'dist/effects/index.mjs', 'es'),
  createConfig('src/effects/index.ts', 'dist/effects/index.js', 'cjs'),
  
  // Middlewares module
  createConfig('src/middlewares/index.ts', 'dist/middlewares/index.mjs', 'es'),
  createConfig('src/middlewares/index.ts', 'dist/middlewares/index.js', 'cjs'),
  
  // Type definitions
  {
    input: 'dist/index.d.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins: [dts()],
    external
  }
];
```

## 🧪 jest.config.js

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

## 📄 .gitignore

```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Coverage
coverage/
*.lcov

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Runtime
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Temporary
tmp/
temp/
```

## 📄 .npmignore

```gitignore
# Source code
src/
tests/
examples/
docs/
tools/

# Config files
tsconfig*.json
rollup.config.js
jest.config.js
.eslintrc*
.prettierrc*

# Development
.vscode/
.idea/
*.log
coverage/
.nyc_output/

# CI/CD
.github/
.gitlab-ci.yml
.travis.yml

# Others
*.test.ts
*.spec.ts
*.map
```

## 📄 主要導出文件 (src/index.ts)

```typescript
// Core exports
export * from './core';

// Signal exports (browser only)
export * from './signals';

// Entity exports
export * from './entity';

// Effects exports
export * from './effects';

// Selector exports
export * from './selectors';

// Middleware exports
export * from './middlewares';

// Utility exports
export * from './utils';

// Version info
export const VERSION = '0.0.1';
```

## 📄 公共 API (src/public-api.ts)

```typescript
// 主要 API 導出，確保向後相容性
export {
  // Core
  Store,
  createAction,
  createActionGroup,
  createReducer,
  combineReducers,
  on,
  
  // Entity
  createEntityAdapter,
  
  // Effects
  createEffect,
  
  // Selectors
  createSelector,
  createMemoizedSelector,
  useSelector,
  
  // Middlewares
  createLoggerMiddleware,
  createErrorMiddleware,
  createPerformanceMiddleware,
  
  // Types
  type Action,
  type ActionCreator,
  type Reducer,
  type Middleware,
  type EntityState,
  type SignalSelector
} from './index';
```

## 📄 README.md

```markdown
# @TsStoreXx

A modern, type-safe state management library with RxJS core and Signal projections for optimal performance across all environments.

## ✨ Features

- 🚀 **RxJS Core**: Unified reactive state management
- ⚡ **Signal Projections**: Browser optimization with SolidJS Signals
- 🔄 **Universal**: Works in Browser, Node.js, and Web Workers
- 📦 **Entity Management**: Built-in CRUD operations
- 🎯 **Type Safe**: Full TypeScript support
- 🧪 **SSR Friendly**: Graceful degradation for server-side rendering
- 🔧 **Immer Integration**: Intuitive state updates

## 📦 Installation

```bash
npm install @TsStoreXx rxjs immer
# Optional: for Signal projections
npm install solid-js
```

## 🚀 Quick Start

```typescript
import { Store, createAction, createReducer, on } from '@TsStoreXx';

// Define actions
const increment = createAction('increment');
const decrement = createAction('decrement');

// Create reducer
const counterReducer = createReducer(
  0,
  on(increment, (state) => state + 1),
  on(decrement, (state) => state - 1)
);

// Create store
const store = Store.create(counterReducer, 0);

// Use in browser with Signals
const count = store.select(state => state);
console.log(count()); // Current value

// Use with RxJS everywhere
store.state$.subscribe(state => console.log('State:', state));

// Dispatch actions
store.dispatch(increment());
store.dispatch(decrement());
```

## 📚 Documentation

- [Getting Started](./docs/GETTING_STARTED.md)
- [API Reference](./docs/API.md)
- [Best Practices](./docs/BEST_PRACTICES.md)
- [Migration Guide](./docs/MIGRATION.md)

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © [Your Name]
```

## 📄 LICENSE

```
MIT License

Copyright (c) 2024 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🛠️ 構建腳本 (tools/build.js)

```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Building RxJS State Manager...');

// Clean dist directory
console.log('🧹 Cleaning dist directory...');
execSync('npm run clean', { stdio: 'inherit' });

// Build TypeScript declarations
console.log('📝 Building TypeScript declarations...');
execSync('npm run build:types', { stdio: 'inherit' });

// Build bundles
console.log('📦 Building bundles...');
execSync('npm run build:bundle', { stdio: 'inherit' });

// Copy package.json metadata
console.log('📋 Copying metadata...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const distPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  main: packageJson.main,
  module: packageJson.module,
  types: packageJson.types,
  exports: packageJson.exports,
  peerDependencies: packageJson.peerDependencies,
  optionalDependencies: packageJson.optionalDependencies
};

fs.writeFileSync(
  path.join('dist', 'package.json'),
  JSON.stringify(distPackageJson, null, 2)
);

console.log('✅ Build completed successfully!');
```

這個完整的檔案架構設計包含了：

1. **模組化設計** - 每個功能都有獨立的模組
2. **多格式支援** - ESM、CJS、UMD 三種格式
3. **TypeScript 完全支援** - 完整的型別聲明
4. **樹搖優化** - 支援 tree-shaking
5. **多環境支援** - Browser、Node.js、WebWorker
6. **文檔完整** - 包含使用範例和 API 文檔
7. **測試覆蓋** - Jest 測試配置
8. **CI/CD 就緒** - 自動化構建和發布

你覺得這個檔案架構如何？需要調整哪些部分？