/**
 * TsStoreX Signal 模組統一導出
 */

// Signal 投影器
export { SignalProjector, createSignalProjector, createOptimizedSignalProjector } from './projector';

// Signal 選擇器
export { useSelector } from './selectors';

// 型別
export type { SignalSelector, SignalOptions } from './types';