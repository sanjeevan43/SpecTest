import { useState } from 'react';
import { Download } from 'lucide-react';
import { useAppStore } from '@/hooks/useAppStore';
import { Button } from '@/components/shared/Primitives';
import {
  generateJsonReport,
  generateCsvReport,
  generateExcelReport,
  generateHtmlReport,
  generatePdfReport,
  generatePostmanCollection,
  generateBrunoCollection,
  generateHttpFile,
  downloadFile,
} from '@/services/reportGenerators';

const REPORT_OPTIONS = [
  { key: 'json', label: 'JSON Report' },
  { key: 'csv', label: 'CSV Report' },
  { key: 'excel', label: 'Excel Report' },
  { key: 'html', label: 'HTML Report' },
  { key: 'pdf', label: 'PDF Report' },
] as const;

const COLLECTION_OPTIONS = [
  { key: 'postman', label: 'Postman Collection' },
  { key: 'bruno', label: 'Bruno Collection' },
  { key: 'http', label: '.http Client File' },
] as const;

export function ExportMenu() {
  const [open, setOpen] = useState(false);
  const results = useAppStore((s) => s.results);
  const summary = useAppStore((s) => s.summary);
  const document = useAppStore((s) => s.document);

  const title = document?.title ?? 'Swagger API Auto Tester';

  function exportReport(key: (typeof REPORT_OPTIONS)[number]['key']) {
    if (!summary) return;
    if (key === 'json') downloadFile(generateJsonReport(summary, results), 'report.json', 'application/json');
    if (key === 'csv') downloadFile(generateCsvReport(results), 'report.csv', 'text/csv');
    if (key === 'excel') downloadFile(generateExcelReport(summary, results), 'report.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    if (key === 'html') downloadFile(generateHtmlReport(title, summary, results), 'report.html', 'text/html');
    if (key === 'pdf') downloadFile(generatePdfReport(title, summary, results), 'report.pdf', 'application/pdf');
    setOpen(false);
  }

  function exportCollection(key: (typeof COLLECTION_OPTIONS)[number]['key']) {
    if (!document) return;
    if (key === 'postman') {
      downloadFile(JSON.stringify(generatePostmanCollection(document), null, 2), 'postman-collection.json', 'application/json');
    }
    if (key === 'bruno') {
      const files = generateBrunoCollection(document);
      files.forEach((f, i) => setTimeout(() => downloadFile(f.content, f.filename, 'text/plain'), i * 150));
    }
    if (key === 'http') {
      downloadFile(generateHttpFile(document), 'requests.http', 'text/plain');
    }
    setOpen(false);
  }

  return (
    <div className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)} disabled={!summary && results.length === 0}>
        <Download size={14} />
        Export
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-gray-200 bg-white p-1 shadow-panel dark:border-gray-700 dark:bg-gray-900">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Reports</div>
          {REPORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => exportReport(opt.key)}
              className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {opt.label}
            </button>
          ))}
          <div className="mt-1 border-t border-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800">
            Collections
          </div>
          {COLLECTION_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => exportCollection(opt.key)}
              className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
