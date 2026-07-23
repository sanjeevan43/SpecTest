import { useState } from 'react';
import { Play, Square, RotateCcw, Trash2, Tag, ListChecks } from 'lucide-react';
import { useAppStore } from '@/hooks/useAppStore';
import { Button, Spinner } from '@/components/shared/Primitives';

export function Toolbar() {
  const isRunning = useAppStore((s) => s.isRunning);
  const runAll = useAppStore((s) => s.runAll);
  const runSelected = useAppStore((s) => s.runSelected);
  const runTag = useAppStore((s) => s.runTag);
  const runFailed = useAppStore((s) => s.runFailed);
  const retryFailed = useAppStore((s) => s.retryFailed);
  const stop = useAppStore((s) => s.stop);
  const clearResults = useAppStore((s) => s.clearResults);
  const selectedCount = useAppStore((s) => s.selectedEndpointIds.size);
  const tags = useAppStore((s) => s.document?.tags ?? []);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-3 dark:border-gray-800">
      <Button onClick={runAll} disabled={isRunning}>
        {isRunning ? <Spinner className="h-3.5 w-3.5" /> : <Play size={14} />}
        Run All
      </Button>

      <Button variant="secondary" size="sm" onClick={runSelected} disabled={isRunning || selectedCount === 0}>
        <ListChecks size={14} />
        Run Selected {selectedCount > 0 ? `(${selectedCount})` : ''}
      </Button>

      <div className="relative">
        <Button variant="secondary" size="sm" onClick={() => setTagMenuOpen((o) => !o)} disabled={isRunning || tags.length === 0}>
          <Tag size={14} />
          Run Tag
        </Button>
        {tagMenuOpen && (
          <div className="absolute z-20 mt-1 max-h-56 w-44 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-panel dark:border-gray-700 dark:bg-gray-900">
            {tags.map((tag) => (
              <button
                key={tag}
                className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  setTagMenuOpen(false);
                  runTag(tag);
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <Button variant="secondary" size="sm" onClick={runFailed} disabled={isRunning}>
        Run Failed
      </Button>
      <Button variant="secondary" size="sm" onClick={retryFailed} disabled={isRunning}>
        <RotateCcw size={14} />
        Retry Failed
      </Button>

      <div className="ml-auto flex items-center gap-2">
        {isRunning && (
          <Button variant="danger" size="sm" onClick={stop}>
            <Square size={14} />
            Stop
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={clearResults} disabled={isRunning}>
          <Trash2 size={14} />
          Clear
        </Button>
      </div>
    </div>
  );
}
