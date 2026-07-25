/**
 * @file VersionManager.ts
 * @description Handles extension version tracking and Chrome storage schema migrations.
 *
 * Design:
 * - Each released version declares a migration function if its storage schema changed
 * - Migrations run sequentially on extension install/update
 * - Current schema version is stored separately from app data
 * - Migration failures are logged but never block startup
 */

import { createLogger } from '../utils/Logger';

const log = createLogger('service');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VersionInfo {
  /** The current extension version from manifest (e.g. "1.0.0") */
  current: string;
  /** The previously installed version, if any */
  previous: string | null;
  /** Whether this is a fresh install (no previous version) */
  isFirstInstall: boolean;
  /** Whether the version changed since last run */
  isUpdate: boolean;
}

type MigrationFn = (storage: chrome.storage.LocalStorageArea) => Promise<void>;

interface MigrationEntry {
  version: string;
  description: string;
  migrate: MigrationFn;
}

// ---------------------------------------------------------------------------
// Storage key for persisting the version info
// ---------------------------------------------------------------------------

const VERSION_KEY = 'sat_schema_version';
const PREVIOUS_VERSION_KEY = 'sat_previous_version';

// ---------------------------------------------------------------------------
// Migration Registry
// Migrations are applied in order for any version between the stored version
// and the current version. Add a new entry here for every breaking storage change.
// ---------------------------------------------------------------------------

const MIGRATIONS: MigrationEntry[] = [
  // v1.0.0 — initial install (no migration needed, but registered for completeness)
  {
    version: '1.0.0',
    description: 'Initial schema. Establishes savedReports, environmentProfiles, activeAuthCredentials.',
    migrate: async () => {
      // No-op: first-time installs start with empty storage
    },
  },
  // Future migrations go here, example:
  // {
  //   version: '1.1.0',
  //   description: 'Adds testRuns[] to storage and migrates savedReports.',
  //   migrate: async (storage) => {
  //     const res = await storage.get('savedReports');
  //     const runs = (res.savedReports || []).map(convertReportToTestRun);
  //     await storage.set({ testRuns: runs });
  //   },
  // },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseVersion(v: string): [number, number, number] {
  const parts = v.split('.').map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

function isVersionGreaterThan(a: string, b: string): boolean {
  const [a0, a1, a2] = parseVersion(a);
  const [b0, b1, b2] = parseVersion(b);
  if (a0 !== b0) return a0 > b0;
  if (a1 !== b1) return a1 > b1;
  return a2 > b2;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the version info for the current session.
 * Call once at extension startup (background SW `chrome.runtime.onInstalled`).
 */
export async function getVersionInfo(): Promise<VersionInfo> {
  const manifest = chrome.runtime.getManifest();
  const current = manifest.version;

  try {
    const res = await chrome.storage.local.get(PREVIOUS_VERSION_KEY);
    const previous = (res[PREVIOUS_VERSION_KEY] as string) ?? null;
    return {
      current,
      previous,
      isFirstInstall: previous === null,
      isUpdate: previous !== null && previous !== current,
    };
  } catch {
    return { current, previous: null, isFirstInstall: true, isUpdate: false };
  }
}

/**
 * Runs any pending storage migrations, then persists the current version.
 * Should be called inside `chrome.runtime.onInstalled` in the background SW.
 */
export async function runMigrations(): Promise<void> {
  const info = await getVersionInfo();

  if (!info.isUpdate && !info.isFirstInstall) {
    log.debug('VersionManager: no migration needed', { version: info.current });
    return;
  }

  log.info('VersionManager: running migrations', {
    from: info.previous ?? '(none)',
    to: info.current,
  });

  const storageToRun = info.previous ?? '0.0.0';

  for (const entry of MIGRATIONS) {
    if (isVersionGreaterThan(entry.version, storageToRun)) {
      try {
        log.info(`VersionManager: applying migration ${entry.version} — ${entry.description}`);
        await entry.migrate(chrome.storage.local);
      } catch (err) {
        log.error(`VersionManager: migration ${entry.version} failed`, err);
        // Continue — partial migrations are better than blocking startup
      }
    }
  }

  // Persist current version as the new baseline
  try {
    await chrome.storage.local.set({
      [VERSION_KEY]: info.current,
      [PREVIOUS_VERSION_KEY]: info.current,
    });
  } catch (err) {
    log.error('VersionManager: failed to persist version', err);
  }

  log.info('VersionManager: migrations complete', { version: info.current });
}

/**
 * Returns the stored schema version (may differ from manifest version between migrations).
 */
export async function getStoredSchemaVersion(): Promise<string | null> {
  try {
    const res = await chrome.storage.local.get(VERSION_KEY);
    return (res[VERSION_KEY] as string) ?? null;
  } catch {
    return null;
  }
}
