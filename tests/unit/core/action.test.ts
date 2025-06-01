/**
 * Action 系統單元測試
 * 
 * 測試 Action 創建、型別安全、工具函數等核心功能
 */

import {
    createAction,
    createActionGroup,
    isActionOf,
    createActionTypeGuard,
    isActionOfAny,
    serializeAction,
    getActionInfo,
    createActionDebugger
} from '../../../src/core/action';

import type {

    BaseAction,
    Action,
    ActionCreator
} from '../../../src/core/types';
// ===== 測試型別定義 =====

interface User {
    id: string;
    name: string;
    email: string;
}

interface LoginPayload {
    username: string;
    password: string;
}

// ===== 輔助函數：驗證 UUID v7 格式 =====
function isValidUUIDv7(uuid: string): boolean {
    // UUID v7 格式: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
    // 其中第13位字符必須是 '7'，第17位字符必須是 8, 9, a, 或 b
    const uuidv7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidv7Regex.test(uuid);
}

// ===== 基礎 Action 創建測試 =====

describe('Action System - createAction', () => {
    test('should create action without payload', () => {
        const increment = createAction('INCREMENT');
        const action = increment();

        expect(action.type).toBe('INCREMENT');
        expect(action.timestamp).toBeGreaterThan(0);
        expect(action.id).toBeDefined();
        expect(isValidUUIDv7(action.id)).toBe(true);
        expect('payload' in action).toBe(false);
    });

    test('should create action with payload', () => {
        const setUser = createAction<User>('SET_USER');
        const user: User = { id: '1', name: 'John', email: 'john@example.com' };
        const action = setUser(user);

        expect(action.type).toBe('SET_USER');
        expect(action.payload).toEqual(user);
        expect(action.timestamp).toBeGreaterThan(0);
        expect(action.id).toBeDefined();
        expect(isValidUUIDv7(action.id)).toBe(true);
    });

    test('should generate unique UUIDs for each action', () => {
        const increment = createAction('INCREMENT');
        const action1 = increment();
        const action2 = increment();

        expect(action1.id).not.toBe(action2.id);
        expect(isValidUUIDv7(action1.id)).toBe(true);
        expect(isValidUUIDv7(action2.id)).toBe(true);
    });

    test('should generate UUIDs with proper time ordering', async () => {
        const increment = createAction('INCREMENT');

        const action1 = increment();
        // 稍微延遲以確保時間戳不同
        await new Promise(resolve => setTimeout(resolve, 1));
        const action2 = increment();

        // UUID v7 應該按時間順序排列
        expect(action1.id < action2.id).toBe(true);
        expect(isValidUUIDv7(action1.id)).toBe(true);
        expect(isValidUUIDv7(action2.id)).toBe(true);
    });

    test('should validate action type', () => {
        expect(() => createAction('')).toThrow('Action type cannot be empty');
        expect(() => createAction('  ')).toThrow('Action type cannot have leading or trailing whitespace');
        expect(() => createAction(null as any)).toThrow('Action type must be a non-empty string');
    });

    test('should use custom generators', () => {
        const customTimestamp = 1234567890;
        const customId = '01234567-89ab-7def-8123-456789abcdef'; // 有效的 UUID v7 格式

        const action = createAction('TEST', {
            timestampGenerator: () => customTimestamp,
            idGenerator: () => customId
        });

        const result = action();
        expect(result.timestamp).toBe(customTimestamp);
        expect(result.id).toBe(customId);
        expect(isValidUUIDv7(result.id)).toBe(true);
    });

    test('should add meta data when provided', () => {
        const meta = { component: 'UserForm', version: '1.0' };
        const action = createAction('TEST', { meta });
        const result = action();

        expect((result as any).meta).toEqual(meta);
        expect(isValidUUIDv7(result.id)).toBe(true);
    });

    test('should have immutable type property', () => {
        const action = createAction('TEST');
        expect(action.type).toBe('TEST');

        // 嘗試修改 type 應該失敗
        expect(() => {
            (action as any).type = 'MODIFIED';
        }).toThrow();
    });

    test('should maintain UUID v7 format across multiple rapid creations', () => {
        const increment = createAction('INCREMENT');
        const actions: BaseAction[] = [];

        // 快速創建多個 action
        for (let i = 0; i < 100; i++) {
            actions.push(increment());
        }

        // 驗證所有 UUID 都是有效的 v7 格式
        actions.forEach(action => {
            expect(isValidUUIDv7(action.id)).toBe(true);
        });

        // 驗證所有 UUID 都是唯一的
        const uniqueIds = new Set(actions.map(action => action.id));
        expect(uniqueIds.size).toBe(100);
    });
});

// ===== Action Group 測試 =====

