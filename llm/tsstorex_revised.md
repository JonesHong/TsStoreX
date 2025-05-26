# TsStoreX v0.0.1 - RxJS Core + Signal Projection 架構規劃

## 設計原則

1. **RxJS 為核心** - 所有狀態邏輯基於 RxJS，確保跨環境一致性
2. **Signal 為視圖層優化** - 僅在瀏覽器環境提供 SolidJS Signal 投影
3. **單向數據流** - RxJS → Signal 單向同步，保持數據流清晰
4. **環境無關** - 核心功能在所有環境都可用
5. **漸進增強** - Signal 功能為可選增強，不影響核心邏輯
6. **優雅降級** - SSR/Node.js 環境自動回退到純 RxJS

## 第三方庫選型

### 核心依賴
- **rxjs**: 狀態管理核心，提供響應式編程能力
- **immer**: 不可變狀態更新，提供直觀的狀態修改語法
- **solid-js**: 瀏覽器環境專用，提供 Signal 投影能力

## 核心型別系統

### 基礎型別定義
```typescript
// Action 型別
export interface BaseAction {
  type: string;
  timestamp: number;
  id: string;
}

export type Action<T = void> = T extends void 
  ? BaseAction 
  : BaseAction & { payload: T };

export type ActionCreator<T = void> = T extends void
  ? () => Action<T>
  : (payload: T) => Action<T>;

// Store 相關型別
export interface Reducer<T> {
  (state: T, action: BaseAction): T;
}

export interface Middleware<T = any> {
  (store: MiddlewareAPI<T>): (next: Dispatch) => Dispatch;
}

export interface MiddlewareAPI<T = any> {
  getState: () => T;
  dispatch: Dispatch;
}

export interface Dispatch {
  (action: BaseAction): void;
}

// Signal 相關型別
export interface SignalSelector<R> {
  (): R;
  latest: R;
}

export interface SignalOptions {
  key?: string;
  equals?: (a: any, b: any) => boolean;
}
```

## 環境檢測系統

```typescript
export type Environment = 'browser' | 'node' | 'webworker' | 'unknown';

const detectEnvironment = (): Environment => {
  // Web Worker 檢測
  if (typeof self !== 'undefined' && 'importScripts' in self) {
    return 'webworker';
  }
  // Node.js 檢測
  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'node';
  }
  // 瀏覽器檢測
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser';
  }
  return 'unknown';
};

export const isBrowser = () => detectEnvironment() === 'browser';
export const isServer = () => !isBrowser();
```

## 簡易 Logger 系統

```typescript
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export const createLogger = (level: 'debug' | 'info' | 'warn' | 'error' = 'info'): Logger => {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[level];
  
  const log = (logLevel: string, message: string, ...args: any[]) => {
    if (levels[logLevel as keyof typeof levels] >= currentLevel) {
      console[logLevel as keyof Console](`[${new Date().toISOString()}] ${logLevel.toUpperCase()}: ${message}`, ...args);
    }
  };
  
  return {
    debug: (message: string, ...args: any[]) => log('debug', message, ...args),
    info: (message: string, ...args: any[]) => log('info', message, ...args),
    warn: (message: string, ...args: any[]) => log('warn', message, ...args),
    error: (message: string, ...args: any[]) => log('error', message, ...args)
  };
};
```

## 核心 Action 系統

```typescript
export const createAction = <T = void>(type: string): ActionCreator<T> => {
  const actionCreator = ((payload?: T) => ({
    type,
    ...(payload !== undefined && { payload }),
    timestamp: Date.now(),
    id: crypto.randomUUID()
  })) as ActionCreator<T>;
  
  actionCreator.type = type;
  return actionCreator;
};

// Action 群組創建
export const createActionGroup = <T extends Record<string, any>>(config: {
  source: string;
  events: T;
}): { [K in keyof T]: ActionCreator<T[K]> } => {
  const actions = {} as { [K in keyof T]: ActionCreator<T[K]> };
  
  for (const key of Object.keys(config.events)) {
    const type = `[${config.source}] ${key}`;
    actions[key as keyof T] = createAction<T[typeof key]>(type);
  }
  
  return actions;
};
```

## Immer 增強的 Reducer 系統

