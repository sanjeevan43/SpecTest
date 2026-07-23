import type { ApiEndpoint, ParsedApiDocument } from '@/models/types';
import { generateParamValues, generateRequestBody } from '../dataGenerator';
import { resolvePath } from '@/utils/idExtractor';

interface PostmanItem {
  name: string;
  request: {
    method: string;
    header: Array<{ key: string; value: string }>;
    url: { raw: string; host: string[]; path: string[]; query?: Array<{ key: string; value: string }> };
    body?: { mode: 'raw'; raw: string; options: { raw: { language: 'json' } } };
  };
}

/** Builds a Postman Collection v2.1 JSON object, one request per documented endpoint. */
export function generatePostmanCollection(document: ParsedApiDocument): object {
  const items: PostmanItem[] = document.endpoints.map((endpoint) => buildItem(endpoint));

  return {
    info: {
      name: document.title,
      description: document.description ?? '',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
    variable: [{ key: 'baseUrl', value: document.baseUrl }],
  };
}

function buildItem(endpoint: ApiEndpoint): PostmanItem {
  const grouped = generateParamValues(endpoint.parameters);
  const resolvedPath = resolvePath(endpoint.path, grouped.path);
  const body = endpoint.requestBody ? generateRequestBody(endpoint.requestBody) : undefined;

  const query = Object.entries(grouped.query).map(([key, value]) => ({ key, value: String(value) }));
  const headers = Object.entries(grouped.header).map(([key, value]) => ({ key, value: String(value) }));

  return {
    name: endpoint.summary || `${endpoint.method.toUpperCase()} ${endpoint.path}`,
    request: {
      method: endpoint.method.toUpperCase(),
      header: headers,
      url: {
        raw: `{{baseUrl}}${resolvedPath}`,
        host: ['{{baseUrl}}'],
        path: resolvedPath.split('/').filter(Boolean),
        query: query.length ? query : undefined,
      },
      body: body !== undefined ? { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } } : undefined,
    },
  };
}
