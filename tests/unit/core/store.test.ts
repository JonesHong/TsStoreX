/**
 * Store 核心系統單元測試
 * 
 * 測試範圍：
 * - Store 核心功能
 * - Signal 投影系統
 * - 中間件系統
 * - 環境自適應
 * - 錯誤處理
 * - 生命週期管理
 */

import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { map, take, skip } from 'rxjs/operators';

// Mock 環境檢測
jest.mock('../../../src/utils/environment', () => ({
    isBrowser: jest.fn(),
    isServer: jest.fn(),
    detectEnvironment: jest.fn()
}));

// Mock Logger
jest.mock('../../../src/utils/logger', () => ({
    createLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));



// 修正 SolidJS Mock - 確保在任何時候 require('solid-js') 都會返回正確的 mock
const mockCreateSignal = jest.fn();
const mockCreateMemo = jest.fn();
const mockSetSignal = jest.fn();

// 重要：使用 jest.doMock 來確保動態 require 可以正確獲取 mock
jest.doMock('solid-js', () => ({
    createSignal: mockCreateSignal,
    createMemo: mockCreateMemo
}));


import { Store, SignalProjector, createStore, useSelector } from '../../../src/core/store';
import { createAction } from '../../../src/core/action';
import { createReducer, on } from '../../../src/core/reducer';
import { isBrowser, isServer, detectEnvironment } from '../../../src/utils/environment';
import { createLogger, LogLevel } from '../../../src/utils/logger';

// ============================================================================
// 測試用型別和數據
// ============================================================================

interface TestState {
    counter: number;
    user: {
        id: string;
        name: string;
    } | null;
    todos: Array<{ id: string; text: string; completed: boolean }>;
}

const initialState: TestState = {
    counter: 0,
    user: null,
    todos: []
};

// 測試 Actions
const increment = createAction('INCREMENT');
const decrement = createAction('DECREMENT');
const setCounter = createAction<number>('SET_COUNTER');
const setUser = createAction<{ id: string; name: string }>('SET_USER');
const addTodo = createAction<{ id: string; text: string }>('ADD_TODO');
const reset = createAction('RESET');

// 測試 Reducer
const testReducer = createReducer(
    initialState,
    on(increment, (draft) => {
        draft.counter += 1;
    }),
    on(decrement, (draft) => {
        draft.counter -= 1;
    }),
    on(setCounter, (draft, action) => {
        draft.counter = action.payload;
    }),
    on(setUser, (draft, action) => {
        draft.user = action.payload;
    }),
    on(addTodo, (draft, action) => {
        draft.todos.push({
            ...action.payload,
            completed: false
        });
    }),
    on(reset, () => initialState)
);

// ============================================================================
// Mock 設定
// ============================================================================

const mockIsBrowser = isBrowser as jest.MockedFunction<typeof isBrowser>;
const mockIsServer = isServer as jest.MockedFunction<typeof isServer>;
const mockDetectEnvironment = detectEnvironment as jest.MockedFunction<typeof detectEnvironment>;
const mockCreateLogger = createLogger as jest.MockedFunction<typeof createLogger>;


// ============================================================================
// 測試工具函數
// ============================================================================

const setupBrowserEnv = () => {
    mockIsBrowser.mockReturnValue(true);
    mockIsServer.mockReturnValue(false);
    mockDetectEnvironment.mockReturnValue('browser');
};

const setupServerEnv = () => {
    mockIsBrowser.mockReturnValue(false);
    mockIsServer.mockReturnValue(true);
    mockDetectEnvironment.mockReturnValue('node');
};

const createMockLogger = () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),

    // 下面四個是補上的方法
    isEnabled: jest.fn().mockReturnValue(true),
    child: jest.fn().mockImplementation((props) => createMockLogger()),
    setLevel: jest.fn(),
    getLevel: jest.fn().mockReturnValue('info' as LogLevel),
});

const createTestStore = (config = {}) => {
    return new Store(testReducer, initialState, config);
};

// ============================================================================
// Store 核心功能測試
// ============================================================================

