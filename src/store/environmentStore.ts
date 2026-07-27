import { create } from 'zustand';
import type { Environment } from '../models/Environment';

interface EnvironmentStoreState {
  environments: Environment[];
  selectedEnvironmentId: string;
  globalHeaders: Record<string, string>;
  isVariablesEnabled: boolean;

  setEnvironments: (envs: Environment[]) => void;
  selectEnvironment: (id: string) => void;
  updateEnvironment: (id: string, update: Partial<Environment>) => void;
  addEnvironment: (env: Environment) => void;
  deleteEnvironment: (id: string) => void;
  setGlobalHeaders: (headers: Record<string, string>) => void;
  setVariablesEnabled: (enabled: boolean) => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => void;
  reset: () => void;
}

const defaultEnvironments: Environment[] = [
  {
    id: 'local',
    name: 'Local',
    baseUrl: 'http://localhost:8080',
    variables: { tenantId: '100', organizationId: 'ORG-LOCAL' },
    headers: {},
    timeoutMs: 5000,
    retryPolicy: { retries: 0, backoffMs: 1000 },
  },
  {
    id: 'development',
    name: 'Development',
    baseUrl: 'https://dev-api.example.com',
    variables: { tenantId: '200', organizationId: 'ORG-DEV' },
    headers: {},
    timeoutMs: 10000,
    retryPolicy: { retries: 1, backoffMs: 2000 },
  },
  {
    id: 'qa',
    name: 'QA / Testing',
    baseUrl: 'https://qa-api.example.com',
    variables: { tenantId: '300', organizationId: 'ORG-QA' },
    headers: {},
    timeoutMs: 15000,
    retryPolicy: { retries: 2, backoffMs: 2000 },
  },
  {
    id: 'production',
    name: 'Production',
    baseUrl: 'https://api.example.com',
    variables: { tenantId: '999', organizationId: 'ORG-PROD' },
    headers: {},
    timeoutMs: 15000,
    retryPolicy: { retries: 3, backoffMs: 3000 },
  },
];

export const useEnvironmentStore = create<EnvironmentStoreState>((set, get) => ({
  environments: defaultEnvironments,
  selectedEnvironmentId: 'local',
  globalHeaders: {},
  isVariablesEnabled: true,

  setEnvironments: (environments) => {
    set({ environments });
    get().saveToStorage();
  },

  selectEnvironment: (selectedEnvironmentId) => {
    set({ selectedEnvironmentId });
    get().saveToStorage();
  },

  updateEnvironment: (id, update) => {
    set((state) => {
      const updated = state.environments.map((env) => {
        if (env.id === id) {
          return {
            ...env,
            ...update,
            variables: update.variables ? { ...env.variables, ...update.variables } : env.variables,
            headers: update.headers ? { ...env.headers, ...update.headers } : env.headers,
          };
        }
        return env;
      });
      return { environments: updated };
    });
    get().saveToStorage();
  },

  addEnvironment: (env) => {
    set((state) => ({ environments: [...state.environments, env] }));
    get().saveToStorage();
  },

  deleteEnvironment: (id) => {
    set((state) => {
      const filtered = state.environments.filter((env) => env.id !== id);
      const nextSelected = state.selectedEnvironmentId === id ? filtered[0]?.id || 'local' : state.selectedEnvironmentId;
      return { environments: filtered, selectedEnvironmentId: nextSelected };
    });
    get().saveToStorage();
  },

  setGlobalHeaders: (globalHeaders) => {
    set({ globalHeaders });
    get().saveToStorage();
  },

  setVariablesEnabled: (isVariablesEnabled) => {
    set({ isVariablesEnabled });
    get().saveToStorage();
  },

  loadFromStorage: async () => {
    try {
      const res = await chrome.storage.local.get([
        'environmentProfiles',
        'selectedEnvironmentId',
        'globalHeaders',
        'isVariablesEnabled',
      ]);
      set({
        environments: res.environmentProfiles || defaultEnvironments,
        selectedEnvironmentId: res.selectedEnvironmentId || 'local',
        globalHeaders: res.globalHeaders || {},
        isVariablesEnabled: res.isVariablesEnabled !== undefined ? res.isVariablesEnabled : true,
      });
    } catch {}
  },

  saveToStorage: () => {
    try {
      const { environments, selectedEnvironmentId, globalHeaders, isVariablesEnabled } = get();
      chrome.storage.local.set({
        environmentProfiles: environments,
        selectedEnvironmentId,
        globalHeaders,
        isVariablesEnabled,
      });
    } catch {}
  },

  reset: () =>
    set({
      environments: defaultEnvironments,
      selectedEnvironmentId: 'local',
      globalHeaders: {},
      isVariablesEnabled: true,
    }),
}));
