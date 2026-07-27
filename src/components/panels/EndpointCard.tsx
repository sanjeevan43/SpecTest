import React, { useState } from 'react';
import type { ApiEndpoint } from '../../types';
import type { ApiExecutionResult } from '../../types/ApiExecutionResult';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface EndpointCardProps {
  endpoint: ApiEndpoint;
  result: ApiExecutionResult;
  onRun: () => void;
  onCopyCurl: () => void;
  validationScore?: number;
}

const METHOD_VARIANTS: Record<string, 'get' | 'post' | 'put' | 'patch' | 'delete' | 'default'> = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'delete',
};

const getStatusVariant = (status: string): 'success' | 'danger' | 'info' | 'default' => {
  switch (status) {
    case 'passed':
      return 'success';
    case 'failed':
      return 'danger';
    case 'running':
      return 'info';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string, code?: number): string => {
  switch (status) {
    case 'passed':
      return `Pass${code ? ` ${code}` : ''}`;
    case 'failed':
      return `Fail${code ? ` ${code}` : ''}`;
    case 'running':
      return 'Running';
    default:
      return 'Pending';
  }
};

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 70) return 'text-amber-400';
  return 'text-rose-400';
};

export const EndpointCard: React.FC<EndpointCardProps> = ({
  endpoint,
  result,
  onRun,
  onCopyCurl,
  validationScore,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusVariant = getStatusVariant(result.status);
  const isRunning = result.status === 'running';
  const hasResponse = !!result.response;
  const hasError = !!result.error;

  // Left border color based on status
  const borderAccent =
    result.status === 'passed'
      ? 'border-l-emerald-500/60'
      : result.status === 'failed'
      ? 'border-l-rose-500/60'
      : result.status === 'running'
      ? 'border-l-blue-500/60'
      : 'border-l-slate-700/60';

  return (
    <div
      className={`bg-slate-950/50 border border-slate-800/70 hover:border-slate-700/60 border-l-2 ${borderAccent} rounded-lg overflow-hidden transition-all duration-200 group`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Expand toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
        >
          <Badge variant={METHOD_VARIANTS[endpoint.method] ?? 'default'} size="xs">
            {endpoint.method}
          </Badge>
          <span className="text-xs font-mono text-slate-200 truncate flex-1">{endpoint.path}</span>
          {endpoint.deprecated && (
            <span className="text-[9px] text-slate-600 font-bold px-1 py-0.5 bg-slate-800 rounded border border-slate-700 flex-shrink-0">
              DEPRECATED
            </span>
          )}
          {validationScore !== undefined && (
            <span className={`text-[10px] font-bold flex-shrink-0 ${getScoreColor(validationScore)}`}>
              {validationScore}%
            </span>
          )}
          <Badge
            variant={statusVariant}
            size="xs"
            pulse={isRunning}
          >
            {getStatusLabel(result.status, result.response?.statusCode)}
          </Badge>
          <svg
            className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-1 ml-1 flex-shrink-0">
          {hasResponse && (
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                onCopyCurl();
              }}
              title="Copy cURL"
            >
              cURL
            </Button>
          )}
          <Button
            variant="outline"
            size="xs"
            loading={isRunning}
            onClick={(e) => {
              e.stopPropagation();
              onRun();
            }}
            icon={
              !isRunning ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                </svg>
              ) : undefined
            }
          >
            {isRunning ? '' : 'Run'}
          </Button>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-slate-800/60 bg-slate-950/60 p-3 space-y-3 text-xs">
          {/* Summary and tags */}
          {(endpoint.summary || endpoint.tags.length > 0) && (
            <div className="space-y-1.5">
              {endpoint.summary && (
                <p className="text-slate-400 leading-relaxed">{endpoint.summary}</p>
              )}
              {endpoint.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {endpoint.tags.map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 text-[9px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Parameters preview */}
          {endpoint.parameters.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Parameters ({endpoint.parameters.length})</div>
              <div className="space-y-1">
                {endpoint.parameters.slice(0, 4).map((param) => (
                  <div key={param.name} className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-violet-400 min-w-16">{param.name}</span>
                    <span className="text-slate-600 text-[9px] uppercase px-1 bg-slate-800 rounded">{param.in}</span>
                    <span className="text-slate-600">{param.schema?.type || 'any'}</span>
                    {param.required && (
                      <span className="text-rose-500 text-[9px] font-bold">required</span>
                    )}
                  </div>
                ))}
                {endpoint.parameters.length > 4 && (
                  <div className="text-slate-600 text-[10px]">+{endpoint.parameters.length - 4} more parameters</div>
                )}
              </div>
            </div>
          )}

          {/* Response */}
          {hasResponse && result.response && (
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Response</div>
              <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-800/60 bg-slate-900/40">
                  <span
                    className={`text-[11px] font-black tabular-nums ${
                      result.response.statusCode >= 200 && result.response.statusCode < 300
                        ? 'text-emerald-400'
                        : result.response.statusCode >= 400
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {result.response.statusCode}
                  </span>
                  <span className="text-slate-500 text-[10px]">{result.response.durationMs}ms</span>
                  <span className="text-slate-600 text-[10px] font-mono">{result.response.headers['content-type'] || ''}</span>
                </div>
                <div className="p-2 max-h-32 overflow-y-auto">
                  <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap break-all leading-relaxed">
                    {typeof result.response.body === 'object'
                      ? JSON.stringify(result.response.body, null, 2)
                      : String(result.response.body || '')}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {hasError && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <div className="text-[10px] font-bold text-rose-400 mb-1">Error</div>
              <div className="font-mono text-[10px] text-rose-300 break-all leading-relaxed">{result.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
