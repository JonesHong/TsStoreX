/**
 * Store 核心系統單元測試 - 增強版
 * 
 * 測試範圍：
 * - Store Builder 系統
 * - 多 Reducer 管理
 * - Signal 投影系統
 * - 中間件系統
 * - Effects 系統
 * - 環境自適應
 * - 錯誤處理
 * - 生命週期管理
 */

import { firstValueFrom, isObservable, of, throwError, Observable } from 'rxjs';
import { map, take, skip, filter } from 'rxjs/operators';

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

// 修正 SolidJS Mock
const mockCreateSignal = jest.fn();
const mockCreateMemo = jest.fn();
const mockSetSignal = jest.fn();

jest.doMock('solid-js', () => ({
    createSignal: mockCreateSignal,
    createMemo: mockCreateMemo
}));

import { 
    EnhancedStore, 
    StoreBuilder, 
    createStoreBuilder, 
    store, 
    createStore,
    useSelector 
} from '../../../src/core/store';
import { createAction } from '../../../src/core/action';
import { createReducer, on } from '../../../src/core/reducer';
import { isBrowser, isServer, detectEnvironment } from '../../../src/utils/environment';
import { createLogger, LogLevel } from '../../../src/utils/logger';

// ============================================================================
// 測試用型別和數據
// ============================================================================

// 分割成獨立的狀態類型
interface CounterState {
    count: number;
    lastUpdated: number;
}

interface UserState {
    users: Array<{ id: string; name: string; email: string }>;
    currentUser: { id: string; name: string } | null;
    total: number;
}

interface UIState {
    theme: 'light' | 'dark';
    loading: boolean;
    errors: string[];
}

// 完整的應用狀態（所有 reducer 的聯集）
interface AppState {
    counter: CounterState;
    user: UserState;
    ui: UIState;
}

// 初始狀態
const initialCounterState: CounterState = {
    count: 0,
    lastUpdated: 0
};

const initialUserState: UserState = {
    users: [],
    currentUser: null,
    total: 0
};

const initialUIState: UIState = {
    theme: 'light',
    loading: false,
    errors: []
};

// Actions
const increment = createAction('INCREMENT');
const decrement = createAction('DECREMENT');
const setCounter = createAction<number>('SET_COUNTER');
const reset = createAction('RESET');

const addUser = createAction<{ name: string; email: string }>('ADD_USER');
const setCurrentUser = createAction<{ id: string; name: string }>('SET_CURRENT_USER');
const clearUsers = createAction('CLEAR_USERS');

const setTheme = createAction<'light' | 'dark'>('SET_THEME') as (payload: 'light' | 'dark') => { type: string; payload: 'light' | 'dark' };
const setLoading = createAction<boolean>('SET_LOADING');
const addError = createAction<string>('ADD_ERROR');

// Reducers
const counterReducer = createReducer(
    initialCounterState,
    on(increment, (draft) => {
        draft.count += 1;
        draft.lastUpdated = Date.now();
    }),
    on(decrement, (draft) => {
        draft.count -= 1;
        draft.lastUpdated = Date.now();
    }),
    on(setCounter, (draft, action) => {
        draft.count = action.payload;
        draft.lastUpdated = Date.now();
    }),
    on(reset, () => initialCounterState)
);

const userReducer = createReducer(
    initialUserState,
    on(addUser, (draft, action) => {
        const newUser = {
            id: `user_${Date.now()}`,
            name: action.payload.name,
            email: action.payload.email
        };
        draft.users.push(newUser);
        draft.total += 1;
    }),
    on(setCurrentUser, (draft, action) => {
        draft.currentUser = action.payload;
    }),
    on(clearUsers, () => initialUserState)
);

const uiReducer = createReducer(
    initialUIState,
    on(setTheme, (draft, action) => {
        draft.theme = action.payload;
    }),
    on(setLoading, (draft, action) => {
        draft.loading = action.payload;
    }),
    on(addError, (draft, action) => {
        draft.errors.push(action.payload);
    })
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
    isEnabled: jest.fn().mockReturnValue(true),
    child: jest.fn().mockImplementation(() => createMockLogger()),
    setLevel: jest.fn(),
    getLevel: jest.fn().mockReturnValue('info' as LogLevel),
});

// 創建測試用的完整 Store
const createTestStore = (config = {}) => {
    return store()
        .configure(config)
        .registerReducer('counter', counterReducer)
        .registerReducer('user', userReducer)
        .registerReducer('ui', uiReducer)
        .build();
};

