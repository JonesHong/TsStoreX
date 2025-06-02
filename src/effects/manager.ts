/**
 * TsStoreX Effects 管理器
 * 遵循 KISS 原則：只做必要的事情，保持簡單
 */

import { Observable, Subject, Subscription, EMPTY } from 'rxjs';
import { takeUntil, catchError, filter, take, withLatestFrom, switchMap } from 'rxjs/operators';

import type { BaseAction } from '../core/types';
import type { Effect, EffectConfig, EffectManagerConfig } from './types';
import { createLogger, type Logger } from '../utils/logger';

// ============================================================================
// Effects 管理器
// ============================================================================

export class EffectManager<T = any> {
    private effects = new Map<string, EffectConfig>();
    private subscriptions = new Map<string, Subscription>();
    private destroy$ = new Subject<void>();
    private logger: Logger;
    private isRunning = false;

    constructor(private config: EffectManagerConfig = {}) {
        this.logger = createLogger({
            source: 'EffectManager',
            level: config.logLevel || 'info'
        });
    }

    /**
     * 註冊 Effect
     */
    register(name: string, effect: Effect<T>, options?: EffectConfig['config']): void {
        if (this.effects.has(name)) {
            this.logger.warn(`Effect "${name}" already exists, replacing...`);
            this.unregister(name);
        }

        const effectConfig: EffectConfig = {
            name,
            effect,
            config: options ?? {}
        };

        this.effects.set(name, effectConfig);
        this.logger.debug(`Effect "${name}" registered`);

        // 如果管理器已經啟動，立即啟動這個 Effect
        if (this.isRunning) {
            this.startSingleEffect(effectConfig);
        }
    }

    /**
     * 註銷 Effect
     */
    unregister(name: string): void {
        if (!this.effects.has(name)) {
            this.logger.warn(`Effect "${name}" not found`);
            return;
        }

        this.stopSingleEffect(name);
        this.effects.delete(name);
        this.logger.debug(`Effect "${name}" unregistered`);
    }

    /**
     * 啟動所有 Effects
     */
    start(action$: Observable<BaseAction>, state$: Observable<T>): void {
        if (this.isRunning) {
            this.logger.warn('Effects already running');
            return;
        }

        this.isRunning = true;
        this.logger.info(`Starting ${this.effects.size} effects`);

        this.effects.forEach(effectConfig => {
            this.startSingleEffect(effectConfig, action$, state$);
        });
    }

    /**
     * 停止所有 Effects
     */
    stop(): void {
        if (!this.isRunning) {
            return;
        }

        this.logger.info('Stopping all effects');
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.subscriptions.clear();
        this.isRunning = false;
    }

    /**
     * 銷毀管理器
     */
    destroy(): void {
        this.stop();
        this.destroy$.next();
        this.destroy$.complete();
        this.effects.clear();
        this.logger.info('EffectManager destroyed');
    }

    /**
     * 獲取已註冊的 Effect 名稱列表
     */
    getEffectNames(): string[] {
        return Array.from(this.effects.keys());
    }

    /**
     * 檢查 Effect 是否存在
     */
    hasEffect(name: string): boolean {
        return this.effects.has(name);
    }

    /**
     * 檢查管理器是否正在運行
     */
    isEffectManagerRunning(): boolean {
        return this.isRunning;
    }

    // ============================================================================
    // 私有方法
    // ============================================================================

    private startSingleEffect(
        effectConfig: EffectConfig,
        action$?: Observable<BaseAction>,
        state$?: Observable<T>
    ): void {
        const { name, effect, config } = effectConfig;

        // 如果沒有提供流，說明是在管理器啟動後註冊的，需要等待
        if (!action$ || !state$) {
            return;
        }

        // 檢查是否啟用
        if (config?.enabled === false) {
            this.logger.debug(`Effect "${name}" is disabled, skipping`);
            return;
        }

        try {
            // 執行 Effect
            let effect$ = effect(action$, state$);

            // 添加錯誤處理
            effect$ = effect$.pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    this.logger.error(`Effect "${name}" error:`, error);

                    // 調用全域錯誤處理器
                    if (this.config.onError) {
                        this.config.onError(error, name, { type: 'EFFECT_ERROR', timestamp: Date.now(), id: 'error' });
                    }

                    return EMPTY;
                })
            );

            // 訂閱 Effect
            const subscription = effect$.subscribe({
                next: (action) => {
                    if (action && action.type) {
                        this.logger.debug(`Effect "${name}" produced action: ${action.type}`);
                        // 這裡不直接 dispatch，而是讓 Store 處理
                        // Effect 產生的 Action 會流回到 Store 的 action$ 中
                    }
                },
                error: (error) => {
                    this.logger.error(`Effect "${name}" subscription error:`, error);
                }
            });

            this.subscriptions.set(name, subscription);
            this.logger.debug(`Effect "${name}" started`);

        } catch (error) {
            this.logger.error(`Failed to start effect "${name}":`, error);
        }
    }

    private stopSingleEffect(name: string): void {
        const subscription = this.subscriptions.get(name);
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(name);
            this.logger.debug(`Effect "${name}" stopped`);
        }
    }
}

// ============================================================================
// 工廠函數
// ============================================================================

/**
 * 創建 Effects 管理器
 */
export const createEffectManager = <T = any>(
    config?: EffectManagerConfig
): EffectManager<T> => {
    return new EffectManager<T>(config);
};

// ============================================================================
// Effect 工廠函數
// ============================================================================

/**
 * 創建簡單的 Effect
 */
export const createEffect = <T = any>(
    effect: Effect<T>,
    name?: string
): EffectConfig => {
    return {
        name: name || `effect_${Date.now()}`,
        effect,
        config: { enabled: true }
    };
};

/**
 * 創建條件 Effect
 */
export const createConditionalEffect = <T = any>(
    condition: (action: BaseAction, state: T) => boolean,
    effect: Effect<T>,
    name?: string
): EffectConfig => {
    const conditionalEffect: Effect<T> = (action$, state$) => {
        return action$.pipe(
            // 使用 withLatestFrom 取得最新 state，然後用 condition 過濾
            // 若 condition 為 true，則傳遞 action，否則過濾掉
            // 這裡假設 effect 會處理過濾後的 action
            // 若要進一步處理，可在外部組合更多 operators
            // 這裡直接過濾
            // 需要引入 withLatestFrom, filter
            // @ts-ignore
            withLatestFrom(state$),
            // @ts-ignore
            filter(([action, state]) => condition(action, state)),
            // @ts-ignore
            map(([action, state]) => action),
            // 這裡 effect 處理過濾後的 action$
            // @ts-ignore
            (source$) => effect(source$, state$)
        );
    };

    return {
        name: name || `conditional_effect_${Date.now()}`,
        effect: conditionalEffect,
        config: { enabled: true }
    };
};

/**
 * 創建一次性 Effect
 */
export const createOnceEffect = <T = any>(
    actionType: string,
    effect: (action: BaseAction, state: T) => Observable<BaseAction>,
    name?: string
): EffectConfig => {
    const onceEffect: Effect<T> = (action$, state$) => {
        return action$.pipe(
            // 過濾指定 actionType，且只處理一次
            filter((action: BaseAction) => action.type === actionType),
            take(1),
            withLatestFrom(state$),
            switchMap(([action, state]: [BaseAction, T]) => effect(action, state))
        );
    };

    return {
        name: name || `once_effect_${Date.now()}`,
        effect: onceEffect,
        config: { enabled: true }
    };
};