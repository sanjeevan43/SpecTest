import { create } from 'zustand';
import type { StoredEntity } from '../models/StoredEntity';
import type { DependencyNode } from '../models/DependencyNode';

interface DependencyStoreState {
  isDependencyEngineEnabled: boolean;
  entityCache: Record<string, StoredEntity[]>;
  manualMappings: Record<string, string>;
  dependencyGraph: DependencyNode[];
  accessToken: string | null;

  setDependencyEngineEnabled: (enabled: boolean) => void;
  addHarvestedEntity: (entity: StoredEntity) => void;
  setManualMapping: (name: string, value: string) => void;
  setDependencyGraph: (graph: DependencyNode[]) => void;
  setAccessToken: (token: string | null) => void;
  clearEntityCache: () => void;
  clearStoredIds: () => void;
  clearManualMappings: () => void;
  loadFromStorage: () => Promise<void>;
}

export const useDependencyStore = create<DependencyStoreState>((set, get) => ({
  isDependencyEngineEnabled: true,
  entityCache: {},
  manualMappings: {},
  dependencyGraph: [],
  accessToken: null,

  setDependencyEngineEnabled: (enabled) => {
    set({ isDependencyEngineEnabled: enabled });
    try {
      chrome.storage.local.set({ isDependencyEngineEnabled: enabled });
    } catch {}
  },

  addHarvestedEntity: (entity) =>
    set((state) => {
      const currentList = state.entityCache[entity.name] || [];
      // Prevent duplicates by checking value
      if (currentList.some((e) => e.value === entity.value)) {
        return {};
      }
      const updatedList = [entity, ...currentList];
      const updatedCache = {
        ...state.entityCache,
        [entity.name]: updatedList,
      };
      
      try {
        chrome.storage.local.set({ entityCache: updatedCache });
      } catch {}

      return { entityCache: updatedCache };
    }),

  setManualMapping: (name, value) => {
    set((state) => {
      const updatedMappings = {
        ...state.manualMappings,
        [name]: value,
      };

      try {
        chrome.storage.local.set({ manualMappings: updatedMappings });
      } catch {}

      return { manualMappings: updatedMappings };
    });
  },

  setDependencyGraph: (graph) => set({ dependencyGraph: graph }),

  setAccessToken: (token) => set({ accessToken: token }),

  clearEntityCache: () => {
    set({ entityCache: {} });
    try {
      chrome.storage.local.set({ entityCache: {} });
    } catch {}
  },

  clearStoredIds: () => {
    set({ entityCache: {} });
    try {
      chrome.storage.local.set({ entityCache: {} });
    } catch {}
  },

  clearManualMappings: () => {
    set({ manualMappings: {} });
    try {
      chrome.storage.local.set({ manualMappings: {} });
    } catch {}
  },

  loadFromStorage: async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await new Promise<any>((resolve) => {
          chrome.storage.local.get(
            ['isDependencyEngineEnabled', 'entityCache', 'manualMappings'],
            (result) => resolve(result || {})
          );
        });

        set({
          isDependencyEngineEnabled: data.isDependencyEngineEnabled !== false,
          entityCache: data.entityCache || {},
          manualMappings: data.manualMappings || {},
        });
      }
    } catch {}
  },
}));
