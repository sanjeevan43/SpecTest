import { useAIStore } from '../store/aiStore';
import { SecureKeyStorage } from '../storage/SecureKeyStorage';
import { OpenAIProvider } from '../providers/OpenAIProvider';
import { OpenRouterProvider } from '../providers/OpenRouterProvider';
import { GeminiProvider } from '../providers/GeminiProvider';
import { PromptBuilder } from './PromptBuilder';
import type { ParsedApiDocument } from '../types';
import type { InferenceResult } from '../models/InferenceResult';
import type { AIConfiguration } from '../models/AIConfiguration';

export class AIService {
  /**
   * Runs the AI inference for the given document if enabled and resolves execution/dependencies.
   */
  public static async infer(document: ParsedApiDocument): Promise<InferenceResult | null> {
    const aiStore = useAIStore.getState();
    if (!aiStore.enabled) {
      return null;
    }

    // Check Cache
    const cached = aiStore.getInferenceCache(document);
    if (cached) {
      console.log('[AI Engine] Using cached AI result');
      return cached;
    }

    const apiKey = await SecureKeyStorage.getKey(aiStore.provider);
    if (!apiKey) {
      console.warn('[AI Engine] API Key is missing. Falling back to deterministic resolver.');
      return null;
    }

    const config: AIConfiguration = {
      enabled: aiStore.enabled,
      provider: aiStore.provider,
      apiKey: apiKey,
      baseUrl: aiStore.baseUrl,
      model: aiStore.model,
      temperature: aiStore.temperature,
      maxTokens: aiStore.maxTokens,
      timeout: aiStore.timeout,
      onlyForUnresolved: aiStore.onlyForUnresolved,
      alwaysAskBeforeSend: aiStore.alwaysAskBeforeSend
    };

    console.log('[AI Engine] AI analyzed dependency');
    
    let providerInstance;
    if (config.provider === 'openai') {
      providerInstance = new OpenAIProvider();
    } else if (config.provider === 'openrouter') {
      providerInstance = new OpenRouterProvider();
    } else {
      providerInstance = new GeminiProvider();
    }

    const metadataPayload = PromptBuilder.buildMetadataPayload(document);
    try {
      const result = await providerInstance.inferDependencies(metadataPayload, config);
      aiStore.setInferenceCache(document, result);
      return result;
    } catch (e) {
      console.error('[AI Engine] Inference failed, falling back to built-in resolver:', e);
      return null;
    }
  }
}
