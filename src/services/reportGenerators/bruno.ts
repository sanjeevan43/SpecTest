import type { ApiEndpoint, ParsedApiDocument } from '@/models/types';
import { generateParamValues, generateRequestBody } from '../dataGenerator';
import { resolvePath } from '@/utils/idExtractor';

export interface BrunoFile {
  filename: string;
  content: string;
}

/** Builds a Bruno-compatible collection: one `.bru` file per endpoint + a `bruno.json` manifest. */
export function generateBrunoCollection(document: ParsedApiDocument): BrunoFile[] {
  const files: BrunoFile[] = document.endpoints.map((endpoint) => ({
    filename: sanitizeFilename(`${endpoint.method}-${endpoint.path}`) + '.bru',
    content: buildBruFile(endpoint, document),
  }));

  files.push({
    filename: 'bruno.json',
    content: JSON.stringify(
      { version: '1', name: document.title, type: 'collection' },
      null,
      2,
    ),
  });

  return files;
}

function buildBruFile(endpoint: ApiEndpoint, document: ParsedApiDocument): string {
  const grouped = generateParamValues(endpoint.parameters);
  const resolvedPath = resolvePath(endpoint.path, grouped.path);
  const body = endpoint.requestBody ? generateRequestBody(endpoint.requestBody) : undefined;
  const method = endpoint.method;

  const queryLines = Object.entries(grouped.query)
    .map(([key, value]) => `  ${key}: ${value}`)
    .join('\n');
  const headerLines = Object.entries(grouped.header)
    .map(([key, value]) => `  ${key}: ${value}`)
    .join('\n');

  const sections = [
    `meta {\n  name: ${endpoint.summary || `${method.toUpperCase()} ${endpoint.path}`}\n  type: http\n}`,
    `${method} {\n  url: ${document.baseUrl}${resolvedPath}\n}`,
  ];

  if (queryLines) sections.push(`query {\n${queryLines}\n}`);
  if (headerLines) sections.push(`headers {\n${headerLines}\n}`);
  if (body !== undefined) {
    sections.push(`body:json {\n${JSON.stringify(body, null, 2)}\n}`);
  }

  return sections.join('\n\n');
}

function sanitizeFilename(value: string): string {
  return value.replace(/[{}]/g, '').replace(/[^a-zA-Z0-9-_/]/g, '_').replace(/\//g, '-');
}
