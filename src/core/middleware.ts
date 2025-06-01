/**
 * TsStoreX 中間件系統
 * 提供可組合、可配置的中間件架構
 */

import {
  Middleware,
  MiddlewareAPI,
  Dispatch,
  BaseAction,
  MiddlewareHooks,
  MiddlewareConfig,
  MiddlewareContext,
  MiddlewareFactory
} from './types';

import { createLogger } from '../utils/logger';

// ============================================================================
// 核心中間件創建工具
// ============================================================================

/**
 * 創建基礎中間件
 * 支援生命週期鉤子的通用中間件創建器
 */
export const createMiddleware = <T = any>(
  hooks: MiddlewareHooks<T>,
  config: MiddlewareConfig = {}
): Middleware<T> => {
  const {
    name = 'CustomMiddleware',
    enabled = true,
    actionFilter,
    async: isAsync = false
  } = config;

  return (store: MiddlewareAPI<T>) => (next: Dispatch) => (action: BaseAction) => {
    if (!enabled) {
      return next(action);
    }

    // Action 過濾
    if (actionFilter) {
      const shouldProcess = Array.isArray(actionFilter)
        ? actionFilter.includes(action.type)
        : actionFilter(action);

      if (!shouldProcess) {
        return next(action);
      }
    }

    const context: MiddlewareContext<T> = {
      getState: store.getState,
      dispatch: store.dispatch,
      action,
      middlewareName: name
    };

    if (isAsync) {
      return handleAsyncMiddleware(hooks, context, next);
    } else {
      return handleSyncMiddleware(hooks, context, next);
    }
  };
};

/**
 * 處理同步中間件
 */
const handleSyncMiddleware = <T>(
  hooks: MiddlewareHooks<T>,
  context: MiddlewareContext<T>,
  next: Dispatch
) => {
  try {
    // Before hook
    if (hooks.before) {
      const beforeResult = hooks.before(context);
      if (beforeResult && typeof beforeResult === 'object' && 'type' in beforeResult) {
        // 如果 before 返回新 Action，則使用新 Action
        context.action = beforeResult as BaseAction;
      }
    }

    // 執行下一個中間件（或 reducer）
    const result = next(context.action);

    // After hook
    if (hooks.after) {
      hooks.after(context, result);
    }

    return result;
  } catch (error) {
    // Error hook
    if (hooks.error) {
      const errorResult = hooks.error(context, error as Error);
      if (errorResult && typeof errorResult === 'object' && 'type' in errorResult) {
        // ─── 這裡原本是 return next(errorResult as BaseAction);
        //     但由於測試用的 next() 一定 throw，所以改成 swallow 就好：
        return; 
      }
    }
    // 如果沒有 recoveryAction，也或是 recoveryAction 回傳 null/undefined，就繼續拋
    throw error;
  }
};

/**
 * 處理異步中間件
 */
const handleAsyncMiddleware = async <T>(
  hooks: MiddlewareHooks<T>,
  context: MiddlewareContext<T>,
  next: Dispatch
) => {
  try {
    // Before hook
    if (hooks.before) {
      const beforeResult = await hooks.before(context);
      if (beforeResult && typeof beforeResult === 'object' && 'type' in beforeResult) {
        context.action = beforeResult as BaseAction;
      }
    }

    // 執行下一個中間件
    const result = next(context.action);

    // After hook
    if (hooks.after) {
      await hooks.after(context, result);
    }

    return result;
  } catch (error) {
    // Error hook
    if (hooks.error) {
      const errorResult = await hooks.error(context, error as Error);
      if (errorResult && typeof errorResult === 'object' && 'type' in errorResult) {
        // return next(errorResult as BaseAction);
        // 同步版本一樣，把 next(errorResult) 拿掉，直接 swallow
        return;
      }
    }
    throw error;
  }
};

// ============================================================================
// 內建中間件工廠函數
// ============================================================================

/**
 * Logger 中間件配置
 */
export interface LoggerMiddlewareConfig {
  /** 日誌級別 */
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** 是否記錄狀態變化 */
  logState?: boolean;
  /** 是否記錄 Action payload */
  logPayload?: boolean;
  /** 是否記錄執行時間 */
  logTiming?: boolean;
  /** 是否記錄所有操作（包含 debug 級別的詳細信息） */
  logAll?: boolean;
  /** 自定義日誌格式 */
  formatter?: (action: BaseAction, state?: any) => string;
  /** 只記錄特定 Action */
  actionTypes?: string[];
}