describe('Action System - createActionGroup', () => {
    test('should create action group with correct types and UUID v7 IDs', () => {
        const userActions = createActionGroup({
            source: 'User',
            events: {
                load: undefined,
                loadSuccess: {} as { users: User[] },
                loadFailure: {} as { error: string },
                create: {} as { user: User },
                update: {} as { id: string; changes: Partial<User> },
                delete: {} as { id: string }
            }
        });

        expect(userActions.load.type).toBe('[User] load');
        expect(userActions.loadSuccess.type).toBe('[User] loadSuccess');
        expect(userActions.create.type).toBe('[User] create');

        // 測試 Action 創建
        const loadAction = userActions.load();
        expect(loadAction.type).toBe('[User] load');
        expect('payload' in loadAction).toBe(false);
        expect(isValidUUIDv7(loadAction.id)).toBe(true);

        const createAction = userActions.create({
            user: { id: '1', name: 'John', email: 'john@example.com' }
        });
        expect(createAction.type).toBe('[User] create');
        expect(createAction.payload.user.id).toBe('1');
        expect(isValidUUIDv7(createAction.id)).toBe(true);
    });

    test('should validate group config', () => {
        expect(() => createActionGroup({
            source: '',
            events: {}
        })).toThrow('Action group source must be a non-empty string');

        expect(() => createActionGroup({
            source: 'Test',
            events: null as any
        })).toThrow('Action group events must be an object');
    });
});

// ===== 型別檢查測試 =====

describe('Action System - Type Guards', () => {
    const increment = createAction('INCREMENT');
    const setUser = createAction<User>('SET_USER');
    const login = createAction<LoginPayload>('LOGIN');

    test('isActionOf should correctly identify action type', () => {
        const incrementAction = increment();
        const userAction = setUser({ id: '1', name: 'John', email: 'john@example.com' });

        expect(isActionOf(incrementAction, increment)).toBe(true);
        expect(isActionOf(userAction, setUser)).toBe(true);
        expect(isActionOf(incrementAction, setUser)).toBe(false);
        expect(isActionOf(userAction, increment)).toBe(false);

        // 驗證 UUID v7 格式
        expect(isValidUUIDv7(incrementAction.id)).toBe(true);
        expect(isValidUUIDv7(userAction.id)).toBe(true);

        // 確保型別保護正常工作
        if (isActionOf(userAction, setUser)) {
            // 在這個 block 中，TypeScript 應該知道 userAction 有 payload
            expect(userAction.payload.id).toBe('1');
        }

        if (isActionOf(incrementAction, increment)) {
            // 在這個 block 中，TypeScript 應該知道 incrementAction 沒有 payload
            expect('payload' in incrementAction).toBe(false);
        }
    });

    test('createActionTypeGuard should create bound type guard', () => {
        const isIncrementAction = createActionTypeGuard(increment);
        const isSetUserAction = createActionTypeGuard(setUser);

        const incrementAction = increment();
        const userAction = setUser({ id: '1', name: 'John', email: 'john@example.com' });

        expect(isIncrementAction(incrementAction)).toBe(true);
        expect(isIncrementAction(userAction)).toBe(false);
        expect(isSetUserAction(userAction)).toBe(true);
        expect(isSetUserAction(incrementAction)).toBe(false);

        // 驗證 UUID v7 格式
        expect(isValidUUIDv7(incrementAction.id)).toBe(true);
        expect(isValidUUIDv7(userAction.id)).toBe(true);
    });

    test('isActionOfAny should check multiple action types', () => {
        const incrementAction = increment();
        const userAction = setUser({ id: '1', name: 'John', email: 'john@example.com' });
        const loginAction = login({ username: 'admin', password: 'secret' });

        expect(isActionOfAny(incrementAction, [increment, setUser])).toBe(true);
        expect(isActionOfAny(userAction, [increment, setUser])).toBe(true);
        expect(isActionOfAny(loginAction, [increment, setUser])).toBe(false);
        expect(isActionOfAny(loginAction, [login])).toBe(true);

        // 驗證所有 action 都有有效的 UUID v7
        expect(isValidUUIDv7(incrementAction.id)).toBe(true);
        expect(isValidUUIDv7(userAction.id)).toBe(true);
        expect(isValidUUIDv7(loginAction.id)).toBe(true);
    });
});

// ===== 工具函數測試 =====

