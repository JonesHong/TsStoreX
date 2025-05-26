#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// 顏色輸出工具
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logStep = (step, message) => {
  log(`\n${step} ${message}`, 'cyan');
};

const logSuccess = (message) => {
  log(`✅ ${message}`, 'green');
};

const logError = (message) => {
  log(`❌ ${message}`, 'red');
};

const logWarning = (message) => {
  log(`⚠️  ${message}`, 'yellow');
};

// 執行命令並記錄時間
const execWithTiming = (command, description) => {
  const startTime = performance.now();
  
  try {
    log(`   執行: ${command}`, 'bright');
    execSync(command, { 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    logSuccess(`${description} 完成 (${duration}s)`);
    return true;
  } catch (error) {
    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    logError(`${description} 失敗 (${duration}s)`);
    console.error(error.stdout || error.message);
    return false;
  }
};

// 檢查檔案大小
const checkBundleSize = (filePath, maxSizeKB) => {
  if (!fs.existsSync(filePath)) {
    logWarning(`檔案不存在: ${filePath}`);
    return false;
  }
  
  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  
  if (stats.size / 1024 > maxSizeKB) {
    logWarning(`${path.basename(filePath)}: ${sizeKB}KB (超過 ${maxSizeKB}KB 限制)`);
    return false;
  } else {
    logSuccess(`${path.basename(filePath)}: ${sizeKB}KB (符合 ${maxSizeKB}KB 限制)`);
    return true;
  }
};

// 生成 package.json 副本到 dist
const generateDistPackageJson = () => {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const distPackageJson = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      keywords: packageJson.keywords,
      author: packageJson.author,
      license: packageJson.license,
      homepage: packageJson.homepage,
      repository: packageJson.repository,
      bugs: packageJson.bugs,
      main: packageJson.main,
      module: packageJson.module,
      types: packageJson.types,
      exports: packageJson.exports,
      files: packageJson.files,
      sideEffects: packageJson.sideEffects,
      engines: packageJson.engines,
      peerDependencies: packageJson.peerDependencies,
      peerDependenciesMeta: packageJson.peerDependenciesMeta,
      optionalDependencies: packageJson.optionalDependencies
    };
    
    fs.writeFileSync(
      path.join('dist', 'package.json'),
      JSON.stringify(distPackageJson, null, 2)
    );
    
    logSuccess('package.json 複製到 dist 目錄');
    return true;
  } catch (error) {
    logError(`生成 dist/package.json 失敗: ${error.message}`);
    return false;
  }
};

// 複製必要文件
const copyRequiredFiles = () => {
  const filesToCopy = ['README.md', 'LICENSE', 'CHANGELOG.md'];
  let success = true;
  
  filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.copyFileSync(file, path.join('dist', file));
        logSuccess(`${file} 複製完成`);
      } catch (error) {
        logWarning(`複製 ${file} 失敗: ${error.message}`);
        success = false;
      }
    } else {
      logWarning(`檔案不存在: ${file}`);
    }
  });
  
  return success;
};

// 主要構建流程
const main = async () => {
  const totalStartTime = performance.now();
  
  log('🏗️  開始構建 TsStoreX...', 'bright');
  
  // 1. 清理 dist 目錄
  logStep('1.', '清理 dist 目錄');
  if (!execWithTiming('npm run clean', '清理目錄')) {
    process.exit(1);
  }
  
  // 2. 型別檢查
  logStep('2.', 'TypeScript 型別檢查');
  if (!execWithTiming('npm run type-check', '型別檢查')) {
    process.exit(1);
  }
  
  // 3. ESLint 檢查
  logStep('3.', 'ESLint 程式碼檢查');
  if (!execWithTiming('npm run lint', '程式碼檢查')) {
    logWarning('ESLint 檢查有警告，但繼續構建...');
  }
  
  // 4. 構建 TypeScript 型別定義
  logStep('4.', '構建 TypeScript 型別定義');
  if (!execWithTiming('npm run build:types', '型別定義構建')) {
    process.exit(1);
  }
  
  // 5. 構建 Bundle
  logStep('5.', '構建 JavaScript Bundle');
  if (!execWithTiming('npm run build:bundle', 'Bundle 構建')) {
    process.exit(1);
  }
  
  // 6. 檢查 Bundle 大小
  logStep('6.', '檢查 Bundle 大小');
  const sizeChecks = [
    checkBundleSize('dist/index.mjs', 15), // 主包 < 15KB
    checkBundleSize('dist/core/index.mjs', 8), // 核心 < 8KB
    checkBundleSize('dist/signals/index.mjs', 3), // Signal < 3KB
    checkBundleSize('dist/entity/index.mjs', 5), // Entity < 5KB
    checkBundleSize('dist/effects/index.mjs', 4), // Effects < 4KB
  ];
  
  if (sizeChecks.some(check => !check)) {
    logWarning('部分 Bundle 超過大小限制，請考慮優化');
  }
  
  // 7. 生成 dist 用 package.json
  logStep('7.', '生成發布用 package.json');
  generateDistPackageJson();
  
  // 8. 複製必要文件
  logStep('8.', '複製必要文件');
  copyRequiredFiles();
  
  // 9. 驗證構建結果
  logStep('9.', '驗證構建結果');
  const requiredFiles = [
    'dist/index.js',
    'dist/index.mjs',
    'dist/index.d.ts',
    'dist/package.json'
  ];
  
  let allFilesExist = true;
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      logSuccess(`${file} ✓`);
    } else {
      logError(`${file} ✗`);
      allFilesExist = false;
    }
  });
  
  if (!allFilesExist) {
    logError('構建驗證失敗，缺少必要文件');
    process.exit(1);
  }
  
  // 構建完成
  const totalDuration = ((performance.now() - totalStartTime) / 1000).toFixed(2);
  log(`\n🎉 構建完成！總耗時: ${totalDuration}s`, 'green');
  
  // 顯示構建統計
  logStep('📊', '構建統計');
  try {
    const distFiles = fs.readdirSync('dist', { recursive: true });
    log(`   生成文件數量: ${distFiles.length}`, 'blue');
    
    const totalSize = distFiles
      .map(file => {
        const fullPath = path.join('dist', file);
        return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile() 
          ? fs.statSync(fullPath).size 
          : 0;
      })
      .reduce((sum, size) => sum + size, 0);
    
    log(`   總大小: ${(totalSize / 1024).toFixed(2)}KB`, 'blue');
  } catch (error) {
    logWarning(`無法計算構建統計: ${error.message}`);
  }
  
  log('\n準備發布到 NPM? 執行: npm run release', 'cyan');
};

// 錯誤處理
process.on('uncaughtException', (error) => {
  logError(`未捕獲的異常: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logError(`未處理的 Promise 拒絕: ${reason}`);
  process.exit(1);
});

// 執行構建
main().catch(error => {
  logError(`構建失敗: ${error.message}`);
  process.exit(1);
});