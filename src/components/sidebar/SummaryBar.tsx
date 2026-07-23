import { useAppStore } from '@/hooks/useAppStore';
import { formatMs } from '@/utils/formatters';

const CARDS: Array<{ key: 'total' | 'passed' | 'failed' | 'unauthorized' | 'validationErrors'; label: string; color: string }> = [
  { key: 'total', label: 'Total', color: 'text-gray-700 dark:text-gray-200' },
  { key: 'passed', label: 'Passed', color: 'text-emerald-500' },
  { key: 'failed', label: 'Failed', color: 'text-red-500' },
  { key: 'unauthorized', label: 'Unauthorized', color: 'text-orange-500' },
  { key: 'validationErrors', label: 'Validation', color: 'text-purple-500' },
];

export function SummaryBar() {
  const summary = useAppStore((s) => s.summary);
  const results = useAppStore((s) => s.results);

  const total = summary?.total ?? results.length;
  const passed = summary?.passed ?? results.filter((r) => r.status === 'passed').length;
  const failed = summary?.failed ?? results.filter((r) => r.status === 'failed').length;
  const unauthorized = summary?.unauthorized ?? results.filter((r) => r.status === 'unauthorized').length;
  const validationErrors = summary?.validationErrors ?? results.filter((r) => r.status === 'validation_error').length;
  const avg = summary?.averageTimeMs ?? (results.length ? results.reduce((s, r) => s + (r.timing?.total ?? 0), 0) / results.length : 0);

  const values = { total, passed, failed, unauthorized, validationErrors };

  return (
    <div className="grid grid-cols-3 gap-2 border-b border-gray-200 p-3 dark:border-gray-800 sm:grid-cols-6">
      {CARDS.map((card) => (
        <div key={card.key} className="rounded-lg bg-gray-50 px-2 py-1.5 text-center dark:bg-gray-900">
          <div className={`text-lg font-bold ${card.color}`}>{values[card.key]}</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400">{card.label}</div>
        </div>
      ))}
      <div className="rounded-lg bg-gray-50 px-2 py-1.5 text-center dark:bg-gray-900">
        <div className="text-lg font-bold text-brand-500">{formatMs(avg)}</div>
        <div className="text-[10px] uppercase tracking-wide text-gray-400">Avg Time</div>
      </div>
    </div>
  );
}
