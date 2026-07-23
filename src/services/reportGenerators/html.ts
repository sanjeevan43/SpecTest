import type { RunSummary, TestResult } from '@/models/types';
import { formatMs, formatBytes } from '@/utils/formatters';

export function generateHtmlReport(title: string, summary: RunSummary, results: TestResult[]): string {
  const rows = results
    .map(
      (r) => `
        <tr class="${statusClass(r.status)}">
          <td>${r.method.toUpperCase()}</td>
          <td><code>${escapeHtml(r.path)}</code></td>
          <td>${r.kind}</td>
          <td><span class="badge">${r.status}</span></td>
          <td>${r.responseStatus ?? '—'}</td>
          <td>${formatMs(r.timing?.total)}</td>
          <td>${formatBytes(r.responseSize)}</td>
          <td>${r.retryCount}</td>
          <td>${escapeHtml(r.error ?? '')}</td>
        </tr>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)} — Test Report</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 32px; background: #0f1115; color: #e6e8ee; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #9aa0ac; margin-bottom: 24px; }
  .cards { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 32px; }
  .card { background: #181b22; border-radius: 12px; padding: 16px 20px; min-width: 120px; box-shadow: 0 4px 14px rgba(0,0,0,0.3); }
  .card .value { font-size: 26px; font-weight: 700; }
  .card .label { color: #9aa0ac; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
  table { width: 100%; border-collapse: collapse; background: #14161c; border-radius: 12px; overflow: hidden; }
  th, td { padding: 10px 12px; text-align: left; font-size: 13px; border-bottom: 1px solid #23262f; }
  th { background: #1c1f27; color: #9aa0ac; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
  code { background: #23262f; padding: 2px 6px; border-radius: 4px; }
  .badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; text-transform: capitalize; }
  tr.passed .badge { background: #14532d; color: #86efac; }
  tr.failed .badge { background: #7f1d1d; color: #fca5a5; }
  tr.unauthorized .badge { background: #78350f; color: #fdba74; }
  tr.validation_error .badge { background: #581c87; color: #d8b4fe; }
  tr.skipped .badge { background: #374151; color: #d1d5db; }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="subtitle">Run ${summary.runId} — ${new Date(summary.startedAt).toLocaleString()}</div>
  <div class="cards">
    <div class="card"><div class="value">${summary.total}</div><div class="label">Total</div></div>
    <div class="card"><div class="value">${summary.passed}</div><div class="label">Passed</div></div>
    <div class="card"><div class="value">${summary.failed}</div><div class="label">Failed</div></div>
    <div class="card"><div class="value">${summary.unauthorized}</div><div class="label">Unauthorized</div></div>
    <div class="card"><div class="value">${summary.validationErrors}</div><div class="label">Validation Errors</div></div>
    <div class="card"><div class="value">${formatMs(summary.averageTimeMs)}</div><div class="label">Avg Time</div></div>
  </div>
  <table>
    <thead>
      <tr><th>Method</th><th>Path</th><th>Test Kind</th><th>Status</th><th>HTTP</th><th>Time</th><th>Size</th><th>Retries</th><th>Error</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

function statusClass(status: string): string {
  return status;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
