/**
 * @file tests/unit/AppConfig.test.ts
 * @description Unit tests for AppConfig — defaults, deep-merge, Chrome storage
 * persistence, and config reset.
 *
 * The Chrome storage mock is installed via tests/setup.ts.
 * `clearStorageMock()` and `seedStorageMock()` are helpers from chromeMock.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { clearStorageMock, seedStorageMock } from '../mocks/chromeMock';

// ---------------------------------------------------------------------------
// NOTE: AppConfig uses a module-level _runtimeConfig singleton.
// We must re-import the module fresh for each isolated test,
// OR call resetConfig() between tests to restore the singleton.
// We use resetConfig() for simplicity since dynamic imports in beforeEach
// would break coverage and add complexity.
// ---------------------------------------------------------------------------

import {
  DEFAULT_CONFIG,
  getConfig,
  loadConfig,
  updateConfig,
  resetConfig,
} from '../../src/config/AppConfig';

// ---------------------------------------------------------------------------
// DEFAULT_CONFIG — immutable defaults
// ---------------------------------------------------------------------------

describe('DEFAULT_CONFIG', () => {
  it('has all required top-level keys', () => {
    expect(DEFAULT_CONFIG).toHaveProperty('version');
    expect(DEFAULT_CONFIG).toHaveProperty('featureFlags');
    expect(DEFAULT_CONFIG).toHaveProperty('execution');
    expect(DEFAULT_CONFIG).toHaveProperty('retention');
    expect(DEFAULT_CONFIG).toHaveProperty('ui');
    expect(DEFAULT_CONFIG).toHaveProperty('security');
  });

  it('all cloud feature flags are disabled by default', () => {
    const { featureFlags } = DEFAULT_CONFIG;
    expect(featureFlags.cloudSync).toBe(false);
    expect(featureFlags.teamWorkspaces).toBe(false);
    expect(featureFlags.scheduledRuns).toBe(false);
    expect(featureFlags.aiAnalysis).toBe(false);
    expect(featureFlags.integrations).toBe(false);
  });

  it('virtualizedList is enabled by default', () => {
    expect(DEFAULT_CONFIG.featureFlags.virtualizedList).toBe(true);
  });

  it('token masking is enabled by default', () => {
    expect(DEFAULT_CONFIG.security.maskTokensInLogs).toBe(true);
    expect(DEFAULT_CONFIG.security.maskTokensInReports).toBe(true);
  });

  it('default theme is dark', () => {
    expect(DEFAULT_CONFIG.ui.defaultTheme).toBe('dark');
  });

  it('compact mode is off by default', () => {
    expect(DEFAULT_CONFIG.ui.compactMode).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// loadConfig — no stored overrides
// ---------------------------------------------------------------------------

describe('loadConfig — empty storage', () => {
  beforeEach(async () => {
    clearStorageMock();
    await resetConfig(); // reset singleton to defaults
  });

  it('returns default config when storage is empty', async () => {
    const config = await loadConfig();
    expect(config.version).toBe(DEFAULT_CONFIG.version);
    expect(config.featureFlags.cloudSync).toBe(false);
    expect(config.ui.defaultTheme).toBe('dark');
  });
});

// ---------------------------------------------------------------------------
// loadConfig — with stored overrides
// ---------------------------------------------------------------------------

describe('loadConfig — with stored overrides', () => {
  beforeEach(async () => {
    clearStorageMock();
    await resetConfig();
    seedStorageMock({
      sat_app_config: {
        featureFlags: { cloudSync: true },
        ui: { defaultTheme: 'light', compactMode: true },
      },
    });
  });

  it('deep-merges stored overrides into defaults', async () => {
    const config = await loadConfig();
    // Override was applied
    expect(config.featureFlags.cloudSync).toBe(true);
    expect(config.ui.defaultTheme).toBe('light');
    expect(config.ui.compactMode).toBe(true);
  });

  it('preserves unspecified defaults after merge', async () => {
    const config = await loadConfig();
    // Non-overridden feature flags remain at defaults
    expect(config.featureFlags.teamWorkspaces).toBe(false);
    expect(config.featureFlags.aiAnalysis).toBe(false);
    // Non-overridden ui values preserved
    expect(config.ui.animationsEnabled).toBe(DEFAULT_CONFIG.ui.animationsEnabled);
    expect(config.ui.defaultPanelWidth).toBe(DEFAULT_CONFIG.ui.defaultPanelWidth);
  });
});

// ---------------------------------------------------------------------------
// updateConfig
// ---------------------------------------------------------------------------

describe('updateConfig', () => {
  beforeEach(async () => {
    clearStorageMock();
    await resetConfig();
  });

  it('updates a single feature flag without affecting others', async () => {
    await updateConfig({ featureFlags: { cloudSync: true } });
    const config = getConfig();
    expect(config.featureFlags.cloudSync).toBe(true);
    expect(config.featureFlags.aiAnalysis).toBe(false); // untouched
  });

  it('updates nested ui config without losing sibling keys', async () => {
    await updateConfig({ ui: { compactMode: true } });
    const config = getConfig();
    expect(config.ui.compactMode).toBe(true);
    expect(config.ui.defaultTheme).toBe('dark'); // preserved from default
  });

  it('persists override to Chrome storage under sat_app_config key', async () => {
    await updateConfig({ retention: { maxSavedRuns: 50 } });
    const stored = await chrome.storage.local.get('sat_app_config');
    const savedConfig = stored['sat_app_config'] as typeof DEFAULT_CONFIG;
    expect(savedConfig.retention.maxSavedRuns).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// resetConfig
// ---------------------------------------------------------------------------

describe('resetConfig', () => {
  it('restores all defaults after an updateConfig call', async () => {
    await updateConfig({
      featureFlags: { cloudSync: true },
      ui: { compactMode: true },
    });
    await resetConfig();
    const config = getConfig();
    expect(config.featureFlags.cloudSync).toBe(false);
    expect(config.ui.compactMode).toBe(false);
  });

  it('getConfig() returns defaults immediately after resetConfig', async () => {
    await resetConfig();
    expect(getConfig().ui.defaultTheme).toBe('dark');
  });
});
