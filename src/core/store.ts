/**
 * TsStoreX 增強版 Store 系統 - 瘦身版
 * 核心 Store 實現，所有額外功能已拆分到專門模組
 */

import { BehaviorSubject, Observable, OperatorFunction, Subject, Subscription } from 'rxjs';
import { map, distinctUntilChanged, takeUntil, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

// 型別匯入（從拆分後的型別檔案）
import  {
  Dispatch,
  Middleware,
  MiddlewareAPI,
  EnhancedStoreConfig,
  StoreDebugInfo,
  Reducer
} from './types';

import  {
  Effect,
  EffectConfig
} from '../effects/types';


// Signal 功能匯入（從拆分後的 Signal 模組）
import { 
  createOptimizedSignalProjector,
  useSelector,
  type SignalProjector,
  type SignalSelector,
  type SignalOptions
} from '../signals';

// 工具匯入（從拆分後的工具模組）
import { detectEnvironment, isBrowser } from '../utils/environment';
import { createLogger, type Logger } from '../utils/logger';
import { composeMiddleware } from '../utils/compose';
import { BaseAction } from './types';

// Builder 功能匯入（從拆分後的 Builder 模組）
import { 
  createStoreBuilder,
  createStore,
  store,
  type StoreBuilder
} from './builder';

// ============================================================================
// 增強版 Store 核心實現
// ============================================================================

export class EnhancedStore<T> {
  private _state$ = new BehaviorSubject<T>(this.initialState);
  private _action$ = new Subject<BaseAction>();
  private _destroy$ = new Subject<void>();
  private reducer: Reducer<T>;
  private middleware: Middleware<T>[] = [];
  private effects: EffectConfig[] = [];
  private effectSubscriptions: Subscription[] = [];
  private signalProjector: SignalProjector<T>;
  private logger: Logger;
  private rawDispatch!: Dispatch;
  
  public dispatch!: Dispatch;
  public readonly state$: Observable<T>;
  public readonly action$: Observable<BaseAction>;

  constructor(
    reducer: Reducer<T>,
    private initialState: T,
    private config: EnhancedStoreConfig<T> = {}
  ) {
    this.reducer = reducer;
    this.middleware = config.middleware || [];
    this.effects = config.effects || [];
    
    this.logger = createLogger({
      source: 'EnhancedStore',
      level: config.logLevel || 'info'
    });

    this.state$ = this._state$.asObservable();
    this.action$ = this._action$.asObservable();

    // 初始化 Signal 投影器（使用拆分的模組）
    this.signalProjector = createOptimizedSignalProjector(this.state$, {
      logLevel: config.logLevel ?? 'info'
    });

    this.setupRawDispatch();
    this.setupMiddleware();
    this.startEffects();

    this.logger.info('Enhanced Store initialized', {
      middleware: this.middleware.length,
      effects: this.effects.length,
      environment: detectEnvironment(),
      signalsEnabled: isBrowser() && config.enableSignals !== false
    });
  }

  // ============================================================================
  // 核心狀態管理
  // ============================================================================

  getState(): T {
    return this._state$.getValue();
  }

  // ============================================================================
  // Signal 投影介面（使用拆分的模組）
  // ============================================================================

  select<R>(
    selector: (state: T) => R,
    options?: SignalOptions
  ): SignalSelector<R> | null {
    return this.signalProjector.createSignal(selector, options);
  }

  selectMemo<R>(
    selector: (state: T) => R,
    options?: SignalOptions
  ): SignalSelector<R> | null {
    return this.signalProjector.createMemoSignal(selector, options);
  }

  // ============================================================================
  // RxJS 介面
  // ============================================================================

  selectState<R>(
    selector: (state: T) => R,
    equals?: (a: R, b: R) => boolean
  ): Observable<R> {
    return this.state$.pipe(
      map(selector),
      distinctUntilChanged(equals || ((a, b) => a === b))
    );
  }

  subscribe(observer: {
    next?: (state: T) => void;
    error?: (error: any) => void;
    complete?: () => void;
  }): Subscription {
    return this.state$.subscribe(observer);
  }

  pipe<R>(...operators: OperatorFunction<any, any>[]): Observable<R> {
    return (this.state$.pipe as any)(...operators) as Observable<R>;
  }

  // ============================================================================
  // 動態配置 API
  // ============================================================================

  addMiddleware(middleware: Middleware<T>): void {
    this.middleware.push(middleware);
    this.setupMiddleware();
    this.logger.info('Middleware added and reapplied');
  }

  removeMiddleware(middleware: Middleware<T>): void {
    const index = this.middleware.indexOf(middleware);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      this.setupMiddleware();
      this.logger.info('Middleware removed and reapplied');
    }
  }

  addEffect(name: string, effect: Effect<T>, config?: EffectConfig['config']): void {
    if (this.effects.some(e => e.name === name)) {
      this.logger.warn(`Effect "${name}" already exists, replacing...`);
      this.removeEffect(name);
    }

    const effectConfig: EffectConfig = { name, effect, config: config ?? undefined };
    this.effects.push(effectConfig);
    
    this.startSingleEffect(effectConfig);
    
    this.logger.info(`Effect "${name}" added and started`);
  }

  removeEffect(name: string): void {
    const index = this.effects.findIndex(e => e.name === name);
    if (index !== -1) {
      this.effects.splice(index, 1);
      this.stopEffects();
      this.startEffects();
      this.logger.info(`Effect "${name}" removed`);
    }
  }

  replaceReducer(newReducer: Reducer<T>): void {
    this.reducer = newReducer;
    this.logger.info('Reducer replaced (hot reload)');
  }

  // ============================================================================
  // 內部實現
  // ============================================================================

  private setupRawDispatch(): void {
    this.rawDispatch = (action: BaseAction) => {
      if (!action || !action.type) {
        throw new Error('Invalid action: missing type');
      }

      try {
        this.logger.debug(`Dispatching: ${action.type}`);

        this._action$.next(action);

        const currentState = this.getState();
        const newState = this.reducer(currentState, action);

        if (newState === undefined) {
          this.logger.warn(`Reducer returned undefined for action: ${action.type}`);
          return;
        }

        if (newState !== currentState) {
          this._state$.next(newState);
          this.logger.debug(`State updated by action: ${action.type}`);
        }
      } catch (error) {
        this.logger.error(`Error dispatching action ${action.type}:`, error);
        throw error;
      }
    };

    this.dispatch = this.rawDispatch;
  }

  private setupMiddleware(): void {
    if (this.middleware.length === 0) {
      this.dispatch = this.rawDispatch;
      return;
    }

    const middlewareAPI: MiddlewareAPI<T> = {
      getState: () => this.getState(),
      dispatch: (action) => this.dispatch(action)
    };

    try {
      this.dispatch = composeMiddleware(middlewareAPI, this.middleware, this.rawDispatch) as Dispatch;
      this.logger.debug(`${this.middleware.length} middleware(s) applied`);
    } catch (error) {
      this.logger.error('Failed to setup middleware:', error);
      throw error;
    }
  }

  private startEffects(): void {
    this.effects.forEach(effectConfig => {
      this.startSingleEffect(effectConfig);
    });
  }

  private startSingleEffect(effectConfig: EffectConfig): void {
    try {
      const effect$ = effectConfig.effect(this.action$, this.state$).pipe(
        takeUntil(this._destroy$),
        catchError((error) => {
          this.logger.error(`Effect ${effectConfig.name} error:`, error);
          return EMPTY;
        })
      );

      const subscription = effect$.subscribe({
        next: (action) => {
          if (action) {
            this.dispatch(action);
          }
        },
        error: (error) => {
          this.logger.error(`Effect ${effectConfig.name} subscription error:`, error);
        }
      });

      this.effectSubscriptions.push(subscription);
      this.logger.debug(`Effect "${effectConfig.name}" started`);
    } catch (error) {
      this.logger.error(`Failed to start effect ${effectConfig.name}:`, error);
    }
  }

  private stopEffects(): void {
    this.effectSubscriptions.forEach(sub => sub.unsubscribe());
    this.effectSubscriptions = [];
  }

  // ============================================================================
  // 生命週期管理
  // ============================================================================

  destroy(): void {
    this.logger.info('Destroying Enhanced Store...');

    this.stopEffects();
    this.signalProjector.destroy();

    this._destroy$.next();
    this._destroy$.complete();

    this._action$.complete();
    this._state$.complete();

    this.logger.info('Enhanced Store destroyed');
  }

  // ============================================================================
  // 調試工具
  // ============================================================================

  getStoreInfo(): StoreDebugInfo<T> {
    return {
      environment: detectEnvironment(),
      signalsEnabled: isBrowser() && this.config.enableSignals !== false,
      middlewareCount: this.middleware.length,
      effectsCount: this.effects.length,
      effectNames: this.effects.map(e => e.name),
      currentStateSnapshot: this.getState(),
      hasActiveSubscriptions: !this._state$.closed
    };
  }

  reset(): void {
    this.logger.warn('Resetting Store to initial state');
    this._state$.next(this.initialState);
  }
}

// ============================================================================
// 重新匯出拆分的模組功能
// ============================================================================

export { 
  // Builder 模組
  createStoreBuilder, 
  createStore, 
  store, 
  
  // Signal 模組
  useSelector,
  
};