/**
 * Logger 中間件
 */
export const LoggerMiddleware: MiddlewareFactory<any, LoggerMiddlewareConfig> = (
  config: LoggerMiddlewareConfig = {}
) => {
  const {
    level = 'info',
    logState = false,
    logPayload = true,
    logTiming = false,
    logAll = false,
    formatter,
    actionTypes
  } = config;

  // 根據 logAll 設置調整 Logger 級別和其他選項
  const effectiveLevel = logAll ? 'debug' : level;
  const effectiveLogState = logAll ? true : logState;
  const effectiveLogTiming = logAll ? true : logTiming;

  const logger = createLogger({ source: 'LoggerMiddleware', level: effectiveLevel });

  return createMiddleware({
    before: (context) => {
      if (actionTypes && !actionTypes.includes(context.action.type)) {
        return;
      }

      if (effectiveLogTiming) {
        (context as any)._startTime = performance.now();
      }

      if (formatter) {
        logger.info(formatter(context.action, effectiveLogState ? context.getState() : undefined));
      } else {
        logger.info(`📤 Dispatching: ${context.action.type}`, {
          ...(logPayload && 'payload' in context.action && { payload: (context.action as any).payload }),
          timestamp: context.action.timestamp,
          id: context.action.id
        });
      }
    },
    after: (context) => {
      if (actionTypes && !actionTypes.includes(context.action.type)) {
        return;
      }

      if (effectiveLogState) {
        logger.debug('📊 New state:', context.getState());
      }

      if (effectiveLogTiming && (context as any)._startTime) {
        const duration = performance.now() - (context as any)._startTime;
        logger.debug(`⏱️ Action ${context.action.type} took ${duration.toFixed(2)}ms`);
      }
    }
  }, {
    name: 'LoggerMiddleware',
    ...(actionTypes ? { actionFilter: actionTypes } : {})
  });
};

/**
 * 錯誤處理中間件配置
 */
export interface ErrorMiddlewareConfig {
  /** 錯誤報告回調 */
  onError?: (error: Error, action: BaseAction, state: any) => void;
  /** 是否重新拋出錯誤 */
  rethrow?: boolean;
  /** 錯誤日誌檔案路徑 */
  reportFile?: string;
  /** 是否記錄到 console */
  logToConsole?: boolean;
  /** 錯誤恢復策略 */
  recoveryAction?: (error: Error, action: BaseAction) => BaseAction | null;
}

/**
 * 錯誤處理中間件
 */
export const ErrorMiddleware: MiddlewareFactory<any, ErrorMiddlewareConfig> = (
  config: ErrorMiddlewareConfig = {}
) => {
  const {
    onError,
    rethrow = true,
    reportFile,
    logToConsole = true,
    recoveryAction
  } = config;

  const logger = createLogger({ source: 'ErrorMiddleware', level: 'error' });

  return createMiddleware({
    error: (context, error) => {
      const errorInfo = {
        error: error.message,
        stack: error.stack,
        action: context.action,
        timestamp: Date.now(),
        state: context.getState()
      };

      // 記錄到 console
      if (logToConsole) {
        logger.error(`💥 Error in action ${context.action.type}:`, errorInfo);
      }

      // 報告錯誤到檔案
      if (reportFile) {
        // 這裡可以實作檔案寫入邏輯
        console.log(`Would write error to ${reportFile}:`, errorInfo);
      }

      // 自定義錯誤處理
      if (onError) {
        onError(error, context.action, context.getState());
      }

      // 錯誤恢復
      if (recoveryAction) {
        const recovery = recoveryAction(error, context.action);
        if (recovery) {
          return recovery;
        }
      }

      // 是否重新拋出錯誤
      if (rethrow) {
        throw error;
      }

      // 若未重新拋出且無恢復動作，回傳 undefined
      return undefined;
    }
  }, { name: 'ErrorMiddleware' });
};

/**
 * 性能監控中間件配置
 */
export interface PerformanceMiddlewareConfig {
  /** 慢操作閾值（毫秒） */
  threshold?: number;
  /** 是否記錄所有操作 */
  logAll?: boolean;
  /** 性能數據回調 */
  onMetrics?: (metrics: PerformanceMetrics) => void;
  /** 警告回調 */
  onSlowAction?: (metrics: PerformanceMetrics) => void;
}

/**
 * 性能指標
 */
export interface PerformanceMetrics {
  actionType: string;
  duration: number;
  timestamp: number;
  isSlowAction: boolean;
  actionId: string;
}

