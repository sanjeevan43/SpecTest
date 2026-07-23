import * as XLSX from 'xlsx';
import type { RunSummary, TestResult } from '@/models/types';

export function generateExcelReport(summary: RunSummary, results: TestResult[]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Metric', 'Value'],
    ['Run ID', summary.runId],
    ['Started At', new Date(summary.startedAt).toLocaleString()],
    ['Finished At', summary.finishedAt ? new Date(summary.finishedAt).toLocaleString() : ''],
    ['Total APIs', summary.total],
    ['Passed', summary.passed],
    ['Failed', summary.failed],
    ['Skipped', summary.skipped],
    ['Unauthorized', summary.unauthorized],
    ['Validation Errors', summary.validationErrors],
    ['Average Time (ms)', Math.round(summary.averageTimeMs)],
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  const resultRows = results.map((r) => ({
    Method: r.method.toUpperCase(),
    Path: r.path,
    'Test Kind': r.kind,
    Status: r.status,
    'HTTP Status': r.responseStatus ?? '',
    'Response Size (bytes)': r.responseSize ?? '',
    'Total Time (ms)': r.timing?.total ? Math.round(r.timing.total) : '',
    'DNS (ms)': r.timing?.dns ? Math.round(r.timing.dns) : '',
    'Connect (ms)': r.timing?.connect ? Math.round(r.timing.connect) : '',
    'Waiting (ms)': r.timing?.waiting ? Math.round(r.timing.waiting) : '',
    'Download (ms)': r.timing?.download ? Math.round(r.timing.download) : '',
    'Retry Count': r.retryCount,
    'Schema Issues': r.schemaIssues?.length ?? 0,
    Error: r.error ?? '',
    URL: r.resolvedUrl,
  }));
  const resultsSheet = XLSX.utils.json_to_sheet(resultRows);
  XLSX.utils.book_append_sheet(workbook, resultsSheet, 'Results');

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
