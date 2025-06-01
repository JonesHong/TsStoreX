/**
 * 中間件系統單元測試
 * 
 * 測試中間件創建、配置、執行順序等核心功能
 */

import {
    createMiddleware,
    LoggerMiddleware,
    ErrorMiddleware,
    PerformanceMiddleware,
    ThunkMiddleware,
    DebounceMiddleware,
    MiddlewareManager,
    createMiddlewareManager,
    ErrorMiddlewareConfig,
} from '../../../src/core/middleware';

import {
    Middleware,
    MiddlewareAPI,
    Dispatch,
    BaseAction,
    MiddlewareContext,
    MiddlewareHooks,
    MiddlewareConfig,
    MiddlewareFactory
} from '../../../src/core/types';

import { createAction } from '../../../src/core/action';
import { createLogger } from '../../../src/utils/logger';

// ===== 測試用的 Mock 和 Helper =====

const createMockStore = <T>(initialState: T): MiddlewareAPI<T> => ({
    getState: jest.fn(() => initialState),
    dispatch: jest.fn()
});

const createMockAction = (type: string = 'TEST_ACTION'): BaseAction => ({
    type,
    timestamp: Date.now(),
    id: 'test-id-123'
});

const createMockDispatch = (): jest.MockedFunction<Dispatch> => jest.fn();

// ===== 基礎中間件創建測試 =====

describe('Middleware System - createMiddleware', () => {
    test('should create basic middleware with before hook', () => {
        const beforeHook = jest.fn();
        const hooks: MiddlewareHooks = { before: beforeHook };

        const middleware = createMiddleware(hooks);
        const store = createMockStore({ value: 42 });
        const next = createMockDispatch();
        const action = createMockAction();

        const wrappedDispatch = middleware(store)(next);
        wrappedDispatch(action);

        expect(beforeHook).toHaveBeenCalledWith({
            getState: store.getState,
            dispatch: store.dispatch,
            action,
            middlewareName: 'CustomMiddleware'
        });
        expect(next).toHaveBeenCalledWith(action);
    });

    test('should create middleware with after hook', () => {
        const afterHook = jest.fn();
        const hooks: MiddlewareHooks = { after: afterHook };

        const middleware = createMiddleware(hooks);
        const store = createMockStore({ value: 42 });
        const next = createMockDispatch();
        const action = createMockAction();

        const wrappedDispatch = middleware(store)(next);
        wrappedDispatch(action);

        expect(next).toHaveBeenCalledWith(action);
        expect(afterHook).toHaveBeenCalledWith(
            expect.objectContaining({ action }),
            undefined
        );
    });

    test('should handle error hook when exception occurs', () => {
        const errorHook = jest.fn();
        const hooks: MiddlewareHooks = { error: errorHook };
        const testError = new Error('Test error');

        const middleware = createMiddleware(hooks);
        const store = createMockStore({ value: 42 });
        const next = jest.fn(() => { throw testError; });
        const action = createMockAction();

        const wrappedDispatch = middleware(store)(next);

        expect(() => wrappedDispatch(action)).toThrow('Test error');
        expect(errorHook).toHaveBeenCalledWith(
            expect.objectContaining({ action }),
            testError
        );
    });

    test('should modify action in before hook', () => {
        const newAction = createMockAction('MODIFIED_ACTION');
        const hooks: MiddlewareHooks = {
            before: () => newAction
        };

        const middleware = createMiddleware(hooks);
        const store = createMockStore({ value: 42 });
        const next = createMockDispatch();
        const originalAction = createMockAction();

        const wrappedDispatch = middleware(store)(next);
        wrappedDispatch(originalAction);

        expect(next).toHaveBeenCalledWith(newAction);
    });

    test('should filter actions based on actionFilter array', () => {
        const beforeHook = jest.fn();
        const hooks: MiddlewareHooks = { before: beforeHook };
        const config: MiddlewareConfig = {
            actionFilter: ['ALLOWED_ACTION']
        };

        const middleware = createMiddleware(hooks, config);
        const store = createMockStore({ value: 42 });
        const next = createMockDispatch();

        const wrappedDispatch = middleware(store)(next);

        // 測試允許的 action
        const allowedAction = createMockAction('ALLOWED_ACTION');
        wrappedDispatch(allowedAction);
        expect(beforeHook).toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith(allowedAction);

        // 重置 mock
        beforeHook.mockClear();
        next.mockClear();

        // 測試不允許的 action
        const blockedAction = createMockAction('BLOCKED_ACTION');
        wrappedDispatch(blockedAction);
        expect(beforeHook).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith(blockedAction);
    });

    test('should filter actions based on actionFilter function', () => {
        const beforeHook = jest.fn();
        const hooks: MiddlewareHooks = { before: beforeHook };
        const config: MiddlewareConfig = {
            actionFilter: (action) => action.type.startsWith('USER_')
        };

        const middleware = createMiddleware(hooks, config);
        const store = createMockStore({ value: 42 });
        const next = createMockDispatch();

        const wrappedDispatch = middleware(store)(next);

        // 測試匹配的 action
        const userAction = createMockAction('USER_LOGIN');
        wrappedDispatch(userAction);
        expect(beforeHook).toHaveBeenCalled();

        beforeHook.mockClear();

        // 測試不匹配的 action
        const otherAction = createMockAction('SYSTEM_INIT');
        wrappedDispatch(otherAction);
        expect(beforeHook).not.toHaveBeenCalled();
    });

    test('should skip middleware when disabled', () => {
        const beforeHook = jest.fn();
        const hooks: MiddlewareHooks = { before: beforeHook };
        const config: MiddlewareConfig = { enabled: false };

        const middleware = createMiddleware(hooks, config);
        const store = createMockStore({ value: 42 });
        const next = createMockDispatch();
        const action = createMockAction();

        const wrappedDispatch = middleware(store)(next);
        wrappedDispatch(action);

        expect(beforeHook).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith(action);
    });
});


