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
