import type { TestStatus } from '@/models/types';

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || Number.isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatMs(ms: number | undefined): string {
  if (ms === undefined || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatTimestamp(ts: number | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

export const STATUS_COLORS: Record<TestStatus, string> = {
  idle: 'text-gray-400',
  queued: 'text-blue-400',
  running: 'text-amber-500',
  passed: 'text-emerald-500',
  failed: 'text-red-500',
  skipped: 'text-gray-400',
  unauthorized: 'text-orange-500',
  validation_error: 'text-purple-500',
};

export const STATUS_BADGE_BG: Record<TestStatus, string> = {
  idle: 'bg-gray-100 dark:bg-gray-800',
  queued: 'bg-blue-100 dark:bg-blue-900/40',
  running: 'bg-amber-100 dark:bg-amber-900/40',
  passed: 'bg-emerald-100 dark:bg-emerald-900/40',
  failed: 'bg-red-100 dark:bg-red-900/40',
  skipped: 'bg-gray-100 dark:bg-gray-800',
  unauthorized: 'bg-orange-100 dark:bg-orange-900/40',
  validation_error: 'bg-purple-100 dark:bg-purple-900/40',
};

export const METHOD_COLORS: Record<string, string> = {
  get: 'bg-blue-500',
  post: 'bg-emerald-500',
  put: 'bg-amber-500',
  patch: 'bg-purple-500',
  delete: 'bg-red-500',
  head: 'bg-gray-500',
  options: 'bg-gray-400',
};

export function httpStatusMeaning(status: number | undefined): string {
  if (!status) return 'No response';
  if (status >= 200 && status < 300) return 'Success';
  if (status === 400) return 'Bad Request';
  if (status === 401) return 'Unauthorized';
  if (status === 403) return 'Forbidden';
  if (status === 404) return 'Not Found';
  if (status === 422) return 'Unprocessable Entity';
  if (status >= 500) return 'Server Error';
  return 'Unknown';
}