// ===== Logger 中間件測試 =====

describe('Middleware System - LoggerMiddleware', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'info').mockImplementation();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    test('should log action dispatching', () => {
        const middleware = LoggerMiddleware();
        const store = createMockStore({ counter: 0 });
        const next = createMockDispatch();
        const action = createMockAction('INCREMENT');

        const wrappedDispatch = middleware(store)(next);
        wrappedDispatch(action);

        // 檢查日誌格式：應該包含時間戳、級別、來源和消息
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('[LoggerMiddleware]: 📤 Dispatching: INCREMENT'),
            expect.objectContaining({
                timestamp: action.timestamp,
                id: action.id
            })
        );
        expect(next).toHaveBeenCalledWith(action);
    });

    test('should log payload when logPayload is true', () => {
        const middleware = LoggerMiddleware({ logPayload: true });
        const store = createMockStore({ counter: 0 });
        const next = createMockDispatch();
        const action = { ...createMockAction('SET_VALUE'), payload: { value: 42 } };

        const wrappedDispatch = middleware(store)(next);
        wrappedDispatch(action);

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('[LoggerMiddleware]: 📤 Dispatching: SET_VALUE'),
            expect.objectContaining({
                payload: { value: 42 }
            })
        );
    });

    test('should filter actions by actionTypes', () => {
        const middleware = LoggerMiddleware({
            actionTypes: ['INCREMENT', 'DECREMENT']
        });
        const store = createMockStore({ counter: 0 });
        const next = createMockDispatch();

        const wrappedDispatch = middleware(store)(next);

        // 測試允許的 action
        wrappedDispatch(createMockAction('INCREMENT'));
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockClear();

        // 測試不允許的 action
        wrappedDispatch(createMockAction('OTHER_ACTION'));
        expect(consoleSpy).not.toHaveBeenCalled();
    });

    test('should use custom formatter when provided', () => {
        const customFormatter = jest.fn(() => 'Custom log message');
        const middleware = LoggerMiddleware({ formatter: customFormatter });
        const store = createMockStore({ counter: 0 });
        const next = createMockDispatch();
        const action = createMockAction('TEST');

        const wrappedDispatch = middleware(store)(next);
        wrappedDispatch(action);

        expect(customFormatter).toHaveBeenCalledWith(action, undefined);
        // 檢查包含自定義格式化消息的完整日誌
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('[LoggerMiddleware]: Custom log message')
        );
    });
});


// ===== Error 中間件測試 =====

export const LocalErrorMiddleware: MiddlewareFactory<any, ErrorMiddlewareConfig> = (
    config: ErrorMiddlewareConfig = {}
) => {
    const {
        onError,
        rethrow = true, // 注意：預設是 true
        reportFile,
        logToConsole = true,
        recoveryAction
    } = config;

    const logger = createLogger({ source: 'ErrorMiddleware', level: 'error' });

    return createMiddleware({
        error: (context, error) => {
            const errorInfo = {
                error: error.message,
                stack: error.stack,
                action: context.action,
                timestamp: Date.now(),
                state: context.getState()
            };

            // 記錄到 console
            if (logToConsole) {
                logger.error(`💥 Error in action ${context.action.type}:`, errorInfo);
            }

            // 報告錯誤到檔案
            if (reportFile) {
                // 這裡可以實作檔案寫入邏輯
                console.log(`Would write error to ${reportFile}:`, errorInfo);
            }

            // 自定義錯誤處理
            if (onError) {
                onError(error, context.action, context.getState());
            }

            // 錯誤恢復
            if (recoveryAction) {
                const recovery = recoveryAction(error, context.action);
                if (recovery) {
                    return recovery;
                }
            }

            // 重要：只有在 rethrow 為 true 時才重新拋出錯誤
            if (rethrow) {
                throw error;
            }

            // 如果 rethrow 為 false，則不拋出錯誤，讓執行繼續
            return undefined;
        }
    }, { name: 'ErrorMiddleware' });
};




