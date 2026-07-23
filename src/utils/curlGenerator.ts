import type { HttpMethod } from '@/models/types';

export interface CurlInput {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

/** Builds a copy-pasteable curl command for a given request. Shell-escapes single quotes. */
export function generateCurl({ method, url, headers, body }: CurlInput): string {
  const parts: string[] = [`curl -X ${method.toUpperCase()}`, `'${escapeShell(url)}'`];

  for (const [key, value] of Object.entries(headers)) {
    if (!value) continue;
    parts.push(`-H '${escapeShell(`${key}: ${value}`)}'`);
  }

  if (body !== undefined && body !== null && method !== 'get' && method !== 'head') {
    const serialized = typeof body === 'string' ? body : JSON.stringify(body);
    parts.push(`-d '${escapeShell(serialized)}'`);
  }

  return parts.join(' \\\n  ');
}

function escapeShell(value: string): string {
  return value.replace(/'/g, `'\\''`);
}