describe('Action System - Utilities', () => {
    const setUser = createAction<User>('SET_USER');
    const user: User = { id: '1', name: 'John', email: 'john@example.com' };
    const action = setUser(user);

    test('serializeAction should convert action to JSON string', () => {
        const serialized = serializeAction(action);
        const parsed = JSON.parse(serialized);

        expect(parsed.type).toBe('SET_USER');
        expect(parsed.payload).toEqual(user);
        expect(parsed.timestamp).toBeDefined();
        expect(parsed.id).toBeDefined();
        expect(isValidUUIDv7(parsed.id)).toBe(true);
    });

    test('getActionInfo should extract action metadata', () => {
        const info = getActionInfo(action);

        expect(info.type).toBe('SET_USER');
        expect(info.timestamp).toBe(action.timestamp);
        expect(info.id).toBe(action.id);
        expect(info.hasPayload).toBe(true);
        expect(info.payloadType).toBe('object');
        expect(isValidUUIDv7(info.id)).toBe(true);
    });

    test('getActionInfo for action without payload', () => {
        const increment = createAction('INCREMENT');
        const incrementAction = increment();
        const info = getActionInfo(incrementAction);

        expect(info.hasPayload).toBe(false);
        expect(info.payloadType).toBe('void');
        expect(isValidUUIDv7(info.id)).toBe(true);
    });
});

// ===== 除錯器測試 =====

