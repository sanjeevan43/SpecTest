import type { AIConfiguration } from '../models/AIConfiguration';
import type { InferenceResult } from '../models/InferenceResult';

export interface AIProvider {
  testConnection(config: AIConfiguration): Promise<{ success: boolean; status: string }>;
  inferDependencies(metadata: any, config: AIConfiguration): Promise<InferenceResult>;
}