```typescript
import { produce, Draft } from 'immer';

export interface ReducerHandler<T, A extends BaseAction> {
  type: string;
  reducer: (state: Draft<T>, action: A) => T | void;
}

export const on = <T, A extends Action<any>>(
  actionCreator: ActionCreator<A extends Action<infer P> ? P : never>,
  reducer: (state: Draft<T>, action: A) => T | void
): ReducerHandler<T, A> => ({
  type: actionCreator.type,
  reducer
});

export const createReducer = <T>(
  initialState: T,
  ...handlers: Array<ReducerHandler<T, any>>
): Reducer<T> => {
  const handlerMap = handlers.reduce((acc, handler) => {
    acc[handler.type] = handler.reducer;
    return acc;
  }, {} as Record<string, (state: Draft<T>, action: any) => T | void>);
  
  return (state = initialState, action: BaseAction): T => {
    const handler = handlerMap[action.type];
    if (!handler) return state;
    
    return produce(state, (draft) => {
      const result = handler(draft, action);
      return result !== undefined ? result : undefined;
    });
  };
};

// Reducer 組合器
export const combineReducers = <T extends Record<string, any>>(
  reducers: { [K in keyof T]: Reducer<T[K]> }
): Reducer<T> => {
  return (state: T | undefined, action: BaseAction): T => {
    if (!state) {
      const initialState = {} as T;
      for (const key in reducers) {
        initialState[key] = reducers[key](undefined as any, action);
      }
      return initialState;
    }
    
    return produce(state, (draft) => {
      let hasChanged = false;
      
      for (const key in reducers) {
        const previousStateForKey = state[key];
        const nextStateForKey = reducers[key](previousStateForKey, action);
        
        if (nextStateForKey !== previousStateForKey) {
          (draft as any)[key] = nextStateForKey;
          hasChanged = true;
        }
      }
      
      if (!hasChanged) {
        return state;
      }
    });
  };
};
```

## Signal 投影系統

```typescript
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

export class SignalProjector<T> {
  private _signalCache = new Map<string, any>();
  private _subscriptions = new Map<string, Subscription>();
  
  constructor(private state$: Observable<T>) {}
  
  // 創建 Signal 投影
  createSignal<R>(
    selector: (state: T) => R,
    options: SignalOptions = {}
  ): SignalSelector<R> | null {
    if (isServer()) return null;
    
    const cacheKey = options.key || this.generateKey(selector);
    
    if (!this._signalCache.has(cacheKey)) {
      this._createSignalProjection(selector, cacheKey, options);
    }
    
    return this._signalCache.get(cacheKey);
  }
  
  // 創建記憶化 Signal
  createMemoSignal<R>(
    selector: (state: T) => R,
    options: SignalOptions = {}
  ): SignalSelector<R> | null {
    if (isServer()) return null;
    
    const cacheKey = options.key || `memo_${this.generateKey(selector)}`;
    
    if (!this._signalCache.has(cacheKey)) {
      this._createMemoSignalProjection(selector, cacheKey, options);
    }
    
    return this._signalCache.get(cacheKey);
  }
  
  private async _createSignalProjection<R>(
    selector: (state: T) => R,
    cacheKey: string,
    options: SignalOptions
  ): Promise<void> {
    try {
      const { createSignal } = await import('solid-js');
      
      // 獲取初始值
      const initialValue = await this._getInitialValue(selector);
      const [signal, setSignal] = createSignal(initialValue, {
        equals: options.equals || ((a, b) => a === b)
      });
      
      // 單向同步：RxJS → Signal
      const subscription = this.state$.pipe(
        map(selector),
        distinctUntilChanged(options.equals || ((a, b) => a === b))
      ).subscribe(newValue => {
        setSignal(() => newValue);
      });
      
      // 增強的 Signal 介面
      const enhancedSignal = Object.assign(signal, {
        get latest() {
          return signal();
        }
      });
      
      this._signalCache.set(cacheKey, enhancedSignal);
      this._subscriptions.set(cacheKey, subscription);
    } catch (error) {
      console.warn('Failed to create signal projection:', error);
    }
  }
  
  private async _createMemoSignalProjection<R>(
    selector: (state: T) => R,
    cacheKey: string,
    options: SignalOptions
  ): Promise<void> {
    try {
      const { createSignal, createMemo } = await import('solid-js');
      
      const initialValue = await this._getInitialValue(selector);
      const [currentState, setCurrentState] = createSignal(initialValue);
      
      // 創建記憶化計算
      const memoSignal = createMemo(() => selector(currentState()));
      
      // 監聽狀態變化
      const subscription = this.state$.subscribe(newState => {
        setCurrentState(() => newState as any);
      });
      
      const enhancedSignal = Object.assign(memoSignal, {
        get latest() {
          return memoSignal();
        }
      });
      
      this._signalCache.set(cacheKey, enhancedSignal);
      this._subscriptions.set(cacheKey, subscription);
    } catch (error) {
      console.warn('Failed to create memo signal projection:', error);
    }
  }
  
  private async _getInitialValue<R>(selector: (state: T) => R): Promise<R> {
    return new Promise((resolve) => {
      const subscription = this.state$.pipe(
        map(selector)
      ).subscribe(value => {
        resolve(value);
        subscription.unsubscribe();
      });
    });
  }
  
  private generateKey(selector: Function): string {
    return `selector_${selector.toString().slice(0, 50)}_${Date.now()}`;
  }
  
  destroy(): void {
    this._subscriptions.forEach(subscription => subscription.unsubscribe());
    this._subscriptions.clear();
    this._signalCache.clear();
  }
}
```