describe('Action System - Debugger', () => {
    test('createActionDebugger should provide debug utilities', () => {
        const actionDebugger = createActionDebugger('TestDebug');
        const consoleSpy = jest.spyOn(console, 'group').mockImplementation();
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        const consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();

        const setUser = createAction<User>('SET_USER');
        const action = setUser({ id: '1', name: 'John', email: 'john@example.com' });

        // 驗證 action 有有效的 UUID v7
        expect(isValidUUIDv7(action.id)).toBe(true);

        actionDebugger.log(action);

        expect(consoleSpy).toHaveBeenCalledWith('TestDebug: SET_USER');
        expect(consoleLogSpy).toHaveBeenCalledWith('Action Info:', expect.any(Object));
        expect(consoleLogSpy).toHaveBeenCalledWith('Full Action:', action);
        expect(consoleGroupEndSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
        consoleLogSpy.mockRestore();
        consoleGroupEndSpy.mockRestore();
    });

    test('debugger trace should log multiple actions', () => {
        const actionDebugger = createActionDebugger();
        const consoleSpy = jest.spyOn(console, 'group').mockImplementation();
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        const consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();

        const increment = createAction('INCREMENT');
        const setUser = createAction<User>('SET_USER');

        const actions = [
            increment(),
            setUser({ id: '1', name: 'John', email: 'john@example.com' }),
            increment()
        ];

        // 驗證所有 action 都有有效的 UUID v7
        actions.forEach(action => {
            expect(isValidUUIDv7(action.id)).toBe(true);
        });

        actionDebugger.trace(actions);

        expect(consoleSpy).toHaveBeenCalledWith('ActionDebug: Action Trace (3 actions)');
        expect(consoleLogSpy).toHaveBeenCalledTimes(3);
        expect(consoleGroupEndSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
        consoleLogSpy.mockRestore();
        consoleGroupEndSpy.mockRestore();
    });
});

// ===== 整合測試 =====

describe('Action System - Integration Tests', () => {
    test('should work in complete user management scenario', () => {
        // 創建用戶管理相關的 Actions
        const userActions = createActionGroup({
            source: 'User',
            events: {
                loadUsers: undefined,
                loadUsersSuccess: {} as { users: User[] },
                loadUsersFailure: {} as { error: string },
                createUser: {} as { user: Omit<User, 'id'> },
                createUserSuccess: {} as { user: User },
                updateUser: {} as { id: string; changes: Partial<User> },
                deleteUser: {} as { id: string }
            }
        });

        // 模擬一系列操作
        const loadAction = userActions.loadUsers();
        const createAction = userActions.createUser({
            user: { name: 'John', email: 'john@example.com' }
        });
        const updateAction = userActions.updateUser({
            id: '1',
            changes: { email: 'john.doe@example.com' }
        });

        // 驗證 Actions
        expect(loadAction.type).toBe('[User] loadUsers');
        expect(createAction.type).toBe('[User] createUser');
        expect(updateAction.type).toBe('[User] updateUser');

        // 驗證所有 action 都有有效的 UUID v7
        expect(isValidUUIDv7(loadAction.id)).toBe(true);
        expect(isValidUUIDv7(createAction.id)).toBe(true);
        expect(isValidUUIDv7(updateAction.id)).toBe(true);

        // 驗證 UUID 的時間順序性
        expect(loadAction.id < createAction.id).toBe(true);
        expect(createAction.id < updateAction.id).toBe(true);

        // 驗證 Payload
        expect(createAction.payload.user.name).toBe('John');
        expect(updateAction.payload.id).toBe('1');
        expect(updateAction.payload.changes.email).toBe('john.doe@example.com');

        // 測試型別檢查
        expect(isActionOf(loadAction, userActions.loadUsers)).toBe(true);
        expect(isActionOf(createAction, userActions.createUser)).toBe(true);
        expect(isActionOf(updateAction, userActions.updateUser)).toBe(true);

        // 測試批量檢查
        expect(isActionOfAny(loadAction, [
            userActions.loadUsers,
            userActions.createUser,
            userActions.updateUser
        ])).toBe(true);
    });

    test('should maintain type safety throughout action lifecycle', () => {
        const userActions = createActionGroup({
            source: 'User',
            events: {
                setCurrentUser: {} as { user: User },
                updateProfile: {} as { userId: string; profile: Partial<User> }
            }
        });

        const user: User = { id: '1', name: 'John', email: 'john@example.com' };
        const setCurrentUserAction = userActions.setCurrentUser({ user });

        // 驗證 UUID v7 格式
        expect(isValidUUIDv7(setCurrentUserAction.id)).toBe(true);

        // TypeScript 應該能夠推導出正確的型別
        if (isActionOf(setCurrentUserAction, userActions.setCurrentUser)) {
            // 在這個 block 中，setCurrentUserAction.payload 應該是 { user: User }
            const actionUser = setCurrentUserAction.payload.user;
            expect(actionUser.id).toBe('1');
            expect(actionUser.name).toBe('John');
            expect(actionUser.email).toBe('john@example.com');
        }
    });
});

// ===== UUID v7 特性測試 =====

describe('Action System - UUID v7 Specific Tests', () => {
    test('should generate UUID v7 with proper version and variant bits', () => {
        const increment = createAction('INCREMENT');
        const action = increment();

        // 檢查版本位 (第13位字符應該是 '7')
        expect(action.id.charAt(14)).toBe('7');

        // 檢查變體位 (第17位字符應該是 8, 9, a, 或 b)
        const variantChar = action.id.charAt(19).toLowerCase();
        expect(['8', '9', 'a', 'b']).toContain(variantChar);
    });

    test('should maintain UUID v7 time ordering under load', async () => {
        const increment = createAction('INCREMENT');
        const actions: Array<{ id: string; timestamp: number }> = [];

        // 創建一系列 action，每次間隔一小段時間
        for (let i = 0; i < 10; i++) {
            const action = increment();
            actions.push({ id: action.id, timestamp: action.timestamp });
            await new Promise(resolve => setTimeout(resolve, 1));
        }

        // 驗證 UUID 和時間戳都按順序排列
        for (let i = 1; i < actions.length; i++) {
            expect(actions[i].id > actions[i - 1].id).toBe(true);
            expect(actions[i].timestamp >= actions[i - 1].timestamp).toBe(true);
        }
    });

    test('should handle UUID v7 serialization and deserialization', () => {
        const setUser = createAction<User>('SET_USER');
        const user: User = { id: '1', name: 'John', email: 'john@example.com' };
        const action = setUser(user);

        const serialized = serializeAction(action);
        const parsed = JSON.parse(serialized);

        expect(isValidUUIDv7(parsed.id)).toBe(true);
        expect(parsed.id).toBe(action.id);
    });
});

// ===== 效能測試 =====

describe('Action System - Performance Tests', () => {
    test('should create actions with UUID v7 efficiently', () => {
        const increment = createAction('INCREMENT');
        const start = performance.now();

        // 創建大量 Actions
        const actions: BaseAction[] = [];
        for (let i = 0; i < 10000; i++) {
            actions.push(increment());
        }

        const end = performance.now();
        const duration = end - start;

        // 應該能在合理時間內完成
        expect(duration).toBeLessThan(1000); // 1秒內

        // 驗證所有 UUID 都是有效的 v7 格式
        actions.forEach(action => {
            expect(isValidUUIDv7(action.id)).toBe(true);
        });

        // 驗證所有 UUID 都是唯一的
        const uniqueIds = new Set(actions.map(action => action.id));
        expect(uniqueIds.size).toBe(10000);
    });

    test('should handle large action groups with UUID v7 efficiently', () => {
        const events: Record<string, any> = {};

        // 創建大量事件
        for (let i = 0; i < 1000; i++) {
            events[`action${i}`] = {} as { data: string };
        }

        const start = performance.now();

        const largeActionGroup = createActionGroup({
            source: 'LargeGroup',
            events
        });

        const end = performance.now();
        const duration = end - start;

        expect(duration).toBeLessThan(500); // 0.5秒內
        expect(Object.keys(largeActionGroup)).toHaveLength(1000);

        // 測試創建一些 action 來驗證 UUID v7
        const testAction = largeActionGroup.action0({ data: 'test' });
        expect(isValidUUIDv7(testAction.id)).toBe(true);
    });
});