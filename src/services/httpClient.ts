import axios, { AxiosError } from 'axios';
import type { HttpMethod, TimingBreakdown } from '@/models/types';

export interface HttpRequestInput {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  data?: unknown;
  timeoutMs: number;
}

export interface HttpRequestOutput {
  status: number | undefined;
  headers: Record<string, string>;
  body: unknown;
  size: number;
  timing: TimingBreakdown;
  error?: string;
}

// MV3 service workers have no XMLHttpRequest — force axios onto its fetch adapter so
// this works identically in background, content script, and sidebar contexts.
const client = axios.create({ adapter: 'fetch', validateStatus: () => true });

/** Executes a single HTTP call, capturing a best-effort DNS/connect/wait/download timing breakdown. */
export async function executeRequest(input: HttpRequestInput): Promise<HttpRequestOutput> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  const clientStart = performance.now();

  try {
    const response = await client.request({
      method: input.method,
      url: input.url,
      headers: input.headers,
      data: input.data,
      signal: controller.signal,
      responseType: 'json',
      transitional: { clarifyTimeoutError: true },
    });
    clearTimeout(timeout);
    const clientEnd = performance.now();

    const timing = deriveTiming(input.url, clientStart, clientEnd);
    const bodyString = safeStringify(response.data);

    return {
      status: response.status,
      headers: normalizeHeaders(response.headers as Record<string, unknown>),
      body: response.data,
      size: new Blob([bodyString]).size,
      timing,
    };
  } catch (err) {
    clearTimeout(timeout);
    const clientEnd = performance.now();
    const timing = deriveTiming(input.url, clientStart, clientEnd);
    const message = describeError(err);
    return { status: undefined, headers: {}, body: null, size: 0, timing, error: message };
  }
}

/** Retries a request up to `maxRetries` times with the given delay, only for network/5xx failures. */
export async function executeRequestWithRetry(
  input: HttpRequestInput,
  maxRetries: number,
  delayMs: number,
): Promise<{ result: HttpRequestOutput; attempts: number }> {
  let attempts = 0;
  let lastResult: HttpRequestOutput;

  do {
    lastResult = await executeRequest(input);
    attempts += 1;
    const shouldRetry = attempts <= maxRetries && (lastResult.error !== undefined || (lastResult.status ?? 0) >= 500);
    if (!shouldRetry) break;
    await sleep(delayMs);
  } while (attempts <= maxRetries);

  return { result: lastResult, attempts: attempts - 1 };
}

function deriveTiming(url: string, start: number, end: number): TimingBreakdown {
  const total = Math.max(0, end - start);

  // Best-effort breakdown using the Resource Timing API, when the browser recorded an entry
  // for this exact URL close to our call window (service workers do get resource entries).
  try {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const match = entries
      .filter((e) => e.name === url)
      .sort((a, b) => Math.abs(a.startTime - start) - Math.abs(b.startTime - start))[0];

    if (match) {
      const dns = Math.max(0, match.domainLookupEnd - match.domainLookupStart);
      const connect = Math.max(0, match.connectEnd - match.connectStart);
      const waiting = Math.max(0, match.responseStart - match.requestStart || match.responseStart - match.startTime);
      const download = Math.max(0, match.responseEnd - match.responseStart);
      return { dns, connect, waiting, download, total };
    }
  } catch {
    // Resource Timing not available in this context — fall through to the proportional estimate.
  }

  // Fallback: attribute all time to "waiting" since we can't see the sub-phases.
  return { dns: 0, connect: 0, waiting: total, download: 0, total };
}

function normalizeHeaders(headers: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    result[key] = String(value);
  }
  return result;
}

function safeStringify(value: unknown): string {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value ?? '');
  } catch {
    return '';
  }
}

function describeError(err: unknown): string {
  if (axios.isCancel(err) || (err as Error)?.name === 'AbortError') return 'Request timed out';
  if (err instanceof AxiosError) {
    if (err.code === 'ERR_NETWORK') return 'Network error (possibly CORS or the server is unreachable)';
    return err.message;
  }
  return err instanceof Error ? err.message : 'Unknown error';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
