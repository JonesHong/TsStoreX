/**
 * TsStoreX Signal 選擇器
 * 從 store.ts 移出的 useSelector 函數  
 */

import { Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

// 型別匯入
import type { SignalSelector, SignalOptions } from './types';

// ============================================================================
// useSelector 函數（直接從 store.ts 移植）
// ============================================================================

export function useSelector<T, R>(
  store: { select: (selector: (state: T) => R, options?: SignalOptions) => SignalSelector<R> | null },
  selector: (state: T) => R,
  options?: SignalOptions
): SignalSelector<R>;

export function useSelector<T, R>(
  store: { selectState: (selector: (state: T) => R, equals?: (a: R, b: R) => boolean) => Observable<R> },
  selector: (state: T) => R,
  options?: SignalOptions
): Observable<R>;

export function useSelector<T, R>(
  store: any,
  selector: (state: T) => R,
  options: SignalOptions = {}
): SignalSelector<R> | Observable<R> {
  const signal = store.select?.(selector, options);

  if (signal) {
    return signal; // 瀏覽器環境返回 Signal
  }

  // 服務端環境返回 Observable
  if (store.selectState) {
    return store.selectState(selector, options.equals);
  }
  
  if (store.state$) {
    return store.state$.pipe(
      map(selector),
      distinctUntilChanged(options.equals || ((a, b) => a === b))
    );
  }
  
  throw new Error('Invalid store object');
}