## Effect 系統

```typescript
import { Observable, Subject, EMPTY } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

export type EffectStrategy = 'switch' | 'merge' | 'exhaust' | 'concat';

export interface EffectConfig {
  strategy?: EffectStrategy;
  cancelPrevious?: boolean;
}

export interface Effect {
  (action$: Observable<BaseAction>, state$: Observable<any>): Observable<BaseAction>;
}

export class EffectManager {
  private effects: Map<string, { effect: Effect; config?: EffectConfig }> = new Map();
  private destroy$ = new Subject<void>();
  private logger = createLogger();
  
  registerEffect(name: string, effect: Effect, config?: EffectConfig): void {
    this.effects.set(name, { effect, config });
    this.logger.debug(`Effect registered: ${name}`);
  }
  
  startEffects(store: Store<any>): void {
    this.effects.forEach(({ effect, config }, name) => {
      try {
        const effect$ = effect(store.action$, store.state$).pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            this.logger.error(`Effect ${name} error:`, error);
            return EMPTY;
          })
        );
        
        effect$.subscribe({
          next: (action) => {
            if (action) {
              store.dispatch(action);
            }
          },
          error: (error) => {
            this.logger.error(`Effect ${name} subscription error:`, error);
          }
        });
      } catch (error) {
        this.logger.error(`Failed to start effect ${name}:`, error);
      }
    });
  }
  
  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.effects.clear();
  }
}

export const createEffect = (
  effect: Effect, 
  config?: EffectConfig
): { effect: Effect; config?: EffectConfig } => ({ effect, config });
```

## 中間件系統

```typescript
// Logger 中間件
export const createLoggerMiddleware = (): Middleware => {
  const logger = createLogger('debug');
  
  return (store) => (next) => (action) => {
    logger.info(`Dispatching action: ${action.type}`, action);
    const result = next(action);
    logger.debug(`New state:`, store.getState());
    return result;
  };
};

// 錯誤處理中間件
export const createErrorMiddleware = (): Middleware => {
  const logger = createLogger();
  
  return (store) => (next) => (action) => {
    try {
      return next(action);
    } catch (error) {
      logger.error(`Error processing action ${action.type}:`, error);
      throw error;
    }
  };
};

// 效能監控中間件
export const createPerformanceMiddleware = (threshold: number = 16): Middleware => {
  const logger = createLogger();
  
  return (store) => (next) => (action) => {
    const start = performance.now();
    const result = next(action);
    const duration = performance.now() - start;
    
    if (duration > threshold) {
      logger.warn(`Slow action detected: ${action.type} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  };
};

// 中間件組合工具
const compose = (...funcs: Function[]) => {
  if (funcs.length === 0) {
    return <T>(arg: T) => arg;
  }
  if (funcs.length === 1) {
    return funcs[0];
  }
  return funcs.reduce((a, b) => (...args: any[]) => a(b(...args)));
};
```

## 核心 Store 實現 - RxJS Core + Signal Projection

```typescript
export interface StoreConfig<T> {
  middleware?: Middleware<T>[];
  enhancers?: any[];
  enableSignals?: boolean;
}

export class Store<T> {
  private _state$ = new BehaviorSubject<T>(this.initialState);
  private _action$ = new Subject<BaseAction>();
  private reducer: Reducer<T>;
  private middleware: Middleware<T>[] = [];
  private effectManager = new EffectManager();
  private signalProjector: SignalProjector<T>;
  private logger = createLogger();
  private rawDispatch: Dispatch;
  
  constructor(
    reducer: Reducer<T>,
    private initialState: T,
    config: StoreConfig<T> = {}
  ) {
    this.reducer = reducer;
    this.middleware = config.middleware || [];
    
    // 初始化 Signal 投影器
    this.signalProjector = new SignalProjector(this._state$.asObservable());
    
    // 原始 dispatch 方法
    this.rawDispatch = (action: BaseAction) => {
      try {
        if (!action || !action.type) {
          throw new Error('Invalid action: missing type');
        }
        
        this.logger.debug(`Dispatching: ${action.type}`);
        this._action$.next(action);
        
        const currentState = this.getState();
        const newState = this.reducer(currentState, action);
        
        if (newState === undefined) {
          this.logger.warn(`Reducer returned undefined for action: ${action.type}`);
          return;
        }
        
        this._state$.next(newState);
      } catch (error) {
        this.logger.error(`Error dispatching action ${action.type}:`, error);
        throw error;
      }
    };
    
    this.setupMiddleware();
    this.logger.info('Store initialized with RxJS core');
    
    if (isBrowser() && config.enableSignals !== false) {
      this.logger.info('Signal projection enabled for browser environment');
    }
  }
  
