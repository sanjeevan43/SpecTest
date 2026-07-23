import { Search } from 'lucide-react';
import { useAppStore } from '@/hooks/useAppStore';

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const STATUSES = ['passed', 'failed', 'skipped', 'unauthorized', 'validation_error'];

export function Filters() {
  const filter = useAppStore((s) => s.filter);
  const setFilter = useAppStore((s) => s.setFilter);
  const tags = useAppStore((s) => s.document?.tags ?? []);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-2.5 dark:border-gray-800">
      <div className="relative flex-1 min-w-[140px]">
        <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={filter.search}
          onChange={(e) => setFilter({ search: e.target.value })}
          placeholder="Search endpoint..."
          className="w-full rounded-md border border-gray-200 bg-white py-1 pl-7 pr-2 text-xs outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>

      <select
        value={filter.method ?? ''}
        onChange={(e) => setFilter({ method: e.target.value || null })}
        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <option value="">All Methods</option>
        {METHODS.map((m) => (
          <option key={m} value={m}>
            {m.toUpperCase()}
          </option>
        ))}
      </select>

      <select
        value={filter.tag ?? ''}
        onChange={(e) => setFilter({ tag: e.target.value || null })}
        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <option value="">All Tags</option>
        {tags.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        value={filter.status ?? ''}
        onChange={(e) => setFilter({ status: e.target.value || null })}
        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <option value="">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace('_', ' ')}
          </option>
        ))}
      </select>
    </div>
  );
}
