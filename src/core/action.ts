import { v7 as uuidv7 } from 'uuid';
import {
    BaseAction,
    Action,
    ActionCreator,
    ActionCreatorConfig,
    ActionGroupConfig,
    ActionGroup,
    ExtractActionPayload,
    ExtractGroupActions,
    ActionUnion,
    ActionFromCreators
} from './types';

// ===== 工具函數 =====
/**
 * 預設時間戳生成器
 */
export const defaultTimestampGenerator = (): number => Date.now();

/**
 * 驗證 Action Type 格式
 */
export const validateActionType = (type: string): void => {
    if (typeof type !== 'string') {
        // null / undefined / 非字串
        throw new Error('Action type must be a non-empty string');
    }
    if (type === '') {
        // 完全空字串
        throw new Error('Action type cannot be empty');
    }
    if (type.trim() !== type) {
        // 前後有空白
        throw new Error('Action type cannot have leading or trailing whitespace');
    }

    if (type.length === 0) {
        throw new Error('Action type cannot be empty');
    }
};

/**
 * 格式化來源前綴
 */
const formatSourcePrefix = (source: string): string => {
    if (!source) return '';
    return `[${source.trim()}]`;
};

// ===== 核心實現 =====

/**
 * 創建 Action Creator
 * 
 * @param type - Action 類型
 * @param config - 可選配置
 * @returns 型別安全的 Action Creator
 * 
 * @example
 * ```typescript
 * // 無 payload 的 Action
 * const increment = createAction('INCREMENT');
 * const action1 = increment(); // { type: 'INCREMENT', timestamp: ..., id: ... }
 * 
 * // 有 payload 的 Action
 * const setUser = createAction<{ id: string; name: string }>('SET_USER');
 * const action2 = setUser({ id: '1', name: 'John' });
 * ```
 */
export const createAction = <T = void>(
    type: string,
    config: ActionCreatorConfig = {}
): ActionCreator<T> => {
    // 驗證 Action Type
    validateActionType(type);

    const {
        enableLogging = false,
        timestampGenerator = defaultTimestampGenerator,
        idGenerator = uuidv7,
        meta
    } = config;

    // 創建 Action Creator 函數
    const actionCreator = ((payload?: T) => {
        const timestamp = timestampGenerator();
        const id = idGenerator();

        // 構建基礎 Action
        const baseAction: BaseAction = {
            type,
            timestamp,
            id
        };

        // 根據是否有 payload 決定最終 Action 結構
        const action = payload !== undefined
            ? { ...baseAction, payload } as Action<T>
            : baseAction as Action<T>;

        // 添加 meta 資料
        if (meta) {
            (action as any).meta = meta;
        }

        // 日誌記錄
        if (enableLogging) {
            console.debug(`[Action Created] ${type}`, action);
        }

        return action;
    }) as ActionCreator<T>;

    // 添加 type 屬性到 Action Creator
    Object.defineProperty(actionCreator, 'type', {
        value: type,
        writable: false,
        enumerable: true,
        configurable: false
    });

    return actionCreator;
};

/**
 * 創建 Action Group
 * 批量創建多個相關的 Action Creator
 * 
 * @param config - Action Group 配置
 * @returns Action Creator 物件集合
 * 
 * @example
 * ```typescript
 * const userActions = createActionGroup({
 *   source: 'User',
 *   events: {
 *     load: void 0,
 *     loadSuccess: (users: User[]) => ({ users }),
 *     loadFailure: (error: string) => ({ error }),
 *     create: (user: User) => ({ user }),
 *     update: { id: string; changes: Partial<User> },
 *     delete: (id: string) => ({ id })
 *   }
 * });
 * 
 * // 使用
 * userActions.load(); // { type: '[User] load', ... }
 * userActions.create({ id: '1', name: 'John' }); // { type: '[User] create', payload: { user: {...} }, ... }
 * ```
 */
