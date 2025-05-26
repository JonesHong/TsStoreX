// 測試範例 - 展示測試框架的使用方式

import { 
    waitFor, 
    nextTick, 
    createTestAction, 
    createTestUser,
    mockCreateSignal,
    suppressConsoleError,
    restoreConsoleError
  } from './setup';
  
  describe('測試框架驗證', () => {
    
    describe('基礎工具函數', () => {
      
      it('should wait for specified time', async () => {
        const start = Date.now();
        await waitFor(100);
        const end = Date.now();
        
        expect(end - start).toBeGreaterThanOrEqual(100);
      });
      
      it('should wait for next tick', async () => {
        let executed = false;
        
        process.nextTick(() => {
          executed = true;
        });
        
        expect(executed).toBe(false);
        await nextTick();
        expect(executed).toBe(true);
      });
      
    });
    
    describe('測試資料工廠', () => {
      
      it('should create test action with required fields', () => {
        const action = createTestAction('TEST_ACTION', { value: 42 });
        
        expect(action).toMatchObject({
          type: 'TEST_ACTION',
          payload: { value: 42 },
          timestamp: expect.any(Number),
          id: expect.any(String)
        });
        
        // 驗證 UUID 格式
        expect(action.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });
      
      it('should create test user with default values', () => {
        const user = createTestUser();
        
        expect(user).toMatchObject({
          id: expect.any(String),
          name: 'Test User',
          email: 'test@example.com'
        });
      });
      
      it('should create test user with overrides', () => {
        const user = createTestUser({
          name: 'Custom User',
          email: 'custom@example.com'
        });
        
        expect(user).toMatchObject({
          id: expect.any(String),
          name: 'Custom User',
          email: 'custom@example.com'
        });
      });
      
    });
    
    describe('Signal 模擬', () => {
      
      it('should create mock signal with getter and setter', () => {
        const [signal, setSignal] = mockCreateSignal(42);
        
        expect(signal()).toBe(42);
        
        setSignal(100);
        expect(signal()).toBe(100);
      });
      
      it('should support functional updates', () => {
        const [signal, setSignal] = mockCreateSignal(10);
        
        setSignal(prev => prev * 2);
        expect(signal()).toBe(20);
      });
      
      it('should notify subscribers on value change', () => {
        const [signal, setSignal] = mockCreateSignal('initial');
        const mockCallback = jest.fn();
        
        // 模擬訂閱
        signal.subscribe(mockCallback);
        
        setSignal('updated');
        
        expect(mockCallback).toHaveBeenCalledWith('updated');
      });
      
    });
    
    describe('錯誤處理', () => {
      
      it('should suppress console errors with patterns', () => {
        const originalError = console.error;
        const mockError = jest.fn();
        console.error = mockError;
        
        suppressConsoleError(['Warning:', 'Deprecated:']);
        
        console.error('Warning: This is a warning');
        console.error('Error: This is an error');
        console.error('Deprecated: This is deprecated');
        
        expect(mockError).toHaveBeenCalledTimes(1);
        expect(mockError).toHaveBeenCalledWith('Error: This is an error');
        
        restoreConsoleError();
        console.error = originalError;
      });
      
    });
    
    describe('環境模擬', () => {
      
      it('should have crypto.randomUUID available', () => {
        expect(typeof window.crypto.randomUUID).toBe('function');
        
        const uuid1 = window.crypto.randomUUID();
        const uuid2 = window.crypto.randomUUID();
        
        expect(uuid1).not.toBe(uuid2);
        expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });
      
      it('should have performance.now available', () => {
        expect(typeof window.performance.now).toBe('function');
        
        const time1 = window.performance.now();
        const time2 = window.performance.now();
        
        expect(time2).toBeGreaterThanOrEqual(time1);
      });
      
      it('should have localStorage available', () => {
        expect(typeof window.localStorage.setItem).toBe('function');
        expect(typeof window.localStorage.getItem).toBe('function');
        
        window.localStorage.setItem('test', 'value');
        expect(window.localStorage.getItem('test')).toBe('value');
        
        window.localStorage.removeItem('test');
        expect(window.localStorage.getItem('test')).toBeNull();
      });
      
    });
    
    describe('自定義匹配器', () => {
      
      it('should match Observable-like objects', () => {
        const mockObservable = {
          subscribe: jest.fn()
        };
        
        expect(mockObservable).toBeObservable();
      });
      
      it('should match Signal-like objects', () => {
        const mockSignal = Object.assign(
          () => 'value',
          { latest: 'value' }
        );
        
        expect(mockSignal).toBeSignal();
      });
      
    });
    
    describe('定時器處理', () => {
      
      beforeEach(() => {
        jest.useFakeTimers();
      });
      
      afterEach(() => {
        jest.useRealTimers();
      });
      
      it('should handle setTimeout with fake timers', () => {
        const callback = jest.fn();
        
        setTimeout(callback, 1000);
        
        expect(callback).not.toHaveBeenCalled();
        
        jest.advanceTimersByTime(1000);
        
        expect(callback).toHaveBeenCalledTimes(1);
      });
      
      it('should handle setInterval with fake timers', () => {
        const callback = jest.fn();
        
        const intervalId = setInterval(callback, 500);
        
        // 執行 3 次
        jest.advanceTimersByTime(1500);
        
        expect(callback).toHaveBeenCalledTimes(3);
        
        clearInterval(intervalId);
      });
      
    });
    
  });
  
  // ===== 整合測試範例 =====
  
  describe('整合測試範例', () => {
    
    it('should demonstrate complete testing workflow', async () => {
      // 1. 準備測試資料
      const user = createTestUser({ name: 'Integration Test User' });
      const action = createTestAction('ADD_USER', user);
      
      // 2. 模擬 Signal
      const [userSignal, setUserSignal] = mockCreateSignal<typeof user | null>(null);
      
      // 3. 模擬異步操作
      const mockAsyncOperation = jest.fn().mockResolvedValue(user);
      
      // 4. 執行測試邏輯
      const result = await mockAsyncOperation();
      setUserSignal(result);
      
      // 5. 驗證結果
      expect(mockAsyncOperation).toHaveBeenCalled();
      expect(userSignal()).toEqual(user);
      expect(action.type).toBe('ADD_USER');
      expect(action.payload).toEqual(user);
    });
    
    it('should test error scenarios', async () => {
      // 準備錯誤場景
      const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));
      
      suppressConsoleError(['Test error']);
      
      try {
        await mockOperation();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Test error');
      }
      
      restoreConsoleError();
    });
    
    it('should test performance scenarios', async () => {
      const start = window.performance.now();
      
      // 模擬一些計算
      await waitFor(50);
      
      const end = window.performance.now();
      const duration = end - start;
      
      expect(duration).toBeGreaterThanOrEqual(50);
      expect(duration).toBeLessThan(100); // 應該不會太慢
    });
    
  });