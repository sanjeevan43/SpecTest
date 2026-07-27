import { create } from 'zustand';
import type { AIConfiguration } from '../models/AIConfiguration';
import type { InferenceResult } from '../models/InferenceResult';
import { SecureKeyStorage } from '../storage/SecureKeyStorage';
import { OpenAIProvider } from '../providers/OpenAIProvider';
import { OpenRouterProvider } from '../providers/OpenRouterProvider';
import { GeminiProvider } from '../providers/GeminiProvider';
import type { ParsedApiDocument } from '../types';

interface AIStoreState {
  enabled: boolean;
  provider: 'openai' | 'openrouter' | 'gemini';
  apiKeyMasked: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  onlyForUnresolved: boolean;
  alwaysAskBeforeSend: boolean;
  connectionStatus: string;
  cache: Record<string, InferenceResult>;

  setAIEnabled: (enabled: boolean) => void;
  updateConfig: (updates: Partial<Omit<AIConfiguration, 'apiKey'>> & { apiKey?: string }) => void;
  saveConfiguration: () => Promise<void>;
  clearApiKey: () => Promise<void>;
  testConnection: () => Promise<void>;
  getInferenceCache: (doc: ParsedApiDocument) => InferenceResult | null;
  setInferenceCache: (doc: ParsedApiDocument, result: InferenceResult) => void;
  loadFromStorage: () => Promise<void>;
}