// 創建簡單的計數器 Store（用於基礎測試）
const createSimpleCounterStore = (config = {}) => {
    return store()
        .configure(config)
        .registerReducer('counter', counterReducer)
        .build();
};

// ============================================================================
// Store Builder 系統測試
// ============================================================================

describe('Store Builder 系統', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateLogger.mockReturnValue(createMockLogger());
        setupBrowserEnv();
    });

    describe('StoreBuilder 創建和配置', () => {
        test('應該創建 StoreBuilder 實例', () => {
            const builder = createStoreBuilder();
            expect(builder).toBeInstanceOf(StoreBuilder);
        });

        test('應該使用便利函數創建 Builder', () => {
            const builder = store();
            expect(builder).toBeInstanceOf(StoreBuilder);
        });

        test('應該正確配置選項', () => {
            const builder = store().configure({ 
                logLevel: 'debug', 
                enableSignals: false 
            });
            
            expect(builder).toBeInstanceOf(StoreBuilder);
        });
    });

    describe('Reducer 註冊', () => {
        test('應該註冊單個 Reducer', () => {
            const builder = store().registerReducer('counter', counterReducer);
            
            const snapshot = builder.getSnapshot();
            expect(snapshot.reducers).toHaveProperty('counter');
        });

        test('應該註冊多個 Reducer', () => {
            const builder = store().registerReducers({
                counter: counterReducer,
                user: userReducer
            });
            
            const snapshot = builder.getSnapshot();
            expect(snapshot.reducers).toHaveProperty('counter');
            expect(snapshot.reducers).toHaveProperty('user');
        });

        test('應該註冊根 Reducer 映射', () => {
            const builder = store()
                .registerReducer('temp', counterReducer) // 這個會被替換
                .registerRoot({
                    counter: counterReducer,
                    user: userReducer,
                    ui: uiReducer
                });
            
            const snapshot = builder.getSnapshot();
            expect(snapshot.reducers).toHaveProperty('counter');
            expect(snapshot.reducers).toHaveProperty('user');
            expect(snapshot.reducers).toHaveProperty('ui');
            expect(snapshot.reducers).not.toHaveProperty('temp');
        });

        test('應該移除 Reducer', () => {
            const builder = store()
                .registerReducer('counter', counterReducer)
                .registerReducer('user', userReducer)
                .removeReducer('user');
            
            const snapshot = builder.getSnapshot();
            expect(snapshot.reducers).toHaveProperty('counter');
            expect(snapshot.reducers).not.toHaveProperty('user');
        });
    });

    describe('中間件註冊', () => {
        test('應該註冊單個中間件', () => {
            const middleware = jest.fn();
            const builder = store().applyMiddleware(middleware);
            
            const snapshot = builder.getSnapshot();
            expect(snapshot.middleware).toContain(middleware);
        });

        test('應該註冊多個中間件', () => {
            const middleware1 = jest.fn();
            const middleware2 = jest.fn();
            const builder = store().applyMiddlewares(middleware1, middleware2);
            
            const snapshot = builder.getSnapshot();
            expect(snapshot.middleware).toContain(middleware1);
            expect(snapshot.middleware).toContain(middleware2);
        });

        test('應該移除中間件', () => {
            const middleware = jest.fn();
            const builder = store()
                .applyMiddleware(middleware)
                .removeMiddleware(middleware);
            
            const snapshot = builder.getSnapshot();
            expect(snapshot.middleware).not.toContain(middleware);
        });
    });

    describe('Effects 註冊', () => {
        test('應該註冊單個 Effect', () => {
            const effect = jest.fn(() => of());
            const builder = store().registerEffect('test', effect);
            
            const snapshot = builder.getSnapshot();
            expect(snapshot.effects).toHaveLength(1);
            expect(snapshot.effects[0].name).toBe('test');
        });

        test('應該註冊多個 Effects', () => {
            const effect1 = jest.fn(() => of());
            const effect2 = jest.fn(() => of());
            const builder = store().registerEffects({
                test1: effect1,
                test2: effect2
            });
            
            const snapshot = builder.getSnapshot();
            expect(snapshot.effects).toHaveLength(2);
        });

        test('應該移除 Effect', () => {
            const effect = jest.fn(() => of());
            const builder = store()
                .registerEffect('test', effect)
                .removeEffect('test');
            
            const snapshot = builder.getSnapshot();
            expect(snapshot.effects).toHaveLength(0);
        });
    });

    describe('Builder 驗證', () => {
        test('應該驗證至少有一個 Reducer', () => {
            const builder = store();
            
            expect(() => builder.build()).toThrow('At least one reducer must be registered');
        });

        test('應該驗證 Reducer 是函數', () => {
            const builder = store().registerReducers({
                counter: counterReducer,
                invalid: 'not a function' as any
            });
            
            expect(() => builder.build()).toThrow('Reducer for key "invalid" is not a function');
        });

        test('應該驗證中間件是函數', () => {
            const builder = store()
                .registerReducer('counter', counterReducer)
                .applyMiddleware('not a function' as any);
            
            expect(() => builder.build()).toThrow('Middleware at index 0 is not a function');
        });
    });
});