  static create<T>(
    reducer: Reducer<T>,
    initialState: T,
    config: StoreConfig<T> = {}
  ): Store<T> {
    const store = new Store(reducer, initialState, config);
    
    // 啟動 Effects
    store.effectManager.startEffects(store);
    
    return store;
  }
  
  // 核心 RxJS 介面
  get state$(): Observable<T> {
    return this._state$.asObservable();
  }
  
  get action$(): Observable<BaseAction> {
    return this._action$.asObservable();
  }
  
  getState(): T {
    return this._state$.getValue();
  }
  
  dispatch: Dispatch = this.rawDispatch;
  
  // Signal 投影介面（瀏覽器專用）
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
  
  // 便利方法：傳統 RxJS 選擇器
  pipe<R>(...operators: any[]): Observable<R> {
    return this.state$.pipe(...operators);
  }
  
  addEffect(name: string, effect: Effect, config?: EffectConfig): void {
    this.effectManager.registerEffect(name, effect, config);
  }
  
  private setupMiddleware(): void {
    if (this.middleware.length === 0) return;
    
    const middlewareAPI: MiddlewareAPI<T> = {
      getState: () => this.getState(),
      dispatch: (action) => this.dispatch(action)
    };
    
    const chain = this.middleware.map(middleware => middleware(middlewareAPI));
    this.dispatch = compose(...chain)(this.rawDispatch);
  }
  
  destroy(): void {
    this.effectManager.destroy();
    this.signalProjector.destroy();
    this._action$.complete();
    this._state$.complete();
    this.logger.info('Store destroyed');
  }
}
```

## Selector 系統 - 統一介面

```typescript
export interface Selector<T, R> {
  (state: T): R;
}

// 基礎 Selector
export const createSelector = <T, R>(
  selector: Selector<T, R>
): Selector<T, R> => {
  return selector;
};

// 記憶化 Selector（RxJS 版本）
export const createMemoizedSelector = <T, Args extends readonly any[], R>(
  ...selectors: [...{ [K in keyof Args]: Selector<T, Args[K]> }, (...args: Args) => R]
): Selector<T, R> => {
  const projector = selectors.pop() as (...args: Args) => R;
  const inputSelectors = selectors as { [K in keyof Args]: Selector<T, Args[K]> };
  
  let lastInputs: Args | undefined;
  let lastResult: R;
  
  return (state: T): R => {
    const inputs = inputSelectors.map(selector => selector(state)) as Args;
    
    if (!lastInputs || 
        inputs.length !== lastInputs.length || 
        inputs.some((input, i) => input !== lastInputs![i])) {
      lastInputs = inputs;
      lastResult = projector(...inputs);
    }
    
    return lastResult;
  };
};

// 便利函數：自動選擇 RxJS 或 Signal 版本
export const useSelector = <T, R>(
  store: Store<T>,
  selector: Selector<T, R>,
  options?: SignalOptions
): SignalSelector<R> | Observable<R> => {
  const signal = store.select(selector, options);
  
  if (signal) {
    return signal; // 瀏覽器環境返回 Signal
  }
  
  // 服務端環境返回 Observable
  return store.pipe(map(selector), distinctUntilChanged());
};
```

## Entity Adapter 系統 - 增強版

```typescript
import { produce, Draft } from 'immer';
import { map } from 'rxjs/operators';

// Entity 相關型別
export interface EntityState<T> {
  ids: string[];
  entities: Record<string, T>;
  loading: boolean;
  error: string | null;
  lastSettlement: SettlementRecord | null;
}

export interface SettlementRecord {
  actionType: string;
  timestamp: number;
  created: string[];
  updated: string[];
  deleted: string[];
}

export interface EntityConfig<T> {
  selectId?: (entity: T) => string;
  sortComparer?: (a: T, b: T) => number;
}

