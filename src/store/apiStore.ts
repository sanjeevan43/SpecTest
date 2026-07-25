import { create } from 'zustand';
import type { ParsedApiDocument } from '../types';
import type { ApiExecutionResult } from '../types/ApiExecutionResult';

interface ApiStoreState {
  document: ParsedApiDocument | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedMethod: string;
  selectedTag: string;
  selectedServerUrl: string | null;
  executionResults: Record<string, ApiExecutionResult>;
  statusFilter: string; // 'ALL' | 'passed' | 'failed' | 'pending' | 'running'

  setDocument: (doc: ParsedApiDocument | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedMethod: (method: string) => void;
  setSelectedTag: (tag: string) => void;
  setSelectedServerUrl: (url: string | null) => void;
  updateExecutionResult: (endpointId: string, update: Partial<ApiExecutionResult>) => void;
  clearExecutionResults: () => void;
  setStatusFilter: (filter: string) => void;
  reset: () => void;
}

export const useApiStore = create<ApiStoreState>((set) => ({
  document: null,
  loading: false,
  error: null,
  searchQuery: '',
  selectedMethod: 'ALL',
  selectedTag: 'ALL',
  selectedServerUrl: null,
  executionResults: {},
  statusFilter: 'ALL',

  setDocument: (doc) => {
    // Initialize all endpoints to pending
    const initialResults: Record<string, ApiExecutionResult> = {};
    if (doc) {
      doc.endpoints.forEach((ep) => {
        initialResults[ep.id] = {
          endpointId: ep.id,
          status: 'pending',
          request: null,
          response: null,
          error: null,
          retryCount: 0,
        };
      });
    }

    set({
      document: doc,
      error: null,
      selectedServerUrl: doc ? doc.baseUrl : null,
      executionResults: initialResults,
      statusFilter: 'ALL',
    });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedMethod: (method) => set({ selectedMethod: method }),
  setSelectedTag: (tag) => set({ selectedTag: tag }),
  setSelectedServerUrl: (url) => set({ selectedServerUrl: url }),

  updateExecutionResult: (endpointId, update) =>
    set((state) => {
      const current = state.executionResults[endpointId] || {
        endpointId,
        status: 'pending',
        request: null,
        response: null,
        error: null,
        retryCount: 0,
      };

      return {
        executionResults: {
          ...state.executionResults,
          [endpointId]: {
            ...current,
            ...update,
          },
        },
      };
    }),

  clearExecutionResults: () =>
    set((state) => {
      const resetResults: Record<string, ApiExecutionResult> = {};
      if (state.document) {
        state.document.endpoints.forEach((ep) => {
          resetResults[ep.id] = {
            endpointId: ep.id,
            status: 'pending',
            request: null,
            response: null,
            error: null,
            retryCount: 0,
          };
        });
      }
      return { executionResults: resetResults };
    }),

  setStatusFilter: (filter) => set({ statusFilter: filter }),

  reset: () =>
    set({
      document: null,
      loading: false,
      error: null,
      searchQuery: '',
      selectedMethod: 'ALL',
      selectedTag: 'ALL',
      selectedServerUrl: null,
      executionResults: {},
      statusFilter: 'ALL',
    }),
}));