// ============================================================================
// Store 核心功能測試
// ============================================================================

describe('Store 核心功能', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateLogger.mockReturnValue(createMockLogger());
        setupBrowserEnv();
    });

    describe('Store 創建和狀態管理', () => {
        test('應該正確創建多 Reducer Store', () => {
            const testStore = createTestStore();
            
            expect(testStore).toBeInstanceOf(EnhancedStore);
            
            const state = testStore.getState();
            expect(state).toHaveProperty('counter');
            expect(state).toHaveProperty('user');
            expect(state).toHaveProperty('ui');
            expect(state.counter).toEqual(initialCounterState);
            expect(state.user).toEqual(initialUserState);
            expect(state.ui).toEqual(initialUIState);
        });

        test('應該正確分發 Action 到對應 Reducer', () => {
            const testStore = createTestStore();
            
            // 測試 counter reducer
            testStore.dispatch(increment());
            expect(testStore.getState().counter.count).toBe(1);
            
            // 測試 user reducer
            testStore.dispatch(addUser({ name: 'John', email: 'john@test.com' }));
            expect(testStore.getState().user.users).toHaveLength(1);
            expect(testStore.getState().user.total).toBe(1);
            
            // 測試 ui reducer
            testStore.dispatch(setTheme('dark'));
            expect(testStore.getState().ui.theme).toBe('dark');
        });

        test('應該保持其他狀態不變', () => {
            const testStore = createTestStore();
            const initialState = testStore.getState();
            
            // 只更新 counter
            testStore.dispatch(increment());
            const newState = testStore.getState();
            
            // counter 狀態應該改變
            expect(newState.counter).not.toBe(initialState.counter);
            // 其他狀態應該保持引用相等
            expect(newState.user).toBe(initialState.user);
            expect(newState.ui).toBe(initialState.ui);
        });

        test('應該支援複雜的狀態更新流程', () => {
            const testStore = createTestStore();
            
            // 執行一系列操作
            testStore.dispatch(increment());
            testStore.dispatch(increment());
            testStore.dispatch(addUser({ name: 'Alice', email: 'alice@test.com' }));
            testStore.dispatch(setCurrentUser({ id: '1', name: 'Alice' }));
            testStore.dispatch(setTheme('dark'));
            testStore.dispatch(setLoading(true));
            
            const finalState = testStore.getState();
            
            // 驗證所有狀態都正確更新
            expect(finalState.counter.count).toBe(2);
            expect(finalState.user.users).toHaveLength(1);
            expect(finalState.user.currentUser).toEqual({ id: '1', name: 'Alice' });
            expect(finalState.ui.theme).toBe('dark');
            expect(finalState.ui.loading).toBe(true);
        });
    });

    describe('RxJS 響應式流', () => {
        test('應該提供狀態流', async () => {
            const testStore = createTestStore();
            
            const statePromise = firstValueFrom(testStore.state$.pipe(skip(1), take(1)));
            
            testStore.dispatch(increment());
            
            const state = await statePromise;
            expect(state.counter.count).toBe(1);
        });

        test('應該支援部分狀態選擇器', async () => {
            const testStore = createTestStore();
            
            const counterStream = testStore.selectState(state => state.counter.count);
            const counterPromise = firstValueFrom(counterStream.pipe(skip(1), take(1)));
            
            testStore.dispatch(setCounter(42));
            
            const counter = await counterPromise;
            expect(counter).toBe(42);
        });

        test('應該支援複雜選擇器', async () => {
            const testStore = createTestStore();
            
            const statsStream = testStore.selectState(state => ({
                counterValue: state.counter.count,
                userCount: state.user.total,
                isDarkTheme: state.ui.theme === 'dark',
                hasErrors: state.ui.errors.length > 0
            }));
            
            const statsPromise = firstValueFrom(statsStream.pipe(skip(1), take(1)));
            
            testStore.dispatch(increment());
            testStore.dispatch(addUser({ name: 'Test', email: 'test@test.com' }));
            testStore.dispatch(setTheme('dark'));
            
            const stats = await statsPromise;
            expect(stats.counterValue).toBe(1);
            expect(stats.userCount).toBe(1);
            expect(stats.isDarkTheme).toBe(true);
            expect(stats.hasErrors).toBe(false);
        });
    });

    describe('錯誤處理', () => {
        test('應該處理無效的 Action', () => {
            const testStore = createTestStore();
            
            expect(() => {
                testStore.dispatch(null as any);
            }).toThrow('Invalid action: missing type');
        });

        test('應該處理 Reducer 錯誤', () => {
            const faultyReducer = jest.fn().mockImplementation(() => {
                throw new Error('Reducer error');
            });

            const storeWithFaultyReducer = store()
                .registerReducer('faulty', faultyReducer)
                .build();

            expect(() => {
                storeWithFaultyReducer.dispatch(increment());
            }).toThrow('Reducer error');
        });
    });
});

