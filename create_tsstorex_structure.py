#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TsStoreX 檔案結構創建腳本
自動創建完整的專案目錄結構和空檔案
"""

import os
import sys
from pathlib import Path

# 專案根目錄
PROJECT_ROOT = "."

# 檔案結構定義
FILE_STRUCTURE = {
    # 源碼目錄
    "src/core": [
        "index.ts",      # 核心模組導出
        "store.ts",      # Store 實現
        "action.ts",     # Action 系統
        "reducer.ts",    # Reducer 系統
        "middleware.ts", # 中間件系統
        "types.ts"       # 核心型別定義
    ],
    
    "src/signals": [
        "index.ts",      # Signal 模組導出
        "projector.ts",  # Signal 投影器
        "selectors.ts",  # Signal Selectors
        "types.ts"       # Signal 型別定義
    ],
    
    "src/entity": [
        "index.ts",      # Entity 模組導出
        "adapter.ts",    # Entity Adapter 實現
        "selectors.ts",  # Entity Selectors
        "types.ts"       # Entity 型別定義
    ],
    
    "src/effects": [
        "index.ts",      # Effects 模組導出
        "manager.ts",    # Effect Manager
        "operators.ts",  # 自定義 RxJS 操作符
        "types.ts"       # Effects 型別定義
    ],
    
    "src/selectors": [
        "index.ts",      # Selectors 模組導出
        "memoized.ts",   # 記憶化 Selectors
        "utils.ts",      # Selector 工具函數
        "types.ts"       # Selector 型別定義
    ],
    
    "src/middlewares": [
        "index.ts",      # 中間件模組導出
        "logger.ts",     # Logger 中間件
        "error.ts",      # 錯誤處理中間件
        "performance.ts", # 性能監控中間件
        "persistence.ts" # 持久化中間件
    ],
    
    "src/utils": [
        "index.ts",      # 工具模組導出
        "environment.ts", # 環境檢測
        "logger.ts",     # Logger 工具
        "compose.ts"     # 函數組合工具
    ],
    
    "src": [
        "index.ts",      # 主要導出文件
        "public-api.ts"  # 公共 API 導出
    ],
    
    # 編譯輸出目錄
    "dist": [
        "index.js",      # CJS 版本
        "index.mjs",     # ESM 版本
        "index.d.ts",    # TypeScript 聲明文件
        "index.umd.js"   # UMD 版本（瀏覽器）
    ],
    
    "dist/types": [],    # 詳細型別聲明（空目錄）
    
    # 使用範例
    "examples/basic": [],    # 基礎範例
    "examples/entity": [],   # Entity 範例
    "examples/effects": [],  # Effects 範例
    "examples/signals": [],  # Signal 範例
    "examples/ssr": [],      # SSR 範例
    
    # 文檔
    "docs": [
        "README.md",         # 主要文檔
        "GETTING_STARTED.md", # 快速開始
        "API.md",            # API 文檔
        "MIGRATION.md",      # 遷移指南
        "BEST_PRACTICES.md"  # 最佳實踐
    ],
    
    # 測試文件
    "tests/unit": [],        # 單元測試
    "tests/integration": [], # 整合測試
    "tests": [
        "setup.ts"          # 測試設置
    ],
    
    # 構建工具
    "tools": [
        "build.js",          # 構建腳本
        "bundle.config.js",  # Bundle 配置
        "release.js"         # 發布腳本
    ],
    
    # 根目錄檔案
    ".": [
        "package.json",      # NPM 配置
        "tsconfig.json",     # TypeScript 配置
        "tsconfig.build.json", # 構建專用 TS 配置
        "rollup.config.js",  # Rollup 配置
        "jest.config.js",    # Jest 測試配置
        ".gitignore",        # Git 忽略文件
        ".npmignore",        # NPM 忽略文件
        "LICENSE",           # 授權文件
        "README.md"          # 項目說明
    ]
}

# 檔案初始內容模板
FILE_TEMPLATES = {
    # TypeScript 檔案模板
    "*.ts": """// TODO: 實現此模組
export {};
""",
    
    # Index 檔案模板
    "index.ts": """// TODO: 導出此模組的公共 API
export * from './types';
""",
    
    # Types 檔案模板
    "types.ts": """// TODO: 定義此模組的型別