// Entity Adapter 工廠函數
export const createEntityAdapter = <T>(entityName: string, config: EntityConfig<T> = {}) => {
  const selectId = config.selectId || ((entity: any) => entity.id);
  
  // Actions
  const actions = {
    addOne: createAction<{ data: T }>(`[${entityName}] Add One`),
    addMany: createAction<{ data: T[] }>(`[${entityName}] Add Many`),
    updateOne: createAction<{ id: string; changes: Partial<T> }>(`[${entityName}] Update One`),
    updateMany: createAction<{ updates: Array<{ id: string; changes: Partial<T> }> }>(`[${entityName}] Update Many`),
    upsertOne: createAction<{ data: T }>(`[${entityName}] Upsert One`),
    upsertMany: createAction<{ data: T[] }>(`[${entityName}] Upsert Many`),
    removeOne: createAction<{ id: string }>(`[${entityName}] Remove One`),
    removeMany: createAction<{ ids: string[] }>(`[${entityName}] Remove Many`),
    removeAll: createAction(`[${entityName}] Remove All`),
    setLoading: createAction<{ loading: boolean }>(`[${entityName}] Set Loading`),
    setError: createAction<{ error: string | null }>(`[${entityName}] Set Error`),
  };
  
  // 工具函數
  const createSettlement = (action: BaseAction, created: string[] = [], updated: string[] = [], deleted: string[] = []): SettlementRecord => ({
    actionType: action.type,
    timestamp: action.timestamp,
    created,
    updated,
    deleted
  });
  
  const insertSorted = (ids: string[], newId: string, entities: Record<string, T>) => {
    if (!config.sortComparer) {
      ids.push(newId);
      return;
    }
    
    const newEntity = entities[newId];
    const insertIndex = ids.findIndex(existingId => {
      const existingEntity = entities[existingId];
      return config.sortComparer!(newEntity, existingEntity) < 0;
    });
    
    if (insertIndex === -1) {
      ids.push(newId);
    } else {
      ids.splice(insertIndex, 0, newId);
    }
  };
  
  // 初始狀態
  const initialState: EntityState<T> = {
    ids: [],
    entities: {},
    loading: false,
    error: null,
    lastSettlement: null
  };
  
  // Reducer 實現
  const reducer = createReducer(
    initialState,
    on(actions.addOne, (draft, action) => {
      const entity = action.payload.data;
      const id = selectId(entity);
      
      if (draft.entities[id]) {
        return;
      }
      
      draft.entities[id] = entity;
      insertSorted(draft.ids, id, draft.entities);
      draft.lastSettlement = createSettlement(action, [id]);
    }),
    
    on(actions.addMany, (draft, action) => {
      const entities = action.payload.data;
      const createdIds: string[] = [];
      
      entities.forEach(entity => {
        const id = selectId(entity);
        if (!draft.entities[id]) {
          draft.entities[id] = entity;
          insertSorted(draft.ids, id, draft.entities);
          createdIds.push(id);
        }
      });
      
      draft.lastSettlement = createSettlement(action, createdIds);
    }),
    
    on(actions.updateOne, (draft, action) => {
      const { id, changes } = action.payload;
      const existingEntity = draft.entities[id];
      
      if (!existingEntity) {
        return;
      }
      
      Object.assign(draft.entities[id], changes);
      draft.lastSettlement = createSettlement(action, [], [id]);
    }),
    
    on(actions.updateMany, (draft, action) => {
      const updates = action.payload.updates;
      const updatedIds: string[] = [];
      
      updates.forEach(({ id, changes }) => {
        const existingEntity = draft.entities[id];
        if (existingEntity) {
          Object.assign(draft.entities[id], changes);
          updatedIds.push(id);
        }
      });
      
      draft.lastSettlement = createSettlement(action, [], updatedIds);
    }),
    
    on(actions.upsertOne, (draft, action) => {
      const entity = action.payload.data;
      const id = selectId(entity);
      const exists = !!draft.entities[id];
      
      draft.entities[id] = entity;
      
      if (!exists) {
        insertSorted(draft.ids, id, draft.entities);
      }
      
      draft.lastSettlement = createSettlement(
        action, 
        exists ? [] : [id], 
        exists ? [id] : []
      );
    }),
    
    on(actions.upsertMany, (draft, action) => {
      const entities = action.payload.data;
      const createdIds: string[] = [];
      const updatedIds: string[] = [];
      
      entities.forEach(entity => {
        const id = selectId(entity);
        const exists = !!draft.entities[id];
        
        draft.entities[id] = entity;
        
        if (!exists) {
          insertSorted(draft.ids, id, draft.entities);
          createdIds.push(id);
        } else {
          updatedIds.push(id);
        }
      });
      
      draft.lastSettlement = createSettlement(action, createdIds, updatedIds);
    }),
    
    on(actions.removeOne, (draft, action) => {
      const id = action.payload.id;
      
      if (!draft.entities[id]) {
        return;
      }
      
      delete draft.entities[id];
      const index = draft.ids.indexOf(id);
      if (index > -1) {
        draft.ids.splice(index, 1);
      }
      
      draft.lastSettlement = createSettlement(action, [], [], [id]);
    }),
    
    on(actions.removeMany, (draft, action) => {
      const idsToRemove = action.payload.ids;
      const deletedIds: string[] = [];
      
      idsToRemove.forEach(id => {
        if (draft.entities[id]) {
          delete draft.entities[id];
          const index = draft.ids.indexOf(id);
          if (index > -1) {
            draft.ids.splice(index, 1);
          }
          deletedIds.push(id);
        }
      });
      
      draft.lastSettlement = createSettlement(action, [], [], deletedIds);
    }),
    
    on(actions.removeAll, (draft, action) => {
      const deletedIds = [...draft.ids];
      
      draft.ids = [];
      draft.entities = {};
      draft.lastSettlement = createSettlement(action, [], [], deletedIds);
    }),
    
    on(actions.setLoading, (draft, action) => {
      draft.loading = action.payload.loading;
    }),
    
    on(actions.setError, (draft, action) => {
      draft.error = action.payload.error;
    })
  );
  
  // Selectors - 支援 RxJS 和 Signal 雙模式
  const selectors = {
    selectIds: (state: EntityState<T>) => state.ids,
    selectEntities: (state: EntityState<T>) => state.entities,
    selectAll: (state: EntityState<T>) => state.ids.map(id => state.entities[id]),
    selectTotal: (state: EntityState<T>) => state.ids.length,
    selectById: (id: string) => (state: EntityState<T>) => state.entities[id],
    selectLoading: (state: EntityState<T>) => state.loading,
    selectError: (state: EntityState<T>) => state.error,
    selectLastSettlement: (state: EntityState<T>) => state.lastSettlement,
  };
  
  // Signal Selectors（瀏覽器專用）
  const createSignalSelectors = <AppState>(
    store: Store<AppState>,
    entityStateSelector: (state: AppState) => EntityState<T>
  ) => {
    return {
      selectIds: () => store.select(state => selectors.selectIds(entityStateSelector(state))),
      selectEntities: () => store.select(state => selectors.selectEntities(entityStateSelector(state))),
      selectAll: () => store.select(state => selectors.selectAll(entityStateSelector(state))),
      selectTotal: () => store.select(state => selectors.selectTotal(entityStateSelector(state))),
      selectById: (id: string) => store.select(state => selectors.selectById(id)(entityStateSelector(state))),
      selectLoading: () => store.select(state => selectors.selectLoading(entityStateSelector(state))),
      selectError: () => store.select(state => selectors.selectError(entityStateSelector(state))),
      selectLastSettlement: () => store.select(state => selectors.selectLastSettlement(entityStateSelector(state))),
    };
  };
  
  return {
    actions,
    reducer,
    selectors,
    createSignalSelectors,
    initialState
  };
};
```

## 使用範例 - RxJS Core + Signal Projection

```typescript
import { filter, map, switchMap, catchError } from 'rxjs/operators';
import { from, of } from 'rxjs';

