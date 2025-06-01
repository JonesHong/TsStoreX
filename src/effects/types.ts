/**
 * TsStoreX Effects 系統型別定義
 * 定義副作用管理相關的所有介面和型別
 */

import { Observable, Subscription } from 'rxjs';
import  { BaseAction } from '../core/types';

// ============================================================================
// Effect 核心型別
// ============================================================================

/**
 * Effect 函數介面
 * 接收 action 流和 state 流，回傳新的 action 流
 */
export interface Effect<T = any> {
  (action$: Observable<BaseAction>, state$: Observable<T>): Observable<BaseAction>;
}

/**
 * Effect 執行策略
 */
export type EffectStrategy = 
  | 'switch'    // 切換：取消前一個，執行新的
  | 'merge'     // 合併：所有 Effect 同時執行
  | 'exhaust'   // 排斥：忽略新的，直到當前完成
  | 'concat';   // 串聯：依序執行

/**
 * Effect 配置選項
 */
export interface EffectOptions {
  /** 執行策略 */
  strategy?: EffectStrategy;
  /** 是否取消前一個 Effect */
  cancelPrevious?: boolean;
  /** 重試次數 */
  retryCount?: number;
  /** 重試延遲 (毫秒) */
  retryDelay?: number;
  /** 超時時間 (毫秒) */
  timeout?: number;
  /** 是否啟用錯誤追蹤 */
  enableErrorTracking?: boolean;
}

/**
 * Effect 配置項目
 */
export interface EffectConfig<T = any> {
  /** Effect 名稱 */
  name: string;
  /** Effect 函數 */
  effect: Effect<T>;
  /** 可選配置 */
  config?: EffectOptions | undefined;
}

// ============================================================================
// Effect Manager 型別
// ============================================================================

/**
 * Effect 管理器配置
 */
export interface EffectManagerConfig {
  /** 日誌級別 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** 最大同時執行的 Effect 數量 */
  maxConcurrentEffects?: number;
  /** 是否啟用效能監控 */
  enablePerformanceTracking?: boolean;
  /** 全域錯誤處理函數 */
  globalErrorHandler?: (error: EffectError, effectName: string) => void;
}

/**
 * Effect 執行狀態
 */
export type EffectStatus = 
  | 'idle'        // 閒置
  | 'running'     // 執行中
  | 'completed'   // 完成
  | 'cancelled'   // 已取消
  | 'error';      // 錯誤

/**
 * Effect 實例資訊
 */
export interface EffectInstance<T = any> {
  /** Effect 名稱 */
  name: string;
  /** Effect 配置 */
  config: EffectConfig<T>;
  /** 當前狀態 */
  status: EffectStatus;
  /** 訂閱物件 */
  subscription?: Subscription;
  /** 開始時間 */
  startedAt?: Date;
  /** 完成時間 */
  completedAt?: Date;
  /** 錯誤資訊 */
  error?: EffectError;
  /** 執行統計 */
  stats: EffectStats;
}

/**
 * Effect 執行統計
 */
export interface EffectStats {
  /** 執行次數 */
  executionCount: number;
  /** 成功次數 */
  successCount: number;
  /** 錯誤次數 */
  errorCount: number;
  /** 平均執行時間 (毫秒) */
  averageExecutionTime: number;
  /** 最後執行時間 */
  lastExecutedAt?: Date;
  /** 最後錯誤時間 */
  lastErrorAt?: Date;
}

// ============================================================================
// Effect 錯誤型別
// ============================================================================

/**
 * Effect 錯誤型別
 */
export type EffectErrorType = 
  | 'EXECUTION_FAILED'     // 執行失敗
  | 'TIMEOUT'              // 超時
  | 'CANCELLED'            // 被取消
  | 'INVALID_CONFIG'       // 配置無效
  | 'STREAM_ERROR'         // 流錯誤
  | 'DEPENDENCY_ERROR';    // 依賴錯誤

/**
 * Effect 錯誤介面
 */
export interface EffectError extends Error {
  /** 錯誤型別 */
  type: EffectErrorType;
  /** Effect 名稱 */
  effectName: string;
  /** 原始錯誤 */
  originalError?: Error;
  /** 錯誤發生時間 */
  timestamp: Date;
  /** 額外上下文資訊 */
  context?: Record<string, any>;
}

// ============================================================================
// Effect 生命週期型別
// ============================================================================

/**
 * Effect 生命週期事件
 */
export type EffectLifecycleEvent = 
  | 'registered'    // 已註冊
  | 'started'       // 已啟動
  | 'executed'      // 已執行
  | 'completed'     // 已完成
  | 'cancelled'     // 已取消
  | 'error'         // 錯誤
  | 'destroyed';    // 已銷毀

/**
 * Effect 生命週期監聽器
 */
export interface EffectLifecycleListener {
  /** 事件型別 */
  event: EffectLifecycleEvent;
  /** 回調函數 */
  callback: (data: {
    effectName: string;
    timestamp: Date;
    metadata?: any;
  }) => void;
}

