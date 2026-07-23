import type { ParsedApiDocument } from '@/models/types';
import { generateParamValues, generateRequestBody } from '../dataGenerator';
import { resolvePath } from '@/utils/idExtractor';

/** Builds a `.http` file (VS Code REST Client / JetBrains HTTP Client compatible), one block per endpoint. */
export function generateHttpFile(document: ParsedApiDocument): string {
  const blocks = document.endpoints.map((endpoint) => {
    const grouped = generateParamValues(endpoint.parameters);
    const resolvedPath = resolvePath(endpoint.path, grouped.path);
    const query = Object.entries(grouped.query)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    const url = `${document.baseUrl}${resolvedPath}${query ? `?${query}` : ''}`;
    const headerLines = Object.entries(grouped.header)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    const body = endpoint.requestBody ? generateRequestBody(endpoint.requestBody) : undefined;

    const lines = [
      `### ${endpoint.summary || endpoint.operationId || `${endpoint.method.toUpperCase()} ${endpoint.path}`}`,
      `${endpoint.method.toUpperCase()} ${url} HTTP/1.1`,
    ];
    if (headerLines) lines.push(headerLines);
    if (body !== undefined) {
      lines.push('Content-Type: application/json', '', JSON.stringify(body, null, 2));
    }
    return lines.join('\n');
  });

  return blocks.join('\n\n');
}
