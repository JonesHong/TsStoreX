// Node.js 環境專用測試設定

import { TextEncoder, TextDecoder } from 'util';
import { webcrypto } from 'crypto';

// ===== Node.js 環境補丁 =====

// 補丁 crypto API (Node.js 16+)
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto
  });
}

// 補丁 TextEncoder/TextDecoder
if (!globalThis.TextEncoder) {
  Object.defineProperty(globalThis, 'TextEncoder', {
    value: TextEncoder
  });
}

if (!globalThis.TextDecoder) {
  Object.defineProperty(globalThis, 'TextDecoder', {
    value: TextDecoder
  });
}

// 模擬 performance API
if (!globalThis.performance) {
  Object.defineProperty(globalThis, 'performance', {
    value: {
      now: (): number => {
        const [seconds, nanoseconds] = process.hrtime();
        return seconds * 1000 + nanoseconds / 1000000;
      }
    }
  });
}

// ===== 環境檢測模擬 =====

// 確保 Node.js 環境正確檢測
Object.defineProperty(globalThis, 'window', {
  value: undefined,
  configurable: true
});

Object.defineProperty(globalThis, 'document', {
  value: undefined,
  configurable: true
});

// 確保 process 存在且包含 versions.node
if (!globalThis.process || !globalThis.process.versions) {
  Object.defineProperty(globalThis, 'process', {
    value: {
      ...process,
      versions: {
        ...process.versions,
        node: process.version
      }
    }
  });
}

// ===== Node.js 專用測試工具 =====

// 模擬檔案系統操作
export const mockFileSystem = () => {
  const fs = require('fs');
  const fsPromises = require('fs/promises');
  
  const originalReadFile = fs.readFileSync;
  const originalWriteFile = fs.writeFileSync;
  const originalExists = fs.existsSync;
  
  const fileSystem = new Map<string, string>();
  
  // 模擬同步檔案操作
  fs.readFileSync = jest.fn((path: string, encoding?: string) => {
    if (fileSystem.has(path)) {
      const content = fileSystem.get(path)!;
      return encoding ? content : Buffer.from(content);
    }
    throw new Error(`ENOENT: no such file or directory '${path}'`);
  });
  
  fs.writeFileSync = jest.fn((path: string, data: string | Buffer) => {
    fileSystem.set(path, data.toString());
  });
  
  fs.existsSync = jest.fn((path: string) => {
    return fileSystem.has(path);
  });
  
  // 模擬非同步檔案操作
  fsPromises.readFile = jest.fn(async (path: string, encoding?: string) => {
    return fs.readFileSync(path, encoding);
  });
  
  fsPromises.writeFile = jest.fn(async (path: string, data: string | Buffer) => {
    return fs.writeFileSync(path, data);
  });
  
  return {
    // 設定模擬檔案
    setFile: (path: string, content: string) => {
      fileSystem.set(path, content);
    },
    
    // 獲取模擬檔案
    getFile: (path: string) => {
      return fileSystem.get(path);
    },
    
    // 清理模擬檔案
    clear: () => {
      fileSystem.clear();
    },
    
    // 恢復原始檔案系統
    restore: () => {
      fs.readFileSync = originalReadFile;
      fs.writeFileSync = originalWriteFile;
      fs.existsSync = originalExists;
    }
  };
};

// ===== 網路請求模擬 =====

export const mockNetworkRequests = () => {
  const originalFetch = globalThis.fetch;
  const responses = new Map<string, any>();
  
  globalThis.fetch = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const urlString = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    
    if (responses.has(urlString)) {
      const mockResponse = responses.get(urlString);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
        ...mockResponse.options
      });
    }
    
    throw new Error(`No mock response defined for ${urlString}`);
  });
  
  return {
    // 設定模擬回應
    setResponse: (url: string, response: any, options?: any) => {
      responses.set(url, { ...response, options });
    },
    
    // 清理模擬回應
    clear: () => {
      responses.clear();
    },
    
    // 恢復原始 fetch
    restore: () => {
      globalThis.fetch = originalFetch;
    }
  };
};

// ===== 環境變數模擬 =====

export const mockEnvironment = (env: Record<string, string>) => {
  const originalEnv = { ...process.env };
  
  Object.assign(process.env, env);
  
  return {
    restore: () => {
      process.env = originalEnv;
    }
  };
};

// ===== 定時器增強 =====

export const createTimerUtils = () => {
  return {
    // 快進所有定時器
    fastForward: (ms: number) => {
      jest.advanceTimersByTime(ms);
    },
    
    // 執行所有待處理的定時器
    flushTimers: () => {
      jest.runAllTimers();
    },
    
    // 執行下一個定時器
    nextTimer: () => {
      jest.runOnlyPendingTimers();
    }
  };
};

// ===== 測試資料生成器 =====

export const generateTestData = {
  // 生成隨機字串
  randomString: (length = 10): string => {
    return Math.random().toString(36).substring(2, 2 + length);
  },
  
  // 生成隨機數字
  randomNumber: (min = 0, max = 100): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  // 生成測試用戶資料
  user: (overrides: any = {}) => ({
    id: crypto.randomUUID(),
    name: `User ${generateTestData.randomString(5)}`,
    email: `user${generateTestData.randomNumber()}@test.com`,
    createdAt: new Date().toISOString(),
    ...overrides
  }),
  
  // 生成大量測試資料
  users: (count = 10) => {
    return Array.from({ length: count }, () => generateTestData.user());
  }
};

// ===== 測試清理 =====

beforeEach(() => {
  // 使用假定時器
  jest.useFakeTimers();
});

afterEach(() => {
  // 清理所有模擬
  jest.clearAllMocks();
  jest.restoreAllMocks();
  
  // 恢復真實定時器
  jest.useRealTimers();
  
  // 清理環境變數
  delete process.env.TEST_ENV;
});