/**
 * TsStoreX 函數組合工具
 * 從 store.ts 移出的 compose 函數
 */

/**
 * 函數組合工具
 * 將多個函數組合成一個函數，從右到左執行
 */
export const compose = (...funcs: Function[]): Function => {
    if (funcs.length === 0) {
      return <T>(arg: T): T => arg;
    }
    if (funcs.length === 1) {
      return funcs[0] || ((arg: any) => arg);
    }
    return funcs.reduce((a, b) => (...args: any[]) => a(b(...args)));
  };
  
  /**
   * 中間件鏈組合器
   * 專門用於處理中間件的組合
   */
  export const composeMiddleware = <T>(
    middlewareAPI: T,
    middlewares: any[],
    finalDispatch: Function
  ): Function => {
    if (middlewares.length === 0) {
      return finalDispatch;
    }
  
    try {
      const chain = middlewares.map(middleware => middleware(middlewareAPI));
      return compose(...chain)(finalDispatch);
    } catch (error) {
      console.error('Failed to compose middleware chain:', error);
      return finalDispatch;
    }
  };