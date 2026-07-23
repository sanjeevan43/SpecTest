import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { RunSummary, TestResult } from '@/models/types';
import { formatMs, formatBytes } from '@/utils/formatters';

export function generatePdfReport(title: string, summary: RunSummary, results: TestResult[]): Blob {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });

  doc.setFontSize(18);
  doc.text(title, 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Run ${summary.runId} — ${new Date(summary.startedAt).toLocaleString()}`, 40, 58);

  doc.setTextColor(20);
  doc.setFontSize(11);
  const summaryLines = [
    `Total: ${summary.total}`,
    `Passed: ${summary.passed}`,
    `Failed: ${summary.failed}`,
    `Skipped: ${summary.skipped}`,
    `Unauthorized: ${summary.unauthorized}`,
    `Validation Errors: ${summary.validationErrors}`,
    `Average Time: ${formatMs(summary.averageTimeMs)}`,
  ];
  doc.text(summaryLines.join('    |    '), 40, 80);

  autoTable(doc, {
    startY: 100,
    head: [['Method', 'Path', 'Kind', 'Status', 'HTTP', 'Time', 'Size', 'Retries', 'Error']],
    body: results.map((r) => [
      r.method.toUpperCase(),
      r.path,
      r.kind,
      r.status,
      String(r.responseStatus ?? '—'),
      formatMs(r.timing?.total),
      formatBytes(r.responseSize),
      String(r.retryCount),
      r.error ?? '',
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [53, 99, 255] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const status = String(data.cell.raw);
        if (status === 'passed') data.cell.styles.textColor = [16, 122, 61];
        if (status === 'failed') data.cell.styles.textColor = [185, 28, 28];
        if (status === 'unauthorized') data.cell.styles.textColor = [180, 83, 9];
        if (status === 'validation_error') data.cell.styles.textColor = [107, 33, 168];
      }
    },
  });

  return doc.output('blob');
}
