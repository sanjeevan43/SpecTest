export interface AIConfiguration {
  enabled: boolean;
  provider: 'openai' | 'openrouter' | 'gemini';
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number; // in milliseconds
  onlyForUnresolved: boolean;
  alwaysAskBeforeSend: boolean;
}
