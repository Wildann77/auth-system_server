/**
 * Logger Utility
 * Standardized JSON logging for the entire application
 */

import { isDevelopment } from '@/config/env';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: any;
}

class Logger {
  private format(level: LogLevel, message: string, context?: LogContext) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };

    return JSON.stringify(entry);
  }

  public info(message: string, context?: LogContext) {
    if (this.shouldLog('INFO')) {
      console.log(this.format('INFO', message, context));
    }
  }

  public warn(message: string, context?: LogContext) {
    if (this.shouldLog('WARN')) {
      console.warn(this.format('WARN', message, context));
    }
  }

  public error(message: string, context?: LogContext) {
    if (this.shouldLog('ERROR')) {
      console.error(this.format('ERROR', message, context));
    }
  }

  public debug(message: string, context?: LogContext) {
    if (isDevelopment || this.shouldLog('DEBUG')) {
      console.log(this.format('DEBUG', message, context));
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const priority = levelPriority[level];
    const targetPriority = levelPriority[currentLevel];
    return priority >= targetPriority;
  }
}

const levelPriority: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'INFO';

export const logger = new Logger();
