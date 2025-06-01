/**
 * TsStoreX 核心型別定義
 * 定義 Action、Reducer、Store 等相關型別
 */

// ============================================================================
// Action 相關型別 
// ============================================================================

/**
 * 基礎 Action 介面
 * 所有 Action 都必須包含 type、timestamp 和 id
 */
export interface BaseAction {
  /** Action 類型標識，唯一識別此動作 */
  readonly type: string;
  /** 動作創建時間戳 */
  readonly timestamp: number;
  /** 唯一識別碼，用於追蹤和除錯 */
  readonly id: string;
}

/**
 * 帶 Payload 的 Action 型別
 * 支援泛型，提供完整的型別安全
 */
export type Action<T = void> = T extends void
  ? BaseAction
  : BaseAction & { readonly payload: T };

/**
 * Action Creator 函數型別
 * 根據 Payload 型別自動推導函數簽名
 */
export type ActionCreator<T = void> = T extends void
  ? (() => Action<T>) & { readonly type: string }
  : ((payload: T) => Action<T>) & { readonly type: string };

/**
 * Action Creator 配置選項
 */
export interface ActionCreatorConfig {
  /** 是否啟用詳細日誌 */
  enableLogging?: boolean;
  /** 自定義時間戳生成器 */
  timestampGenerator?: () => number;
  /** 自定義 ID 生成器 */
  idGenerator?: () => string;
  /** Action 元資料 */
  meta?: Record<string, any>;
}

/**
 * Action Group 配置
 */
export interface ActionGroupConfig<T extends Record<string, any>> {
  /** 來源標識，會加到 type 前綴 */
  source: string;
  /** 事件定義，key 為事件名，value 為 payload 型別 */
  events: T;
  /** 額外配置 */
  config?: ActionCreatorConfig;
}

/**
 * Action Group 返回型別
 * 根據事件定義自動生成對應的 Action Creator
 */
export type ActionGroup<T extends Record<string, any>> = {
  [K in keyof T]: ActionCreator<T[K]>
};

// ============================================================================
// Reducer 相關型別 
// ============================================================================

/**
 * Reducer 函數型別定義
 * @template T 狀態型別
 */
export interface Reducer<T> {
  (state: T | undefined, action: BaseAction): T;
}

/**
 * Reducer 處理器型別定義
 * @template T 狀態型別
 * @template A Action 型別
 */
export interface ReducerHandler<T, A extends BaseAction> {
  type: string;
  reducer: (state: import('immer').Draft<T>, action: A) => T | void;
}

/**
 * Reducer 組合器型別定義
 * @template T 複合狀態型別
 */
export type ReducersMapObject<T> = {
  [K in keyof T]: Reducer<T[K]>;
};

// ============================================================================
// Store 相關型別
// ============================================================================

/**
 * Action 派發函數
 */
export interface Dispatch {
  (action: BaseAction): void;
  // 支援 Thunk 函數
  // <T>(thunk: (dispatch: Dispatch, getState: () => T) => any): any;
}

/**
 * 中間件 API 介面
 */
export interface MiddlewareAPI<T = any> {
  getState: () => T;
  dispatch: Dispatch;
}

/**
 * 中間件函數介面
 */
export interface Middleware<T = any> {
  (store: MiddlewareAPI<T>): (next: Dispatch) => Dispatch;
}

/**
 * 基礎 Store 配置選項
 */
export interface StoreConfig {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  enableSignals?: boolean;
  devTools?: boolean;
}

/**
 * 增強型 Store 建構配置
 * 包含中間件和效果配置（effects 型別將在後續模組中定義）
 */
export interface EnhancedStoreConfig<T = any> extends StoreConfig {
  middleware?: Middleware<T>[];
  // 注意：effects 相關型別將在 effects 模組中定義，這裡預留介面
  effects?: Array<{
    name: string;
    effect: any; // 暫時用 any，後續會被 effects/types.ts 中的型別替換
    config?: any;
  }>;
}

// ============================================================================
// Store Builder 相關型別 (從 builder.ts 需要)
// ============================================================================

/**
 * Store Builder 快照型別
 * 用於驗證和構建過程中的狀態快照
 */
export interface StoreBuilderSnapshot<T extends Record<string, any> = any> {
  reducers: ReducersMapObject<T>;
  middleware: Middleware<T>[];
  effects: Array<{
    name: string;
    effect: any; // 暫時用 any，後續會被 effects/types.ts 中的型別替換
    config?: any;
  }>;
  config: StoreConfig;
}

/**
 * Store 調試資訊
 */
export interface StoreDebugInfo<T = any> {
  environment: string;
  signalsEnabled: boolean;
  middlewareCount: number;
  effectsCount: number;
  effectNames: string[];
  currentStateSnapshot: T;
  hasActiveSubscriptions: boolean;
}

// ============================================================================
// 工具型別
// ============================================================================

/**
 * 提取 Action Creator 陣列中所有可能的 Action 型別
 */
export type ActionFromCreators<T extends ReadonlyArray<ActionCreator<any>>> = 
  T extends ReadonlyArray<ActionCreator<infer U>> ? Action<U> : never;

/**
 * 更精確的 Action Creator 陣列型別推導
 */
export type ActionCreatorReturnTypes<T extends ReadonlyArray<ActionCreator<any>>> = {
  [K in keyof T]: T[K] extends ActionCreator<any> ? ReturnType<T[K]> : never;
};

/**
 * Action 聯合型別
 */
export type ActionUnion<T extends ReadonlyArray<ActionCreator<any>>> = 
  ActionCreatorReturnTypes<T>[number];

/**
 * 提取 Action 的 Payload 類型
 */
export type ExtractActionPayload<T> = T extends ActionCreator<infer P> ? P : never;

/**
 * 提取 Action Group 中所有 Action 的聯合類型
 */
export type ExtractGroupActions<T extends Record<string, ActionCreator<any>>> = {
  [K in keyof T]: ReturnType<T[K]>
}[keyof T];


  // ============================================================================
  // Middleware 型別和工具
  // ============================================================================
  
  /**
   * 中間件執行上下文
   */
  export interface MiddlewareContext<T = any> {
    /** 獲取當前狀態 */
    getState: () => T;
    /** 派發 Action */
    dispatch: Dispatch;
    /** 當前處理的 Action */
    action: BaseAction;
    /** 中間件名稱 */
    middlewareName?: string;
  }
  
  /**
   * 中間件生命週期鉤子
   */
  export interface MiddlewareHooks<T = any> {
    /** Action 進入前的預處理 */
    before?: (context: MiddlewareContext<T>) => void | BaseAction | Promise<void | BaseAction>;
    /** Action 處理後的後處理 */
    after?: (context: MiddlewareContext<T>, result?: any) => void | Promise<void>;
    /** 錯誤處理 */
    error?: (context: MiddlewareContext<T>, error: Error) => void | BaseAction | Promise<void | BaseAction>;
  }
  
  /**
   * 中間件配置選項
   */
  export interface MiddlewareConfig {
    /** 中間件名稱 */
    name?: string;
    /** 是否啟用 */
    enabled?: boolean;
    /** 優先級（數字越小優先級越高） */
    priority?: number;
    /** 只處理特定 Action 類型 */
    actionFilter?: string[] | ((action: BaseAction) => boolean);
    /** 是否為異步中間件 */
    async?: boolean;
  }
  
  /**
   * 中間件工廠函數型別
   */
  export type MiddlewareFactory<T = any, Config = any> = (config?: Config) => Middleware<T>;
  