// 1. 定義狀態類型
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AppState {
  users: EntityState<User>;
  counter: number;
  ui: {
    theme: 'light' | 'dark';
    sidebarOpen: boolean;
  };
}

// 2. 創建 Entity Adapter
const userAdapter = createEntityAdapter<User>('User', {
  selectId: (user) => user.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name)
});

// 3. 創建其他 Actions
const counterActions = createActionGroup({
  source: 'Counter',
  events: {
    increment: undefined,
    decrement: undefined,
    reset: undefined,
    set: (value: number) => ({ value })
  }
});

const uiActions = createActionGroup({
  source: 'UI',
  events: {
    setTheme: (theme: 'light' | 'dark') => ({ theme }),
    toggleSidebar: undefined
  }
});

// 4. 創建 Reducers
const counterReducer = createReducer(
  0,
  on(counterActions.increment, (draft) => draft + 1),
  on(counterActions.decrement, (draft) => draft - 1),
  on(counterActions.reset, () => 0),
  on(counterActions.set, (draft, action) => action.payload.value)
);

const uiReducer = createReducer(
  { theme: 'light' as const, sidebarOpen: false },
  on(uiActions.setTheme, (draft, action) => {
    draft.theme = action.payload.theme;
  }),
  on(uiActions.toggleSidebar, (draft) => {
    draft.sidebarOpen = !draft.sidebarOpen;
  })
);

// 5. 組合 Reducer
const rootReducer = combineReducers({
  users: userAdapter.reducer,
  counter: counterReducer,
  ui: uiReducer
});

// 6. 創建 Store - RxJS 核心
const store = Store.create(rootReducer, {
  users: userAdapter.initialState,
  counter: 0,
  ui: { theme: 'light', sidebarOpen: false }
}, {
  middleware: [
    createLoggerMiddleware(),
    createErrorMiddleware(),
    createPerformanceMiddleware(20)
  ],
  enableSignals: true // 啟用 Signal 投影
});

// 7. 創建 Effects - 純 RxJS
const userEffects = createEffect((action$, state$) =>
  action$.pipe(
    filter(action => action.type === userAdapter.actions.addOne.type),
    switchMap((action) => {
      const user = (action as any).payload.data;
      return from(fetch('/api/users', { 
        method: 'POST', 
        body: JSON.stringify(user),
        headers: { 'Content-Type': 'application/json' }
      })).pipe(
        map(() => userAdapter.actions.setLoading({ loading: false })),
        catchError(error => of(userAdapter.actions.setError({ error: error.message })))
      );
    })
  )
);

