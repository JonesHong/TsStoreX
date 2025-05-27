/**
 * TsStoreX Store 核心系統
 * 基於 RxJS 的響應式狀態管理 + Signal 投影
 */

import { BehaviorSubject, Observable, OperatorFunction, Subject, Subscription } from 'rxjs';
import { map, distinctUntilChanged, takeUntil, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

// 導入已實現的模組
import { isBrowser, isServer, detectEnvironment } from '../utils/environment';
import { createLogger, Logger } from '../utils/logger';
import { BaseAction } from './action';
import { Reducer } from './reducer';

// ============================================================================
// Store 專用型別定義
// ============================================================================

export interface Dispatch {
    (action: BaseAction): void;
}

export interface Middleware<T = any> {
    (store: MiddlewareAPI<T>): (next: Dispatch) => Dispatch;
}

export interface MiddlewareAPI<T = any> {
    getState: () => T;
    dispatch: Dispatch;
}

export interface SignalSelector<R> {
    (): R;
    latest: R;
}

export interface SignalOptions {
    key?: string;
    equals?: (a: any, b: any) => boolean;
}

export interface StoreConfig<T> {
    middleware?: Middleware<T>[];
    enhancers?: any[];
    enableSignals?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// ============================================================================
// Signal 投影系統
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

    /**
     * 創建 Signal 投影
     * 瀏覽器環境：RxJS → Signal 單向同步
     * 服務端環境：返回 null，優雅降級
     */
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
                // 同步載入 SolidJS
                // jest.doMock('solid-js') 可以在這裡攔截並拋錯
                // 若拋錯，就會進入下面的 catch，並 return null
                // tslint:disable-next-line: no-var-requires
                const { createSignal: solidCreateSignal } = require('solid-js');

                // 取到初始值（同步方式）
                let initialValue: R;
                const sub = this.state$
                    .pipe(map(selector))
                    .subscribe(v => {
                        initialValue = v;
                        sub.unsubscribe();
                    });

                // 建立 SolidJS signal
                const [signal, setSignal] = solidCreateSignal(initialValue!, {
                    equals: options.equals || ((a, b) => a === b)
                });

                // RxJS → Signal 單向同步
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

                // 增強的 SignalSelector 介面
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

    /**
     * 創建記憶化 Signal 投影
     * 適用於複雜計算的快取優化
     */
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
                // 同步載入 SolidJS
                // tslint:disable-next-line: no-var-requires
                const { createSignal: solidCreateSignal, createMemo } = require('solid-js');

                // 取到初始值
                let initialValue: R;
                const sub = this.state$
                    .pipe(map(selector))
                    .subscribe(v => {
                        initialValue = v;
                        sub.unsubscribe();
                    });

                // 建立 currentState signal
                const [currentState, setCurrentState] = solidCreateSignal(initialValue!, {
                    equals: options.equals || ((a, b) => a === b)
                });

                // 建立記憶化 memo
                const memoSignal = createMemo(() => currentState()) as SignalSelector<R>;

                // RxJS → Signal 單向同步
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

                // 增強的 SignalSelector 介面
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

    private generateKey(fn: Function): string {
        return `selector_${fn.toString().slice(0, 50)}_${Date.now()}`;
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
// 中間件組合工具
// ============================================================================

const compose = (...funcs: Function[]) => {
    if (funcs.length === 0) {
        return <T>(arg: T) => arg;
    }
    if (funcs.length === 1) {
        return funcs[0];
    }
    return funcs.reduce((a, b) => (...args: any[]) => a(b(...args)));
};

// ============================================================================
// 核心 Store 實現
// ============================================================================

export class Store<T> {
    private _state$ = new BehaviorSubject<T>(this.initialState);
    private _action$ = new Subject<BaseAction>();
    private _destroy$ = new Subject<void>();
    private reducer: Reducer<T>;
    private middleware: Middleware<T>[] = [];
    private signalProjector: SignalProjector<T>;
    private logger: Logger;
    private rawDispatch: Dispatch;
    dispatch: Dispatch;

    // 公開的響應式流
    public readonly state$: Observable<T>;
    public readonly action$: Observable<BaseAction>;

    constructor(
        reducer: Reducer<T>,
        private initialState: T,
        config: StoreConfig<T> = {}
    ) {
        this.reducer = reducer;
        this.middleware = config.middleware || [];
        this.logger = createLogger({
            source: 'Store',
            level: config.logLevel || 'info'
        });

        // 初始化響應式流
        this.state$ = this._state$.asObservable();
        this.action$ = this._action$.asObservable();

        // 初始化 Signal 投影器
        this.signalProjector = new SignalProjector(this.state$, config.logLevel);

        // 原始 dispatch 方法
        this.rawDispatch = (action: BaseAction) => {
            if (!action || !action.type) {
                throw new Error('Invalid action: missing type');
            }
            try {

                this.logger.debug(`Dispatching: ${action.type}`);

                // 發送 action 到流中
                this._action$.next(action);

                const currentState = this.getState();
                const newState = this.reducer(currentState, action);

                if (newState === undefined) {
                    this.logger.warn(`Reducer returned undefined for action: ${action.type}`);
                    return;
                }

                // 只有在狀態真正改變時才更新
                if (newState !== currentState) {
                    this._state$.next(newState);
                    this.logger.debug(`State updated by action: ${action.type}`);
                }
            } catch (error) {
                this.logger.error(`Error dispatching action ${action.type}:`, error);
                throw error;
            }
        };

        // 再把 dispatch 指向 rawDispatch
        this.dispatch = this.rawDispatch;
        this.setupMiddleware();

        this.logger.info('Store initialized with RxJS core');

        if (isBrowser() && config.enableSignals !== false) {
            this.logger.info('Signal projection enabled for browser environment');
        }
    }

    /**
     * Store 工廠方法
     * 提供便利的 Store 創建介面
     */
    static create<T>(
        reducer: Reducer<T>,
        initialState: T,
        config: StoreConfig<T> = {}
    ): Store<T> {
        return new Store(reducer, initialState, config);
    }

    // ============================================================================
    // 核心狀態管理介面
    // ============================================================================

    /**
     * 獲取當前狀態
     */
    getState(): T {
        return this._state$.getValue();
    }


    // ============================================================================
    // Signal 投影介面（瀏覽器專用）
    // ============================================================================

    /**
     * 創建 Signal 選擇器
     * 瀏覽器環境：返回 Signal，享受細粒度更新
     * 服務端環境：返回 null，優雅降級
     */
    select<R>(
        selector: (state: T) => R,
        options?: SignalOptions
    ): SignalSelector<R> | null {
        return this.signalProjector.createSignal(selector, options);
    }

    /**
     * 創建記憶化 Signal 選擇器
     * 適用於複雜計算的性能優化
     */
    selectMemo<R>(
        selector: (state: T) => R,
        options?: SignalOptions
    ): SignalSelector<R> | null {
        return this.signalProjector.createMemoSignal(selector, options);
    }

    // ============================================================================
    // RxJS 傳統介面（跨環境）
    // ============================================================================

    /**
     * RxJS 管道操作符
     * 提供完整的 RxJS 響應式能力
     */
    pipe<R>(operators: OperatorFunction<any, any>[]): Observable<R> {
        // 把 this.state$.pipe 當成 any function，apply 動態陣列
        return (this.state$.pipe as any).apply(this.state$, operators) as Observable<R>;
    }



    /**
     * 訂閱狀態變化
     * 通用的狀態監聽介面
     */
    subscribe(observer: {
        next?: (state: T) => void;
        error?: (error: any) => void;
        complete?: () => void;
    }): Subscription {
        return this.state$.subscribe(observer);
    }

    /**
     * 選擇並訂閱部分狀態
     * RxJS 版本的選擇器
     */
    selectState<R>(
        selector: (state: T) => R,
        equals?: (a: R, b: R) => boolean
    ): Observable<R> {
        return this.state$.pipe(
            map(selector),
            distinctUntilChanged(equals || ((a, b) => a === b))
        );
    }

    // ============================================================================
    // 中間件系統
    // ============================================================================

    private setupMiddleware(): void {
        if (this.middleware.length === 0) {
            this.logger.debug('No middleware configured');
            return;
        }

        const middlewareAPI: MiddlewareAPI<T> = {
            getState: () => this.getState(),
            dispatch: (action) => this.dispatch(action)
        };

        try {
            const chain = this.middleware.map(middleware => middleware(middlewareAPI));
            const composed = compose(...chain);
            if (!composed) {
                // 沒拿到任何 middleware，直接回退到最原始的 dispatch
                this.dispatch = this.rawDispatch;
            } else {
                this.dispatch = composed(this.rawDispatch);
            }
            this.logger.info(`${this.middleware.length} middleware(s) applied`);
        } catch (error) {
            this.logger.error('Failed to setup middleware:', error);
            throw error;
        }
    }

    // ============================================================================
    // 生命週期管理
    // ============================================================================

    /**
     * 銷毀 Store
     * 清理所有訂閱和資源
     */
    destroy(): void {
        this.logger.info('Destroying Store...');

        // 發送銷毀信號
        this._destroy$.next();
        this._destroy$.complete();

        // 銷毀 Signal 投影器
        this.signalProjector.destroy();

        // 完成所有流
        this._action$.complete();
        this._state$.complete();

        this.logger.info('Store destroyed');
    }

    // ============================================================================
    // 調試和開發工具
    // ============================================================================

    /**
     * 獲取 Store 當前統計信息
     */
    getStoreInfo() {
        return {
            environment: detectEnvironment(),
            signalsEnabled: isBrowser(),
            middlewareCount: this.middleware.length,
            currentStateSnapshot: this.getState(),
            hasActiveSubscriptions: !this._state$.closed
        };
    }

    /**
     * 重置 Store 到初始狀態
     * 主要用於測試和開發
     */
    reset(): void {
        this.logger.warn('Resetting Store to initial state');
        this._state$.next(this.initialState);
    }
}

// ============================================================================
// 便利函數
// ============================================================================

// overload #1：編輯器在「瀏覽器環境」會推論成 SignalSelector<R>
export function useSelector<T, R>(
    store: Store<T>,
    selector: (state: T) => R,
    options?: SignalOptions
): SignalSelector<R>;

// overload #2：編輯器在「伺服器環境」會推論成 Observable<R>
export function useSelector<T, R>(
    store: Store<T>,
    selector: (state: T) => R,
    options?: SignalOptions
): Observable<R>;

/**
 * 統一的選擇器介面
 * 自動適配環境，返回最適合的響應式類型
 */
export function useSelector<T, R>(
    store: Store<T>,
    selector: (state: T) => R,
    options?: SignalOptions
): SignalSelector<R> | Observable<R> {
    const signal = store.select(selector, options);

    if (signal) {
        return signal; // 瀏覽器環境返回 Signal
    }

    // 服務端環境返回 Observable
    return store.selectState(selector, options?.equals);
};

/**
 * 創建 Store 的便利函數
 */
export const createStore = <T>(
    reducer: Reducer<T>,
    initialState: T,
    config?: StoreConfig<T>
): Store<T> => {
    return Store.create(reducer, initialState, config);
};