// ============================================================================
// 動態配置測試
// ============================================================================

describe('動態配置', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateLogger.mockReturnValue(createMockLogger());
        setupBrowserEnv();
    });

    describe('動態中間件管理', () => {
        test('應該動態添加中間件', () => {
            const testStore = createSimpleCounterStore();
            const newMiddleware = jest.fn((store) => (next) => (action) => next(action));
            
            expect(() => {
                testStore.addMiddleware(newMiddleware);
            }).not.toThrow();
        });

        test('應該動態移除中間件', () => {
            const middleware = jest.fn((store) => (next) => (action) => next(action));
            const testStore = createSimpleCounterStore({ middleware: [middleware] });
            
            expect(() => {
                testStore.removeMiddleware(middleware);
            }).not.toThrow();
        });
    });

    describe('動態 Effects 管理', () => {
        test('應該動態添加 Effect', () => {
            const testStore = createSimpleCounterStore();
            const effect = jest.fn(() => of());
            
            expect(() => {
                testStore.addEffect('test', effect);
            }).not.toThrow();
        });

        test('應該動態移除 Effect', () => {
            const effect = jest.fn(() => of());
            const testStore = store()
                .registerReducer('counter', counterReducer)
                .registerEffect('test', effect)
                .build();
            
            expect(() => {
                testStore.removeEffect('test');
            }).not.toThrow();
        });
    });

    describe('Reducer 替換（熱重載）', () => {
        test('應該支援 Reducer 熱重載', () => {
            const testStore = createSimpleCounterStore();
            const newReducer = createReducer(
                initialCounterState,
                on(increment, (draft) => {
                    draft.count += 10; // 不同的邏輯
                })
            );
            
            expect(() => {
                testStore.replaceReducer(newReducer);
            }).not.toThrow();
        });
    });
});

// ============================================================================
// Effects 系統測試
// ============================================================================

describe('Effects 系統', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateLogger.mockReturnValue(createMockLogger());
        setupBrowserEnv();
    });

    test('應該執行 Effects', (done) => {
        const mockEffect = jest.fn((action$, state$) => {
            return action$.pipe(
                filter(action => action.type === 'INCREMENT'),
                map(() => setCounter(100))
            );
        });

        const testStore = store()
            .registerReducer('counter', counterReducer)
            .registerEffect('test', mockEffect)
            .build();

        // 訂閱狀態變化來驗證 Effect 是否執行
        testStore.selectState(state => state.counter.count).subscribe(count => {
            if (count === 100) {
                expect(mockEffect).toHaveBeenCalled();
                done();
            }
        });

        testStore.dispatch(increment());
    });

    test('應該處理 Effect 錯誤', () => {
        const faultyEffect = jest.fn(() => {
            throw new Error('Effect error');
        });

        expect(() => {
            store()
                .registerReducer('counter', counterReducer)
                .registerEffect('faulty', faultyEffect)
                .build();
        }).not.toThrow(); // Effect 錯誤不應該影響 Store 創建
    });
});

// ============================================================================
// 型別推導測試（編譯時測試）
// ============================================================================

