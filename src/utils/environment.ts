/**
 * 環境檢測系統
 * 
 * 提供跨環境的統一檢測機制，支援：
 * - Browser (瀏覽器)
 * - Node.js (服務端)
 * - WebWorker (Web Worker)
 * - Unknown (未知環境)
 */

// ===== 環境類型定義 =====

/**
 * 支援的環境類型
 */
export type Environment = 'browser' | 'node' | 'webworker' | 'unknown';

/**
 * 環境檢測結果
 */
export interface EnvironmentInfo {
  /** 環境類型 */
  type: Environment;
  /** 是否為瀏覽器環境 */
  isBrowser: boolean;
  /** 是否為服務端環境 */
  isServer: boolean;
  /** 是否為 Web Worker 環境 */
  isWebWorker: boolean;
  /** 是否支援 DOM */
  supportsDom: boolean;
  /** 是否支援 Web APIs */
  supportsWebApis: boolean;
  /** 是否支援 Node.js APIs */
  supportsNodeApis: boolean;
  /** 用戶代理字串 (瀏覽器專用) */
  userAgent?: string;
  /** Node.js 版本 (Node.js 專用) */
  nodeVersion?: string;
  /** 平台資訊 */
  platform?: string;
}

/**
 * 環境特性檢測
 */
export interface EnvironmentCapabilities {
  /** 是否支援 localStorage */
  hasLocalStorage: boolean;
  /** 是否支援 sessionStorage */
  hasSessionStorage: boolean;
  /** 是否支援 IndexedDB */
  hasIndexedDB: boolean;
  /** 是否支援 Web Workers */
  hasWebWorkers: boolean;
  /** 是否支援 Service Workers */
  hasServiceWorkers: boolean;
  /** 是否支援 WebSockets */
  hasWebSockets: boolean;
  /** 是否支援 Fetch API */
  hasFetch: boolean;
  /** 是否支援 Crypto API */
  hasCrypto: boolean;
  /** 是否支援 Performance API */
  hasPerformance: boolean;
  /** 是否支援 Promises */
  hasPromises: boolean;
  /** 是否支援 ES6 模組 */
  hasESModules: boolean;
}

// ===== 核心檢測邏輯 =====

/**
 * 檢測當前執行環境
 * 
 * 檢測順序：
 * 1. Web Worker (importScripts 存在)
 * 2. Node.js (process.versions.node 存在)
 * 3. Browser (window 和 document 存在)
 * 4. Unknown (無法識別)
 */
export const detectEnvironment = (): Environment => {
  try {
    // Web Worker 檢測 - 優先檢測因為 Worker 中也可能有部分瀏覽器 API
    if (
      typeof self !== 'undefined' && 
      typeof importScripts === 'function' &&
      typeof WorkerGlobalScope !== 'undefined'
    ) {
      return 'webworker';
    }

    // Node.js 檢測 - 檢查 process 物件和 Node.js 版本
    if (
      typeof process !== 'undefined' && 
      process.versions && 
      typeof process.versions.node === 'string'
    ) {
      return 'node';
    }

    // 瀏覽器檢測 - window 和 document 同時存在
    if (
      typeof window !== 'undefined' && 
      typeof document !== 'undefined' &&
      typeof window.document === 'object'
    ) {
      return 'browser';
    }

    // 無法識別的環境
    return 'unknown';
  } catch (error) {
    // 在嚴格環境下，訪問未定義的全域變數可能拋出錯誤
    return 'unknown';
  }
};

/**
 * 檢測環境特性
 */
export const detectEnvironmentCapabilities = (): EnvironmentCapabilities => {
  const capabilities: EnvironmentCapabilities = {
    hasLocalStorage: false,
    hasSessionStorage: false,
    hasIndexedDB: false,
    hasWebWorkers: false,
    hasServiceWorkers: false,
    hasWebSockets: false,
    hasFetch: false,
    hasCrypto: false,
    hasPerformance: false,
    hasPromises: false,
    hasESModules: false,
  };

  try {
    // Promise 支援檢測
    capabilities.hasPromises = typeof Promise === 'function';

    // ES6 模組支援檢測
    capabilities.hasESModules = typeof import.meta === 'object';

    // 根據環境類型檢測特定功能
    const envType = detectEnvironment();

    if (envType === 'browser' || envType === 'webworker') {
      // 瀏覽器和 Web Worker 共用的 API
      capabilities.hasFetch = typeof fetch === 'function';
      capabilities.hasCrypto = typeof crypto === 'object' && typeof crypto.randomUUID === 'function';
      capabilities.hasPerformance = typeof performance === 'object' && typeof performance.now === 'function';
      capabilities.hasWebSockets = typeof WebSocket === 'function';

      if (envType === 'browser') {
        // 瀏覽器專用 API
        capabilities.hasLocalStorage = typeof localStorage === 'object';
        capabilities.hasSessionStorage = typeof sessionStorage === 'object';
        capabilities.hasIndexedDB = typeof indexedDB === 'object';
        capabilities.hasWebWorkers = typeof Worker === 'function';
        capabilities.hasServiceWorkers = 'serviceWorker' in navigator;
      }
    } else if (envType === 'node') {
      // Node.js 環境檢測
      capabilities.hasCrypto = typeof require === 'function' && !!tryRequire('crypto');
      capabilities.hasPerformance = typeof performance === 'object' || !!tryRequire('perf_hooks');
      capabilities.hasFetch = typeof fetch === 'function' || !!tryRequire('node-fetch');
    }
  } catch (error) {
    // 忽略檢測錯誤，保持預設值
  }

  return capabilities;
};

/**
 * 獲取完整環境資訊
 */
