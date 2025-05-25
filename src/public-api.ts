// 主要 API 導出，確保向後相容性
export {
    // Core
    Store,
    createAction,
    createActionGroup,
    createReducer,
    combineReducers,
    on,
    
    // Entity
    createEntityAdapter,
    
    // Effects
    createEffect,
    
    // Selectors
    createSelector,
    createMemoizedSelector,
    useSelector,
    
    // Middlewares
    createLoggerMiddleware,
    createErrorMiddleware,
    createPerformanceMiddleware,
    
    // Types
    type Action,
    type ActionCreator,
    type Reducer,
    type Middleware,
    type EntityState,
    type SignalSelector
  } from './index';