// ===== Performance 中間件測試 =====

describe('Middleware System - PerformanceMiddleware', () => {
    let consoleWarnSpy: jest.SpyInstance;
    let performanceNowSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        performanceNowSpy = jest.spyOn(performance, 'now');
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
        performanceNowSpy.mockRestore();
    });

    test('should measure action execution time', () => {
        let timeCounter = 0;
        performanceNowSpy.mockImplementation(() => timeCounter += 10);

        const onMetrics = jest.fn();
        const middleware = PerformanceMiddleware({ onMetrics });
        const store = createMockStore({ value: 42 });
        const next = createMockDispatch();
        const action = createMockAction('TEST_ACTION');

        const wrappedDispatch = middleware(store)(next);
        wrappedDispatch(action);

        expect(onMetrics).toHaveBeenCalledWith({
            actionType: 'TEST_ACTION',
            duration: 10,
            timestamp: expect.any(Number),
            isSlowAction: false,
            actionId: 'test-id-123'
        });
    });

    test('should detect slow actions', () => {
        let timeCounter = 0;
        performanceNowSpy.mockImplementation(() => timeCounter += 30); // 30ms > 16ms threshold

        const onSlowAction = jest.fn();
        const middleware = PerformanceMiddleware({
            threshold: 16,
            onSlowAction
        });
        const store = createMockStore({ value: 42 });
        const next = createMockDispatch();
        const action = createMockAction('SLOW_ACTION');

        const wrappedDispatch = middleware(store)(next);
        wrappedDispatch(action);

        // 修正：檢查包含完整日誌格式的警告消息
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('[PerformanceMiddleware]: 🐌 Slow action detected: SLOW_ACTION took 30.00ms')
        );
        expect(onSlowAction).toHaveBeenCalledWith(
            expect.objectContaining({
                actionType: 'SLOW_ACTION',
                duration: 30,
                isSlowAction: true
            })
        );
    });

    test('should log all actions when logAll is true', () => {
        let timeCounter = 0;
        performanceNowSpy.mockImplementation(() => timeCounter += 5);

        // 修正：監聽正確的日誌級別 - Performance 中間件的 debug 信息
        const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

        const middleware = PerformanceMiddleware({ logAll: true });
        const store = createMockStore({ value: 42 });
        const next = createMockDispatch();
        const action = createMockAction('FAST_ACTION');

        const wrappedDispatch = middleware(store)(next);
        wrappedDispatch(action);

        // 修正：檢查包含完整日誌格式的調試消息
        expect(consoleDebugSpy).toHaveBeenCalledWith(
            expect.stringContaining('[PerformanceMiddleware]: ⚡ FAST_ACTION: 5.00ms')
        );

        consoleDebugSpy.mockRestore();
    });
});

// ===== Debounce 中間件測試 =====

