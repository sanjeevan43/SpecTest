import { create } from 'zustand';
import type { ValidationResult } from '../models/ValidationResult';

interface ValidationSettings {
  enableValidation: boolean;
  ignoreOptionalFields: boolean;
  ignoreAdditionalProperties: boolean;
  strictMode: boolean;
}

interface ValidationStoreState {
  validationResults: Record<string, ValidationResult>;
  settings: ValidationSettings;

  setValidationResult: (endpointId: string, result: ValidationResult) => void;
  updateSettings: (settings: Partial<ValidationSettings>) => void;
  clearResults: () => void;
  reset: () => void;
}

const defaultSettings: ValidationSettings = {
  enableValidation: true,
  ignoreOptionalFields: false,
  ignoreAdditionalProperties: false,
  strictMode: false,
};

export const useValidationStore = create<ValidationStoreState>((set) => ({
  validationResults: {},
  settings: defaultSettings,

  setValidationResult: (endpointId, result) =>
    set((state) => ({
      validationResults: {
        ...state.validationResults,
        [endpointId]: result,
      },
    })),

  updateSettings: (newSettings) =>
    set((state) => {
      const updated = { ...state.settings, ...newSettings };
      try {
        chrome.storage.local.set({ validationSettings: updated });
      } catch {}
      return { settings: updated };
    }),

  clearResults: () => set({ validationResults: {} }),

  reset: () =>
    set({
      validationResults: {},
      settings: defaultSettings,
    }),
}));