describe('型別推導測試', () => {
    test('應該正確推導單個 Reducer 的型別', () => {
        const simpleStore = store()
            .registerReducer('counter', counterReducer)
            .build();

        const state = simpleStore.getState();
        
        // TypeScript 應該推導出正確的型別
        expect(state).toHaveProperty('counter');
        expect(state.counter).toHaveProperty('count');
        expect(state.counter).toHaveProperty('lastUpdated');
    });

    test('應該正確推導多個 Reducer 的聯集型別', () => {
        const multiStore = store()
            .registerReducer('counter', counterReducer)
            .registerReducer('user', userReducer)
            .build();

        const state = multiStore.getState();
        
        // TypeScript 應該推導出聯集型別
        expect(state).toHaveProperty('counter');
        expect(state).toHaveProperty('user');
        expect(state.counter).toHaveProperty('count');
        expect(state.user).toHaveProperty('users');
        expect(state.user).toHaveProperty('total');
    });

    test('應該正確推導批量註冊的型別', () => {
        const batchStore = store()
            .registerReducers({
                counter: counterReducer,
                user: userReducer,
                ui: uiReducer
            })
            .build();

        const state = batchStore.getState();
        
        expect(state).toHaveProperty('counter');
        expect(state).toHaveProperty('user');
        expect(state).toHaveProperty('ui');
    });
});

// ============================================================================
// 向後相容性測試
// ============================================================================

describe('向後相容性', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateLogger.mockReturnValue(createMockLogger());
        setupBrowserEnv();
    });

    test('應該支援舊的 createStore API', () => {
        const oldStyleStore = createStore(counterReducer, initialCounterState);
        
        expect(oldStyleStore).toBeInstanceOf(EnhancedStore);
        expect(oldStyleStore.getState()).toEqual(initialCounterState);
        
        oldStyleStore.dispatch(increment());
        expect(oldStyleStore.getState().count).toBe(1);
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
        const testStore = createTestStore();
        
        expect(() => testStore.destroy()).not.toThrow();
    });

    test('應該提供完整的 Store 信息', () => {
        const testStore = createTestStore();
        
        const info = testStore.getStoreInfo();
        
        expect(info).toHaveProperty('environment');
        expect(info).toHaveProperty('middlewareCount');
        expect(info).toHaveProperty('effectsCount');
        expect(info).toHaveProperty('effectNames');
        expect(info).toHaveProperty('currentStateSnapshot');
    });

    test('應該正確重置 Store', () => {
        const testStore = createTestStore();
        
        // 修改狀態
        testStore.dispatch(increment());
        testStore.dispatch(addUser({ name: 'Test', email: 'test@test.com' }));
        
        // 重置
        testStore.reset();
        
        const state = testStore.getState();
        expect(state.counter).toEqual(initialCounterState);
        expect(state.user).toEqual(initialUserState);
        expect(state.ui).toEqual(initialUIState);
    });
});

// ============================================================================
// 整合測試
// ============================================================================

describe('整合測試', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateLogger.mockReturnValue(createMockLogger());
        setupBrowserEnv();
    });

    test('完整的應用場景測試', async () => {
        // 模擬真實應用的中間件
        const loggerMiddleware = jest.fn((store) => (next) => (action) => {
            console.log('Action:', action.type);
            return next(action);
        });

        // 模擬 Effect
        const autoSaveEffect = jest.fn((action$, state$) => {
            return action$.pipe(
                filter(action => action.type === 'ADD_USER'),
                map(() => setLoading(false))
            );
        });

        // 創建完整的 Store
        const appStore = store()
            .configure({ logLevel: 'debug', enableSignals: true })
            .registerRoot({
                counter: counterReducer,
                user: userReducer,
                ui: uiReducer
            })
            .applyMiddleware(loggerMiddleware)
            .registerEffect('autoSave', autoSaveEffect)
            .build();

        // 執行複雜的操作流程
        const states: any[] = [];
        appStore.state$.subscribe(state => states.push(state));

        appStore.dispatch(increment());
        appStore.dispatch(setTheme('dark'));
        appStore.dispatch(addUser({ name: 'Alice', email: 'alice@test.com' }));
        appStore.dispatch(setCurrentUser({ id: '1', name: 'Alice' }));
        appStore.dispatch(increment());

        // 等待異步操作完成
        await new Promise(resolve => setTimeout(resolve, 10));

        // 驗證最終狀態
        const finalState = appStore.getState();
        expect(finalState.counter.count).toBe(2);
        expect(finalState.user.users).toHaveLength(1);
        expect(finalState.user.currentUser?.name).toBe('Alice');
        expect(finalState.ui.theme).toBe('dark');

        // 驗證中間件被調用
        expect(loggerMiddleware).toHaveBeenCalled();

        // 驗證 Effect 被調用
        expect(autoSaveEffect).toHaveBeenCalled();

        // 驗證狀態變化歷史
        expect(states.length).toBeGreaterThan(5);
    });
});