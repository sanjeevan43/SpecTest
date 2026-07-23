import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Download, AlertTriangle } from 'lucide-react';
import type { TestResult } from '@/models/types';
import { MethodBadge, Badge, IconButton } from '@/components/shared/Primitives';
import { formatBytes, formatMs, STATUS_BADGE_BG, STATUS_COLORS, httpStatusMeaning } from '@/utils/formatters';
import { downloadFile } from '@/services/reportGenerators';

export function ResultCard({ result }: { result: TestResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        <MethodBadge method={result.method} />
        <span className="flex-1 truncate font-mono text-xs text-gray-700 dark:text-gray-300">{result.path}</span>
        {result.kind !== 'happy_path' && (
          <span className="hidden text-[10px] text-gray-400 sm:inline">{result.kind.replace(/_/g, ' ')}</span>
        )}
        {result.schemaIssues && result.schemaIssues.length > 0 && (
          <AlertTriangle size={13} className="text-purple-500" />
        )}
        <span className="font-mono text-[11px] text-gray-400">{result.responseStatus ?? '—'}</span>
        <span className="w-14 text-right text-[11px] text-gray-400">{formatMs(result.timing?.total)}</span>
        <Badge className={`${STATUS_BADGE_BG[result.status]} ${STATUS_COLORS[result.status]}`}>{result.status.replace('_', ' ')}</Badge>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-gray-100 p-3 text-xs dark:border-gray-800">
          <Row label="URL" value={result.resolvedUrl} mono />
          <Row label="HTTP Status" value={`${result.responseStatus ?? '—'} · ${httpStatusMeaning(result.responseStatus)}`} />
          <Row label="Response Size" value={formatBytes(result.responseSize)} />
          <Row label="Retries" value={String(result.retryCount)} />
          {result.timing && (
            <Row
              label="Timing"
              value={`DNS ${formatMs(result.timing.dns)} · Connect ${formatMs(result.timing.connect)} · Wait ${formatMs(result.timing.waiting)} · Download ${formatMs(result.timing.download)}`}
            />
          )}
          {result.error && <Row label="Error" value={result.error} highlight="text-red-500" />}

          {result.schemaIssues && result.schemaIssues.length > 0 && (
            <div>
              <div className="mb-1 font-semibold text-purple-500">Schema Issues</div>
              <ul className="space-y-0.5">
                {result.schemaIssues.map((issue, i) => (
                  <li key={i} className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
                    <span className="text-purple-500">{issue.kind.replace('_', ' ')}</span> at <code>{issue.path}</code>
                    {issue.expected ? ` — expected ${issue.expected}, got ${issue.actual}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Section title="Request Headers" content={JSON.stringify(result.requestHeaders, null, 2)} />
          {result.requestBody !== undefined && <Section title="Request Body" content={JSON.stringify(result.requestBody, null, 2)} />}
          {result.responseHeaders && <Section title="Response Headers" content={JSON.stringify(result.responseHeaders, null, 2)} />}
          {result.responseBody !== undefined && <Section title="Response Body" content={JSON.stringify(result.responseBody, null, 2)} />}
          <Section title="cURL" content={result.curl} copyable downloadable filename={`${result.method}-${sanitize(result.path)}.sh`} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-gray-400">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} ${highlight ?? 'text-gray-700 dark:text-gray-300'} break-all`}>{value}</span>
    </div>
  );
}

function Section({
  title,
  content,
  copyable = true,
  downloadable,
  filename,
}: {
  title: string;
  content: string;
  copyable?: boolean;
  downloadable?: boolean;
  filename?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold text-gray-500 dark:text-gray-400">{title}</span>
        <div className="flex gap-1">
          {copyable && (
            <IconButton title="Copy" onClick={() => navigator.clipboard.writeText(content)}>
              <Copy size={12} />
            </IconButton>
          )}
          {downloadable && (
            <IconButton title="Download" onClick={() => downloadFile(content, filename ?? 'download.txt', 'text/plain')}>
              <Download size={12} />
            </IconButton>
          )}
        </div>
      </div>
      <pre className="satt-scroll max-h-40 overflow-auto rounded-md bg-gray-50 p-2 font-mono text-[11px] text-gray-700 dark:bg-gray-900 dark:text-gray-300">
        {content}
      </pre>
    </div>
  );
}

function sanitize(path: string): string {
  return path.replace(/[{}/]/g, '_');
}