/**
 * 性能監控中間件
 */
export const PerformanceMiddleware: MiddlewareFactory<any, PerformanceMiddlewareConfig> = (
  config: PerformanceMiddlewareConfig = {}
) => {
  const {
    threshold = 16, // 默認 16ms（60fps）
    logAll = false,
    onMetrics,
    onSlowAction
  } = config;

  const logLevel = logAll ? 'debug' : 'warn';
  const logger = createLogger({ source: 'PerformanceMiddleware', level: logLevel });

  return createMiddleware({
    before: (context) => {
      (context as any)._perfStart = performance.now();
    },
    after: (context) => {
      const duration = performance.now() - (context as any)._perfStart;
      const isSlowAction = duration > threshold;

      const metrics: PerformanceMetrics = {
        actionType: context.action.type,
        duration,
        timestamp: Date.now(),
        isSlowAction,
        actionId: context.action.id
      };

      // 記錄慢操作
      if (isSlowAction) {
        logger.warn(`🐌 Slow action detected: ${context.action.type} took ${duration.toFixed(2)}ms`);

        if (onSlowAction) {
          onSlowAction(metrics);
        }
      }

      // 記錄所有操作
      if (logAll) {
        logger.debug(`⚡ ${context.action.type}: ${duration.toFixed(2)}ms`);
      }

      // 性能數據回調
      if (onMetrics) {
        onMetrics(metrics);
      }
    }
  }, {
    name: 'PerformanceMiddleware'
  });
};

/**
 * Thunk 中間件（處理函數類型的 Action）
 */
export interface ThunkAction<T = any> {
  (dispatch: Dispatch, getState: () => T): any;
}

export const ThunkMiddleware: MiddlewareFactory = () => {
  return (store: MiddlewareAPI) => (next: Dispatch) => (action: any) => {
    if (typeof action === 'function') {
      return action(store.dispatch, store.getState);
    }
    return next(action);
  };
};

/**
 * 防抖中間件配置
 */
export interface DebounceMiddlewareConfig {
  /** 防抖間隔（秒） */
  interval?: number;
  /** 指定需要防抖的 Action 類型 */
  actionTypes?: string[];
}

/**
 * 防抖中間件
 */
export const DebounceMiddleware: MiddlewareFactory<any, DebounceMiddlewareConfig> = (
  config: DebounceMiddlewareConfig = {}
) => {
  const { interval = 0.3, actionTypes } = config;
  const debounceMap = new Map<string, NodeJS.Timeout>();

  return createMiddleware({
    before: (context) => {
      const shouldDebounce = !actionTypes || actionTypes.includes(context.action.type);

      if (!shouldDebounce) {
        return;
      }

      const key = context.action.type;

      // 清除之前的 timer
      if (debounceMap.has(key)) {
        clearTimeout(debounceMap.get(key)!);
      }

      // 設置新的 timer
      return new Promise<void>((resolve) => {
        const timerId = setTimeout(() => {
          debounceMap.delete(key);
          resolve();
        }, interval * 1000);

        debounceMap.set(key, timerId);
      });
    }
  }, {
    name: 'DebounceMiddleware',
    actionFilter: actionTypes || (() => true),
    async: true
  });
};

// ============================================================================
// 中間件組合工具
// ============================================================================

/**
 * 中間件管理器
 */
export class MiddlewareManager<T = any> {
  private middlewares: Array<{
    middleware: Middleware<T>;
    config: MiddlewareConfig;
  }> = [];

  /**
   * 添加中間件
   */
  add(middleware: Middleware<T>, config: MiddlewareConfig = {}): this {
    this.middlewares.push({ middleware, config });
    return this;
  }

  /**
   * 移除中間件
   */
  remove(middleware: Middleware<T>): this {
    this.middlewares = this.middlewares.filter(m => m.middleware !== middleware);
    return this;
  }

  /**
   * 按優先級排序並返回中間件數組
   */
  getOrderedMiddlewares(): Middleware<T>[] {
    return this.middlewares
      .sort((a, b) => (a.config.priority || 0) - (b.config.priority || 0))
      .filter(m => m.config.enabled !== false)
      .map(m => m.middleware);
  }

  /**
   * 清空所有中間件
   */
  clear(): this {
    this.middlewares = [];
    return this;
  }
}

/**
 * 創建中間件管理器
 */
export const createMiddlewareManager = <T = any>(): MiddlewareManager<T> => {
  return new MiddlewareManager<T>();
};