import type { AIProvider } from '../services/AIProvider';
import type { AIConfiguration } from '../models/AIConfiguration';
import type { InferenceResult } from '../models/InferenceResult';

export class GeminiProvider implements AIProvider {
  public async testConnection(config: AIConfiguration): Promise<{ success: boolean; status: string }> {
    const model = config.model || 'gemini-1.5-flash';
    const baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com';
    const url = `${baseUrl.replace(/\/$/, '')}/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || 10000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'ping' }] }],
          generationConfig: {
            maxOutputTokens: 5
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 200) {
        return { success: true, status: 'Connected' };
      } else if (response.status === 400 || response.status === 403) {
        return { success: false, status: 'Invalid API Key' };
      } else if (response.status === 429) {
        return { success: false, status: 'Rate Limited' };
      } else {
        return { success: false, status: `Authentication Failed (${response.status})` };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return { success: false, status: 'Network Error (Timeout)' };
      }
      return { success: false, status: 'Network Error' };
    }
  }

  public async inferDependencies(metadata: any, config: AIConfiguration): Promise<InferenceResult> {
    const model = config.model || 'gemini-1.5-flash';
    const baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com';
    const url = `${baseUrl.replace(/\/$/, '')}/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000);

    try {
      const systemInstruction = 'You are an API dependency analysis assistant. Analyze the OpenAPI metadata and return a strict JSON object mapping relationships. The output must strictly conform to the InferenceResult interface structure.';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nMetadata:\n${JSON.stringify(metadata)}` }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: config.temperature ?? 0.1,
            maxOutputTokens: config.maxTokens ?? 2048
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI inference failed with status ${response.status}`);
      }

      const responseData = await response.json();
      const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return JSON.parse(text) as InferenceResult;
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
