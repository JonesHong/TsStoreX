import 'jest-environment-jsdom';
import { v7 as uuidv7 } from 'uuid';

// 全域測試設定和工具

// ===== 環境模擬 =====

// 模擬瀏覽器 API
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: (): string => {
      return uuidv7();
    },
    getRandomValues: (arr: Uint8Array): Uint8Array => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  }
});

// 模擬 performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: (): number => Date.now()
  }
});

// 模擬 localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string): void => {
      store[key] = value.toString();
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key: (index: number): string | null => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// ===== 測試工具函數 =====

// 等待 Promise 解析
export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// 等待下一個 tick
export const nextTick = (): Promise<void> => {
  return new Promise(resolve => process.nextTick(resolve));
};

// 模擬 RxJS Observable 測試工具
export const createMockObservable = <T>(values: T[], delay = 0) => {
  return new Promise<T[]>(resolve => {
    const results: T[] = [];
    let index = 0;

    const emit = () => {
      if (index < values.length) {
        results.push(values[index]);
        index++;
        setTimeout(emit, delay);
      } else {
        resolve(results);
      }
    };

    setTimeout(emit, delay);
  });
};

// ===== Signal 測試支援 =====

// 模擬 SolidJS createSignal（用於測試 Signal 投影）
let signalCallbacks: (() => void)[] = [];

export const mockCreateSignal = <T>(initialValue: T) => {
  let value = initialValue;
  const subscribers: Array<(newValue: T) => void> = [];

  const getter = (): T => value;
  const setter = (newValue: T | ((prev: T) => T)): void => {
    const nextValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(value)
      : newValue;
    
    if (nextValue !== value) {
      value = nextValue;
      subscribers.forEach(callback => callback(nextValue));
      signalCallbacks.forEach(callback => callback());
    }
  };

  getter.subscribe = (callback: (newValue: T) => void) => {
    subscribers.push(callback);
    return () => {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  };

  return [getter, setter] as const;
};

// 清理 Signal 回調
export const clearSignalCallbacks = (): void => {
  signalCallbacks = [];
};

// 註冊 Signal 回調
export const onSignalUpdate = (callback: () => void): void => {
  signalCallbacks.push(callback);
};

// ===== 錯誤處理 =====

// 全域錯誤處理器
const originalError = console.error;
let suppressedErrors: string[] = [];

export const suppressConsoleError = (patterns: string[]): void => {
  suppressedErrors = patterns;
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    const shouldSuppress = suppressedErrors.some(pattern => 
      message.includes(pattern)
    );
    
    if (!shouldSuppress) {
      originalError(...args);
    }
  };
};

export const restoreConsoleError = (): void => {
  console.error = originalError;
  suppressedErrors = [];
};

// ===== 測試狀態重置 =====

// 在每個測試前重置狀態
beforeEach(() => {
  // 清理 localStorage
  localStorageMock.clear();
  
  // 清理 Signal 回調
  clearSignalCallbacks();
  
  // 重置 console.error
  restoreConsoleError();
  
  // 清理所有定時器
  jest.clearAllTimers();
});

// 在每個測試後清理
afterEach(() => {
  // 清理所有模擬
  jest.clearAllMocks();
  jest.restoreAllMocks();
  
  // 清理 DOM
  document.body.innerHTML = '';
  
  // 清理定時器
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ===== 自定義匹配器 =====

// 擴展 Jest 匹配器
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeObservable(): R;
      toEmitValues(values: any[]): R;
      toBeSignal(): R;
    }
  }
}

// Observable 匹配器
expect.extend({
  toBeObservable(received) {
    const pass = received && typeof received.subscribe === 'function';
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be an Observable`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be an Observable`,
        pass: false
      };
    }
  },
  
  async toEmitValues(received, expectedValues) {
    if (!received || typeof received.subscribe !== 'function') {
      return {
        message: () => `expected ${received} to be an Observable`,
        pass: false
      };
    }

    const emittedValues: any[] = [];
    
    return new Promise(resolve => {
      const subscription = received.subscribe({
        next: (value: any) => emittedValues.push(value),
        complete: () => {
          const pass = JSON.stringify(emittedValues) === JSON.stringify(expectedValues);
          resolve({
            message: () => pass 
              ? `expected Observable not to emit values ${JSON.stringify(expectedValues)}`
              : `expected Observable to emit values ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(emittedValues)}`,
            pass
          });
        }
      });

      // 自動完成 (用於測試)
      setTimeout(() => {
        subscription.unsubscribe();
        const pass = JSON.stringify(emittedValues) === JSON.stringify(expectedValues);
        resolve({
          message: () => pass 
            ? `expected Observable not to emit values ${JSON.stringify(expectedValues)}`
            : `expected Observable to emit values ${JSON.stringify(expectedValues)}, but got ${JSON.stringify(emittedValues)}`,
          pass
        });
      }, 100);
    });
  },
  
  toBeSignal(received) {
    const pass = received && typeof received === 'function' && 'latest' in received;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a Signal`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a Signal`,
        pass: false
      };
    }
  }
});

// ===== 測試資料工廠 =====

export const createTestAction = (type: string, payload?: any) => ({
  type,
  payload,
  timestamp: Date.now(),
  id: window.crypto.randomUUID()
});

export const createTestUser = (overrides: Partial<{
  id: string;
  name: string;
  email: string;
}> = {}) => ({
  id: window.crypto.randomUUID(),
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
});

export const createTestEntityState = <T>(entities: T[] = [], selectId = (entity: any) => entity.id) => ({
  ids: entities.map(selectId),
  entities: entities.reduce((acc, entity) => {
    acc[selectId(entity)] = entity;
    return acc;
  }, {} as Record<string, T>),
  loading: false,
  error: null,
  lastSettlement: null
});

// ===== 日誌設定 =====

// 測試環境下降低日誌級別
if (process.env.NODE_ENV === 'test') {
  console.log = jest.fn();
  console.debug = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
}