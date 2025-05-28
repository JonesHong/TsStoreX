/**
 * TsStoreX Logger 系統
 * 從 store.ts 移出的基本日誌功能
 */
import { DateTime } from 'luxon';
/**
 * 日誌級別
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Logger 配置
 */
export interface LoggerConfig {
  level?: LogLevel;
  source?: string;
}

/**
 * Logger 介面
 */
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}

/**
 * 日誌級別優先級
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
};

/**
 * Logger 實現
 */
class LoggerImpl implements Logger {
  private level: LogLevel;
  private source: string;

  constructor(config: LoggerConfig = {}) {
    this.level = config.level || 'info';
    this.source = config.source || '';
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

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.level]) {
      return;
    }

    const timestamp = DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss'); // 2025-05-23 23:23:13
    const prefix = `[${timestamp}] ${level.toUpperCase()}`;
    const fullMessage = this.source ? `${prefix} [${this.source}]: ${message}` : `${prefix}: ${message}`;

    const consoleMethods: Record<LogLevel, keyof Console> = {
      debug: 'debug',
      info: 'info', 
      warn: 'warn',
      error: 'error',
      silent: 'log'
    };

    const consoleMethod = consoleMethods[level];
    (console as any)[consoleMethod](fullMessage, ...args);
  }
}

/**
 * 建立 Logger 實例
 */
export const createLogger = (config: LoggerConfig = {}): Logger => {
  return new LoggerImpl(config);
};