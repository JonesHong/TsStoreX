/**
 * TsStoreX 核心型別定義
 * 從 store.ts 移出的基本型別介面
 */

import { BaseAction } from './action';

// ============================================================================
// 核心 Store 型別
// ============================================================================

/**
 * Action 派發函數
 */
export interface Dispatch {
  (action: BaseAction): void;
}

/**
 * 中間件 API 介面
 */
export interface MiddlewareAPI<T = any> {
  getState: () => T;
  dispatch: Dispatch;
}

/**
 * 中間件函數介面
 */
export interface Middleware<T = any> {
  (store: MiddlewareAPI<T>): (next: Dispatch) => Dispatch;
}

/**
 * Store 配置選項
 */
export interface StoreConfig {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  enableSignals?: boolean;
  devTools?: boolean;
}

/**
 * 增強型 Store 建構配置
 */
export interface EnhancedStoreConfig<T = any> {
  middleware?: Middleware<T>[];
  effects?: import('../effects/types').EffectConfig[];
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  enableSignals?: boolean;
  devTools?: boolean;
}

// ============================================================================
// Store Builder 型別
// ============================================================================

/**
 * Reducer 映射物件型別
 */
export type ReducersMapObject<T extends Record<string, any>> = {
  [K in keyof T]: import('./reducer').Reducer<T[K]>;
};

/**
 * Store Builder 快照型別
 */
export interface StoreBuilderSnapshot<T extends Record<string, any> = any> {
  reducers: ReducersMapObject<T>;
  middleware: Middleware<T>[];
  effects: import('../effects/types').EffectConfig[];
  config: StoreConfig;
}

/**
 * Store 調試資訊
 */
export interface StoreDebugInfo<T = any> {
  environment: string;
  signalsEnabled: boolean;
  middlewareCount: number;
  effectsCount: number;
  effectNames: string[];
  currentStateSnapshot: T;
  hasActiveSubscriptions: boolean;
}