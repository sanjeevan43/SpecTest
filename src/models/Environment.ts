export interface Environment {
  id: string; // e.g. "dev"
  name: string; // e.g. "Development"
  baseUrl: string;
  variables: Record<string, string>;
  headers: Record<string, string>;
  timeoutMs: number;
  retryPolicy: {
    retries: number;
    backoffMs: number;
  };
}
