export interface ApiResponse {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  durationMs: number;
  requestSize: number;
  responseSize: number;
}