export interface TODO_Type {
  // 待實現
}
""",
    
    # JavaScript 配置檔案
    "*.js": """// TODO: 配置此工具
module.exports = {
  // 待實現
};
""",
    
    # JSON 檔案
    "*.json": """{
  "TODO": "待實現"
}
""",
    
    # Markdown 檔案
    "*.md": """# TODO: 編寫文檔

待實現的內容...
""",
    
    # 特殊檔案
    ".gitignore": """# 依賴項
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 構建輸出
dist/
build/
*.tsbuildinfo

# 測試覆蓋率
coverage/
*.lcov

# IDE
.vscode/
.idea/
*.swp
*.swo

# 系統檔案
.DS_Store
Thumbs.db

# 日誌
logs/
*.log

# 環境變數
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# 臨時檔案
tmp/
temp/
""",
    
    ".npmignore": """# 源碼
src/
tests/
examples/
docs/
tools/

# 配置檔案
tsconfig*.json
rollup.config.js
jest.config.ts
.eslintrc*
.prettierrc*

# 開發檔案
.vscode/
.idea/
*.log
coverage/
.nyc_output/

# CI/CD
.github/
.gitlab-ci.yml
.travis.yml

# 其他
*.test.ts
*.spec.ts
*.map
""",
    
    "LICENSE": """MIT License

Copyright (c) 2024 TsStoreX

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
"""
}

def get_file_content(file_path: str, file_name: str) -> str:
    """
    根據檔案類型和名稱獲取初始內容
    """
    # 檢查是否有特定檔案的模板
    if file_name in FILE_TEMPLATES:
        return FILE_TEMPLATES[file_name]
    
    # 檢查檔案擴展名模板
    if file_name.endswith('.ts'):
        if file_name == 'index.ts':
            return FILE_TEMPLATES["index.ts"]
        elif file_name == 'types.ts':
            return FILE_TEMPLATES["types.ts"]
        else:
            return FILE_TEMPLATES["*.ts"]
    elif file_name.endswith('.js'):
        return FILE_TEMPLATES["*.js"]
    elif file_name.endswith('.json'):
        return FILE_TEMPLATES["*.json"]
    elif file_name.endswith('.md'):
        return FILE_TEMPLATES["*.md"]
    
    # 預設空內容
    return ""

def create_directory(dir_path: Path) -> None:
    """
    創建目錄（如果不存在）
    """
    if not dir_path.exists():
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f"✅ 創建目錄: {dir_path}")
    else:
        print(f"⏭️  目錄已存在: {dir_path}")

def create_file(file_path: Path, content: str = "") -> None:
    """
    創建檔案（如果不存在）
    """
    if not file_path.exists():
        # 確保父目錄存在
        create_directory(file_path.parent)
        
        # 創建檔案
        file_path.write_text(content, encoding='utf-8')
        print(f"✅ 創建檔案: {file_path}")
    else:
        print(f"⏭️  檔案已存在: {file_path}")

def main():
    """
    主函數：創建完整的專案結構
    """
    print("🚀 開始創建 TsStoreX 專案結構...")
    print("=" * 50)
    
    # 設定專案根目錄
    project_root = Path(PROJECT_ROOT)
    
    try:
        # 創建專案根目錄
        create_directory(project_root)
        
        # 遍歷檔案結構定義
        for dir_path, files in FILE_STRUCTURE.items():
            # 解析目錄路徑
            if dir_path == ".":
                current_dir = project_root
            else:
                current_dir = project_root / dir_path
            
            # 創建目錄
            create_directory(current_dir)
            
            # 創建檔案
            for file_name in files:
                file_path = current_dir / file_name
                content = get_file_content(str(current_dir), file_name)
                create_file(file_path, content)
        
        print("=" * 50)
        print("🎉 TsStoreX 專案結構創建完成！")
        print(f"📁 專案根目錄: {project_root.resolve()}")
        
        # 顯示下一步提示
        print("\n📋 接下來你可以：")
        print(f"   1. cd {PROJECT_ROOT}")
        print("   2. npm init (如果需要重新配置 package.json)")
        print("   3. npm install")
        print("   4. 開始實現各個模組！")
        
    except Exception as e:
        print(f"❌ 創建過程中發生錯誤: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
