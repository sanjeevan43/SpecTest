import { create } from 'zustand';
import type { TestCase } from '../models/TestCase';

interface TestSettings {
  maxTestCases: number;
  enableBoundary: boolean;
  enableNegative: boolean;
  maxStringLength: number;
  maxArraySize: number;
  randomSeed: string;
}

interface TestStoreState {
  scenarios: Record<string, TestCase[]>;
  settings: TestSettings;
  testFilter: string; // 'ALL' | 'passed' | 'failed' | 'skipped' | 'positive' | 'negative' | 'boundary' | 'validation'

  setScenarios: (scenarios: Record<string, TestCase[]>) => void;
  updateTestCase: (endpointId: string, testId: string, update: Partial<TestCase>) => void;
  updateSettings: (settings: Partial<TestSettings>) => void;
  setTestFilter: (filter: string) => void;
  clearAllTests: () => void;
  reset: () => void;
}

const defaultSettings: TestSettings = {
  maxTestCases: 15,
  enableBoundary: true,
  enableNegative: true,
  maxStringLength: 128,
  maxArraySize: 5,
  randomSeed: 'swagger-auto-seed',
};

export const useTestStore = create<TestStoreState>((set) => ({
  scenarios: {},
  settings: defaultSettings,
  testFilter: 'ALL',

  setScenarios: (scenarios) => set({ scenarios }),
  
  updateTestCase: (endpointId, testId, update) =>
    set((state) => {
      const endpointScenarios = state.scenarios[endpointId] || [];
      const updated = endpointScenarios.map((tc) => {
        if (tc.id === testId) {
          return {
            ...tc,
            ...update,
            result: update.result ? { ...(tc.result || {}), ...update.result } : tc.result,
          };
        }
        return tc;
      });

      return {
        scenarios: {
          ...state.scenarios,
          [endpointId]: updated,
        },
      };
    }),

  updateSettings: (newSettings) =>
    set((state) => {
      const updated = { ...state.settings, ...newSettings };
      try {
        chrome.storage.local.set({ testGeneratorSettings: updated });
      } catch {}
      return { settings: updated };
    }),

  setTestFilter: (filter) => set({ testFilter: filter }),

  clearAllTests: () => set({ scenarios: {} }),

  reset: () =>
    set({
      scenarios: {},
      settings: defaultSettings,
      testFilter: 'ALL',
    }),
}));
