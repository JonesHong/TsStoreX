/**
 * TsStoreX Signal 型別定義
 * 從 store.ts 移出的 Signal 相關型別
 */

// ============================================================================
// Signal 核心型別
// ============================================================================

/**
 * Signal 選擇器介面
 */
export interface SignalSelector<R> {
  (): R;
  latest: R;
}

/**
 * Signal 配置選項
 */
export interface SignalOptions {
  key?: string;
  equals?: (a: any, b: any) => boolean;
}