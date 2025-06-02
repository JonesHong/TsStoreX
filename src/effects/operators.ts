/**
 * TsStoreX Effects 專用 RxJS 操作符
 * 提供狀態管理特化的 RxJS 操作符，簡化 Effects 開發
 */

import { Observable, OperatorFunction, EMPTY, of, timer, throwError } from 'rxjs';
import {
  filter,
  map,
  switchMap,
  mergeMap,
  concatMap,
  exhaustMap,
  catchError,
//   retry,
  delay,
  debounceTime,
  distinctUntilChanged,
  withLatestFrom,
  takeUntil,
  tap,
  retryWhen,
  delayWhen,
  take
} from 'rxjs/operators';

import type { BaseAction } from '../core/types';
import type { EffectStrategy } from './types';

// ============================================================================
// Action 過濾操作符
// ============================================================================

/**
 * 過濾特定類型的 Actions
 * 
 * @param actionTypes - 要過濾的 Action 類型陣列
 * @returns RxJS 操作符
 * 
 * @example
 * ```typescript
 * action$.pipe(
 *   ofType('USER_LOGIN', 'USER_LOGOUT'),
 *   // 只處理登入和登出 Actions
 * )
 * ```
 */
export const ofType = <T extends BaseAction = BaseAction>(
  ...actionTypes: string[]
): OperatorFunction<BaseAction, T> => {
  return filter((action: BaseAction): action is T => 
    actionTypes.includes(action.type)
  );
};

/**
 * 過濾符合條件的 Actions
 * 
 * @param predicate - 條件函數
 * @returns RxJS 操作符
 */
export const ofAction = <T extends BaseAction = BaseAction>(
  predicate: (action: BaseAction) => boolean
): OperatorFunction<BaseAction, T> => {
  return filter((action: BaseAction): action is T => predicate(action));
};

/**
 * 過濾包含特定 payload 屬性的 Actions
 * 
 * @param key - payload 屬性名
 * @returns RxJS 操作符
 */
export const withPayload = <T extends BaseAction = BaseAction>(
  key?: string
): OperatorFunction<BaseAction, T> => {
  return filter((action: BaseAction): action is T => {
    if (!('payload' in action)) return false;
    if (!key) return true;
    return (action as any).payload && key in (action as any).payload;
  });
};

// ============================================================================
// 狀態相關操作符
// ============================================================================

/**
 * 從狀態流中選擇特定值
 * 
 * @param selector - 狀態選擇器函數
 * @returns RxJS 操作符
 */
export const selectState = <T, R>(
  selector: (state: T) => R
): OperatorFunction<T, R> => {
  return source$ => source$.pipe(
    map(selector),
    distinctUntilChanged()
  );
};

/**
 * 結合最新的狀態值
 * 
 * @param state$ - 狀態流
 * @param selector - 可選的狀態選擇器
 * @returns RxJS 操作符
 */
export const withState = <T, S, R = S>(
  state$: Observable<S>,
  selector?: (state: S) => R
): OperatorFunction<T, [T, R]> => {
  return source$ => source$.pipe(
    withLatestFrom(
      selector ? state$.pipe(map(selector)) : state$
    ),
    map(([t, sOrR]) => [t, sOrR as R] as [T, R])
  );
};

/**
 * 只有當狀態符合條件時才執行
 * 
 * @param state$ - 狀態流
 * @param condition - 條件函數
 * @returns RxJS 操作符
 */
export const whenState = <T, S>(
  state$: Observable<S>,
  condition: (state: S) => boolean
): OperatorFunction<T, T> => {
  return source$ => source$.pipe(
    withLatestFrom(state$),
    filter(([_, state]) => condition(state)),
    map(([action, _]) => action)
  );
};

// ============================================================================
// Effect 執行策略操作符
// ============================================================================

/**
 * 根據策略執行 Effect
 * 
 * @param strategy - 執行策略
 * @param effectFn - Effect 執行函數
 * @returns RxJS 操作符
 */
export const executeWith = <T, R>(
  strategy: EffectStrategy,
  effectFn: (value: T) => Observable<R>
): OperatorFunction<T, R> => {
  switch (strategy) {
    case 'switch':
      return switchMap(effectFn);
    case 'merge':
      return mergeMap(effectFn);
    case 'concat':
      return concatMap(effectFn);
    case 'exhaust':
      return exhaustMap(effectFn);
    default:
      return mergeMap(effectFn); // 預設使用 merge
  }
};

/**
 * Switch 策略：新的操作會取消正在執行的操作
 */
export const switchEffect = <T, R>(
  effectFn: (value: T) => Observable<R>
): OperatorFunction<T, R> => switchMap(effectFn);

