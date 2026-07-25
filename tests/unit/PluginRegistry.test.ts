/**
 * @file tests/unit/PluginRegistry.test.ts
 * @description Unit tests for the PluginRegistry — registration, retrieval,
 * overwrite warnings, validation, and the summary API.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pluginRegistry } from '../../src/plugins/PluginRegistry';
import type { IValidator } from '../../src/plugins/interfaces/IValidator';
import type { IExporter } from '../../src/plugins/interfaces/IExporter';
import type { IAuthProvider } from '../../src/plugins/interfaces/IAuthProvider';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidator(id: string): IValidator {
  return {
    id,
    name: `Validator ${id}`,
    version: '1.0.0',
    validate: vi.fn().mockReturnValue({ score: 100, errors: [], warnings: [], fieldResults: [] }),
  };
}

function makeExporter(id: string): IExporter {
  return {
    id,
    name: `Exporter ${id}`,
    version: '1.0.0',
    label: 'Custom Format',
    fileExtension: 'txt',
    export: vi.fn().mockReturnValue({ content: '', mimeType: 'text/plain', filename: 'test.txt' }),
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  pluginRegistry.clear();
});

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

describe('PluginRegistry — validators', () => {
  it('registers and retrieves a validator', () => {
    const v = makeValidator('com.test.v1');
    pluginRegistry.registerValidator(v);
    expect(pluginRegistry.getValidator('com.test.v1')).toBe(v);
  });

  it('returns all registered validators', () => {
    pluginRegistry.registerValidator(makeValidator('v1'));
    pluginRegistry.registerValidator(makeValidator('v2'));
    expect(pluginRegistry.getValidators().length).toBe(2);
  });

  it('returns undefined for unregistered id', () => {
    expect(pluginRegistry.getValidator('does-not-exist')).toBeUndefined();
  });

  it('overwrites duplicate id with warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    pluginRegistry.registerValidator(makeValidator('com.test.dup'));
    pluginRegistry.registerValidator(makeValidator('com.test.dup'));
    expect(pluginRegistry.getValidators().length).toBe(1);
    warnSpy.mockRestore();
  });

  it('throws when id is missing', () => {
    expect(() =>
      pluginRegistry.registerValidator({ ...makeValidator(''), id: '' }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Exporters
// ---------------------------------------------------------------------------

describe('PluginRegistry — exporters', () => {
  it('registers and retrieves an exporter', () => {
    const e = makeExporter('com.test.e1');
    pluginRegistry.registerExporter(e);
    expect(pluginRegistry.getExporter('com.test.e1')).toBe(e);
  });

  it('returns all registered exporters', () => {
    pluginRegistry.registerExporter(makeExporter('e1'));
    pluginRegistry.registerExporter(makeExporter('e2'));
    pluginRegistry.registerExporter(makeExporter('e3'));
    expect(pluginRegistry.getExporters().length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

describe('PluginRegistry — getSummary', () => {
  it('returns zero counts when empty', () => {
    const s = pluginRegistry.getSummary();
    expect(s.validators).toBe(0);
    expect(s.exporters).toBe(0);
    expect(s.authProviders).toBe(0);
    expect(s.testGenerators).toBe(0);
    expect(s.reportFormatters).toBe(0);
  });

  it('reflects registered counts', () => {
    pluginRegistry.registerValidator(makeValidator('v1'));
    pluginRegistry.registerExporter(makeExporter('e1'));
    pluginRegistry.registerExporter(makeExporter('e2'));
    const s = pluginRegistry.getSummary();
    expect(s.validators).toBe(1);
    expect(s.exporters).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Clear
// ---------------------------------------------------------------------------

describe('PluginRegistry — clear', () => {
  it('removes all registered plugins', () => {
    pluginRegistry.registerValidator(makeValidator('v1'));
    pluginRegistry.registerExporter(makeExporter('e1'));
    pluginRegistry.clear();
    expect(pluginRegistry.getSummary().validators).toBe(0);
    expect(pluginRegistry.getSummary().exporters).toBe(0);
  });
});
