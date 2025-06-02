/**
 * TsStoreX Effects 系統型別定義
 * 遵循 KISS 原則：簡單、直觀、易用
 */

import { Observable } from 'rxjs';
import type { BaseAction } from '../core/types';

// ============================================================================
// 基礎 Effect 型別
// ============================================================================

/**
 * Effect 函數型別
 * 接收 action$ 和 state$ 流，返回新的 action 流
 * 
 * @template T 狀態型別
 */
export interface Effect<T = any> {
  (action$: Observable<BaseAction>, state$: Observable<T>): Observable<BaseAction>;
}

/**
 * Effect 配置選項
 */
export interface EffectConfig {
  /** Effect 名稱，用於識別和除錯 */
  name: string;
  /** Effect 函數 */
  effect: Effect<any>;
  /** 額外配置選項 */
  config?: EffectOptions;
}

/**
 * Effect 執行選項
 */
export interface EffectOptions {
  /** 
   * 執行策略
   * - 'merge': 並行執行多個 effect（預設）
   * - 'switch': 新的 effect 會取消正在執行的 effect
   * - 'exhaust': 忽略新的 effect 直到當前 effect 完成
   * - 'concat': 按順序執行 effect
   */
  strategy?: EffectStrategy;
  
  /** 是否在錯誤時自動重試 */
  autoRetry?: boolean;
  
  /** 重試次數（當 autoRetry 為 true 時有效） */
  retryCount?: number;
  
  /** 重試延遲時間（毫秒） */
  retryDelay?: number;
  
  /** 是否啟用（可用於動態開關 effect） */
  enabled?: boolean;
  
  /** 只響應特定的 Action 類型 */
  actionFilter?: string[] | ((action: BaseAction) => boolean);
}

/**
 * Effect 執行策略
 */
export type EffectStrategy = 'merge' | 'switch' | 'exhaust' | 'concat';

// ============================================================================
// Effect Manager 相關型別
// ============================================================================

/**
 * Effect Manager 配置
 */
export interface EffectManagerConfig {
  /** 全域錯誤處理器 */
  onError?: (error: Error, effectName: string, action: BaseAction) => void;
  
  /** 全域日誌級別 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  
  /** 是否在錯誤時自動重啟 effect */
  autoRestart?: boolean;
  
  /** 最大並行 effect 數量 */
  maxConcurrency?: number;
}

/**
 * Effect 執行資訊
 */
export interface EffectExecutionInfo {
  /** Effect 名稱 */
  name: string;
  
  /** 觸發的 Action */
  triggerAction: BaseAction;
  
  /** 開始時間 */
  startTime: number;
  
  /** 執行狀態 */
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  
  /** 結束時間 */
  endTime?: number;
  
  /** 錯誤資訊 */
  error?: Error;
  
  /** 產生的 Actions */
  resultActions?: BaseAction[];
}

/**
 * Effect 統計資訊
 */
export interface EffectStats {
  /** Effect 名稱 */
  name: string;
  
  /** 執行次數 */
  executionCount: number;
  
  /** 成功次數 */
  successCount: number;
  
  /** 失敗次數 */
  failureCount: number;
  
  /** 平均執行時間（毫秒） */
  averageExecutionTime: number;
  
  /** 最後執行時間 */
  lastExecutionTime?: number;
  
  /** 當前狀態 */
  isRunning: boolean;
}

// ============================================================================
// Effect 工廠和工具型別
// ============================================================================

/**
 * Effect 工廠函數型別
 */
export type EffectFactory<T = any, Config = any> = (config?: Config) => Effect<T>;

/**
 * Effect 建構器配置
 */
export interface EffectBuilder<T = any> {
  /** 設定 Effect 名稱 */
  name(name: string): EffectBuilder<T>;
  
  /** 設定執行策略 */
  strategy(strategy: EffectStrategy): EffectBuilder<T>;
  
  /** 設定 Action 過濾器 */
  filter(filter: string[] | ((action: BaseAction) => boolean)): EffectBuilder<T>;
  
  /** 設定錯誤處理 */
  onError(handler: (error: Error, action: BaseAction) => Observable<BaseAction> | void): EffectBuilder<T>;
  
  /** 設定重試邏輯 */
  retry(count: number, delay?: number): EffectBuilder<T>;
  
  /** 建構 Effect 配置 */
  build(): EffectConfig;
}

// ============================================================================
// 預設 Effects 相關型別
// ============================================================================

/**
 * HTTP Effect 配置
 */
export interface HttpEffectConfig {
  /** API 基礎 URL */
  baseUrl?: string;
  
  /** 預設請求標頭 */
  defaultHeaders?: Record<string, string>;
  
  /** 請求超時時間（毫秒） */
  timeout?: number;
  
  /** 重試配置 */
  retry?: {
    count: number;
    delay: number;
    condition?: (error: any) => boolean;
  };
}

/**
 * Timer Effect 配置
 */
export interface TimerEffectConfig {
  /** 延遲時間（毫秒） */
  delay?: number;
  
  /** 間隔時間（毫秒，用於週期性執行） */
  interval?: number;
  
  /** 是否立即執行 */
  immediate?: boolean;
  
  /** 最大執行次數（用於間隔執行） */
  maxCount?: number;
}

/**
 * Storage Effect 配置
 */
export interface StorageEffectConfig {
  /** 儲存鍵名 */
  key: string;
  
  /** 儲存類型 */
  storage?: 'localStorage' | 'sessionStorage';
  
  /** 是否自動序列化 */
  serialize?: boolean;
  
  /** 序列化函數 */
  serializer?: (value: any) => string;
  
  /** 反序列化函數 */
  deserializer?: (value: string) => any;
}

// ============================================================================
// Effect 生命週期型別
// ============================================================================

/**
 * Effect 生命週期事件
 */
export type EffectLifecycleEvent = 
  | 'registered'
  | 'started'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'restarted'
  | 'destroyed';

/**
 * Effect 生命週期監聽器
 */
export interface EffectLifecycleListener {
  (event: EffectLifecycleEvent, effectName: string, data?: any): void;
}

/**
 * Effect 狀態
 */
export interface EffectState {
  /** 是否已註冊 */
  isRegistered: boolean;
  
  /** 是否正在執行 */
  isRunning: boolean;
  
  /** 是否已暫停 */
  isPaused: boolean;
  
  /** 是否已銷毀 */
  isDestroyed: boolean;
  
  /** 最後更新時間 */
  lastUpdated: number;
}

// ============================================================================
// 高級 Effect 型別
// ============================================================================

/**
 * 條件 Effect 配置
 */
export interface ConditionalEffectConfig<T = any> {
  /** 條件函數 */
  condition: (action: BaseAction, state: T) => boolean;
  
  /** 條件為真時執行的 Effect */
  onTrue: Effect<T>;
  
  /** 條件為假時執行的 Effect（可選） */
  onFalse?: Effect<T>;
}

/**
 * 組合 Effect 配置
 */
export interface CompositeEffectConfig<T = any> {
  /** 子 Effects */
  effects: Effect<T>[];
  
  /** 組合策略 */
  strategy: 'parallel' | 'sequential' | 'race';
  
  /** 是否等待所有 Effect 完成 */
  waitForAll?: boolean;
}

/**
 * 狀態相關 Effect 配置
 */
export interface StatefulEffectConfig<T = any> {
  /** 初始狀態 */
  initialState?: any;
  
  /** 狀態更新函數 */
  updateState?: (currentState: any, action: BaseAction, storeState: T) => any;
  
  /** 狀態選擇器 */
  stateSelector?: (storeState: T) => any;
}