/**
 * Merge 策略：並行執行多個操作
 */
export const mergeEffect = <T, R>(
  effectFn: (value: T) => Observable<R>,
  concurrent = Infinity
): OperatorFunction<T, R> => mergeMap(effectFn, concurrent);

/**
 * Concat 策略：按順序執行操作
 */
export const concatEffect = <T, R>(
  effectFn: (value: T) => Observable<R>
): OperatorFunction<T, R> => concatMap(effectFn);

/**
 * Exhaust 策略：忽略新的操作直到當前操作完成
 */
export const exhaustEffect = <T, R>(
  effectFn: (value: T) => Observable<R>
): OperatorFunction<T, R> => exhaustMap(effectFn);

// ============================================================================
// 錯誤處理操作符
// ============================================================================

/**
 * 增強的錯誤處理
 * 
 * @param config - 錯誤處理配置
 * @returns RxJS 操作符
 */
export const handleError = <T>(config: {
  /** 重試次數 */
  retryCount?: number;
  /** 重試延遲 */
  retryDelay?: number;
  /** 錯誤處理函數 */
  onError?: (error: any, attempt: number) => Observable<T> | void;
  /** 最終錯誤處理 */
  fallback?: (error: any) => Observable<T>;
} = {}): OperatorFunction<T, T> => {
  const { retryCount = 0, retryDelay = 1000, onError, fallback } = config;

  return source$ => source$.pipe(
    retryWhen(errors$ => 
      errors$.pipe(
        mergeMap((error: any, index: number) => {
          if (onError) {
            const result = onError(error, index + 1);
            if (result) return result;
          }
          return of(error);
        }),
        delayWhen((_, index) => 
          index < retryCount 
            ? timer(retryDelay * Math.pow(2, index)) // 指數退避
            : throwError(() => new Error('Max retries exceeded'))
        )
      )
    ),
    catchError(error => {
      if (fallback) {
        return fallback(error);
      }
      console.error('Effect error:', error);
      return EMPTY;
    })
  );
};

/**
 * 簡單重試操作符
 * 
 * @param count - 重試次數
 * @param delayMs - 重試延遲（毫秒）
 * @returns RxJS 操作符
 */
export const retryWithDelay = <T>(
  count: number,
  delayMs: number = 1000
): OperatorFunction<T, T> => {
  return source$ => source$.pipe(
    retryWhen(errors$ =>
      errors$.pipe(
        tap(error => console.warn('Effect retry:', error)),
        delay(delayMs),
        take(count),
        concatMap((_, index) => 
          index === count - 1 
            ? throwError(new Error('Max retries exceeded'))
            : of(null)
        )
      )
    )
  );
};

/**
 * 忽略錯誤，繼續執行
 * 
 * @param logError - 是否記錄錯誤
 * @returns RxJS 操作符
 */
export const ignoreErrors = <T>(
  logError: boolean = true
): OperatorFunction<T, T> => {
  return source$ => source$.pipe(
    catchError(error => {
      if (logError) {
        console.error('Effect error (ignored):', error);
      }
      return EMPTY;
    })
  );
};

// ============================================================================
// 時間相關操作符
// ============================================================================

/**
 * 防抖：在指定時間內只執行最後一次
 * 
 * @param dueTime - 防抖時間（毫秒）
 * @returns RxJS 操作符
 */
export const debounceEffect = <T>(
  dueTime: number
): OperatorFunction<T, T> => {
  return debounceTime(dueTime);
};

/**
 * 延遲執行
 * 
 * @param delayMs - 延遲時間（毫秒）
 * @returns RxJS 操作符
 */
export const delayEffect = <T>(
  delayMs: number
): OperatorFunction<T, T> => {
  return delay(delayMs);
};

/**
 * 週期性執行，直到取消
 * 
 * @param intervalMs - 間隔時間（毫秒）
 * @param cancel$ - 取消信號
 * @returns RxJS 操作符
 */
export const repeatUntil = <T>(
  intervalMs: number,
  cancel$: Observable<any>
): OperatorFunction<T, T> => {
  return source$ => source$.pipe(
    switchMap(value => 
      timer(0, intervalMs).pipe(
        map(() => value),
        takeUntil(cancel$)
      )
    )
  );
};

// ============================================================================
// Action 創建操作符
// ============================================================================

/**
 * 映射為新的 Action
 * 
 * @param actionCreator - Action 創建函數
 * @returns RxJS 操作符
 */
export const mapToAction = <T, A extends BaseAction>(
  actionCreator: (...args: any[]) => A
): OperatorFunction<T, A> => {
  return map((value: T) => {
    if (typeof actionCreator === 'function') {
      return actionCreator(value);
    }
    return actionCreator;
  });
};

