/**
 * TsStoreX Core 模組統一導出
 */

// ============================================================================
// 型別導出
// ============================================================================
export * from './types';

// ============================================================================
// Action 系統
// ============================================================================
export {
  // 核心函數
  createAction,
  createActionGroup,
  
  // 工具函數
  isActionOf,
  createActionTypeGuard,
  isActionOfAny,
  isActionOfAnyPrecise,
  serializeAction,
  // getActionInfo,
  createActionDebugger,
  
} from './action';

// ============================================================================
// Reducer 系統
// ============================================================================
export {
  // 核心函數
  on,
  createReducer,
  combineReducers,
  composeReducers,
  createDefaultReducer,
  enhanceReducer,
  createConditionalReducer,
  createResettableReducer,
  
} from './reducer';

// ============================================================================
// Store 系統
// ============================================================================
export {
  // 主要 Store 類別
  EnhancedStore,
  
  // 便利函數
  useSelector,
  
} from './store';

// ============================================================================
// Builder 系統
// ============================================================================
export {
  // Builder 類別和工廠
  StoreBuilder,
  createStoreBuilder,
  createStore,
  store,
  
} from './builder';