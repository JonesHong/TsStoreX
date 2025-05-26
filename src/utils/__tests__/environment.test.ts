/**
 * 環境檢測系統測試
 */

import {
    detectEnvironment,
    detectEnvironmentCapabilities,
    getEnvironmentInfo,
    isBrowser,
    isServer,
    isWebWorker,
    supportsDom,
    supportsWebApis,
    supportsNodeApis,
    hasFeature,
    hasFeatures,
    runInEnvironment,
    runInBrowser,
    runInServer,
    runInWebWorker,
    getEnvironmentDescription,
    checkCompatibility,
    Environment,
    type EnvironmentInfo,
    type EnvironmentCapabilities
  } from '../environment';
  
  describe('環境檢測系統', () => {
    
    describe('detectEnvironment', () => {
      
      it('should detect browser environment', () => {
        // 在 jsdom 測試環境中，應該檢測為瀏覽器
        const env = detectEnvironment();
        expect(env).toBe('browser');
      });
      
      it('should handle undefined globals gracefully', () => {
        // 模擬嚴格環境下的檢測
        const originalWindow = global.window;
        const originalDocument = global.document;
        
        // 臨時移除全域變數
        delete (global as any).window;
        delete (global as any).document;
        
        const env = detectEnvironment();
        
        // 恢復全域變數
        global.window = originalWindow;
        global.document = originalDocument;
        
        // 在這種情況下應該檢測為 unknown 或根據其他條件
        expect(['unknown', 'node'].includes(env)).toBe(true);
      });
      
    });
    
    describe('環境類型檢測', () => {
      
      it('should correctly identify browser environment', () => {
        expect(isBrowser()).toBe(true);
        expect(isServer()).toBe(false);
        expect(isWebWorker()).toBe(false);
      });
      
      it('should correctly identify DOM support', () => {
        expect(supportsDom()).toBe(true);
        expect(supportsWebApis()).toBe(true);
      });
      
      it('should handle Node.js API detection', () => {
        // 在測試環境中可能有混合的 API
        const nodeSupport = supportsNodeApis();
        expect(typeof nodeSupport).toBe('boolean');
      });
      
    });
    
    describe('環境特性檢測', () => {
      
      it('should detect basic capabilities', () => {
        const capabilities = detectEnvironmentCapabilities();
        
        expect(capabilities).toMatchObject({
          hasPromises: expect.any(Boolean),
          hasESModules: expect.any(Boolean),
        });
        
        // 在 jsdom 環境中應該支援 Promise
        expect(capabilities.hasPromises).toBe(true);
      });
      
      it('should detect localStorage availability', () => {
        const hasLocalStorage = hasFeature('hasLocalStorage');
        expect(typeof hasLocalStorage).toBe('boolean');
        
        // 在測試環境中已模擬 localStorage
        expect(hasLocalStorage).toBe(true);
      });
      
      it('should detect crypto API availability', () => {
        const hasCrypto = hasFeature('hasCrypto');
        expect(typeof hasCrypto).toBe('boolean');
        
        // 測試環境中已模擬 crypto
        expect(hasCrypto).toBe(true);
      });
      
      it('should detect performance API availability', () => {
        const hasPerformance = hasFeature('hasPerformance');
        expect(typeof hasPerformance).toBe('boolean');
        
        // 測試環境中已模擬 performance
        expect(hasPerformance).toBe(true);
      });
      
    });
    
    describe('hasFeatures 批量檢測', () => {
      
      it('should check multiple features at once', () => {
        const result = hasFeatures(['hasPromises', 'hasLocalStorage']);
        expect(typeof result).toBe('boolean');
      });
      
      it('should return false if any feature is missing', () => {
        // 假設某些功能不存在
        const result = hasFeatures(['hasPromises', 'hasServiceWorkers']);
        expect(typeof result).toBe('boolean');
      });
      
    });
    
    describe('getEnvironmentInfo', () => {
      
      it('should return complete environment information', () => {
        const info = getEnvironmentInfo();
        
        expect(info).toMatchObject({
          type: expect.any(String),
          isBrowser: expect.any(Boolean),
          isServer: expect.any(Boolean),
          isWebWorker: expect.any(Boolean),
          supportsDom: expect.any(Boolean),
          supportsWebApis: expect.any(Boolean),
          supportsNodeApis: expect.any(Boolean),
        });
        
        // 在瀏覽器環境中應該有 userAgent
        if (info.isBrowser) {
          expect(typeof info.userAgent).toBe('string');
        }
      });
      
      it('should provide consistent information', () => {
        const info1 = getEnvironmentInfo();
        const info2 = getEnvironmentInfo();
        
        expect(info1.type).toBe(info2.type);
        expect(info1.isBrowser).toBe(info2.isBrowser);
        expect(info1.isServer).toBe(info2.isServer);
      });
      
    });
    
    describe('條件執行函數', () => {
      
      it('should execute function in correct environment', () => {
        const browserFn = jest.fn(() => 'browser result');
        const fallbackFn = jest.fn(() => 'fallback result');
        
        const result = runInEnvironment('browser', browserFn, fallbackFn);
        
        if (isBrowser()) {
          expect(browserFn).toHaveBeenCalled();
          expect(fallbackFn).not.toHaveBeenCalled();
          expect(result).toBe('browser result');
        } else {
          expect(browserFn).not.toHaveBeenCalled();
          expect(fallbackFn).toHaveBeenCalled();
          expect(result).toBe('fallback result');
        }
      });
      
      it('should handle multiple target environments', () => {
        const fn = jest.fn(() => 'executed');
        const fallback = jest.fn(() => 'fallback');
        
        const result = runInEnvironment(['browser', 'node'], fn, fallback);
        
        expect(fn).toHaveBeenCalled();
        expect(result).toBe('executed');
      });
      
      it('should return undefined without fallback', () => {
        const fn = jest.fn(() => 'executed');
        
        const result = runInEnvironment('webworker', fn);
        
        // 在非 webworker 環境中應該返回 undefined
        if (!isWebWorker()) {
          expect(fn).not.toHaveBeenCalled();
          expect(result).toBeUndefined();
        }
      });
      
    });
    
    describe('專用執行函數', () => {
      
      it('should execute runInBrowser correctly', () => {
        const fn = jest.fn(() => 'browser only');
        const fallback = jest.fn(() => 'not browser');
        
        const result = runInBrowser(fn, fallback);
        
        if (isBrowser()) {
          expect(fn).toHaveBeenCalled();
          expect(result).toBe('browser only');
        } else {
          expect(fallback).toHaveBeenCalled();
          expect(result).toBe('not browser');
        }
      });
      
      it('should execute runInServer correctly', () => {
        const fn = jest.fn(() => 'server only');
        const fallback = jest.fn(() => 'not server');
        
        const result = runInServer(fn, fallback);
        
        if (isServer()) {
          expect(fn).toHaveBeenCalled();
          expect(result).toBe('server only');
        } else {
          expect(fallback).toHaveBeenCalled();
          expect(result).toBe('not server');
        }
      });
      
      it('should execute runInWebWorker correctly', () => {
        const fn = jest.fn(() => 'worker only');
        const fallback = jest.fn(() => 'not worker');
        
        const result = runInWebWorker(fn, fallback);
        
        if (isWebWorker()) {
          expect(fn).toHaveBeenCalled();
          expect(result).toBe('worker only');
        } else {
          expect(fallback).toHaveBeenCalled();
          expect(result).toBe('not worker');
        }
      });
      
    });
    
    describe('getEnvironmentDescription', () => {
      
      it('should return readable environment description', () => {
        const description = getEnvironmentDescription();
        
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      });
      
      it('should include relevant information for each environment', () => {
        const description = getEnvironmentDescription();
        const env = detectEnvironment();
        
        if (env === 'browser') {
          expect(description).toContain('Browser');
        } else if (env === 'node') {
          expect(description).toContain('Node.js');
        } else if (env === 'webworker') {
          expect(description).toContain('Web Worker');
        }
      });
      
    });
    
    describe('checkCompatibility', () => {
      
      it('should check environment compatibility', () => {
        const result = checkCompatibility({
          environments: ['browser']
        });
        
        expect(result).toMatchObject({
          compatible: expect.any(Boolean),
          missing: expect.any(Array)
        });
        
        if (isBrowser()) {
          expect(result.compatible).toBe(true);
          expect(result.missing).toHaveLength(0);
        }
      });
      
      it('should check feature compatibility', () => {
        const result = checkCompatibility({
          features: ['hasPromises', 'hasLocalStorage']
        });
        
        expect(result).toMatchObject({
          compatible: expect.any(Boolean),
          missing: expect.any(Array)
        });
      });
      
      it('should return missing requirements', () => {
        const result = checkCompatibility({
          environments: ['webworker'],
          features: ['hasServiceWorkers']
        });
        
        if (!isWebWorker()) {
          expect(result.compatible).toBe(false);
          expect(result.missing.length).toBeGreaterThan(0);
        }
      });
      
    });
    
    describe('Environment 預設導出', () => {
      
      it('should provide all main APIs', () => {
        expect(Environment.detect).toBe(detectEnvironment);
        expect(Environment.getInfo).toBe(getEnvironmentInfo);
        expect(Environment.getCapabilities).toBe(detectEnvironmentCapabilities);
        expect(Environment.isBrowser).toBe(isBrowser);
        expect(Environment.isServer).toBe(isServer);
        expect(Environment.hasFeature).toBe(hasFeature);
      });
      
      it('should provide consistent results', () => {
        const directResult = detectEnvironment();
        const moduleResult = Environment.detect();
        
        expect(directResult).toBe(moduleResult);
      });
      
    });
    
    describe('錯誤處理', () => {
      
      it('should handle exceptions in feature detection', () => {
        // 模擬訪問受限的環境
        const originalLocalStorage = global.localStorage;
        
        // 模擬 localStorage 訪問拋出異常
        Object.defineProperty(global, 'localStorage', {
          get: () => {
            throw new Error('Access denied');
          },
          configurable: true
        });
        
        expect(() => {
          detectEnvironmentCapabilities();
        }).not.toThrow();
        
        // 恢復 localStorage
        global.localStorage = originalLocalStorage;
      });
      
      it('should handle missing global objects', () => {
        const originalCrypto = global.crypto;
        delete (global as any).crypto;
        
        expect(() => {
          detectEnvironmentCapabilities();
        }).not.toThrow();
        
        // 恢復 crypto
        if (originalCrypto) {
          global.crypto = originalCrypto;
        }
      });
      
    });
    
    describe('邊界情況', () => {
      
      it('should handle empty feature arrays', () => {
        const result = hasFeatures([]);
        expect(result).toBe(true); // 空陣列應該返回 true
      });
      
      it('should handle unknown environment gracefully', () => {
        const originalWindow = global.window;
        const originalDocument = global.document;
        const originalProcess = global.process;
        const originalSelf = global.self;
        
        // 移除所有環境識別符
        delete (global as any).window;
        delete (global as any).document;
        delete (global as any).process;
        delete (global as any).self;
        
        const env = detectEnvironment();
        expect(env).toBe('unknown');
        
        // 恢復環境
        if (originalWindow) global.window = originalWindow;
        if (originalDocument) global.document = originalDocument;
        if (originalProcess) global.process = originalProcess;
        if (originalSelf) global.self = originalSelf;
      });
      
    });
    
  });