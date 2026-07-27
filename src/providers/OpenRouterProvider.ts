import type { AIProvider } from '../services/AIProvider';
import type { AIConfiguration } from '../models/AIConfiguration';
import type { InferenceResult } from '../models/InferenceResult';

export class OpenRouterProvider implements AIProvider {
  public async testConnection(config: AIConfiguration): Promise<{ success: boolean; status: string }> {
    const baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || 10000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 200) {
        return { success: true, status: 'Connected' };
      } else if (response.status === 401) {
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
    const baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'HTTP-Referer': 'https://swagger-api-auto-tester.extension',
          'X-Title': 'Swagger API Auto Tester'
        },
        body: JSON.stringify({
          model: config.model || 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You are an API dependency analysis assistant. Analyze the OpenAPI metadata and return a strict JSON object mapping relationships.'
            },
            {
              role: 'user',
              content: JSON.stringify(metadata)
            }
          ],
          temperature: config.temperature ?? 0.1,
          max_tokens: config.maxTokens ?? 2000,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI inference failed with status ${response.status}`);
      }

      const responseData = await response.json();
      const text = responseData.choices?.[0]?.message?.content || '';
      return JSON.parse(text) as InferenceResult;
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