// ============================================================================
// 高階 Effect 型別
// ============================================================================

/**
 * 條件 Effect 配置
 */
export interface ConditionalEffectConfig<T = any> extends EffectConfig<T> {
  /** 執行條件 */
  condition: (action: BaseAction, state: T) => boolean;
}

/**
 * 批次 Effect 配置
 */
export interface BatchEffectConfig<T = any> extends EffectConfig<T> {
  /** 批次大小 */
  batchSize: number;
  /** 批次間隔 (毫秒) */
  batchInterval: number;
}

/**
 * 排程 Effect 配置
 */
export interface ScheduledEffectConfig<T = any> extends EffectConfig<T> {
  /** 執行時程 (cron 表達式或毫秒間隔) */
  schedule: string | number;
  /** 是否立即執行 */
  runImmediately?: boolean;
}

// ============================================================================
// Effect 組合型別
// ============================================================================

/**
 * Effect 組合策略
 */
export type EffectCompositionStrategy = 
  | 'parallel'      // 平行執行
  | 'sequential'    // 順序執行
  | 'race'          // 競賽執行 (第一個完成)
  | 'pipeline';     // 管線執行 (前一個的輸出作為下一個的輸入)

/**
 * 組合 Effect 配置
 */
export interface ComposedEffectConfig<T = any> {
  /** 組合名稱 */
  name: string;
  /** 子 Effect 列表 */
  effects: EffectConfig<T>[];
  /** 組合策略 */
  strategy: EffectCompositionStrategy;
  /** 組合選項 */
  options?: {
    /** 失敗時是否停止 */
    stopOnError?: boolean;
    /** 超時時間 */
    timeout?: number;
  };
}

// ============================================================================
// Effect 中間件型別
// ============================================================================

/**
 * Effect 中間件函數
 */
export interface EffectMiddleware<T = any> {
  (
    effectName: string,
    effect: Effect<T>,
    next: (effect: Effect<T>) => Observable<BaseAction>
  ): Observable<BaseAction>;
}

/**
 * Effect 攔截器
 */
export interface EffectInterceptor<T = any> {
  /** 攔截器名稱 */
  name: string;
  /** 前置處理 */
  beforeEffect?: (effectName: string, action$: Observable<BaseAction>, state$: Observable<T>) => void;
  /** 後置處理 */
  afterEffect?: (effectName: string, result$: Observable<BaseAction>) => Observable<BaseAction>;
  /** 錯誤處理 */
  onError?: (effectName: string, error: EffectError) => void;
}

// ============================================================================
// Effect 工廠型別
// ============================================================================

/**
 * Effect 工廠函數
 */
export interface EffectFactory<T = any, P = any> {
  (params: P): Effect<T>;
}

/**
 * 可重用 Effect 範本
 */
export interface EffectTemplate<T = any, P = any> {
  /** 範本名稱 */
  name: string;
  /** 範本描述 */
  description?: string;
  /** 工廠函數 */
  factory: EffectFactory<T, P>;
  /** 預設配置 */
  defaultConfig?: EffectOptions;
}

// ============================================================================
// 測試相關型別
// ============================================================================

/**
 * Effect 測試輔助工具配置
 */
export interface EffectTestConfig<T = any> {
  /** 模擬的初始狀態 */
  initialState?: T;
  /** 模擬的 actions */
  mockActions?: BaseAction[];
  /** 測試超時時間 */
  timeout?: number;
  /** 是否啟用詳細日誌 */
  verbose?: boolean;
}

/**
 * Effect 測試結果
 */
export interface EffectTestResult {
  /** 是否成功 */
  success: boolean;
  /** 執行時間 */
  duration: number;
  /** 輸出的 actions */
  outputActions: BaseAction[];
  /** 錯誤資訊 */
  error?: EffectError;
  /** 測試日誌 */
  logs: string[];
}

// ============================================================================
// 匯出所有型別
// ============================================================================

// export type {
//   // 核心 Effect 型別
//   Effect,
//   EffectStrategy,
//   EffectOptions,
//   EffectConfig,
  
//   // Effect Manager 型別
//   EffectManagerConfig,
//   EffectStatus,
//   EffectInstance,
//   EffectStats,
  
//   // 錯誤型別
//   EffectErrorType,
//   EffectError,
  
//   // 生命週期型別
//   EffectLifecycleEvent,
//   EffectLifecycleListener,
  
//   // 高階型別
//   ConditionalEffectConfig,
//   BatchEffectConfig,
//   ScheduledEffectConfig,
//   ComposedEffectConfig,
  
//   // 中間件型別
//   EffectMiddleware,
//   EffectInterceptor,
  
//   // 工廠型別
//   EffectFactory,
//   EffectTemplate,
  
//   // 測試型別
//   EffectTestConfig,
//   EffectTestResult
// };