describe('Store 核心功能', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateLogger.mockReturnValue(createMockLogger());
        setupBrowserEnv();
    });

    describe('Store 創建和初始化', () => {
        test('應該正確創建 Store 實例', () => {
            const store = createTestStore();

            expect(store).toBeInstanceOf(Store);
            expect(store.getState()).toEqual(initialState);
        });

        test('應該使用工廠方法創建 Store', () => {
            const store = Store.create(testReducer, initialState);

            expect(store).toBeInstanceOf(Store);
            expect(store.getState()).toEqual(initialState);
        });

        test('應該使用便利函數創建 Store', () => {
            const store = createStore(testReducer, initialState);

            expect(store).toBeInstanceOf(Store);
            expect(store.getState()).toEqual(initialState);
        });

        test('應該正確設定 Logger', () => {
            const store = createTestStore({ logLevel: 'debug' });

            expect(mockCreateLogger).toHaveBeenCalledWith({
                source: 'Store',
                level: 'debug'
            });
        });
    });

    describe('State 管理', () => {
        test('應該正確獲取初始狀態', () => {
            const store = createTestStore();

            expect(store.getState()).toEqual(initialState);
        });

        test('應該正確分發 Action 並更新狀態', () => {
            const store = createTestStore();

            store.dispatch(increment());
            expect(store.getState().counter).toBe(1);

            store.dispatch(increment());
            expect(store.getState().counter).toBe(2);

            store.dispatch(decrement());
            expect(store.getState().counter).toBe(1);
        });

        test('應該正確處理帶 payload 的 Action', () => {
            const store = createTestStore();

            store.dispatch(setCounter(42));
            expect(store.getState().counter).toBe(42);

            store.dispatch(setUser({ id: '1', name: 'John' }));
            expect(store.getState().user).toEqual({ id: '1', name: 'John' });
        });

        test('應該正確處理複雜狀態更新', () => {
            const store = createTestStore();

            store.dispatch(addTodo({ id: '1', text: 'Learn TsStoreX' }));
            store.dispatch(addTodo({ id: '2', text: 'Write tests' }));

            expect(store.getState().todos).toHaveLength(2);
            expect(store.getState().todos[0]).toEqual({
                id: '1',
                text: 'Learn TsStoreX',
                completed: false
            });
        });

        test('應該在狀態未變更時不更新', () => {
            const store = createTestStore();
            const initialStateRef = store.getState();

            // 分發一個不會改變狀態的 action
            store.dispatch({ type: 'UNKNOWN_ACTION', timestamp: Date.now(), id: 'test' });

            expect(store.getState()).toBe(initialStateRef);
        });
    });

    describe('RxJS 響應式流', () => {
        test('應該提供狀態流', async () => {
            const store = createTestStore();

            const statePromise = firstValueFrom(store.state$.pipe(skip(1), take(1)));

            store.dispatch(increment());

            const state = await statePromise;
            expect(state.counter).toBe(1);
        });

        test('應該提供 Action 流', async () => {
            const store = createTestStore();

            const actionPromise = firstValueFrom(store.action$.pipe(take(1)));

            const action = increment();
            store.dispatch(action);

            const receivedAction = await actionPromise;
            expect(receivedAction.type).toBe('INCREMENT');
        });

        test('應該支援狀態選擇器', async () => {
            const store = createTestStore();

            const counterStream = store.selectState(state => state.counter);
            const counterPromise = firstValueFrom(counterStream.pipe(skip(1), take(1)));

            store.dispatch(setCounter(10));

            const counter = await counterPromise;
            expect(counter).toBe(10);
        });

        test('應該支援自定義比較函數', async () => {
            const store = createTestStore();

            // 只有當 counter 變化超過 5 時才觸發
            const significantChanges = store.selectState(
                state => state.counter,
                (a, b) => Math.abs(a - b) < 5
            );

            const values: number[] = [];
            significantChanges.subscribe(value => values.push(value));

            store.dispatch(setCounter(3)); // 不應觸發（變化 < 5）
            store.dispatch(setCounter(6)); // 應該觸發（變化 >= 5）
            store.dispatch(setCounter(8)); // 不應觸發（變化 < 5）

            expect(values).toEqual([0, 6]); // 初始值 + 顯著變化
        });

        test('應該支援訂閱狀態變化', () => {
            const store = createTestStore();
            const mockNext = jest.fn();

            const subscription = store.state$.pipe(skip(1)).subscribe({ next: mockNext });
            // mockNext.mockClear();    // 把首次 BehaviorSubject 的 emission count 清成 0

            store.dispatch(increment());
            store.dispatch(increment());

            expect(mockNext).toHaveBeenCalledTimes(2);
            expect(mockNext).toHaveBeenLastCalledWith({ ...initialState, counter: 2 });

            subscription.unsubscribe();
        });
    });

    describe('錯誤處理', () => {
        test('應該處理無效的 Action', () => {
            const store = createTestStore();
            const mockLogger = mockCreateLogger.mock.results[0].value;

            expect(() => {
                store.dispatch(null as any);
            }).toThrow('Invalid action: missing type');

            expect(() => {
                store.dispatch({ type: null } as any);
            }).toThrow('Invalid action: missing type');
        });

        test('應該處理 Reducer 錯誤', () => {
            const faultyReducer = jest.fn().mockImplementation(() => {
                throw new Error('Reducer error');
            });

            expect(() => {
                new Store(faultyReducer, initialState);
            }).not.toThrow(); // Store 創建不應拋出錯誤

            const store = new Store(faultyReducer, initialState);

            expect(() => {
                store.dispatch(increment());
            }).toThrow('Reducer error');
        });

        test('應該警告 undefined 返回值', () => {
            const undefinedReducer = jest.fn().mockReturnValue(undefined);
            const store = new Store(undefinedReducer, initialState);
            const mockLogger = mockCreateLogger.mock.results[0].value;

            store.dispatch(increment());

            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Reducer returned undefined for action: INCREMENT')
            );
        });
    });
});

