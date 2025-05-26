/**
 * Logger 系統
 * 
 * 提供跨環境的統一日誌記錄功能，支援：
 * - 分級日誌記錄 (debug, info, warn, error)
 * - 環境自適應輸出
 * - 可配置的日誌級別
 * - 結構化日誌支援
 * - 效能優化的條件記錄
 */

import { detectEnvironment, isBrowser, isServer } from './environment';

// ===== 日誌級別定義 =====

/**
 * 日誌級別
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * 日誌級別優先級映射
 */
export const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
} as const;

/**
 * 日誌條目介面
 */
export interface LogEntry {
  /** 日誌級別 */
  level: LogLevel;
  /** 日誌訊息 */
  message: string;
  /** 時間戳 */
  timestamp: string;
  /** 額外資料 */
  data?: any[] | undefined;
  /** 來源標識 */
  source?: string | undefined;
  /** 環境資訊 */
  environment: string;
}

/**
 * Logger 配置
 */
export interface LoggerConfig {
  /** 最小日誌級別 */
  level?: LogLevel;
  /** 來源標識 */
  source?: string | undefined;
  /** 是否啟用時間戳 */
  enableTimestamp?: boolean;
  /** 是否啟用來源標識 */
  enableSource?: boolean;
  /** 自定義輸出函數 */
  customOutput?: (entry: LogEntry) => void;
  /** 是否啟用顏色輸出 (Node.js) */
  enableColors?: boolean;
  /** 是否啟用結構化日誌 */
  enableStructured?: boolean;
}

// ===== 顏色定義 (Node.js) =====

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
} as const;

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: COLORS.gray,
  info: COLORS.blue,
  warn: COLORS.yellow,
  error: COLORS.red,
  silent: COLORS.reset
};

// ===== Logger 類別 =====

/**
 * Logger 介面
 */
export interface Logger {
  /** 除錯日誌 */
  debug(message: string, ...args: any[]): void;
  /** 資訊日誌 */
  info(message: string, ...args: any[]): void;
  /** 警告日誌 */
  warn(message: string, ...args: any[]): void;
  /** 錯誤日誌 */
  error(message: string, ...args: any[]): void;
  /** 檢查是否啟用指定級別 */
  isEnabled(level: LogLevel): boolean;
  /** 建立子 Logger */
  child(source: string): Logger;
  /** 設定日誌級別 */
  setLevel(level: LogLevel): void;
  /** 獲取當前日誌級別 */
  getLevel(): LogLevel;
}

/**
 * Logger 實現類別
 */
