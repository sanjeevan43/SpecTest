import { X } from 'lucide-react';
import { useAppStore } from '@/hooks/useAppStore';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const config = useAppStore((s) => s.config);
  const setConfig = useAppStore((s) => s.setConfig);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-white dark:bg-gray-950">
      <div className="flex items-center justify-between border-b border-gray-200 p-3 dark:border-gray-800">
        <h3 className="text-sm font-semibold">Settings</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <X size={16} />
        </button>
      </div>

      <div className="satt-scroll flex-1 space-y-4 overflow-y-auto p-4 text-xs">
        <NumberField label="Concurrency" value={config.concurrency} min={1} max={20} onChange={(v) => setConfig({ concurrency: v })} />
        <NumberField label="Retry Count" value={config.retryCount} min={0} max={10} onChange={(v) => setConfig({ retryCount: v })} />
        <NumberField label="Request Timeout (ms)" value={config.requestTimeoutMs} min={1000} max={120000} step={1000} onChange={(v) => setConfig({ requestTimeoutMs: v })} />
        <NumberField label="Delay Between Requests (ms)" value={config.delayBetweenRequestsMs} min={0} max={5000} step={50} onChange={(v) => setConfig({ delayBetweenRequestsMs: v })} />

        <div>
          <label className="mb-1 block font-medium text-gray-500 dark:text-gray-400">Base URL Override</label>
          <input
            type="text"
            value={config.baseUrlOverride ?? ''}
            onChange={(e) => setConfig({ baseUrlOverride: e.target.value || null })}
            placeholder="https://staging.api.example.com"
            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <ToggleField label="Ignore SSL (development)" checked={config.ignoreSsl} onChange={(v) => setConfig({ ignoreSsl: v })} />
        <ToggleField label="Auto Run on Page Load" checked={config.autoRunOnPageLoad} onChange={(v) => setConfig({ autoRunOnPageLoad: v })} />
        <ToggleField label="Run Negative ID Tests" checked={config.runNegativeTests} onChange={(v) => setConfig({ runNegativeTests: v })} />
        <ToggleField label="Run Query Param Tests" checked={config.runQueryParamTests} onChange={(v) => setConfig({ runQueryParamTests: v })} />
        <ToggleField label="Run Header Tests" checked={config.runHeaderTests} onChange={(v) => setConfig({ runHeaderTests: v })} />
        <ToggleField label="Validate Response Schema" checked={config.validateSchema} onChange={(v) => setConfig({ validateSchema: v })} />

        <div>
          <label className="mb-1 block font-medium text-gray-500 dark:text-gray-400">Theme</label>
          <select
            value={config.theme}
            onChange={(e) => setConfig({ theme: e.target.value as 'light' | 'dark' | 'system' })}
            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 flex justify-between font-medium text-gray-500 dark:text-gray-400">
        <span>{label}</span>
        <span className="text-gray-700 dark:text-gray-200">{value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-600"
      />
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between">
      <span className="font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-brand-600" />
    </label>
  );
}