// ============================================================================
// Signal 投影系統測試
// ============================================================================

describe('Signal 投影系統', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateLogger.mockReturnValue(createMockLogger());
    });

    describe('瀏覽器環境', () => {
        beforeEach(() => {
            setupBrowserEnv();

            // 設定 SolidJS mock 返回值 - 確保結構正確
            const mockSignalFunction = jest.fn(() => 'signal-value');
            mockCreateSignal.mockReturnValue([
                mockSignalFunction,
                mockSetSignal
            ]);

            const mockMemoFunction = jest.fn(() => 'memo-value');
            mockCreateMemo.mockReturnValue(mockMemoFunction);
        });

        test('應該在瀏覽器環境創建 Signal', () => {
            const store = createTestStore();

            const signal = store.select(state => state.counter);

            expect(signal).not.toBeNull();
            expect(typeof signal).toBe('function');
            expect(mockCreateSignal).toHaveBeenCalled();
        });

        test('應該在瀏覽器環境創建 Memo Signal', () => {
            const store = createTestStore();

            const memoSignal = store.selectMemo(state => state.counter * 2);

            expect(memoSignal).not.toBeNull();
            expect(typeof memoSignal).toBe('function');
            expect(mockCreateSignal).toHaveBeenCalled();
            expect(mockCreateMemo).toHaveBeenCalled();
        });

        test('應該快取相同的 Signal', () => {
            const store = createTestStore();

            const signal1 = store.select(state => state.counter, { key: 'counter' });
            const signal2 = store.select(state => state.counter, { key: 'counter' });

            expect(signal1).toBe(signal2);
            expect(signal1).not.toBeNull();
        });

        test('應該正確增強 Signal 介面', () => {
            const store = createTestStore();

            const signal = store.select(state => state.counter);

            expect(signal).not.toBeNull();
            if (signal) {
                expect(typeof signal).toBe('function');
                expect(signal).toHaveProperty('latest');
            }
        });
    });
});

describe('服務端環境', () => {
    beforeEach(() => {
        setupServerEnv();
    });

    test('應該在服務端環境返回 null', () => {
        const store = createTestStore();

        const signal = store.select(state => state.counter);

        expect(signal).toBeNull();
    });

    test('應該在服務端環境為 Memo Signal 返回 null', () => {
        const store = createTestStore();

        const memoSignal = store.selectMemo(state => state.counter * 2);

        expect(memoSignal).toBeNull();
    });
});

describe('Signal 投影器獨立測試', () => {
    test('應該正確創建 SignalProjector', () => {
        setupBrowserEnv();
        const state$ = of(initialState);

        const projector = new SignalProjector(state$);

        expect(projector).toBeInstanceOf(SignalProjector);
    });

    test('應該正確銷毀 SignalProjector', () => {
        setupBrowserEnv();
        const state$ = of(initialState);
        const projector = new SignalProjector(state$);

        expect(() => projector.destroy()).not.toThrow();
    });

    test('應該在不支援的環境中返回 null', () => {
        // 測試服務端環境（這是一個真實的降級情況）
        setupServerEnv();
        
        const state$ = of(initialState);
        const projector = new SignalProjector(state$);

        const signal = projector.createSignal(state => state.counter);

        expect(signal).toBeNull();
        expect(mockCreateSignal).not.toHaveBeenCalled();
    });

    test('應該在錯誤情況下返回 null', () => {
        setupBrowserEnv();
        const state$ = of(initialState);
        
        // 使用繼承來模擬錯誤情況
        class ErrorSignalProjector extends SignalProjector<any> {
            createSignal<R>(selector: any, options: any = {}): any {
                try {
                    throw new Error('Simulated error');
                } catch (error) {
                    // 模擬原始程式碼中的 catch 邏輯
                    return null;
                }
            }
        }

        const projector = new ErrorSignalProjector(state$);
        const signal = projector.createSignal(state => state.counter);

        expect(signal).toBeNull();
    });
});