class LoggerImpl implements Logger {
  private config: Required<LoggerConfig>;
  private environment: string;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: 'info',
      source: '',
      enableTimestamp: true,
      enableSource: true,
      enableColors: isServer(),
      enableStructured: false,
      customOutput: (entry: LogEntry) => {},
      ...config
    };
    
    this.environment = detectEnvironment();
  }

  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  isEnabled(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  child(source: string): Logger {
    const childSource = this.config.source 
      ? `${this.config.source}:${source}`
      : source;
    
    return new LoggerImpl({
      ...this.config,
      source: childSource
    });
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getLevel(): LogLevel {
    return this.config.level;
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    // 級別檢查 - 早期返回以提升效能
    if (!this.isEnabled(level)) {
      return;
    }

    // 建立日誌條目
    const entry: LogEntry = {
      level,
      message,
      timestamp: this.config.enableTimestamp ? new Date().toISOString() : '',
      data: args.length > 0 ? args : undefined,
      source: this.config.enableSource ? this.config.source : undefined,
      environment: this.environment
    };

    // 使用自定義輸出或預設輸出
    if (this.config.customOutput) {
      this.config.customOutput(entry);
    } else {
      this.defaultOutput(entry);
    }
  }

  private defaultOutput(entry: LogEntry): void {
    if (this.config.enableStructured) {
      this.structuredOutput(entry);
    } else {
      this.simpleOutput(entry);
    }
  }

  private simpleOutput(entry: LogEntry): void {
    const parts: string[] = [];
    
    // 時間戳
    if (entry.timestamp) {
      parts.push(`[${entry.timestamp}]`);
    }
    
    // 級別
    const levelStr = entry.level.toUpperCase().padEnd(5);
    if (this.config.enableColors && isServer()) {
      parts.push(`${LEVEL_COLORS[entry.level]}${levelStr}${COLORS.reset}`);
    } else {
      parts.push(levelStr);
    }
    
    // 來源
    if (entry.source) {
      parts.push(`[${entry.source}]`);
    }
    
    // 訊息
    parts.push(entry.message);
    
    const logMessage = parts.join(' ');
    
    // 根據級別選擇輸出方法
    this.outputToConsole(entry.level, logMessage, entry.data);
  }

  private structuredOutput(entry: LogEntry): void {
    const structuredEntry = {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      source: entry.source,
      environment: entry.environment,
      ...(entry.data && entry.data.length > 0 && { data: entry.data })
    };

    this.outputToConsole(entry.level, JSON.stringify(structuredEntry));
  }

  private outputToConsole(level: LogLevel, message: string, data?: any[]): void {
    const consoleMethods: Record<LogLevel, keyof Console> = {
      debug: 'debug',
      info: 'info',
      warn: 'warn',
      error: 'error',
      silent: 'log'
    };

    const consoleMethod = consoleMethods[level];
    const consoleObj = console as any;

    if (data && data.length > 0) {
      consoleObj[consoleMethod](message, ...data);
    } else {
      consoleObj[consoleMethod](message);
    }
  }
}

// ===== 工廠函數 =====

/**
 * 建立 Logger 實例
 */
export const createLogger = (config: LoggerConfig = {}): Logger => {
  return new LoggerImpl(config);
};

/**
 * 根據環境建立最佳化的 Logger
 */
export const createOptimizedLogger = (source?: string): Logger => {
  const environment = detectEnvironment();
  
  const baseConfig: LoggerConfig = {
    source,
    enableTimestamp: true,
    enableSource: !!source,
  };

  // 環境特定優化
  switch (environment) {
    case 'browser':
      return createLogger({
        ...baseConfig,
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
        enableColors: false, // 瀏覽器有自己的樣式
        enableStructured: false
      });
      
    case 'node':
      return createLogger({
        ...baseConfig,
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
        enableColors: true,
        enableStructured: process.env.LOG_FORMAT === 'json'
      });
      
    case 'webworker':
      return createLogger({
        ...baseConfig,
        level: 'info',
        enableColors: false,
        enableStructured: true
      });
      
    default:
      return createLogger({
        ...baseConfig,
        level: 'warn',
        enableColors: false,
        enableStructured: false
      });
  }
};

// ===== 預設 Logger =====

/**
 * 預設 Logger 實例
 */
export const defaultLogger = createOptimizedLogger('TsStoreX');

/**
 * 便利函數 - 使用預設 Logger
 */
export const log = {
  debug: (message: string, ...args: any[]) => defaultLogger.debug(message, ...args),
  info: (message: string, ...args: any[]) => defaultLogger.info(message, ...args),
  warn: (message: string, ...args: any[]) => defaultLogger.warn(message, ...args),
  error: (message: string, ...args: any[]) => defaultLogger.error(message, ...args),
} as const;

// ===== 效能監控工具 =====

/**
 * 效能監控 Logger
 */
export const createPerformanceLogger = (source: string = 'Performance'): {
  time: (label: string) => void;
  timeEnd: (label: string) => void;
  logger: Logger;
} => {
  const logger = createLogger({
    source,
    level: 'debug',
    enableTimestamp: true
  });

  const timers = new Map<string, number>();

  return {
    time: (label: string) => {
      const start = isBrowser() ? performance.now() : process.hrtime.bigint();
      timers.set(label, start as number);
      logger.debug(`Timer started: ${label}`);
    },

    timeEnd: (label: string) => {
      const start = timers.get(label);
      if (start === undefined) {
        logger.warn(`Timer not found: ${label}`);
        return;
      }

      let duration: number;
      if (isBrowser()) {
        duration = performance.now() - start;
      } else {
        const end = process.hrtime.bigint();
        duration = Number(end - BigInt(Math.floor(start))) / 1_000_000;
      }

      timers.delete(label);
      logger.info(`${label}: ${duration.toFixed(2)}ms`);
    },

    logger
  };
};

// ===== 條件記錄工具 =====

/**
 * 僅在開發環境記錄
 */
export const devLog = (message: string, ...args: any[]): void => {
  if (process.env.NODE_ENV === 'development') {
    defaultLogger.debug(`[DEV] ${message}`, ...args);
  }
};

/**
 * 僅在生產環境記錄錯誤
 */
export const prodError = (message: string, ...args: any[]): void => {
  if (process.env.NODE_ENV === 'production') {
    defaultLogger.error(`[PROD] ${message}`, ...args);
  }
};

/**
 * 條件記錄
 */
export const conditionalLog = (
  condition: boolean,
  level: LogLevel,
  message: string,
  ...args: any[]
): void => {
  if (condition) {
    if (level !== 'silent' && typeof defaultLogger[level] === 'function') {
        defaultLogger[level](message, ...args);
    }
  }
};