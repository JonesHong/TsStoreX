import { produce, Draft } from 'immer';
import  {
    BaseAction,
    Reducer,
    ReducerHandler,
    ReducersMapObject,
    ActionCreator
  } from './types';
  

/**
 * 建立 Action-Reducer 綁定
 * @template T 狀態型別
 * @template P Payload 型別
 * @param actionCreator Action 創建器
 * @param reducer Reducer 函數，接受 Draft 狀態
 * @returns ReducerHandler 物件
 * 
 * @example
 * ```typescript
 * const increment = createAction('INCREMENT');
 * const counterHandler = on(increment, (state, action) => {
 *   state.count += 1; // 直接修改 draft
 * });
 * ```
 */
export const on = <T, P = void>(
    actionCreator: ActionCreator<P>,
    reducer: (state: Draft<T>, action: ReturnType<typeof actionCreator>) => T | void
): ReducerHandler<T, ReturnType<typeof actionCreator>> => ({
    type: actionCreator.type,
    reducer: reducer as any
});

/**
 * 建立 Immer 增強的 Reducer
 * @template T 狀態型別
 * @param initialState 初始狀態
 * @param handlers Reducer 處理器陣列
 * @returns 完整的 Reducer 函數
 * 
 * @example
 * ```typescript
 * interface CounterState {
 *   count: number;
 *   lastUpdated: number;
 * }
 * 
 * const initialState: CounterState = {
 *   count: 0,
 *   lastUpdated: Date.now()
 * };
 * 
 * const counterReducer = createReducer(
 *   initialState,
 *   on(increment, (draft) => {
 *     draft.count += 1;
 *     draft.lastUpdated = Date.now();
 *   }),
 *   on(decrement, (draft) => {
 *     draft.count -= 1;
 *     draft.lastUpdated = Date.now();
 *   }),
 *   on(reset, () => initialState) // 返回新狀態
 * );
 * ```
 */
export const createReducer = <T>(
    initialState: T,
    ...handlers: Array<ReducerHandler<T, any>>
): Reducer<T> => {
    // 建立 action type 到 handler 的映射
    const handlerMap = new Map<string, (state: Draft<T>, action: any) => T | void>();

    handlers.forEach(handler => {
        if (handlerMap.has(handler.type)) {
            console.warn(`Duplicate handler for action type: ${handler.type}`);
        }
        handlerMap.set(handler.type, handler.reducer);
    });

    return (state: T | undefined = initialState, action: BaseAction): T => {
        // 驗證 action 結構
        if (!action || typeof action.type !== 'string') {
            console.warn('Invalid action: missing or invalid type property');
            return state!;
        }
        try {
            const handler = handlerMap.get(action.type);

            // 如果沒有對應的 handler，直接返回原狀態
            if (!handler) {
                return state!;
            }

            // 先準備一個變數攔截 handler 回傳的新 state
            let overrideState: T | undefined;

            // 這裡的 recipe 絕對不寫 return，確保它符合「void 回傳」的 overload
            const nextState = produce(state!, (draft: Draft<T>) => {
                const result = handler(draft, action);
                if (result !== undefined) {
                    overrideState = result;
                    // 此時雖然 draft 可能被修改了，但我們最終如果 override 就不會用到它
                }
            });

            // 如果 handler 回傳了新 state，就用它；否則就用 produce 的 nextState
            return overrideState !== undefined ? overrideState : nextState;

        } catch (error) {
            console.error(`Error in reducer for action ${action.type}:`, error);
            return state!;
        }
    };
};


/**
 * 組合多個 Reducer 成為一個根 Reducer
 * @template T 根狀態型別
 * @param reducers Reducer 映射物件
 * @returns 組合後的 Reducer
 * 
 * @example
 * ```typescript
 * interface RootState {
 *   counter: CounterState;
 *   user: UserState;
 *   ui: UIState;
 * }
 * 
 * const rootReducer = combineReducers({
 *   counter: counterReducer,
 *   user: userReducer,
 *   ui: uiReducer
 * });
 * ```
 */
