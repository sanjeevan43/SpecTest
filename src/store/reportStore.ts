import { create } from 'zustand';
import type { Report } from '../models/Report';

interface ReportSettings {
  defaultFormat: string;
  includeRequestBodies: boolean;
  includeResponseBodies: boolean;
  includeHeaders: boolean;
  includeCharts: boolean;
  maskSensitiveData: boolean;
  compressReports: boolean;
}

interface ReportStoreState {
  reports: Report[];
  settings: ReportSettings;
  compareLeftReportId: string | null;
  compareRightReportId: string | null;

  addReport: (report: Report) => void;
  deleteReport: (id: string) => void;
  renameReport: (id: string, newTitle: string) => void;
  setCompareLeft: (id: string | null) => void;
  setCompareRight: (id: string | null) => void;
  updateSettings: (settings: Partial<ReportSettings>) => void;
  loadFromStorage: () => Promise<void>;
  reset: () => void;
}

const defaultSettings: ReportSettings = {
  defaultFormat: 'HTML',
  includeRequestBodies: true,
  includeResponseBodies: true,
  includeHeaders: true,
  includeCharts: true,
  maskSensitiveData: true,
  compressReports: false,
};

export const useReportStore = create<ReportStoreState>((set, get) => ({
  reports: [],
  settings: defaultSettings,
  compareLeftReportId: null,
  compareRightReportId: null,

  addReport: (report) => {
    set((state) => ({ reports: [report, ...state.reports] }));
    get().saveToStorage();
  },

  deleteReport: (id) => {
    set((state) => ({
      reports: state.reports.filter((r) => r.id !== id),
      compareLeftReportId: state.compareLeftReportId === id ? null : state.compareLeftReportId,
      compareRightReportId: state.compareRightReportId === id ? null : state.compareRightReportId,
    }));
    get().saveToStorage();
  },

  renameReport: (id, newTitle) => {
    set((state) => ({
      reports: state.reports.map((r) => (r.id === id ? { ...r, title: newTitle } : r)),
    }));
    get().saveToStorage();
  },

  setCompareLeft: (compareLeftReportId) => set({ compareLeftReportId }),
  setCompareRight: (compareRightReportId) => set({ compareRightReportId }),

  updateSettings: (newSettings) => {
    set((state) => ({ settings: { ...state.settings, ...newSettings } }));
    get().saveToStorage();
  },

  loadFromStorage: async () => {
    try {
      const res = await chrome.storage.local.get(['savedReports', 'reportSettings']);
      set({
        reports: res.savedReports || [],
        settings: res.reportSettings || defaultSettings,
      });
    } catch {}
  },

  saveToStorage: () => {
    try {
      const { reports, settings } = get();
      chrome.storage.local.set({
        savedReports: reports,
        reportSettings: settings,
      });
    } catch {}
  },

  reset: () =>
    set({
      reports: [],
      settings: defaultSettings,
      compareLeftReportId: null,
      compareRightReportId: null,
    }),
}));
