/**
 * TsStoreX Store Builder Pattern 系統
 * 從 store.ts 移出的 StoreBuilder 類別和相關工廠函數
 */

// 型別匯入
import  {
  Dispatch,
  Middleware,
  MiddlewareAPI,
  StoreConfig,
  ReducersMapObject,
  StoreBuilderSnapshot,
  Reducer
} from './types';

import  {
  Effect,
  EffectConfig
} from '../effects/types';
;

// 工具匯入
import { createLogger, type Logger } from '../utils/logger';
import { validateStoreBuilder, throwIfInvalid } from '../utils/validation';
import { combineReducers } from './reducer';

// ============================================================================
// Store Builder 類別（直接從 store.ts 移植）
// ============================================================================

export class StoreBuilder<T extends Record<string, any> = {}> {
  private reducers: ReducersMapObject<T> = {} as ReducersMapObject<T>;
  private middleware: Middleware<T>[] = [];
  private effects: EffectConfig[] = [];
  private config: StoreConfig = {};
  private logger: Logger;

  constructor() {
    this.logger = createLogger({ source: 'StoreBuilder' });
  }

  configure(config: StoreConfig): this {
    this.config = { ...this.config, ...config };
    this.logger = createLogger({
      source: 'StoreBuilder',
      level: config.logLevel || 'info'
    });
    return this;
  }

  registerReducer<K extends string, S>(
    key: K,
    reducer: Reducer<S>
  ): StoreBuilder<T & Record<K, S>> {
    const newBuilder = this as any;
    newBuilder.reducers[key] = reducer;
    this.logger.debug(`Reducer registered: ${key}`);
    return newBuilder;
  }

  registerReducers<R extends Record<string, Reducer<any>>>(
    reducers: R
  ): StoreBuilder<T & { [K in keyof R]: R[K] extends Reducer<infer S> ? S : never }> {
    const newBuilder = this as any;
    Object.assign(newBuilder.reducers, reducers);
    this.logger.debug(`Multiple reducers registered: ${Object.keys(reducers).join(', ')}`);
    return newBuilder;
  }

  registerRoot<R extends Record<string, Reducer<any>>>(
    reducers: R
  ): StoreBuilder<{ [K in keyof R]: R[K] extends Reducer<infer S> ? S : never }> {
    const newBuilder = new StoreBuilder() as any;
    newBuilder.reducers = { ...reducers };
    newBuilder.middleware = [...this.middleware];
    newBuilder.effects = [...this.effects];
    newBuilder.config = { ...this.config };
    newBuilder.logger = this.logger;
    this.logger.debug(`Root reducers registered: ${Object.keys(reducers).join(', ')}`);
    return newBuilder;
  }

  applyMiddleware(middleware: Middleware<T>): this {
    this.middleware.push(middleware);
    this.logger.debug(`Middleware applied: ${middleware.name || 'anonymous'}`);
    return this;
  }

  applyMiddlewares(...middlewares: Middleware<T>[]): this {
    this.middleware.push(...middlewares);
    this.logger.debug(`Multiple middlewares applied: ${middlewares.length}`);
    return this;
  }

  registerEffect(name: string, effect: Effect<T>, config?: EffectConfig['config']): this {
    const effectConfig: EffectConfig = { name, effect };
    if (config !== undefined) {
      effectConfig.config = config;
    }
    this.effects.push(effectConfig);
    this.logger.debug(`Effect registered: ${name}`);
    return this;
  }

  registerEffects(effects: EffectConfig[] | Record<string, Effect<T>>): this {
    if (Array.isArray(effects)) {
      this.effects.push(...effects);
      this.logger.debug(`Multiple effects registered: ${effects.map(e => e.name).join(', ')}`);
    } else {
      const effectConfigs = Object.entries(effects).map(([name, effect]) => ({
        name,
        effect
      }));
      this.effects.push(...effectConfigs);
      this.logger.debug(`Multiple effects registered: ${Object.keys(effects).join(', ')}`);
    }
    return this;
  }

  removeReducer<K extends keyof T>(key: K): StoreBuilder<Omit<T, K>> {
    const newBuilder = this as any;
    delete newBuilder.reducers[key];
    this.logger.debug(`Reducer removed: ${String(key)}`);
    return newBuilder;
  }

  removeMiddleware(middleware: Middleware<T>): this {
    const index = this.middleware.indexOf(middleware);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      this.logger.debug(`Middleware removed`);
    }
    return this;
  }

  removeEffect(name: string): this {
    const index = this.effects.findIndex(e => e.name === name);
    if (index !== -1) {
      this.effects.splice(index, 1);
      this.logger.debug(`Effect removed: ${name}`);
    }
    return this;
  }

  getSnapshot(): StoreBuilderSnapshot<T> {
    return {
      reducers: { ...this.reducers },
      middleware: [...this.middleware],
      effects: [...this.effects],
      config: { ...this.config }
    };
  }

  private validate(): void {
    const snapshot = this.getSnapshot();
    const validation = validateStoreBuilder(snapshot);
    throwIfInvalid(validation, 'Store Builder validation');
  }

  build(): import('./store').EnhancedStore<T> {
    this.validate();

    const rootReducer = combineReducers(this.reducers);

    const initialState = rootReducer(undefined, {
      type: '@@INIT',
      timestamp: Date.now(),
      id: 'init'
    });

    this.logger.info('Building store with configuration:', {
      reducers: Object.keys(this.reducers),
      middleware: this.middleware.length,
      effects: this.effects.length,
      stateShape: Object.keys(initialState)
    });

    // 動態匯入避免循環依賴
    const { EnhancedStore } = require('./store');
    return new EnhancedStore(rootReducer, initialState, {
      middleware: this.middleware,
      effects: this.effects,
      ...this.config
    });
  }
}

// ============================================================================
// 工廠函數（直接從 store.ts 移植）
// ============================================================================

export const createStoreBuilder = (): StoreBuilder<{}> => {
  return new StoreBuilder<{}>();
};

export const createStore = <T>(
  reducer: Reducer<T>,
  initialState: T,
  config?: StoreConfig
): import('./store').EnhancedStore<T> => {
  const { EnhancedStore } = require('./store');
  return new EnhancedStore(reducer, initialState, config);
};

export const store = () => createStoreBuilder();