export const combineReducers = <T extends Record<string, any>>(
    reducers: ReducersMapObject<T>
): Reducer<T> => {
    const reducerKeys = Object.keys(reducers) as Array<keyof T>;

    // 驗證 reducers 物件
    if (reducerKeys.length === 0) {
        throw new Error('combineReducers: reducers object cannot be empty');
    }

    // 驗證每個 reducer 都是函數
    reducerKeys.forEach(key => {
        if (typeof reducers[key] !== 'function') {
            throw new Error(`combineReducers: reducer for key "${String(key)}" is not a function`);
        }
    });

    return (state: T | undefined, action: BaseAction): T => {
        // 處理初始狀態
        if (state === undefined) {
            const initialState = {} as T;
    
            reducerKeys.forEach(key => {
                const reducer = reducers[key];
                const initialValue = reducer(undefined, action);
    
                if (initialValue === undefined) {
                    throw new Error(
                        `Reducer for key "${String(key)}" returned undefined during initialization. ` +
                        'If the state passed to the reducer is undefined, you must explicitly return the initial state.'
                    );
                }
    
                initialState[key] = initialValue;
            });
    
            return initialState;
        }
    
        // 標記是否有任何子 state 被改變
        let hasChanged = false;
    
        // 用 Immer 處理不可變更新，recipe 不要回傳任何值
        const nextState = produce(state, (draft) => {
            reducerKeys.forEach(key => {
                const reducer = reducers[key];
                const previousStateForKey = state[key];
                const nextStateForKey = reducer(previousStateForKey, action);
    
                // 如果子 state 有變，才寫回 draft
                if (nextStateForKey !== previousStateForKey) {
                    (draft as any)[key] = nextStateForKey;
                    hasChanged = true;
                }
            });
    
            // 注意：recipe 一律不要 return，保證符合 void overload
        });
    
        // 最後根據 hasChanged 決定回傳
        return hasChanged ? nextState : state;
    };
    
};

/**
 * Reducer 組合工具：用於複雜的 reducer 邏輯組合
 * @template T 狀態型別
 * @param reducers Reducer 陣列
 * @returns 組合後的 Reducer
 * 
 * @example
 * ```typescript
 * // 組合多個處理同一狀態的 reducer
 * const compositeReducer = composeReducers(
 *   baseReducer,
 *   enhancementReducer,
 *   loggingReducer
 * );
 * ```
 */
export const composeReducers = <T>(
    ...reducers: Reducer<T>[]
  ): Reducer<T> => {
    if (reducers.length === 0) {
      throw new Error('composeReducers: at least one reducer is required');
    }
  
    if (reducers.length === 1) {
      // 用 ! 告訴 TS 這裡一定不是 undefined
      return reducers[0]!;
    }
  
    return (state: T | undefined, action: BaseAction): T => {
      // 第一次呼叫也用 ! 保證不是 undefined
      let nextState = reducers[0]!(state, action);
  
      for (let i = 1; i < reducers.length; i++) {
        nextState = reducers[i]!(nextState, action);
      }
  
      return nextState;
    };
  };
  

/**
 * 建立預設 Reducer：用於處理未知 action 時的預設行為
 * @template T 狀態型別
 * @param initialState 初始狀態
 * @returns 預設 Reducer
 */
export const createDefaultReducer = <T>(initialState: T): Reducer<T> => {
    return (state: T | undefined = initialState): T => state;
};

/**
 * Reducer 增強器：為現有 Reducer 添加額外功能
 * @template T 狀態型別
 * @param reducer 原始 Reducer
 * @param enhancer 增強函數
 * @returns 增強後的 Reducer
 * 
 * @example
 * ```typescript
 * // 添加日誌功能
 * const enhancedReducer = enhanceReducer(
 *   baseReducer,
 *   (state, action, next) => {
 *     console.log('Before:', state);
 *     const newState = next(state, action);
 *     console.log('After:', newState);
 *     return newState;
 *   }
 * );
 * ```
 */
export const enhanceReducer = <T>(
    reducer: Reducer<T>,
    enhancer: (
        state: T | undefined,
        action: BaseAction,
        next: Reducer<T>
    ) => T
): Reducer<T> => {
    return (state: T | undefined, action: BaseAction): T => {
        return enhancer(state, action, reducer);
    };
};

/**
 * 條件 Reducer：根據條件決定是否執行 reducer
 * @template T 狀態型別
 * @param condition 條件函數
 * @param reducer 條件成立時執行的 reducer
 * @param fallbackReducer 條件不成立時執行的 reducer（可選）
 * @returns 條件 Reducer
 */
export const createConditionalReducer = <T>(
    condition: (state: T | undefined, action: BaseAction) => boolean,
    reducer: Reducer<T>,
    fallbackReducer?: Reducer<T>
): Reducer<T> => {
    return (state: T | undefined, action: BaseAction): T => {
        if (condition(state, action)) {
            return reducer(state, action);
        }

        if (fallbackReducer) {
            return fallbackReducer(state, action);
        }

        return state || ({} as T);
    };
};

/**
 * 重置 Reducer：處理重置狀態的通用邏輯
 * @template T 狀態型別
 * @param resetActionType 重置 action 的 type
 * @param initialState 初始狀態
 * @param baseReducer 基礎 reducer
 * @returns 包含重置邏輯的 Reducer
 */
export const createResettableReducer = <T>(
    resetActionType: string,
    initialState: T,
    baseReducer: Reducer<T>
): Reducer<T> => {
    return (state: T | undefined, action: BaseAction): T => {
        // 如果是重置 action，返回初始狀態
        if (action.type === resetActionType) {
            return initialState;
        }

        // 否則使用基礎 reducer 處理
        return baseReducer(state, action);
    };
};