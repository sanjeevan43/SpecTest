import type { InferenceResult } from './InferenceResult';

export interface AIResponse {
  success: boolean;
  result?: InferenceResult;
  error?: string;
}