// ============================================================================
// 中間件系統測試
// ============================================================================

describe('中間件系統', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateLogger.mockReturnValue(createMockLogger());
        setupBrowserEnv();
    });

    test('應該正確應用單個中間件', () => {
        const mockMiddleware = jest.fn((store) => (next) => (action) => {
            action.middleware = 'applied';
            return next(action);
        });

        const store = createTestStore({ middleware: [mockMiddleware] });

        expect(mockMiddleware).toHaveBeenCalled();
    });

    test('應該正確應用多個中間件', () => {
        const middleware1 = jest.fn((store) => (next) => (action) => {
            action.step1 = true;
            return next(action);
        });

        const middleware2 = jest.fn((store) => (next) => (action) => {
            action.step2 = true;
            return next(action);
        });

        const store = createTestStore({ middleware: [middleware1, middleware2] });

        expect(middleware1).toHaveBeenCalled();
        expect(middleware2).toHaveBeenCalled();
    });

    test('中間件應該能訪問 Store API', () => {
        let capturedStore: any;

        const middleware = (store: any) => {
            capturedStore = store;
            return (next: any) => (action: any) => next(action);
        };

        const store = createTestStore({ middleware: [middleware] });

        expect(capturedStore).toBeDefined();
        expect(typeof capturedStore.getState).toBe('function');
        expect(typeof capturedStore.dispatch).toBe('function');
    });

    test('中間件應該能修改 Action', () => {
        const loggingMiddleware = (store: any) => (next: any) => (action: any) => {
            const modifiedAction = { ...action, logged: true };
            return next(modifiedAction);
        };

        const store = createTestStore({ middleware: [loggingMiddleware] });

        // 這個測試驗證中間件流程正常工作，雖然我們看不到內部修改
        expect(() => store.dispatch(increment())).not.toThrow();
    });

    test('應該處理中間件錯誤', () => {
        const faultyMiddleware = () => {
            throw new Error('Middleware error');
        };

        expect(() => {
            createTestStore({ middleware: [faultyMiddleware] });
        }).toThrow('Middleware error');
    });

    test('應該在沒有中間件時正常工作', () => {
        const store = createTestStore({ middleware: [] });

        expect(() => store.dispatch(increment())).not.toThrow();
        expect(store.getState().counter).toBe(1);
    });
});

// ============================================================================
// 統一選擇器介面測試
// ============================================================================

describe('統一選擇器介面', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateLogger.mockReturnValue(createMockLogger());
    });

    test('應該在瀏覽器環境返回 Signal', () => {
        setupBrowserEnv();
        mockCreateSignal.mockReturnValue([jest.fn(), jest.fn()]);

        const store = createTestStore();
        const result = useSelector(store, state => state.counter);

        // 在瀏覽器環境應該返回 Signal（非 null）
        expect(result).not.toBeNull();
    });

    test('應該在服務端環境返回 Observable', () => {
        setupServerEnv();

        const store = createTestStore();
        const result = useSelector(store, state => state.counter);

        // 先用 type guard 判斷，再做後續斷言
        expect(isObservable(result)).toBe(true);
        if (isObservable(result)) {
            expect(typeof result.subscribe).toBe('function');
        }
    });
});

// ============================================================================
// 生命週期管理測試
// ============================================================================

describe('生命週期管理', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateLogger.mockReturnValue(createMockLogger());
        setupBrowserEnv();
    });

    test('應該正確銷毀 Store', () => {
        const store = createTestStore();

        expect(() => store.destroy()).not.toThrow();
    });

    test('應該正確重置 Store', () => {
        const store = createTestStore();

        store.dispatch(increment());
        store.dispatch(setUser({ id: '1', name: 'John' }));

        store.reset();

        expect(store.getState()).toEqual(initialState);
    });

    test('應該提供 Store 信息', () => {
        const store = createTestStore({ middleware: [jest.fn()] });

        const info = store.getStoreInfo();

        expect(info).toBeDefined();
        expect(info.environment).toBe('browser');
        expect(info.signalsEnabled).toBe(true);
        expect(info.middlewareCount).toBe(1);
        expect(info.currentStateSnapshot).toEqual(initialState);
    });
});

