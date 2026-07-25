/**
 * @file tests/setup.ts
 * @description Global Vitest setup file.
 *
 * Executed before every test file via vitest.config.ts `setupFiles`.
 * Installs Chrome API mocks and configures jsdom environment globals.
 */

// Install Chrome extension API mocks — must come before any src imports
import './mocks/chromeMock';

import { afterEach, beforeEach, vi } from 'vitest';
import { clearStorageMock } from './mocks/chromeMock';

// ---------------------------------------------------------------------------
// Reset storage mock between every test to prevent state bleed
// ---------------------------------------------------------------------------

beforeEach(() => {
  clearStorageMock();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Polyfill browser APIs missing from jsdom
// ---------------------------------------------------------------------------

// crypto.randomUUID (used in store/models)
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      },
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
    },
    writable: true,
  });
}

// fetch (used by OpenApiParser)
if (!globalThis.fetch) {
  globalThis.fetch = vi.fn();
}

// btoa / atob (used by SecureStorage)
if (!globalThis.btoa) {
  globalThis.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
}
if (!globalThis.atob) {
  globalThis.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
}

// ---------------------------------------------------------------------------
// Suppress specific console outputs in tests
// ---------------------------------------------------------------------------
const originalWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  const msg = args[0]?.toString() ?? '';
  // Suppress Zustand subscribeWithSelector warning in test env
  if (msg.includes('zustand') || msg.includes('subscribe')) return;
  originalWarn(...args);
};
