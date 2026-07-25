/**
 * @file Logger.ts
 * @description Centralized, structured logger for the Swagger API Auto Tester extension.
 *
 * Design decisions:
 * - Singleton-free: module-level functions for tree-shakeable usage
 * - Log levels: DEBUG < INFO < WARN < ERROR
 * - In production builds LOG_LEVEL env gates DEBUG output
 * - Chrome extension context-aware (service_worker vs content_script vs popup)
 * - Never throws – all log operations are safe
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = 'background' | 'content' | 'popup' | 'sidebar' | 'service' | 'store' | 'test' | 'unknown';

export interface LogEntry {
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: unknown;
  timestamp: string;
  version: string;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// In production (after vite build), vite replaces import.meta.env.MODE
const IS_PRODUCTION = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'production';
const MIN_LEVEL: LogLevel = IS_PRODUCTION ? 'warn' : 'debug';
const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LEVEL];
}

function buildEntry(
  level: LogLevel,
  context: LogContext,
  message: string,
  data?: unknown,
): LogEntry {
  return {
    level,
    context,
    message,
    data,
    timestamp: new Date().toISOString(),
    version: VERSION,
  };
}

const LEVEL_STYLES: Record<LogLevel, string> = {
  debug: 'color: #94a3b8; font-weight: normal',
  info:  'color: #60a5fa; font-weight: bold',
  warn:  'color: #fbbf24; font-weight: bold',
  error: 'color: #f87171; font-weight: bold',
};

function emit(entry: LogEntry): void {
  const prefix = `[SAT][${entry.context.toUpperCase()}]`;
  const label = `%c${prefix} ${entry.message}`;
  const style = LEVEL_STYLES[entry.level];

  switch (entry.level) {
    case 'debug':
      console.debug(label, style, ...(entry.data !== undefined ? [entry.data] : []));
      break;
    case 'info':
      console.info(label, style, ...(entry.data !== undefined ? [entry.data] : []));
      break;
    case 'warn':
      console.warn(label, style, ...(entry.data !== undefined ? [entry.data] : []));
      break;
    case 'error':
      console.error(label, style, ...(entry.data !== undefined ? [entry.data] : []));
      break;
  }
}

/**
 * Creates a scoped logger bound to a specific context.
 *
 * @example
 * const log = createLogger('service');
 * log.info('Request built', { url: '...' });
 */
export function createLogger(context: LogContext) {
  return {
    debug: (message: string, data?: unknown) => {
      if (!shouldLog('debug')) return;
      emit(buildEntry('debug', context, message, data));
    },
    info: (message: string, data?: unknown) => {
      if (!shouldLog('info')) return;
      emit(buildEntry('info', context, message, data));
    },
    warn: (message: string, data?: unknown) => {
      if (!shouldLog('warn')) return;
      emit(buildEntry('warn', context, message, data));
    },
    error: (message: string, data?: unknown) => {
      if (!shouldLog('error')) return;
      emit(buildEntry('error', context, message, data));
    },
  };
}

/** Global fallback logger for quick usage without a scoped context. */
export const logger = createLogger('unknown');

// ---------------------------------------------------------------------------
// Global error guards — catch unhandled rejections / errors in extension pages
// ---------------------------------------------------------------------------
export function installGlobalErrorHandlers(context: LogContext): void {
  const log = createLogger(context);

  window.addEventListener('unhandledrejection', (event) => {
    log.error('Unhandled promise rejection', {
      reason: event.reason instanceof Error
        ? { message: event.reason.message, stack: event.reason.stack }
        : String(event.reason),
    });
  });

  window.addEventListener('error', (event) => {
    log.error('Uncaught runtime error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
}

// Prevent TS error on __APP_VERSION__ constant injected by Vite define
declare const __APP_VERSION__: string;
