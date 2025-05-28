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
  getActionInfo,
  createActionDebugger,
  
  // 型別
  type BaseAction,
  type Action,
  type ActionCreator,
  type ActionCreatorConfig,
  type ActionGroupConfig,
  type ActionGroup,
  type ExtractActionPayload,
  type ExtractGroupActions,
  type ActionUnion,
  type ActionFromCreators
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
  
  // 型別
  type Reducer,
  type ReducerHandler,
  type ReducersMapObject
} from './reducer';

// ============================================================================
// Store 系統
// ============================================================================
export {
  // 主要 Store 類別
  EnhancedStore,
  
  // 便利函數
  useSelector,
  
  // 型別
  type SignalSelector,
  type SignalOptions
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