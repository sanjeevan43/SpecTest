/**
 * @file tests/unit/Logger.test.ts
 * @description Unit tests for the Logger utility — log level filtering,
 * scoped context labeling, and global error handler installation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, installGlobalErrorHandlers } from '../../src/utils/Logger';

// ---------------------------------------------------------------------------
// Spies
// ---------------------------------------------------------------------------

let debugSpy: ReturnType<typeof vi.spyOn>;
let infoSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  infoSpy  = vi.spyOn(console, 'info').mockImplementation(() => {});
  warnSpy  = vi.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Basic emission
// ---------------------------------------------------------------------------

describe('createLogger', () => {
  it('emits debug messages via console.debug', () => {
    const log = createLogger('service');
    log.debug('Test debug message');
    expect(debugSpy).toHaveBeenCalledOnce();
    expect(debugSpy.mock.calls[0][0]).toContain('Test debug message');
  });

  it('emits info messages via console.info', () => {
    const log = createLogger('service');
    log.info('Test info message');
    expect(infoSpy).toHaveBeenCalledOnce();
  });

  it('emits warn messages via console.warn', () => {
    const log = createLogger('service');
    log.warn('Test warn message');
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('emits error messages via console.error', () => {
    const log = createLogger('service');
    log.error('Test error message');
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it('includes context in log prefix', () => {
    const log = createLogger('background');
    log.info('context check');
    const firstArg = infoSpy.mock.calls[0][0] as string;
    expect(firstArg).toContain('BACKGROUND');
  });

  it('passes optional data object to console call', () => {
    const log = createLogger('service');
    const data = { url: 'https://example.com', status: 200 };
    log.info('API call', data);
    // The data should appear as a subsequent argument
    const args = infoSpy.mock.calls[0];
    expect(JSON.stringify(args)).toContain('example.com');
  });
});

// ---------------------------------------------------------------------------
// Context labels
// ---------------------------------------------------------------------------

describe('createLogger — context labels', () => {
  const contexts = ['background', 'content', 'popup', 'sidebar', 'service', 'store', 'test'] as const;

  for (const ctx of contexts) {
    it(`includes [${ctx.toUpperCase()}] in output`, () => {
      const log = createLogger(ctx);
      log.error(`error in ${ctx}`);
      const firstArg = errorSpy.mock.calls[0][0] as string;
      expect(firstArg).toContain(ctx.toUpperCase());
    });
  }
});

// ---------------------------------------------------------------------------
// installGlobalErrorHandlers
// ---------------------------------------------------------------------------

describe('installGlobalErrorHandlers', () => {
  it('installs unhandledrejection listener without throwing', () => {
    const addListenerSpy = vi.spyOn(window, 'addEventListener');
    installGlobalErrorHandlers('popup');
    const calls = addListenerSpy.mock.calls.map((c) => c[0]);
    expect(calls).toContain('unhandledrejection');
    expect(calls).toContain('error');
    addListenerSpy.mockRestore();
  });
});
