import { create } from 'zustand';
import type { Authentication } from '../models/Authentication';
import type { SecurityScheme } from '../models/SecurityScheme';

interface AuthSettings {
  autoRefreshToken: boolean;
  autoLogin: boolean;
  reuseSwaggerAuth: boolean;
}

interface AuthenticationStoreState {
  currentAuth: Authentication;
  activeSchemes: SecurityScheme[];
  settings: AuthSettings;

  setCurrentAuth: (auth: Partial<Authentication>) => void;
  setActiveSchemes: (schemes: SecurityScheme[]) => void;
  updateSettings: (settings: Partial<AuthSettings>) => void;
  clearAuth: () => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => void;
  reset: () => void;
}

const defaultAuth: Authentication = {
  method: 'anonymous',
};

const defaultSettings: AuthSettings = {
  autoRefreshToken: true,
  autoLogin: true,
  reuseSwaggerAuth: true,
};

export const useAuthenticationStore = create<AuthenticationStoreState>((set, get) => ({
  currentAuth: defaultAuth,
  activeSchemes: [],
  settings: defaultSettings,

  setCurrentAuth: (auth) => {
    set((state) => ({ currentAuth: { ...state.currentAuth, ...auth } }));
    get().saveToStorage();
  },

  setActiveSchemes: (activeSchemes) => set({ activeSchemes }),

  updateSettings: (newSettings) => {
    set((state) => ({ settings: { ...state.settings, ...newSettings } }));
    get().saveToStorage();
  },

  clearAuth: () => {
    set({ currentAuth: defaultAuth });
    get().saveToStorage();
  },

  loadFromStorage: async () => {
    try {
      const res = await chrome.storage.local.get(['activeAuthCredentials', 'authSettings']);
      set({
        currentAuth: res.activeAuthCredentials || defaultAuth,
        settings: res.authSettings || defaultSettings,
      });
    } catch {}
  },

  saveToStorage: () => {
    try {
      const { currentAuth, settings } = get();
      chrome.storage.local.set({
        activeAuthCredentials: currentAuth,
        authSettings: settings,
      });
    } catch {}
  },

  reset: () =>
    set({
      currentAuth: defaultAuth,
      activeSchemes: [],
      settings: defaultSettings,
    }),
}));