const autoSaveEffect = createEffect((action$, state$) =>
  action$.pipe(
    filter(action => action.type.startsWith('[User]')),
    switchMap(() => 
      state$.pipe(
        map(state => state.users),
        switchMap(userState => 
          from(localStorage.setItem('users', JSON.stringify(userState))).pipe(
            map(() => null),
            catchError(() => of(null))
          )
        )
      )
    ),
    filter(Boolean)
  )
);

store.addEffect('userEffects', userEffects, { strategy: 'switch' });
store.addEffect('autoSaveEffect', autoSaveEffect, { strategy: 'merge' });

// 8. 創建 Selectors - 統一介面
const selectUserState = (state: AppState) => state.users;
const selectCounter = (state: AppState) => state.counter;
const selectUI = (state: AppState) => state.ui;

// 記憶化 Selectors
const selectAllUsers = createMemoizedSelector(
  selectUserState,
  userAdapter.selectors.selectAll
);

const selectActiveUsers = createMemoizedSelector(
  selectAllUsers,
  (users) => users.filter(user => user.email.includes('@'))
);

const selectUserStats = createMemoizedSelector(
  selectAllUsers,
  selectCounter,
  (users, counter) => ({
    totalUsers: users.length,
    counterValue: counter,
    averageNameLength: users.reduce((acc, user) => acc + user.name.length, 0) / users.length || 0
  })
);

// 9. 瀏覽器環境 - Signal 投影使用
const BrowserComponent = () => {
  // Signal 投影 - 享受 SolidJS 細粒度更新
  const allUsers = store.select(selectAllUsers);
  const userCount = store.select(state => selectUserState(state).ids.length);
  const counter = store.select(selectCounter);
  const theme = store.select(state => selectUI(state).theme);
  const userStats = store.selectMemo(selectUserStats, { key: 'userStats' });
  
  // 條件渲染處理 SSR
  if (!allUsers) {
    // SSR fallback - 使用 RxJS
    return <div>Loading...</div>;
  }
  
  return (
    <div class={`app theme-${theme()}`}>
      <header>
        <h1>Users ({userCount()})</h1>
        <p>Counter: {counter()}</p>
        <p>Stats: {JSON.stringify(userStats())}</p>
      </header>
      
      <main>
        <For each={allUsers()}>
          {user => (
            <div class="user-card">
              <h3>{user.name}</h3>
              <p>{user.email}</p>
              <button onClick={() => 
                store.dispatch(userAdapter.actions.updateOne({
                  id: user.id,
                  changes: { name: user.name + ' (Updated)' }
                }))
              }>
                Update
              </button>
            </div>
          )}
        </For>
      </main>
      
      <footer>
        <button onClick={() => store.dispatch(counterActions.increment())}>
          Increment
        </button>
        <button onClick={() => store.dispatch(uiActions.toggleSidebar())}>
          Toggle Sidebar
        </button>
      </footer>
    </div>
  );
};

// 10. 服務端環境 - 純 RxJS 使用
const ServerSideLogic = () => {
  // 純 RxJS - 在 Node.js/SSR 環境中使用
  store.state$.pipe(
    map(selectAllUsers),
    filter(users => users.length > 0)
  ).subscribe(users => {
    console.log('Server: Users updated:', users.length);
  });
  
  // 複雜的業務邏輯處理
  store.state$.pipe(
    map(selectUserStats),
    filter(stats => stats.totalUsers > 10)
  ).subscribe(stats => {
    console.log('Server: High user count detected:', stats);
  });
};

// 11. 混合使用 - 同時支援兩種模式
const UniversalComponent = () => {
  // 智能選擇器 - 自動適配環境
  const users = useSelector(store, selectAllUsers);
  const stats = useSelector(store, selectUserStats, { key: 'stats' });
  
  // 在瀏覽器中，users 和 stats 是 Signal
  // 在服務端，users 和 stats 是 Observable
  
  if (isBrowser()) {
    // 瀏覽器邏輯
    const usersSignal = users as SignalSelector<User[]>;
    const statsSignal = stats as SignalSelector<any>;
    
    return (
      <div>
        <h2>Users: {usersSignal().length}</h2>
        <pre>{JSON.stringify(statsSignal(), null, 2)}</pre>
      </div>
    );
  } else {
    // 服務端邏輯 
    const users$ = users as Observable<User[]>;
    const stats$ = stats as Observable<any>;
    
    // SSR 渲染邏輯
    return <div>Server rendered content</div>;
  }
};

