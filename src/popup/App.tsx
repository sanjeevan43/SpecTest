import { useEffect, useState } from 'react';
import { Play, PanelRightOpen, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { sendToBackground } from '@/services/messageBus';
import type { ParsedApiDocument, RunSummary, SwaggerPageInfo } from '@/models/types';
import { formatTimestamp, formatMs } from '@/utils/formatters';

interface PopupState {
  tabId: number | null;
  pageInfo: SwaggerPageInfo | null;
  document: ParsedApiDocument | null;
  summary: RunSummary | null;
  isRunning: boolean;
}

export function App() {
  const [state, setState] = useState<PopupState>({ tabId: null, pageInfo: null, document: null, summary: null, isRunning: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setLoading(false);
      return;
    }
    const response = await sendToBackground<{
      ok: boolean;
      state: { pageInfo?: SwaggerPageInfo; document?: ParsedApiDocument; summary?: RunSummary; isRunning: boolean };
    }>('GET_STATE', { tabId: tab.id });

    setState({
      tabId: tab.id,
      pageInfo: response?.state?.pageInfo ?? null,
      document: response?.state?.document ?? null,
      summary: response?.state?.summary ?? null,
      isRunning: response?.state?.isRunning ?? false,
    });
    setLoading(false);
  }

  async function openSidebar() {
    if (state.tabId === null) return;
    await sendToBackground('OPEN_SIDEBAR', { tabId: state.tabId });
    window.close();
  }

  async function quickRun() {
    if (state.tabId === null) return;
    await openSidebar();
    await sendToBackground('RUN_ALL', { tabId: state.tabId });
  }

  if (loading) {
    return <div className="p-6 text-center text-xs text-gray-400">Loading…</div>;
  }

  const isSwaggerPage = Boolean(state.pageInfo);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${isSwaggerPage ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
        <span className="text-sm font-semibold">Swagger API Auto Tester</span>
      </div>

      {!isSwaggerPage && (
        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          No Swagger/OpenAPI page detected on this tab. Navigate to a Swagger UI, /openapi, or /api-docs page.
        </div>
      )}

      {isSwaggerPage && (
        <>
          <div className="mb-3 rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-900">
            <div className="mb-1 font-medium text-gray-800 dark:text-gray-100">{state.document?.title ?? 'Detected Swagger page'}</div>
            <div className="text-gray-400">
              {state.pageInfo?.framework} · {state.document?.endpoints.length ?? 0} endpoints
            </div>
          </div>

          {state.summary && (
            <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
              <StatCard icon={<CheckCircle2 size={13} className="text-emerald-500" />} label="Passed" value={state.summary.passed} />
              <StatCard icon={<XCircle size={13} className="text-red-500" />} label="Failed" value={state.summary.failed} />
              <StatCard label="Last Run" value={formatTimestamp(state.summary.finishedAt)} wide />
              <StatCard label="Avg Time" value={formatMs(state.summary.averageTimeMs)} wide />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={quickRun}
              disabled={state.isRunning}
              className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Play size={14} /> {state.isRunning ? 'Running…' : 'Quick Run'}
            </button>
            <button
              onClick={openSidebar}
              className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              <PanelRightOpen size={14} /> Open Sidebar
            </button>
            <button
              onClick={openSidebar}
              className="flex items-center justify-center gap-2 rounded-lg bg-transparent px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <Settings size={14} /> Settings
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, wide }: { icon?: React.ReactNode; label: string; value: string | number; wide?: boolean }) {
  return (
    <div className={`rounded-lg bg-gray-50 p-2 dark:bg-gray-900 ${wide ? 'col-span-2' : ''}`}>
      <div className="flex items-center gap-1 text-gray-400">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="font-semibold text-gray-800 dark:text-gray-100">{value}</div>
    </div>
  );
}
