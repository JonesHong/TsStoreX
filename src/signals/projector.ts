/**
 * TsStoreX Signal 投影系統
 * 從 store.ts 移出的 SignalProjector 類別
 */

import { Observable, Subject, Subscription } from 'rxjs';
import { map, distinctUntilChanged, takeUntil, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

// 型別匯入
import type { SignalSelector, SignalOptions } from './types';

// 工具匯入
import { isServer } from '../utils/environment';
import { createLogger, type Logger } from '../utils/logger';
import { generateKey } from '../utils/cache';

// ============================================================================
// Signal 投影器（直接從 store.ts 移植）
// ============================================================================

export class SignalProjector<T> {
  private _signalCache = new Map<string, SignalSelector<any>>();
  private _subscriptions = new Map<string, Subscription>();
  private _destroy$ = new Subject<void>();
  private logger: Logger;

  constructor(
    private state$: Observable<T>,
    logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info'
  ) {
    this.logger = createLogger({
      source: 'SignalProjector',
      level: logLevel
    });
  }

  createSignal<R>(
    selector: (state: T) => R,
    options: SignalOptions = {}
  ): SignalSelector<R> | null {
    if (isServer()) {
      this.logger.debug('Server environment detected, Signal projection disabled');
      return null;
    }

    const cacheKey = options.key || this.generateKey(selector);

    if (!this._signalCache.has(cacheKey)) {
      try {
        const { createSignal: solidCreateSignal } = require('solid-js');

        let initialValue: R;
        const sub = this.state$
          .pipe(map(selector))
          .subscribe(v => {
            initialValue = v;
            sub.unsubscribe();
          });

        const [signal, setSignal] = solidCreateSignal(initialValue!, {
          equals: options.equals || ((a, b) => a === b)
        });

        const subscription = this.state$
          .pipe(
            map(selector),
            distinctUntilChanged(options.equals || ((a, b) => a === b)),
            takeUntil(this._destroy$),
            catchError(error => {
              this.logger.error(`Signal projection stream error for key ${cacheKey}:`, error);
              return EMPTY;
            })
          )
          .subscribe({
            next: newValue => {
              if (typeof newValue === 'function') {
                this.logger.warn(
                  `Selector returned a function for key ${cacheKey}, expected a value.`
                );
                return;
              }
              setSignal(newValue as Exclude<R, Function>);
            },
            error: error => {
              this.logger.error(`Signal projection error for key ${cacheKey}:`, error);
            }
          });

        const enhanced = Object.assign(signal, {
          get latest() {
            return signal();
          }
        }) as SignalSelector<R>;

        this._signalCache.set(cacheKey, enhanced);
        this._subscriptions.set(cacheKey, subscription);

        this.logger.debug(`Signal projection created: ${cacheKey}`);
      } catch (error) {
        this.logger.warn('Failed to create signal projection:', error);
        return null;
      }
    }

    return this._signalCache.get(cacheKey)!;
  }

  createMemoSignal<R>(
    selector: (state: T) => R,
    options: SignalOptions = {}
  ): SignalSelector<R> | null {
    if (isServer()) {
      this.logger.debug('Server environment detected, Memo Signal projection disabled');
      return null;
    }

    const cacheKey = options.key || `memo_${this.generateKey(selector)}`;

    if (!this._signalCache.has(cacheKey)) {
      try {
        const { createSignal: solidCreateSignal, createMemo } = require('solid-js');

        let initialValue: R;
        const sub = this.state$
          .pipe(map(selector))
          .subscribe(v => {
            initialValue = v;
            sub.unsubscribe();
          });

        const [currentState, setCurrentState] = solidCreateSignal(initialValue!, {
          equals: options.equals || ((a, b) => a === b)
        });

        const memoSignal = createMemo(() => currentState()) as SignalSelector<R>;

        const subscription = this.state$
          .pipe(
            map(selector),
            distinctUntilChanged(options.equals || ((a, b) => a === b)),
            takeUntil(this._destroy$),
            catchError(error => {
              this.logger.error(
                `Memo Signal projection stream error for key ${cacheKey}:`,
                error
              );
              return EMPTY;
            })
          )
          .subscribe({
            next: newState => {
              setCurrentState(newState as any);
            },
            error: error => {
              this.logger.error(`Memo Signal projection error for key ${cacheKey}:`, error);
            }
          });

        const enhanced = Object.assign(memoSignal, {
          get latest() {
            return memoSignal();
          }
        }) as SignalSelector<R>;

        this._signalCache.set(cacheKey, enhanced);
        this._subscriptions.set(cacheKey, subscription);

        this.logger.debug(`Memo Signal projection created: ${cacheKey}`);
      } catch (error) {
        this.logger.warn('Failed to create memo signal projection:', error);
        return null;
      }
    }

    return this._signalCache.get(cacheKey)!;
  }

  private generateKey(selector: Function): string {
    return generateKey(selector, 'signal');
  }

  destroy(): void {
    this._subscriptions.forEach(s => s.unsubscribe());
    this._subscriptions.clear();
    this._signalCache.clear();
    this._destroy$.next();
    this._destroy$.complete();
    this.logger.debug('SignalProjector destroyed');
  }
}

// ============================================================================
// 工廠函數
// ============================================================================

export const createSignalProjector = <T>(
  state$: Observable<T>,
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
): SignalProjector<T> => {
  return new SignalProjector(state$, logLevel);
};

export const createOptimizedSignalProjector = <T>(
  state$: Observable<T>,
  config: { logLevel?: 'debug' | 'info' | 'warn' | 'error'; enableCache?: boolean } = {}
): SignalProjector<T> => {
  return new SignalProjector(state$, config.logLevel);
};