export const getEnvironmentInfo = (): EnvironmentInfo => {
  const type = detectEnvironment();
  const capabilities = detectEnvironmentCapabilities();

  const info: EnvironmentInfo = {
    type,
    isBrowser: type === 'browser',
    isServer: type === 'node',
    isWebWorker: type === 'webworker',
    supportsDom: type === 'browser',
    supportsWebApis: type === 'browser' || type === 'webworker',
    supportsNodeApis: type === 'node',
  };

  // 瀏覽器特定資訊
  if (type === 'browser') {
    try {
      info.userAgent = navigator.userAgent;
      info.platform = navigator.platform;
    } catch (error) {
      // 忽略錯誤
    }
  }

  // Node.js 特定資訊
  if (type === 'node') {
    try {
      info.nodeVersion = process.versions.node;
      info.platform = process.platform;
    } catch (error) {
      // 忽略錯誤
    }
  }

  return info;
};

// ===== 便利函數 =====

/**
 * 檢查是否為瀏覽器環境
 */
export const isBrowser = (): boolean => {
  return detectEnvironment() === 'browser';
};

/**
 * 檢查是否為服務端環境 (Node.js)
 */
export const isServer = (): boolean => {
  return detectEnvironment() === 'node';
};

/**
 * 檢查是否為 Web Worker 環境
 */
export const isWebWorker = (): boolean => {
  return detectEnvironment() === 'webworker';
};

/**
 * 檢查是否支援 DOM 操作
 */
export const supportsDom = (): boolean => {
  return isBrowser();
};

/**
 * 檢查是否支援 Web APIs
 */
export const supportsWebApis = (): boolean => {
  const env = detectEnvironment();
  return env === 'browser' || env === 'webworker';
};

/**
 * 檢查是否支援 Node.js APIs
 */
export const supportsNodeApis = (): boolean => {
  return isServer();
};

// ===== 功能檢測工具 =====

/**
 * 安全地檢測特定功能是否可用
 */
export const hasFeature = (featureName: keyof EnvironmentCapabilities): boolean => {
  const capabilities = detectEnvironmentCapabilities();
  return capabilities[featureName];
};

/**
 * 檢測多個功能
 */
export const hasFeatures = (featureNames: Array<keyof EnvironmentCapabilities>): boolean => {
  const capabilities = detectEnvironmentCapabilities();
  return featureNames.every(feature => capabilities[feature]);
};

/**
 * 條件執行函數 - 僅在指定環境中執行
 */
export const runInEnvironment = <T>(
  targetEnv: Environment | Environment[],
  fn: () => T,
  fallback?: () => T
): T | undefined => {
  const currentEnv = detectEnvironment();
  const environments = Array.isArray(targetEnv) ? targetEnv : [targetEnv];
  
  if (environments.includes(currentEnv)) {
    return fn();
  } else if (fallback) {
    return fallback();
  }
  
  return undefined;
};

/**
 * 瀏覽器專用執行
 */
export const runInBrowser = <T>(fn: () => T, fallback?: () => T): T | undefined => {
  return runInEnvironment('browser', fn, fallback);
};

/**
 * 服務端專用執行
 */
export const runInServer = <T>(fn: () => T, fallback?: () => T): T | undefined => {
  return runInEnvironment('node', fn, fallback);
};

/**
 * Web Worker 專用執行
 */
export const runInWebWorker = <T>(fn: () => T, fallback?: () => T): T | undefined => {
  return runInEnvironment('webworker', fn, fallback);
};

// ===== 工具函數 =====

/**
 * 安全地嘗試 require 模組 (Node.js 環境)
 */
function tryRequire(moduleName: string): any {
  try {
    return typeof require === 'function' ? require(moduleName) : null;
  } catch (error) {
    return null;
  }
}

/**
 * 獲取環境描述字串
 */
export const getEnvironmentDescription = (): string => {
  const info = getEnvironmentInfo();
  
  switch (info.type) {
    case 'browser':
      return `Browser (${info.userAgent?.split(' ').pop() || 'Unknown'})`;
    case 'node':
      return `Node.js ${info.nodeVersion || 'Unknown'} (${info.platform || 'Unknown'})`;
    case 'webworker':
      return 'Web Worker';
    default:
      return 'Unknown Environment';
  }
};

/**
 * 檢查環境相容性
 */
export const checkCompatibility = (requirements: {
  environments?: Environment[];
  features?: Array<keyof EnvironmentCapabilities>;
}): { compatible: boolean; missing: string[] } => {
  const currentEnv = detectEnvironment();
  const capabilities = detectEnvironmentCapabilities();
  const missing: string[] = [];

  // 檢查環境要求
  if (requirements.environments && !requirements.environments.includes(currentEnv)) {
    missing.push(`Environment: requires ${requirements.environments.join(' or ')}, got ${currentEnv}`);
  }

  // 檢查功能要求
  if (requirements.features) {
    requirements.features.forEach(feature => {
      if (!capabilities[feature]) {
        missing.push(`Feature: ${feature}`);
      }
    });
  }

  return {
    compatible: missing.length === 0,
    missing
  };
};

// ===== 預設導出 =====

/**
 * 環境檢測模組的主要 API
 */
export const Environment = {
  detect: detectEnvironment,
  getInfo: getEnvironmentInfo,
  getCapabilities: detectEnvironmentCapabilities,
  getDescription: getEnvironmentDescription,
  checkCompatibility,
  
  // 便利函數
  isBrowser,
  isServer,
  isWebWorker,
  supportsDom,
  supportsWebApis,
  supportsNodeApis,
  
  // 功能檢測
  hasFeature,
  hasFeatures,
  
  // 條件執行
  runInEnvironment,
  runInBrowser,
  runInServer,
  runInWebWorker,
} as const;