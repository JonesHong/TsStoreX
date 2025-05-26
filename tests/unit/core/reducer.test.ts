import { produce } from 'immer';
import { createAction } from '../../../src/core/action';
import {
  Reducer,
  ReducerHandler,
  on,
  createReducer,
  combineReducers,
  composeReducers,
  createDefaultReducer,
  enhanceReducer,
  createConditionalReducer,
  createResettableReducer,
  ReducersMapObject
} from '../../../src/core/reducer';

// 測試用的 Action 創建
const increment = createAction('INCREMENT');
const decrement = createAction('DECREMENT');
const set = createAction<{ value: number }>('SET');
const reset = createAction('RESET');
const addUser = createAction<{ name: string; email: string }>('ADD_USER');
const removeUser = createAction<{ id: string }>('REMOVE_USER');

// 測試用的狀態介面
interface CounterState {
  count: number;
  lastUpdated: number;
}

interface UserState {
  users: Array<{ id: string; name: string; email: string }>;
  total: number;
}

interface AppState {
  counter: CounterState;
  user: UserState;
}

describe('Reducer System', () => {
  
  describe('on() function', () => {
    it('should create a reducer handler with correct type', () => {
      const handler = on<CounterState>(increment, (draft) => {
        draft.count += 1;
      });

      expect(handler.type).toBe('INCREMENT');
      expect(typeof handler.reducer).toBe('function');
    });

    it('should bind action creator type correctly', () => {
      const handler = on<CounterState, { value: number }>(set, (draft, action) => {
        draft.count = action.payload.value;
      });

      expect(handler.type).toBe('SET');
      expect(typeof handler.reducer).toBe('function');
    });
  });

  describe('createReducer()', () => {
    const initialCounterState: CounterState = {
      count: 0,
      lastUpdated: 0
    };

    it('should return initial state when state is undefined', () => {
      const reducer = createReducer(
        initialCounterState,
        on(increment, (draft) => {
          draft.count += 1;
        })
      );

      const action = { type: 'UNKNOWN', timestamp: Date.now(), id: 'test' };
      const result = reducer(undefined, action);

      expect(result).toEqual(initialCounterState);
    });

    it('should handle draft modifications correctly', () => {
      const reducer = createReducer(
        initialCounterState,
        on(increment, (draft) => {
          draft.count += 1;
          draft.lastUpdated = Date.now();
        })
      );

      const state = { count: 5, lastUpdated: 0 };
      const action = increment();
      const result = reducer(state, action);

      expect(result.count).toBe(6);
      expect(result.lastUpdated).toBeGreaterThan(0);
      expect(result).not.toBe(state); // 確保不可變性
    });

    it('should handle returned new state correctly', () => {
      const newState = { count: 100, lastUpdated: Date.now() };
      const reducer = createReducer(
        initialCounterState,
        on(reset, () => newState)
      );

      const state = { count: 50, lastUpdated: 123456 };
      const action = reset();
      const result = reducer(state, action);

      expect(result).toBe(newState);
      expect(result).not.toBe(state);
    });

    it('should handle mixed modification and return patterns', () => {
      const reducer = createReducer(
        initialCounterState,
        on(increment, (draft) => {
          draft.count += 1; // 修改 draft
        }),
        on(set, (draft, action) => {
          return { // 返回新狀態
            count: action.payload.value,
            lastUpdated: Date.now()
          };
        })
      );

      // 測試 draft 修改
      let state = { count: 10, lastUpdated: 0 };
      let result = reducer(state, increment());
      expect(result.count).toBe(11);

      // 測試返回新狀態
      state = result;
      result = reducer(state, set({ value: 42 }));
      expect(result.count).toBe(42);
      expect(result.lastUpdated).toBeGreaterThan(0);
    });

    it('should return same state for unknown actions', () => {
      const reducer = createReducer(
        initialCounterState,
        on(increment, (draft) => {
          draft.count += 1;
        })
      );

      const state = { count: 5, lastUpdated: 123 };
      const unknownAction = { type: 'UNKNOWN', timestamp: Date.now(), id: 'test' };
      const result = reducer(state, unknownAction);

      expect(result).toBe(state); // 應該返回相同引用
    });

    it('should handle invalid actions gracefully', () => {
      const reducer = createReducer(initialCounterState);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const state = { count: 5, lastUpdated: 123 };
      
      // 測試 null action
      let result = reducer(state, null as any);
      expect(result).toBe(state);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid action: missing or invalid type property');

      // 測試缺少 type 的 action
      result = reducer(state, {} as any);
      expect(result).toBe(state);

      consoleSpy.mockRestore();
    });

    it('should handle reducer errors gracefully', () => {
      const reducer = createReducer(
        initialCounterState,
        on(increment, (draft: any) => {
          throw new Error('Reducer error');
        })
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const state = { count: 5, lastUpdated: 123 };
      const result = reducer(state, increment());

      expect(result).toBe(state); // 應該返回原狀態
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in reducer for action INCREMENT:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should warn about duplicate handlers', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      createReducer(
        initialCounterState,
        on(increment, (draft) => { draft.count += 1; }),
        on(increment, (draft) => { draft.count += 2; }) // 重複的 handler
      );

      expect(consoleSpy).toHaveBeenCalledWith('Duplicate handler for action type: INCREMENT');
      consoleSpy.mockRestore();
    });
  });

  describe('combineReducers()', () => {
    const counterReducer = createReducer(
      { count: 0, lastUpdated: 0 },
      on(increment, (draft) => { draft.count += 1; }),
      on(decrement, (draft) => { draft.count -= 1; })
    );

    const userReducer = createReducer(
      
     {users: [], total: 0 } as UserState ,
      on(addUser, (draft, action) => {
        const newUser = {
          id: Math.random().toString(),
          name: action.payload.name,
          email: action.payload.email
        };
        draft.users.push(newUser);
        draft.total += 1;
      })
    );

    it('should combine multiple reducers correctly', () => {
      const rootReducer = combineReducers({
        counter: counterReducer,
        user: userReducer
      });

      const action = increment();
      const result = rootReducer(undefined, action);

      expect(result).toEqual({
        counter: { count: 1, lastUpdated: 0 },
        user: { users: [], total: 0 }
      });
    });

    it('should handle nested state updates correctly', () => {
      const rootReducer = combineReducers({
        counter: counterReducer,
        user: userReducer
      });

      const initialState = {
        counter: { count: 5, lastUpdated: 0 },
        user: { users: [], total: 0 }
      };

      const action = addUser({ name: 'John', email: 'john@example.com' });
      const result = rootReducer(initialState, action);

      expect(result.counter).toBe(initialState.counter); // 未變更的部分保持引用
      expect(result.user.users).toHaveLength(1);
      expect(result.user.total).toBe(1);
    });

    it('should preserve state reference when no changes occur', () => {
      const rootReducer = combineReducers({
        counter: counterReducer,
        user: userReducer
      });

      const state = {
        counter: { count: 5, lastUpdated: 0 },
        user: { users: [], total: 0 }
      };

      const unknownAction = { type: 'UNKNOWN', timestamp: Date.now(), id: 'test' };
      const result = rootReducer(state, unknownAction);

      expect(result).toBe(state); // 應該返回相同引用
    });

    it('should throw error for empty reducers object', () => {
      expect(() => {
        combineReducers({});
      }).toThrow('combineReducers: reducers object cannot be empty');
    });

    it('should throw error for non-function reducers', () => {
      expect(() => {
        combineReducers({
          counter: counterReducer,
          invalid: 'not a function' as any
        });
      }).toThrow('combineReducers: reducer for key "invalid" is not a function');
    });

    it('should throw error when reducer returns undefined during initialization', () => {
      const badReducer = () => undefined as any;
      const rootReducer = combineReducers({
        bad: badReducer
      });

      expect(() => {
        rootReducer(undefined, { type: 'INIT', timestamp: Date.now(), id: 'test' });
      }).toThrow('Reducer for key "bad" returned undefined during initialization');
    });
  });

  describe('composeReducers()', () => {
    const baseReducer = createReducer(
      { count: 0, lastUpdated: 0 },
      on(increment, (draft) => { draft.count += 1; })
    );

    const timestampReducer = createReducer(
      { count: 0, lastUpdated: 0 },
      on(increment, (draft) => { draft.lastUpdated = Date.now(); })
    );

    it('should compose multiple reducers in sequence', () => {
      const composedReducer = composeReducers(baseReducer, timestampReducer);
      const action = increment();
      const result = composedReducer({ count: 5, lastUpdated: 0 }, action);

      expect(result.count).toBe(6); // baseReducer 的效果
      expect(result.lastUpdated).toBeGreaterThan(0); // timestampReducer 的效果
    });

    it('should return single reducer when only one provided', () => {
      const singleReducer = composeReducers(baseReducer);
      expect(singleReducer).toBe(baseReducer);
    });

    it('should throw error when no reducers provided', () => {
      expect(() => {
        composeReducers();
      }).toThrow('composeReducers: at least one reducer is required');
    });

    it('should handle undefined state correctly', () => {
      const composedReducer = composeReducers(baseReducer, timestampReducer);
      const action = { type: 'INIT', timestamp: Date.now(), id: 'test' };
      const result = composedReducer(undefined, action);

      expect(result).toEqual({ count: 0, lastUpdated: 0 });
    });
  });

  describe('createDefaultReducer()', () => {
    it('should return initial state for any action', () => {
      const initialState = { value: 42 };
      const defaultReducer = createDefaultReducer(initialState);

      const action = { type: 'ANY_ACTION', timestamp: Date.now(), id: 'test' };
      const result = defaultReducer(undefined, action);

      expect(result).toBe(initialState);
    });

    it('should return current state when provided', () => {
      const initialState = { value: 42 };
      const currentState = { value: 100 };
      const defaultReducer = createDefaultReducer(initialState);

      const action = { type: 'ANY_ACTION', timestamp: Date.now(), id: 'test' };
      const result = defaultReducer(currentState, action);

      expect(result).toBe(currentState);
    });
  });

  describe('enhanceReducer()', () => {
    const baseReducer = createReducer(
      { count: 0 },
      on(increment, (draft) => { draft.count += 1; })
    );

    it('should enhance reducer with additional functionality', () => {
      const enhancedReducer = enhanceReducer(
        baseReducer,
        (state, action, next) => {
          const result = next(state, action);
          return { ...result, enhanced: true } as any;
        }
      );

      const action = increment();
      const result = enhancedReducer({ count: 5 }, action);

      expect(result.count).toBe(6);
      expect((result as any).enhanced).toBe(true);
    });

    it('should provide access to state, action, and next reducer', () => {
      const enhancer = jest.fn((state, action, next) => next(state, action));
      const enhancedReducer = enhanceReducer(baseReducer, enhancer);

      const state = { count: 5 };
      const action = increment();
      enhancedReducer(state, action);

      expect(enhancer).toHaveBeenCalledWith(state, action, baseReducer);
    });
  });

  describe('createConditionalReducer()', () => {
    const baseReducer = createReducer(
      { count: 0 },
      on(increment, (draft) => { draft.count += 1; })
    );

    const fallbackReducer = createReducer(
      { count: 0 },
      on(increment, (draft) => { draft.count += 10; })
    );

    it('should execute reducer when condition is true', () => {
      const conditionalReducer = createConditionalReducer(
        (state) => state ? state.count < 10 : true,
        baseReducer
      );

      const state = { count: 5 };
      const action = increment();
      const result = conditionalReducer(state, action);

      expect(result.count).toBe(6);
    });

    it('should execute fallback reducer when condition is false', () => {
      const conditionalReducer = createConditionalReducer(
        (state) => state ? state.count < 10 : false,
        baseReducer,
        fallbackReducer
      );

      const state = { count: 15 };
      const action = increment();
      const result = conditionalReducer(state, action);

      expect(result.count).toBe(25); // fallbackReducer 的效果
    });

    it('should return current state when condition is false and no fallback', () => {
      const conditionalReducer = createConditionalReducer(
        () => false,
        baseReducer
      );

      const state = { count: 5 };
      const action = increment();
      const result = conditionalReducer(state, action);

      expect(result).toBe(state);
    });

    it('should handle undefined state correctly', () => {
      const conditionalReducer = createConditionalReducer(
        () => false,
        baseReducer
      );

      const action = increment();
      const result = conditionalReducer(undefined, action);

      expect(result).toEqual({});
    });
  });

  describe('createResettableReducer()', () => {
    const initialState = { count: 0, name: 'initial' };
    const baseReducer = createReducer(
      initialState,
      on(increment, (draft) => { draft.count += 1; }),
      on(set, (draft, action) => { draft.count = action.payload.value; })
    );

    it('should reset to initial state when reset action is dispatched', () => {
      const resettableReducer = createResettableReducer(
        'RESET',
        initialState,
        baseReducer
      );

      const state = { count: 42, name: 'modified' };
      const resetAction = { type: 'RESET', timestamp: Date.now(), id: 'test' };
      const result = resettableReducer(state, resetAction);

      expect(result).toBe(initialState);
    });

    it('should use base reducer for non-reset actions', () => {
      const resettableReducer = createResettableReducer(
        'RESET',
        initialState,
        baseReducer
      );

      const state = { count: 5, name: 'test' };
      const action = increment();
      const result = resettableReducer(state, action);

      expect(result.count).toBe(6);
      expect(result.name).toBe('test');
    });
  });

  describe('Type Safety and Integration', () => {
    it('should maintain type safety across the system', () => {
      interface TestState {
        value: number;
        text: string;
      }

      const testAction = createAction<{ newValue: number }>('TEST_ACTION');
      
      const testReducer: Reducer<TestState> = createReducer(
        { value: 0, text: 'initial' },
        on(testAction, (draft, action) => {
          draft.value = action.payload.newValue;
          draft.text = `Updated to ${action.payload.newValue}`;
        })
      );

      const state: TestState = { value: 10, text: 'test' };
      const action = testAction({ newValue: 42 });
      const result = testReducer(state, action);

      expect(result.value).toBe(42);
      expect(result.text).toBe('Updated to 42');
    });

    it('should work with complex nested state structures', () => {
      interface NestedState {
        level1: {
          level2: {
            items: string[];
            count: number;
          };
        };
      }

      const addItem = createAction<{ item: string }>('ADD_ITEM');
      
      const nestedReducer = createReducer<NestedState>(
        {
          level1: {
            level2: {
              items: [],
              count: 0
            }
          }
        },
        on(addItem, (draft, action) => {
          draft.level1.level2.items.push(action.payload.item);
          draft.level1.level2.count += 1;
        })
      );

      const result = nestedReducer(undefined, addItem({ item: 'test' }));
      expect(result.level1.level2.items).toEqual(['test']);
      expect(result.level1.level2.count).toBe(1);
    });
  });
});