export const createActionGroup = <T extends Record<string, any>>(
    groupConfig: ActionGroupConfig<T>
): ActionGroup<T> => {
    const { source, events, config = {} } = groupConfig;

    if (!source || typeof source !== 'string') {
        throw new Error('Action group source must be a non-empty string');
    }

    if (!events || typeof events !== 'object') {
        throw new Error('Action group events must be an object');
    }

    const sourcePrefix = formatSourcePrefix(source);
    const actions = {} as ActionGroup<T>;

    // 為每個事件創建 Action Creator
    for (const [eventName] of Object.entries(events) as [keyof T, T[keyof T]][]) {
        const fullType = sourcePrefix ? `${sourcePrefix} ${String(eventName)}` : String(eventName);

        // 創建 Action Creator
        actions[eventName as keyof T] = createAction<T[typeof eventName]>(
            fullType,
            config
        );
    }

    return actions;
};

// ===== 高階工具函數 =====

/**
 * 檢查是否為指定類型的 Action
 * 提供 TypeScript Type Guard 功能
 * 
 * @param action - 要檢查的 Action
 * @param actionCreator - Action Creator
 * @returns 類型保護函數
 * 
 * @example
 * ```typescript
 * const setUser = createAction<User>('SET_USER');
 * 
 * if (isActionOf(action, setUser)) {
 *   // 這裡 action.payload 會被推導為 User 類型
 *   console.log(action.payload.name);
 * }
 * ```
 */
export const isActionOf = <T = any>(
    action: BaseAction,
    actionCreator: ActionCreator<T>
): action is Action<T> => {
    return action && typeof action === 'object' && action.type === actionCreator.type;
};

/**
 * 創建 Action Type Guard
 * 返回綁定到特定 Action Creator 的類型檢查函數
 * 
 * @param actionCreator - Action Creator
 * @returns 綁定的類型檢查函數
 */
export const createActionTypeGuard = <T = any>(
    actionCreator: ActionCreator<T>
) => {
    return (action: any): action is Action<T> => {
        return isActionOf(action, actionCreator);
    };
};

/**
 * 批量檢查 Action 類型
 * 檢查 Action 是否屬於指定的 Action Creator 列表
 * 
 * @param action - 要檢查的 Action
 * @param actionCreators - Action Creator 陣列
 * @returns 是否匹配任何一個 Action Creator
 */
export const isActionOfAny = <TActionCreators extends ReadonlyArray<ActionCreator<any>>>(
    action: BaseAction,
    actionCreators: TActionCreators
): action is ActionFromCreators<TActionCreators> => {
    return actionCreators.some(creator => action && typeof action === 'object' && action.type === creator.type);
};

/**
 * 重新定義 isActionOfAny 使用更精確的型別推導
 */
export const isActionOfAnyPrecise = <TActionCreators extends ReadonlyArray<ActionCreator<any>>>(
    action: BaseAction,
    actionCreators: TActionCreators
): action is ActionUnion<TActionCreators> => {
    return actionCreators.some(creator => action && typeof action === 'object' && action.type === creator.type);
};

// ===== 除錯和工具函數 =====

/**
 * Action 序列化
 * 用於日誌記錄和除錯
 */
export const serializeAction = (action: any): string => {
    try {
        return JSON.stringify(action, null, 2);
    } catch (error) {
        return `[Unserializable Action] type: ${action.type}, id: ${action.id}`;
    }
};

/**
 * Action 資訊提取
 * 提取 Action 的關鍵資訊用於除錯
 */
export const getActionInfo = (action: any) => {
    return {
        type: action.type,
        timestamp: action.timestamp,
        id: action.id,
        hasPayload: 'payload' in action,
        payloadType: 'payload' in action ? typeof (action as any).payload : 'void'
    };
};

/**
 * 創建 Action 除錯器
 * 提供除錯相關的工具方法
 */
export const createActionDebugger = (prefix: string = 'ActionDebug') => {
    return {
        log: (action: any) => {
            console.group(`${prefix}: ${action.type}`);
            console.log('Action Info:', getActionInfo(action));
            console.log('Full Action:', action);
            console.groupEnd();
        },

        trace: (actions: any[]) => {
            console.group(`${prefix}: Action Trace (${actions.length} actions)`);
            actions.forEach((action, index) => {
                console.log(`${index + 1}. ${action.type} [${action.id}]`);
            });
            console.groupEnd();
        }
    };
};