export const useAIStore = create<AIStoreState>((set, get) => ({
  enabled: false,
  provider: 'gemini',
  apiKeyMasked: '',
  baseUrl: '',
  model: 'gemini-1.5-flash',
  temperature: 0.1,
  maxTokens: 2048,
  timeout: 15000,
  onlyForUnresolved: true,
  alwaysAskBeforeSend: false,
  connectionStatus: 'Disconnected',
  cache: {},

  setAIEnabled: (enabled) => {
    set({ enabled });
    try {
      chrome.storage.local.set({ aiEnabled: enabled });
    } catch {}
  },

  updateConfig: (updates) => {
    const nextState: any = {};
    if (updates.enabled !== undefined) nextState.enabled = updates.enabled;
    if (updates.provider !== undefined) {
      nextState.provider = updates.provider;
      // Default models when provider changes
      if (updates.provider === 'openai') {
        nextState.model = 'gpt-3.5-turbo';
        nextState.baseUrl = 'https://api.openai.com/v1';
      } else if (updates.provider === 'openrouter') {
        nextState.model = 'google/gemini-2.5-flash';
        nextState.baseUrl = 'https://openrouter.ai/api/v1';
      } else if (updates.provider === 'gemini') {
        nextState.model = 'gemini-1.5-flash';
        nextState.baseUrl = 'https://generativelanguage.googleapis.com';
      }
    }
    if (updates.baseUrl !== undefined) nextState.baseUrl = updates.baseUrl;
    if (updates.model !== undefined) nextState.model = updates.model;
    if (updates.temperature !== undefined) nextState.temperature = updates.temperature;
    if (updates.maxTokens !== undefined) nextState.maxTokens = updates.maxTokens;
    if (updates.timeout !== undefined) nextState.timeout = updates.timeout;
    if (updates.onlyForUnresolved !== undefined) nextState.onlyForUnresolved = updates.onlyForUnresolved;
    if (updates.alwaysAskBeforeSend !== undefined) nextState.alwaysAskBeforeSend = updates.alwaysAskBeforeSend;
    
    if (updates.apiKey !== undefined) {
      nextState.apiKeyMasked = SecureKeyStorage.maskKey(updates.apiKey);
      // Store raw key temporarily in a hidden non-reactive way or directly save
      (get() as any)._tempRawKey = updates.apiKey;
    }

    set(nextState);
  },

  saveConfiguration: async () => {
    const state = get();
    const rawKey = (state as any)._tempRawKey;
    if (rawKey) {
      await SecureKeyStorage.saveKey(state.provider, rawKey);
      (state as any)._tempRawKey = undefined;
    }

    const configToSave = {
      aiEnabled: state.enabled,
      aiProvider: state.provider,
      aiBaseUrl: state.baseUrl,
      aiModel: state.model,
      aiTemperature: state.temperature,
      aiMaxTokens: state.maxTokens,
      aiTimeout: state.timeout,
      aiOnlyForUnresolved: state.onlyForUnresolved,
      aiAlwaysAskBeforeSend: state.alwaysAskBeforeSend,
    };

    try {
      await chrome.storage.local.set(configToSave);
    } catch {}
  },

  clearApiKey: async () => {
    const state = get();
    await SecureKeyStorage.clearKey(state.provider);
    set({ apiKeyMasked: '' });
  },

  testConnection: async () => {
    set({ connectionStatus: 'Testing...' });
    const state = get();
    const rawKey = (state as any)._tempRawKey || await SecureKeyStorage.getKey(state.provider);

    if (!rawKey) {
      set({ connectionStatus: 'Invalid API Key' });
      return;
    }

    const config: AIConfiguration = {
      enabled: state.enabled,
      provider: state.provider,
      apiKey: rawKey,
      baseUrl: state.baseUrl,
      model: state.model,
      temperature: state.temperature,
      maxTokens: state.maxTokens,
      timeout: state.timeout,
      onlyForUnresolved: state.onlyForUnresolved,
      alwaysAskBeforeSend: state.alwaysAskBeforeSend
    };

    let providerInstance;
    if (state.provider === 'openai') {
      providerInstance = new OpenAIProvider();
    } else if (state.provider === 'openrouter') {
      providerInstance = new OpenRouterProvider();
    } else {
      providerInstance = new GeminiProvider();
    }

    const result = await providerInstance.testConnection(config);
    set({ connectionStatus: result.status });
  },

  getInferenceCache: (doc) => {
    const cacheKey = `${doc.title}_${doc.endpoints.length}_${doc.endpoints.map(e => e.id).join(',')}`;
    return get().cache[cacheKey] || null;
  },

  setInferenceCache: (doc, result) => {
    const cacheKey = `${doc.title}_${doc.endpoints.length}_${doc.endpoints.map(e => e.id).join(',')}`;
    set(state => {
      const updatedCache = { ...state.cache, [cacheKey]: result };
      try {
        chrome.storage.local.set({ aiCache: updatedCache });
      } catch {}
      return { cache: updatedCache };
    });
  },

  loadFromStorage: async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await chrome.storage.local.get([
          'aiEnabled',
          'aiProvider',
          'aiBaseUrl',
          'aiModel',
          'aiTemperature',
          'aiMaxTokens',
          'aiTimeout',
          'aiOnlyForUnresolved',
          'aiAlwaysAskBeforeSend',
          'aiCache'
        ]);

        const provider = data.aiProvider || 'gemini';
        const apiKey = await SecureKeyStorage.getKey(provider);
        const apiKeyMasked = SecureKeyStorage.maskKey(apiKey);

        set({
          enabled: !!data.aiEnabled,
          provider: provider,
          baseUrl: data.aiBaseUrl || (provider === 'gemini' ? 'https://generativelanguage.googleapis.com' : provider === 'openai' ? 'https://api.openai.com/v1' : 'https://openrouter.ai/api/v1'),
          model: data.aiModel || (provider === 'gemini' ? 'gemini-1.5-flash' : provider === 'openai' ? 'gpt-3.5-turbo' : 'google/gemini-2.5-flash'),
          temperature: data.aiTemperature ?? 0.1,
          maxTokens: data.aiMaxTokens ?? 2048,
          timeout: data.aiTimeout ?? 15000,
          onlyForUnresolved: data.aiOnlyForUnresolved !== false,
          alwaysAskBeforeSend: !!data.aiAlwaysAskBeforeSend,
          apiKeyMasked: apiKeyMasked,
          cache: data.aiCache || {}
        });
      }
    } catch {}
  }
}));