/**
 * 根據條件映射不同的 Action
 * 
 * @param condition - 條件函數
 * @param onTrue - 條件為真時的 Action 創建函數
 * @param onFalse - 條件為假時的 Action 創建函數
 * @returns RxJS 操作符
 */
export const mapToActionIf = <T, A extends BaseAction>(
  condition: (value: T) => boolean,
  onTrue: (value: T) => A,
  onFalse?: (value: T) => A
): OperatorFunction<T, A> => {
  return map((value: T) => {
    if (condition(value)) {
      return onTrue(value);
    }
    if (onFalse) {
      return onFalse(value);
    }
    throw new Error('No action creator for false condition');
  });
};

/**
 * 成功和失敗的 Action 映射
 * 
 * @param successCreator - 成功 Action 創建函數
 * @param errorCreator - 錯誤 Action 創建函數
 * @returns RxJS 操作符
 */
export const mapToSuccessOrError = <T, S extends BaseAction, E extends BaseAction>(
  successCreator: (value: T) => S,
  errorCreator: (error: any) => E
): OperatorFunction<T, S | E> => {
  return source$ => source$.pipe(
    map(value => successCreator(value)),
    catchError(error => of(errorCreator(error)))
  );
};

// ============================================================================
// 工具操作符
// ============================================================================

/**
 * 除錯操作符：記錄流中的值
 * 
 * @param label - 除錯標籤
 * @param logger - 自定義日誌函數
 * @returns RxJS 操作符
 */
export const debug = <T>(
  label: string = 'Debug',
  logger: (message: string) => void = console.log
): OperatorFunction<T, T> => {
  return tap(value => {
    logger(`[${label}]: ${JSON.stringify(value)}`);
  });
};

/**
 * 計時操作符：測量執行時間
 * 
 * @param label - 計時標籤
 * @returns RxJS 操作符
 */
export const timeIt = <T>(
  label: string = 'Timer'
): OperatorFunction<T, T> => {
  return source$ => new Observable(subscriber => {
    const startTime = performance.now();
    
    return source$.subscribe({
      next: value => {
        const duration = performance.now() - startTime;
        console.log(`[${label}] Duration: ${duration.toFixed(2)}ms`);
        subscriber.next(value);
      },
      error: error => subscriber.error(error),
      complete: () => subscriber.complete()
    });
  });
};

/**
 * 條件過濾：只有滿足條件時才通過
 * 
 * @param condition - 條件函數
 * @returns RxJS 操作符
 */
export const filterWhen = <T>(
  condition: (value: T) => boolean
): OperatorFunction<T, T> => {
  return filter(condition);
};

/**
 * 安全映射：捕獲映射函數中的錯誤
 * 
 * @param mapFn - 映射函數
 * @param fallback - 錯誤時的回退值
 * @returns RxJS 操作符
 */
export const safeMap = <T, R>(
  mapFn: (value: T) => R,
  fallback?: R
): OperatorFunction<T, R> => {
  return source$ => source$.pipe(
    map(value => {
      try {
        return mapFn(value);
      } catch (error) {
        console.error('Safe map error:', error);
        if (fallback !== undefined) {
          return fallback;
        }
        throw error;
      }
    })
  );
};

// ============================================================================
// 組合操作符
// ============================================================================

/**
 * 建立一個常見的 Effect 處理鏈
 * 
 * @param config - Effect 鏈配置
 * @returns RxJS 操作符
 */
export const createEffectChain = <T, R>(config: {
  /** Action 類型過濾 */
  actionTypes?: string[];
  /** 執行策略 */
  strategy?: EffectStrategy;
  /** 防抖時間 */
  debounce?: number;
  /** 重試配置 */
  retry?: { count: number; delay: number };
  /** Effect 執行函數 */
  effect: (value: T) => Observable<R>;
}): OperatorFunction<BaseAction, R> => {
  const { actionTypes, strategy = 'merge', debounce, retry: retryConfig, effect } = config;
  
  return (source$: Observable<BaseAction>): Observable<R> => {
    let stream$: Observable<any> = source$;
    
    // Action 過濾
    if (actionTypes && actionTypes.length > 0) {
      stream$ = stream$.pipe(ofType(...actionTypes));
    }
    
    // 防抖
    if (debounce && debounce > 0) {
      stream$ = stream$.pipe(debounceEffect(debounce));
    }
    
    // 執行 Effect
    stream$ = stream$.pipe(executeWith(strategy, effect));
    
    // 重試處理
    if (retryConfig) {
      stream$ = stream$.pipe(
        retryWithDelay(retryConfig.count, retryConfig.delay)
      );
    }
    
    return stream$ as Observable<R>;
  };
};
