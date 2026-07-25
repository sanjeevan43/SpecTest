/**
 * @file tests/mocks/chromeMock.ts
 * @description Comprehensive Chrome Extension API mock for Vitest unit tests.
 *
 * Usage: imported via vitest.config.ts `setupFiles` — automatically available
 * in every test file without explicit import.
 *
 * Covers: chrome.storage.local, chrome.runtime, chrome.tabs
 */

import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// In-memory storage backend
// ---------------------------------------------------------------------------

const _store: Record<string, unknown> = {};

const storageMock = {
  local: {
    get: vi.fn(async (keys: string | string[] | Record<string, unknown> | null) => {
      if (keys === null) return { ..._store };
      const keyList = typeof keys === 'string'
        ? [keys]
        : Array.isArray(keys)
          ? keys
          : Object.keys(keys);
      const result: Record<string, unknown> = {};
      for (const k of keyList) {
        if (k in _store) result[k] = _store[k];
      }
      return result;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(_store, items);
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const keyList = typeof keys === 'string' ? [keys] : keys;
      for (const k of keyList) {
        delete _store[k];
      }
    }),
    clear: vi.fn(async () => {
      for (const key of Object.keys(_store)) {
        delete _store[key];
      }
    }),
  },
};

// ---------------------------------------------------------------------------
// Runtime mock
// ---------------------------------------------------------------------------

const runtimeMock = {
  getManifest: vi.fn(() => ({
    name: 'Swagger API Auto Tester',
    version: '1.0.0',
    manifest_version: 3,
  })),
  sendMessage: vi.fn(),
  onInstalled: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  lastError: null as null | { message: string },
};

// ---------------------------------------------------------------------------
// Tabs mock
// ---------------------------------------------------------------------------

const tabsMock = {
  query: vi.fn(async () => [
    { id: 1, url: 'https://petstore.swagger.io/', active: true, windowId: 1 },
  ]),
  sendMessage: vi.fn(async () => undefined),
};

// ---------------------------------------------------------------------------
// Install global chrome mock
// ---------------------------------------------------------------------------

(globalThis as unknown as { chrome: unknown }).chrome = {
  storage: storageMock,
  runtime: runtimeMock,
  tabs: tabsMock,
};

// ---------------------------------------------------------------------------
// Helper: reset storage between tests
// ---------------------------------------------------------------------------

export function clearStorageMock(): void {
  for (const key of Object.keys(_store)) {
    delete _store[key];
  }
}

export function seedStorageMock(data: Record<string, unknown>): void {
  Object.assign(_store, data);
}

export { storageMock, runtimeMock, tabsMock };
