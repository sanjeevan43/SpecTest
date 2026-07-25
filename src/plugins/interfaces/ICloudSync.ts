/**
 * @file ICloudSync.ts
 * @description Future cloud synchronization interface.
 *
 * This is an EXTENSION POINT ONLY — not implemented in Step 12.
 * Implement this interface in a future step to enable:
 *   - Cloud backup of test history
 *   - Team-shared run results
 *   - Remote configuration sync
 *   - CI/CD pipeline integration
 *
 * DO NOT implement business logic here.
 * DO NOT add UI for cloud features.
 * This file exists solely to define the contract for future implementors.
 */

import type { Report } from '../../models/Report';

// ---------------------------------------------------------------------------
// Cloud Auth
// ---------------------------------------------------------------------------

export interface CloudCredentials {
  /** OAuth2 access token or API key */
  accessToken: string;
  /** Optional refresh token */
  refreshToken?: string;
  /** Token expiry in ms since epoch */
  expiresAt?: number;
  /** Organization / workspace identifier */
  organizationId?: string;
}

// ---------------------------------------------------------------------------
// Cloud Sync Payloads
// ---------------------------------------------------------------------------

export interface SyncPayload {
  reports: Report[];
  deviceId: string;
  extensionVersion: string;
  syncedAt: string; // ISO timestamp
}

export interface SyncResult {
  success: boolean;
  uploadedCount: number;
  downloadedCount: number;
  conflictsResolved: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Team Workspace (Step 13+)
// ---------------------------------------------------------------------------

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface TeamWorkspace {
  id: string;
  name: string;
  members: TeamMember[];
  sharedEnvironments: string[]; // environment IDs
  sharedReportIds: string[];
}

// ---------------------------------------------------------------------------
// Scheduled Runs (Step 14+)
// ---------------------------------------------------------------------------

export interface ScheduledRun {
  id: string;
  name: string;
  cronExpression: string; // e.g. "0 9 * * MON-FRI"
  environmentId: string;
  notificationChannels: string[]; // INotificationChannel IDs
  lastRun?: string; // ISO
  nextRun?: string; // ISO
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Cloud Backend Interface (NOT IMPLEMENTED — future extension point)
// ---------------------------------------------------------------------------

/**
 * Implement this interface to connect the extension to a cloud backend.
 *
 * @future Step 13
 */
export interface ICloudBackend {
  readonly id: string;
  readonly name: string;

  /** Authenticates the user and stores credentials for subsequent calls. */
  authenticate(credentials: CloudCredentials): Promise<void>;

  /** Uploads test runs to the cloud. */
  push(payload: SyncPayload): Promise<SyncResult>;

  /** Downloads new/updated reports from the cloud. */
  pull(since?: string): Promise<SyncResult>;

  /** Fetches available team workspaces for the authenticated user. */
  listWorkspaces(): Promise<TeamWorkspace[]>;

  /** Fetches scheduled run definitions for the authenticated user. */
  listScheduledRuns(): Promise<ScheduledRun[]>;

  /** Returns true if the user has a valid authenticated session. */
  isAuthenticated(): boolean;

  /** Signs the user out and clears stored credentials. */
  signOut(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Notification Channels (Step 13+)
// ---------------------------------------------------------------------------

export interface NotificationPayload {
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, string>;
}

/**
 * Implement this interface to send test result notifications.
 * Targets: Slack, MS Teams, GitHub, Jira, Azure DevOps, Jenkins, etc.
 *
 * @future Step 13
 */
export interface INotificationChannel {
  readonly id: string;
  readonly name: string;

  send(payload: NotificationPayload): Promise<void>;
  isConfigured(): boolean;
}
