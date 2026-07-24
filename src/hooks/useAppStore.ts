import { create } from 'zustand';
import { sendToBackground, onMessage } from '@/services/messageBus';
import { chromeStorage } from '@/storage/chromeStorage';
import { DEFAULT_RUNNER_CONFIG } from '@/models/types';
import type {
  AuthCredential,
  HistoryEntry,
  ParsedApiDocument,
  RunnerConfig,
  RunSummary,
  SwaggerPageInfo,
  TestResult,
} from '@/models/types';

export type ResultFilter = {
  search: string;
  method: string | null;
  tag: string | null;
  status: string | null;
};

interface AppStore {
  tabId: number | null;
  pageInfo: SwaggerPageInfo | null;
  document: ParsedApiDocument | null;
  results: TestResult[];
  summary: RunSummary | null;
  history: HistoryEntry[];
  credentials: Record<string, AuthCredential>;
  config: RunnerConfig;
  isRunning: boolean;
  parseError: string | null;
  selectedEndpointIds: Set<string>;
  filter: ResultFilter;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  init: (tabId: number) => Promise<void>;
  refreshState: () => Promise<void>;
  runAll: () => Promise<void>;
  runSelected: () => Promise<void>;
  runTag: (tag: string) => Promise<void>;
  runFailed: () => Promise<void>;
  retryFailed: () => Promise<void>;
  stop: () => Promise<void>;
  clearResults: () => Promise<void>;
  toggleEndpointSelection: (endpointId: string) => void;
  setFilter: (filter: Partial<ResultFilter>) => void;
  setConfig: (config: Partial<RunnerConfig>) => Promise<void>;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  initiateParse: (specUrl: string) => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  tabId: null,
  pageInfo: null,
  document: null,
  results: [],
  summary: null,
  history: [],
  credentials: {},
  config: DEFAULT_RUNNER_CONFIG,
  isRunning: false,
  parseError: null,
  selectedEndpointIds: new Set(),
  filter: { search: '', method: null, tag: null, status: null },
  sidebarOpen: false,
  sidebarCollapsed: false,

  init: async (tabId: number) => {
    set({ tabId });
    await get().refreshState();

    onMessage<TestResult>('TEST_PROGRESS', (result) => {
      set((s) => ({ results: [...s.results, result] }));
    });
    onMessage<{ summary: RunSummary; results: TestResult[] }>('RUN_COMPLETE', ({ summary, results }) => {
      set({ summary, results, isRunning: false });
    });
  },

  refreshState: async () => {
    const { tabId } = get();
    if (tabId === null) return;
    const response = await sendToBackground<{
      ok: boolean;
      state: { pageInfo?: SwaggerPageInfo; document?: ParsedApiDocument; results: TestResult[]; summary?: RunSummary; credentials: Record<string, AuthCredential>; isRunning: boolean };
      config: RunnerConfig;
      history: HistoryEntry[];
    }>('GET_STATE', { tabId });
    if (!response?.ok) return;
    set({
      pageInfo: response.state.pageInfo ?? null,
      document: response.state.document ?? null,
      results: response.state.results ?? [],
      summary: response.state.summary ?? null,
      credentials: response.state.credentials ?? {},
      isRunning: response.state.isRunning ?? false,
      config: response.config ?? DEFAULT_RUNNER_CONFIG,
      history: response.history ?? [],
    });
  },

  runAll: async () => {
    set({ isRunning: true });
    await runViaTab(get().tabId, 'RUN_ALL');
  },
  runSelected: async () => {
    const ids = Array.from(get().selectedEndpointIds);
    set({ isRunning: true });
    await runViaTab(get().tabId, 'RUN_SELECTED', { endpointIds: ids });
  },
  runTag: async (tag: string) => {
    set({ isRunning: true });
    await runViaTab(get().tabId, 'RUN_TAG', { tag });
  },
  runFailed: async () => {
    set({ isRunning: true });
    await runViaTab(get().tabId, 'RUN_FAILED');
  },
  retryFailed: async () => {
    set({ isRunning: true });
    await runViaTab(get().tabId, 'RETRY_FAILED');
  },
  stop: async () => {
    await runViaTab(get().tabId, 'STOP_RUN');
    set({ isRunning: false });
  },
  clearResults: async () => {
    await runViaTab(get().tabId, 'CLEAR_RESULTS');
    set({ results: [], summary: null });
  },

  toggleEndpointSelection: (endpointId: string) => {
    set((s) => {
      const next = new Set(s.selectedEndpointIds);
      if (next.has(endpointId)) next.delete(endpointId);
      else next.add(endpointId);
      return { selectedEndpointIds: next };
    });
  },

  setFilter: (filter: Partial<ResultFilter>) => {
    set((s) => ({ filter: { ...s.filter, ...filter } }));
  },

  setConfig: async (partial: Partial<RunnerConfig>) => {
    const next = { ...get().config, ...partial };
    set({ config: next });
    await chromeStorage.setSettings(next);
  },

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
  initiateParse: async (specUrl: string) => {
    const { tabId } = get();
    if (tabId === null) return;
    set({ parseError: null, document: null });
    try {
      const response = await sendToBackground<{ ok: boolean; document?: ParsedApiDocument; error?: string }>('PARSE_DOCUMENT', { specUrl, tabId });
      if (response?.ok && response.document) {
        set({ document: response.document, parseError: null });
      } else {
        set({ parseError: response?.error ?? 'Unknown parsing error' });
      }
    } catch (err) {
      set({ parseError: err instanceof Error ? err.message : String(err) });
    }
  },
}));

async function runViaTab(tabId: number | null, type: Parameters<typeof sendToBackground>[0], payload?: unknown) {
  if (tabId === null) return;
  await sendToBackground(type, { ...(payload as object), tabId });
}
