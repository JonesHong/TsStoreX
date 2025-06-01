/**
 * TsStoreX 驗證工具
 * 從 store.ts 移出的基本驗證功能
 */

import  { StoreBuilderSnapshot } from '../core/types';

/**
 * 驗證結果介面
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 驗證 Store Builder 配置
 */
export const validateStoreBuilder = <T extends Record<string, any>>(
  snapshot: StoreBuilderSnapshot<T>
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // 檢查是否有 reducer
  if (Object.keys(snapshot.reducers).length === 0) {
    result.isValid = false;
    result.errors.push('At least one reducer must be registered');
  }

  // 驗證 reducer 是否為函數
  Object.entries(snapshot.reducers).forEach(([key, reducer]) => {
    if (typeof reducer !== 'function') {
      result.errors.push(`Reducer for key "${key}" is not a function`);
      result.isValid = false;
    }
  });

  // 驗證中間件
  snapshot.middleware.forEach((middleware, index) => {
    if (typeof middleware !== 'function') {
      result.errors.push(`Middleware at index ${index} is not a function`);
      result.isValid = false;
    }
  });

  return result;
};

/**
 * 拋出驗證錯誤（如果有錯誤）
 */
export const throwIfInvalid = (result: ValidationResult, context?: string): void => {
  if (!result.isValid) {
    const contextStr = context ? `${context}: ` : '';
    const errorMessage = `${contextStr}Validation failed\n${result.errors.join('\n')}`;
    throw new Error(errorMessage);
  }
};