// 12. 完整的狀態操作範例
const performCompleteUserOperations = async () => {
  // 添加用戶
  store.dispatch(userAdapter.actions.addMany({
    data: [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      { id: '3', name: 'Bob Johnson', email: 'bob@example.com' }
    ]
  }));
  
  // 更新用戶
  store.dispatch(userAdapter.actions.updateOne({
    id: '1',
    changes: { avatar: 'https://example.com/avatar1.jpg' }
  }));
  
  // 批量更新
  store.dispatch(userAdapter.actions.updateMany({
    updates: [
      { id: '2', changes: { name: 'Jane Doe-Smith' } },
      { id: '3', changes: { email: 'robert@example.com' } }
    ]
  }));
  
  // Upsert 操作
  store.dispatch(userAdapter.actions.upsertOne({
    data: { id: '4', name: 'Alice Brown', email: 'alice@example.com' }
  }));
  
  // 刪除用戶
  store.dispatch(userAdapter.actions.removeOne({ id: '2' }));
  
  // UI 操作
  store.dispatch(uiActions.setTheme('dark'));
  store.dispatch(counterActions.set({ value: 42 }));
};

// 13. 訂閱和監聽
const setupSubscriptions = () => {
  // RxJS 訂閱（所有環境）
  store.state$.pipe(
    map(state => state.users.ids.length),
    distinctUntilChanged()
  ).subscribe(count => {
    console.log('User count changed:', count);
  });
  
  // Action 流監聽
  store.action$.pipe(
    filter(action => action.type.startsWith('[User]'))
  ).subscribe(action => {
    console.log('User action:', action.type);
  });
  
  // 錯誤處理
  store.state$.pipe(
    map(state => state.users.error),
    filter(error => error !== null)
  ).subscribe(error => {
    console.error('User error:', error);
  });
};

// 14. 清理資源
const cleanup = () => {
  store.destroy();
  console.log('Store and all projections destroyed');
};
```

## 架構優勢總結

### 1. **統一的狀態管理核心**
- 所有環境都使用相同的 RxJS 核心
- 狀態邏輯完全一致，確保行為可預測

### 2. **環境自適應增強**
- 瀏覽器：RxJS + Signal 投影，極致渲染性能
- 服務端：純 RxJS，統一的業務邏輯
- WebWorker：RxJS 核心，適合計算密集型任務

### 3. **漸進增強設計**
- Signal 功能為可選增強
- 不使用 Signal 不影響核心功能
- 可以逐步遷移到 Signal 模式

### 4. **開發體驗優化**
- 使用 Immer 提供直觀的狀態更新
- TypeScript 完美支援
- 統一的 API 設計

### 5. **性能最佳化**
- RxJS 提供強大的響應式能力
- Signal 在瀏覽器中提供細粒度更新
- 記憶化 Selector 避免不必要的計算

## v0.0.1 功能清單

### ✅ 已實現
- [x] **RxJS 核心狀態管理** - 統一的響應式核心
- [x] **Signal 投影系統** - 瀏覽器環境的視圖層優化
- [x] **Immer 增強 Reducer** - 直觀的狀態更新語法
- [x] **環境自適應** - 自動檢測並適配不同環境
- [x] **統一 Selector 介面** - 支援 RxJS 和 Signal 雙模式
- [x] **完整 Entity Adapter** - 支援所有 CRUD 操作
- [x] **中間件系統** - Logger、錯誤處理、性能監控
- [x] **Effect 系統** - 完整的副作用管理
- [x] **優雅降級** - 服務端自動回退到 RxJS 模式

### 🔄 核心依賴
- **rxjs** - 狀態管理核心和響應式編程
- **immer** - 不可變狀態更新
- **solid-js** - 瀏覽器 Signal 投影（可選）

## 未來版本規劃

### v0.0.2 - 增強功能
- [ ] **Signal 組合器** - 複雜 Signal 邏輯組合
- [ ] **DevTools 整合** - 支援 RxJS 和 Signal 調試
- [ ] **狀態持久化** - 智能序列化和恢復
- [ ] **SSR 優化** - 服務端狀態同步到客戶端

### v0.0.3 - 進階功能
- [ ] **時間旅行除錯** - 基於 RxJS 的狀態回滾
- [ ] **Signal 路由整合** - 與 SolidJS Router 深度整合
- [ ] **Worker 支援** - Web Worker 中的狀態同步
- [ ] **性能分析工具** - RxJS 和 Signal 性能監控

### v0.0.4 - 企業級功能
- [ ] **微前端支援** - 多應用狀態管理
- [ ] **離線支援** - 離線狀態同步和衝突解決
- [ ] **實時同步** - WebSocket 基礎的多端同步
- [ ] **完整測試工具** - RxJS 和 Signal 測試輔助

這個新架構完美結合了 RxJS 的強大響應式能力和 SolidJS Signal 的極致渲染性能，同時保持了跨環境的一致性和可測試性。