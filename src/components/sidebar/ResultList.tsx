import { useMemo } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { ResultCard } from './ResultCard';
import { MethodBadge } from '@/components/shared/Primitives';

export function ResultList() {
  const results = useAppStore((s) => s.results);
  const filter = useAppStore((s) => s.filter);
  const document = useAppStore((s) => s.document);
  const selectedEndpointIds = useAppStore((s) => s.selectedEndpointIds);
  const toggleEndpointSelection = useAppStore((s) => s.toggleEndpointSelection);

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (filter.search && !r.path.toLowerCase().includes(filter.search.toLowerCase())) return false;
      if (filter.method && r.method !== filter.method) return false;
      if (filter.tag && !r.tags.includes(filter.tag)) return false;
      if (filter.status && r.status !== filter.status) return false;
      return true;
    });
  }, [results, filter]);

  if (results.length === 0) {
    return (
      <div className="satt-scroll flex-1 overflow-y-auto p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Endpoints ({document?.endpoints.length ?? 0}) — select some to "Run Selected"
        </div>
        <div className="space-y-1.5">
          {document?.endpoints.map((endpoint) => (
            <label
              key={endpoint.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs hover:border-brand-300 dark:border-gray-800 dark:bg-gray-950"
            >
              <input
                type="checkbox"
                checked={selectedEndpointIds.has(endpoint.id)}
                onChange={() => toggleEndpointSelection(endpoint.id)}
                className="accent-brand-600"
              />
              <MethodBadge method={endpoint.method} />
              <span className="truncate font-mono text-gray-600 dark:text-gray-300">{endpoint.path}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="satt-scroll flex-1 space-y-2 overflow-y-auto p-3">
      {filtered.map((result) => (
        <ResultCard key={result.id} result={result} />
      ))}
      {filtered.length === 0 && <div className="p-6 text-center text-xs text-gray-400">No results match the current filters.</div>}
    </div>
  );
}