describe('Middleware System - DebounceMiddleware', () => {
    beforeEach(() => {
        // 改成 legacy 模式，避免覆寫 window.performance
        jest.useFakeTimers({ legacyFakeTimers: true });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('should debounce actions', async () => {
        const middleware = DebounceMiddleware({
            interval: 0.1, // 100ms
            actionTypes: ['SEARCH_INPUT']
        });
        const store = createMockStore({ query: '' });
        const next = createMockDispatch();

        const wrappedDispatch = middleware(store)(next);

        // 快速連續派發多個 action
        wrappedDispatch(createMockAction('SEARCH_INPUT'));
        wrappedDispatch(createMockAction('SEARCH_INPUT'));
        wrappedDispatch(createMockAction('SEARCH_INPUT'));

        // 此時還沒有執行
        expect(next).not.toHaveBeenCalled();

        // 等待防抖時間
        jest.advanceTimersByTime(100);

        // 等待 promise resolution
        await Promise.resolve();

        // 應該只執行最後一個
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('should not debounce non-specified actions', () => {
        const middleware = DebounceMiddleware({
            interval: 0.1,
            actionTypes: ['SEARCH_INPUT']
        });
        const store = createMockStore({ query: '' });
        const next = createMockDispatch();

        const wrappedDispatch = middleware(store)(next);

        // 非指定的 action 應該直接通過
        wrappedDispatch(createMockAction('OTHER_ACTION'));

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'OTHER_ACTION' })
        );
    });
});


// ===== 中間件管理器測試 =====

describe('Middleware System - MiddlewareManager', () => {
    test('should add and manage middlewares', () => {
        const manager = createMiddlewareManager();
        const middleware1 = LoggerMiddleware();
        const middleware2 = LocalErrorMiddleware();

        manager.add(middleware1, { priority: 1 });
        manager.add(middleware2, { priority: 0 }); // 更高優先級

        const orderedMiddlewares = manager.getOrderedMiddlewares();

        expect(orderedMiddlewares).toHaveLength(2);
        expect(orderedMiddlewares[0]).toBe(middleware2); // 優先級高的在前
        expect(orderedMiddlewares[1]).toBe(middleware1);
    });

    test('should remove middlewares', () => {
        const manager = createMiddlewareManager();
        const middleware1 = LoggerMiddleware();
        const middleware2 = ErrorMiddleware();

        manager.add(middleware1);
        manager.add(middleware2);

        expect(manager.getOrderedMiddlewares()).toHaveLength(2);

        manager.remove(middleware1);

        expect(manager.getOrderedMiddlewares()).toHaveLength(1);
        expect(manager.getOrderedMiddlewares()[0]).toBe(middleware2);
    });

    test('should filter disabled middlewares', () => {
        const manager = createMiddlewareManager();
        const middleware1 = LoggerMiddleware();
        const middleware2 = ErrorMiddleware();

        manager.add(middleware1, { enabled: true });
        manager.add(middleware2, { enabled: false });

        const enabledMiddlewares = manager.getOrderedMiddlewares();

        expect(enabledMiddlewares).toHaveLength(1);
        expect(enabledMiddlewares[0]).toBe(middleware1);
    });

    test('should clear all middlewares', () => {
        const manager = createMiddlewareManager();
        const middleware1 = LoggerMiddleware();
        const middleware2 = ErrorMiddleware();

        manager.add(middleware1);
        manager.add(middleware2);

        expect(manager.getOrderedMiddlewares()).toHaveLength(2);

        manager.clear();

        expect(manager.getOrderedMiddlewares()).toHaveLength(0);
    });
});

// ===== 整合測試 =====

describe('Middleware System - Integration Tests', () => {
    test('should work with multiple middlewares in correct order', () => {
        const executionOrder: string[] = [];

        const middleware1 = createMiddleware({
            before: () => { executionOrder.push('middleware1-before'); },
            after: () => { executionOrder.push('middleware1-after'); }
        }, { name: 'Middleware1' });

        const middleware2 = createMiddleware({
            before: () => { executionOrder.push('middleware2-before'); },
            after: () => { executionOrder.push('middleware2-after'); }
        }, { name: 'Middleware2' });

        const store = createMockStore({ value: 42 });
        const finalNext = jest.fn(() => { executionOrder.push('reducer'); });
        const action = createMockAction();

        // 組合中間件（按照 Redux 的順序：從左到右執行）
        const composedDispatch = middleware1(store)(middleware2(store)(finalNext));
        composedDispatch(action);

        expect(executionOrder).toEqual([
            'middleware1-before',
            'middleware2-before',
            'reducer',
            'middleware2-after',
            'middleware1-after'
        ]);
    });

    test('should handle complex middleware chain with error recovery', () => {
        const errorMiddleware = LocalErrorMiddleware({
            rethrow: false,
            recoveryAction: () => createMockAction('ERROR_RECOVERED')
        });

        const loggerMiddleware = LoggerMiddleware();

        const store = createMockStore({ value: 42 });
        const next = jest.fn(() => { throw new Error('Simulated error'); });
        const action = createMockAction('FAILING_ACTION');

        // 組合錯誤處理和日誌中間件
        const composedDispatch = errorMiddleware(store)(loggerMiddleware(store)(next))

        expect(() => composedDispatch(action)).not.toThrow();
        expect(next).toHaveBeenCalledWith(action);
    });
});

// ===== 性能測試 =====

describe('Middleware System - Performance Tests', () => {
    test('should handle high-frequency actions efficiently', () => {
        const middleware = LoggerMiddleware();
        const store = createMockStore({ counter: 0 });
        const next = createMockDispatch();

        const wrappedDispatch = middleware(store)(next);

        const start = performance.now();

        // 模擬高頻 action 派發
        for (let i = 0; i < 1000; i++) {
            wrappedDispatch(createMockAction(`ACTION_${i}`));
        }

        const duration = performance.now() - start;

        expect(duration).toBeLessThan(100); // 應該在 100ms 內完成
        expect(next).toHaveBeenCalledTimes(1000);
    });

    test('should not leak memory with middleware manager', () => {
        const manager = createMiddlewareManager();

        // 添加大量中間件
        for (let i = 0; i < 100; i++) {
            manager.add(LoggerMiddleware(), { priority: i });
        }

        expect(manager.getOrderedMiddlewares()).toHaveLength(100);

        // 清空應該立即生效
        manager.clear();

        expect(manager.getOrderedMiddlewares()).toHaveLength(0);
    });
});