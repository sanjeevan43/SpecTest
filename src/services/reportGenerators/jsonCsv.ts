import type { RunSummary, TestResult } from '@/models/types';

export function generateJsonReport(summary: RunSummary, results: TestResult[]): string {
  return JSON.stringify({ summary, results }, null, 2);
}

const CSV_COLUMNS = [
  'method',
  'path',
  'kind',
  'status',
  'responseStatus',
  'responseSize',
  'totalTimeMs',
  'error',
  'retryCount',
] as const;

export function generateCsvReport(results: TestResult[]): string {
  const header = CSV_COLUMNS.join(',');
  const rows = results.map((r) =>
    [
      r.method.toUpperCase(),
      r.path,
      r.kind,
      r.status,
      r.responseStatus ?? '',
      r.responseSize ?? '',
      r.timing?.total?.toFixed(0) ?? '',
      r.error ?? '',
      r.retryCount,
    ]
      .map(escapeCsvCell)
      .join(','),
  );
  return [header, ...rows].join('\n');
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
