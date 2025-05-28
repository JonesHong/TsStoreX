/**
 * TsStoreX 環境檢測工具
 * 從 store.ts 移出的基本環境檢測功能
 */

/**
 * 支援的環境類型
 */
export type Environment = 'browser' | 'node' | 'webworker' | 'unknown';

/**
 * 檢測當前執行環境
 */
export const detectEnvironment = (): Environment => {
  try {
    // Web Worker 檢測
    if (
      typeof self !== 'undefined' && 
      typeof importScripts === 'function' &&
      typeof WorkerGlobalScope !== 'undefined'
    ) {
      return 'webworker';
    }

    // Node.js 檢測
    if (
      typeof process !== 'undefined' && 
      process.versions && 
      typeof process.versions.node === 'string'
    ) {
      return 'node';
    }

    // 瀏覽器檢測
    if (
      typeof window !== 'undefined' && 
      typeof document !== 'undefined' &&
      typeof window.document === 'object'
    ) {
      return 'browser';
    }

    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
};

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
 * 檢查是否為 Node.js 環境（別名）
 */
export const isNode = (): boolean => {
  return isServer();
};

/**
 * 檢查是否為 Web Worker 環境
 */
export const isWebWorker = (): boolean => {
  return detectEnvironment() === 'webworker';
};

// 一些基本的特性檢測函數（utils/index.ts 中有引用）
export const hasWindow = (): boolean => {
  try {
    return typeof window !== 'undefined' && window !== null;
  } catch {
    return false;
  }
};

export const hasDocument = (): boolean => {
  try {
    return typeof document !== 'undefined' && document !== null;
  } catch {
    return false;
  }
};

export const hasProcess = (): boolean => {
  try {
    return typeof process !== 'undefined' && process !== null;
  } catch {
    return false;
  }
};

export const hasGlobal = (): boolean => {
  try {
    return typeof global !== 'undefined' && global !== null;
  } catch {
    return false;
  }
};