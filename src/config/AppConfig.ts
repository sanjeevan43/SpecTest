/**
 * @file AppConfig.ts
 * @description Typed application configuration: feature flags, defaults, and user overrides.
 *
 * Design:
 * - All values have compile-time types (no `any`)
 * - Defaults are immutable frozen objects
 * - Feature flags control future capabilities without requiring code rewrites
 * - Chrome storage persists user overrides across sessions
 * - Exports a reactive `getConfig()` that merges defaults with persisted overrides
 */

// ---------------------------------------------------------------------------
// Feature Flags — controls experimental / future capabilities
// ---------------------------------------------------------------------------

export interface FeatureFlags {
  /** Enable cloud sync UI (Step 13+) */
  readonly cloudSync: boolean;
  /** Enable team workspace features (Step 13+) */
  readonly teamWorkspaces: boolean;
  /** Enable scheduled test runs (Step 14+) */
  readonly scheduledRuns: boolean;
  /** Enable AI-powered bug analysis (Step 15+) */
  readonly aiAnalysis: boolean;
  /** Enable Slack/Jira/GitHub integrations (Step 13+) */
  readonly integrations: boolean;
  /** Enable plugin system UI */
  readonly pluginSystem: boolean;
  /** Enable GraphQL endpoint testing */
  readonly graphqlSupport: boolean;
  /** Enable gRPC endpoint testing */
  readonly grpcSupport: boolean;
  /** Enable SOAP endpoint testing */
  readonly soapSupport: boolean;
  /** Experimental: virtualized endpoint list (Step 10+) */
  readonly virtualizedList: boolean;
  /** Experimental: service worker request proxying */
  readonly swProxy: boolean;
}

// ---------------------------------------------------------------------------
// Execution Config
// ---------------------------------------------------------------------------

export interface ExecutionConfig {
  readonly defaultTimeoutMs: number;
  readonly maxRetries: number;
  readonly retryBackoffMs: number;
  readonly maxConcurrentRequests: number;
  readonly requestQueueSize: number;
  readonly enableRequestBatching: boolean;
}

// ---------------------------------------------------------------------------
// History / Retention Config
// ---------------------------------------------------------------------------

export interface RetentionConfig {
  readonly maxSavedRuns: number;
  readonly maxRunAgeDays: number;
  readonly autoCleanup: boolean;
  readonly compressOldRuns: boolean;
}

// ---------------------------------------------------------------------------
// UI / UX Config
// ---------------------------------------------------------------------------

export interface UiConfig {
  readonly defaultPanelWidth: number;
  readonly animationsEnabled: boolean;
  readonly defaultTheme: 'dark' | 'light' | 'system';
  readonly compactMode: boolean;
  readonly showValidationScores: boolean;
  readonly showResponseDiff: boolean;
  readonly autoExpandOnFailure: boolean;
  readonly notificationsEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Security Config
// ---------------------------------------------------------------------------

export interface SecurityConfig {
  readonly maskTokensInLogs: boolean;
  readonly maskTokensInReports: boolean;
  readonly sanitizeRequestBodies: boolean;
  readonly maxTokenAgeMs: number;
  readonly allowInsecureHttp: boolean;
}

// ---------------------------------------------------------------------------
// Root App Config
// ---------------------------------------------------------------------------

export interface AppConfig {
  readonly version: string;
  readonly featureFlags: FeatureFlags;
  readonly execution: ExecutionConfig;
  readonly retention: RetentionConfig;
  readonly ui: UiConfig;
  readonly security: SecurityConfig;
}

// ---------------------------------------------------------------------------
// Immutable Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG: AppConfig = Object.freeze({
  version: '1.0.0',

  featureFlags: Object.freeze<FeatureFlags>({
    cloudSync: false,
    teamWorkspaces: false,
    scheduledRuns: false,
    aiAnalysis: false,
    integrations: false,
    pluginSystem: false,
    graphqlSupport: false,
    grpcSupport: false,
    soapSupport: false,
    virtualizedList: true,
    swProxy: false,
  }),

  execution: Object.freeze<ExecutionConfig>({
    defaultTimeoutMs: 15_000,
    maxRetries: 3,
    retryBackoffMs: 1_000,
    maxConcurrentRequests: 5,
    requestQueueSize: 50,
    enableRequestBatching: false,
  }),

  retention: Object.freeze<RetentionConfig>({
    maxSavedRuns: 100,
    maxRunAgeDays: 30,
    autoCleanup: true,
    compressOldRuns: false,
  }),

  ui: Object.freeze<UiConfig>({
    defaultPanelWidth: 490,
    animationsEnabled: true,
    defaultTheme: 'dark',
    compactMode: false,
    showValidationScores: true,
    showResponseDiff: true,
    autoExpandOnFailure: true,
    notificationsEnabled: true,
  }),

  security: Object.freeze<SecurityConfig>({
    maskTokensInLogs: true,
    maskTokensInReports: true,
    sanitizeRequestBodies: false,
    maxTokenAgeMs: 3_600_000, // 1 hour
    allowInsecureHttp: true,
  }),
});

// ---------------------------------------------------------------------------
// Config Manager — merges defaults with Chrome-stored user overrides
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'sat_app_config';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Deep-merges `override` into `base`, preserving unknown keys of `base`. */
function deepMerge<T extends object>(base: T, override: DeepPartial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(override) as Array<keyof T>) {
    const baseVal = base[key];
    const overrideVal = override[key] as T[keyof T];
    if (
      overrideVal !== null &&
      typeof overrideVal === 'object' &&
      !Array.isArray(overrideVal) &&
      typeof baseVal === 'object' &&
      baseVal !== null
    ) {
      result[key] = deepMerge(baseVal as object, overrideVal as DeepPartial<object>) as T[keyof T];
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal;
    }
  }
  return result;
}

let _runtimeConfig: AppConfig = DEFAULT_CONFIG;

/**
 * Loads user overrides from Chrome storage and merges with defaults.
 * Must be called once at extension initialization.
 */
export async function loadConfig(): Promise<AppConfig> {
  try {
    const res = await chrome.storage.local.get(STORAGE_KEY);
    const overrides = res[STORAGE_KEY] as DeepPartial<AppConfig> | undefined;
    if (overrides) {
      _runtimeConfig = deepMerge(DEFAULT_CONFIG, overrides);
    }
  } catch {
    // Chrome storage unavailable (e.g., unit test env) — fall back to defaults
  }
  return _runtimeConfig;
}

/**
 * Returns the current runtime config (defaults + any loaded overrides).
 * Synchronous — call `loadConfig()` at startup first.
 */
export function getConfig(): AppConfig {
  return _runtimeConfig;
}

/**
 * Persists a partial config override to Chrome storage and updates runtime config.
 */
export async function updateConfig(override: DeepPartial<AppConfig>): Promise<void> {
  _runtimeConfig = deepMerge(_runtimeConfig, override);
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: _runtimeConfig });
  } catch {
    // Ignore storage failures gracefully
  }
}

/**
 * Resets config to defaults and clears persisted overrides.
 */
export async function resetConfig(): Promise<void> {
  _runtimeConfig = DEFAULT_CONFIG;
  try {
    await chrome.storage.local.remove(STORAGE_KEY);
  } catch {}
}