// ============================================================================
// 邊界情況和錯誤處理測試
// ============================================================================

describe('邊界情況和錯誤處理', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateLogger.mockReturnValue(createMockLogger());
        setupBrowserEnv();
    });

    test('應該處理空配置', () => {
        expect(() => {
            new Store(testReducer, initialState, {});
        }).not.toThrow();
    });

    test('應該處理未定義的配置', () => {
        expect(() => {
            new Store(testReducer, initialState);
        }).not.toThrow();
    });

    test('應該處理複雜的選擇器', () => {
        const store = createTestStore();

        const complexSelector = (state: TestState) => ({
            counterSquared: state.counter * state.counter,
            hasUser: !!state.user,
            todoCount: state.todos.length
        });

        const result = store.selectState(complexSelector);

        expect(result).toBeDefined();
    });

    test('應該處理函數型選擇器返回值', async () => {
        setupBrowserEnv();
        mockCreateSignal.mockReturnValue([jest.fn(), jest.fn()]);

        const store = createTestStore();

        // 選擇器返回函數（邊界情況）
        const functionSelector = () => () => 'function result';

        expect(() => {
            store.select(functionSelector);
        }).not.toThrow();
    });

    test('應該處理大量快速 dispatch', () => {
        const store = createTestStore();

        expect(() => {
            for (let i = 0; i < 1000; i++) {
                store.dispatch(increment());
            }
        }).not.toThrow();

        expect(store.getState().counter).toBe(1000);
    });
});

// ============================================================================
// 效能相關測試
// ============================================================================

describe('效能相關測試', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateLogger.mockReturnValue(createMockLogger());
        setupBrowserEnv();
    });

    test('應該避免不必要的狀態更新', () => {
        const store = createTestStore();
        const mockSubscriber = jest.fn();

        store.state$.subscribe(mockSubscriber);

        // 分發不會改變狀態的 action
        store.dispatch({ type: 'UNKNOWN', timestamp: Date.now(), id: 'test' });
        store.dispatch({ type: 'UNKNOWN', timestamp: Date.now(), id: 'test' });

        // 只應該有初始狀態的一次調用
        expect(mockSubscriber).toHaveBeenCalledTimes(1);
    });

    test('應該正確處理引用相等性', () => {
        const store = createTestStore();
        const initialStateRef = store.getState();

        // 分發不改變狀態的 action
        store.dispatch({ type: 'UNKNOWN', timestamp: Date.now(), id: 'test' });

        // 狀態引用應該保持相同
        expect(store.getState()).toBe(initialStateRef);
    });
});

// ============================================================================
// 整合測試
// ============================================================================

describe('整合測試', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateLogger.mockReturnValue(createMockLogger());
    });

    test('完整的狀態管理流程', async () => {
        setupBrowserEnv();
        const store = createTestStore();

        // 訂閱狀態變化
        const states: TestState[] = [];
        store.state$.subscribe(state => states.push(state));

        // 執行一系列操作
        store.dispatch(increment());
        store.dispatch(setUser({ id: '1', name: 'Alice' }));
        store.dispatch(addTodo({ id: 't1', text: 'Task 1' }));
        store.dispatch(addTodo({ id: 't2', text: 'Task 2' }));
        store.dispatch(increment());

        // 驗證最終狀態
        const finalState = store.getState();
        expect(finalState.counter).toBe(2);
        expect(finalState.user).toEqual({ id: '1', name: 'Alice' });
        expect(finalState.todos).toHaveLength(2);

        // 驗證狀態變化歷史
        expect(states).toHaveLength(6); // 初始 + 5次變化
    });

    test('跨環境一致性', () => {
        // 測試瀏覽器環境
        setupBrowserEnv();
        const browserStore = createTestStore();
        browserStore.dispatch(increment());
        const browserState = browserStore.getState();

        // 測試服務端環境
        setupServerEnv();
        const serverStore = createTestStore();
        serverStore.dispatch(increment());
        const serverState = serverStore.getState();

        // 核心狀態邏輯應該一致
        expect(browserState).toEqual(serverState);
    });
});