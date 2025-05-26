/**
 * Utils 模組 - 工具函數和實用程式
 */

import { detectEnvironment, getEnvironmentInfo } from './environment';

// ===== 環境檢測 =====
export {
    detectEnvironment,
    detectEnvironmentCapabilities,
    getEnvironmentInfo,
    getEnvironmentDescription,
    checkCompatibility,
    
    // 環境檢查便利函數
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
    
    // 主要 API
    Environment,
    
    // 類型定義
    type Environment as EnvironmentType,
    type EnvironmentInfo,
    type EnvironmentCapabilities,
  } from './environment';
  
  // ===== 未來擴展預留 =====
  // 這裡將添加其他工具模組的導出
  // 例如：logger, compose, 等等
  
  /**
   * Utils 模組版本
   */
  export const UTILS_VERSION = '0.0.1';
  
  /**
   * 檢查 Utils 模組是否正常運作
   */
  export const checkUtilsHealth = (): boolean => {
    try {
      // 基本環境檢測測試
      const env = detectEnvironment();
      const info = getEnvironmentInfo();
      
      return (
        typeof env === 'string' &&
        typeof info === 'object' &&
        info.type === env
      );
    } catch (error) {
      return false;
    }
  };