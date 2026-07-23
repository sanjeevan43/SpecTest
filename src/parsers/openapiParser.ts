import yaml from 'js-yaml';
import { resolveRefs } from './refResolver';
import type {
  ApiEndpoint,
  ApiParameter,
  HttpMethod,
  JsonSchema,
  ParamLocation,
  ParsedApiDocument,
  RequestBodyDefinition,
  ResponseDefinition,
  SecurityScheme,
} from '@/models/types';

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

/** Fetches a spec document (JSON or YAML) and returns it fully parsed + $ref-resolved. */
export async function fetchAndParseSpec(specUrl: string): Promise<ParsedApiDocument> {
  const response = await fetch(specUrl, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec (${response.status} ${response.statusText}) from ${specUrl}`);
  }
  const raw = await response.text();
  const { doc, format } = parseRaw(raw);
  const resolved = resolveRefs<Record<string, unknown>>(doc);
  return normalizeDocument(resolved, specUrl, format);
}

function parseRaw(raw: string): { doc: Record<string, unknown>; format: 'json' | 'yaml' } {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    return { doc: JSON.parse(trimmed), format: 'json' };
  }
  try {
    return { doc: JSON.parse(trimmed), format: 'json' };
  } catch {
    return { doc: yaml.load(trimmed) as Record<string, unknown>, format: 'yaml' };
  }
}

function normalizeDocument(
  doc: Record<string, unknown>,
  sourceUrl: string,
  rawFormat: 'json' | 'yaml',
): ParsedApiDocument {
  const isV3 = typeof doc.openapi === 'string';
  const info = (doc.info as Record<string, unknown>) ?? {};

  const servers = isV3 ? extractV3Servers(doc) : extractV2Servers(doc, sourceUrl);
  const baseUrl = servers[0] ?? new URL(sourceUrl).origin;

  const schemas = isV3
    ? ((doc.components as Record<string, unknown>)?.schemas as Record<string, JsonSchema>) ?? {}
    : (doc.definitions as Record<string, JsonSchema>) ?? {};

  const securitySchemes = isV3
    ? extractV3SecuritySchemes((doc.components as Record<string, unknown>)?.securityDefinitions as never ?? (doc.components as Record<string, unknown>)?.securitySchemes)
    : extractV2SecuritySchemes(doc.securityDefinitions);

  const globalSecurity = extractSecurityRequirementIds(doc.security);

  const paths = (doc.paths as Record<string, Record<string, unknown>>) ?? {};
  const endpoints: ApiEndpoint[] = [];
  const tagSet = new Set<string>();

  for (const [path, pathItem] of Object.entries(paths)) {
    const pathLevelParams = (pathItem.parameters as Record<string, unknown>[]) ?? [];

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as Record<string, unknown> | undefined;
      if (!operation) continue;

      const tags = (operation.tags as string[]) ?? ['untagged'];
      tags.forEach((t) => tagSet.add(t));

      const opParams = (operation.parameters as Record<string, unknown>[]) ?? [];
      const parameters = mergeParameters(pathLevelParams, opParams);

      const requestBody = isV3
        ? extractV3RequestBody(operation.requestBody as Record<string, unknown>)
        : extractV2BodyParam(opParams);

      const responses = extractResponses(operation.responses as Record<string, unknown>, isV3);

      const security = operation.security !== undefined
        ? extractSecurityRequirementIds(operation.security)
        : globalSecurity;

      endpoints.push({
        id: `${method}:${path}`,
        method,
        path,
        operationId: operation.operationId as string | undefined,
        summary: operation.summary as string | undefined,
        description: operation.description as string | undefined,
        tags,
        parameters,
        requestBody,
        responses,
        security,
        deprecated: Boolean(operation.deprecated),
      });
    }
  }

  return {
    title: (info.title as string) ?? 'Untitled API',
    version: (info.version as string) ?? '1.0.0',
    description: info.description as string | undefined,
    baseUrl,
    servers,
    tags: Array.from(tagSet),
    endpoints,
    securitySchemes,
    schemas,
    sourceUrl,
    rawFormat,
  };
}

function extractV3Servers(doc: Record<string, unknown>): string[] {
  const servers = (doc.servers as Array<{ url: string }>) ?? [];
  return servers.map((s) => s.url).filter(Boolean);
}

function extractV2Servers(doc: Record<string, unknown>, sourceUrl: string): string[] {
  const host = doc.host as string | undefined;
  const basePath = (doc.basePath as string) ?? '';
  const schemes = (doc.schemes as string[]) ?? ['https'];
  if (!host) return [new URL(sourceUrl).origin];
  return schemes.map((scheme) => `${scheme}://${host}${basePath}`);
}

function extractV3SecuritySchemes(raw: unknown): Record<string, SecurityScheme> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, SecurityScheme> = {};
  for (const [id, def] of Object.entries(raw as Record<string, Record<string, unknown>>)) {
    result[id] = mapSecurityScheme(id, def);
  }
  return result;
}

function extractV2SecuritySchemes(raw: unknown): Record<string, SecurityScheme> {
  return extractV3SecuritySchemes(raw);
}

function mapSecurityScheme(id: string, def: Record<string, unknown>): SecurityScheme {
  const type = def.type as string;
  if (type === 'http' && def.scheme === 'bearer') {
    return { id, type: 'bearer', scheme: 'bearer' };
  }
  if (type === 'http' && def.scheme === 'basic') {
    return { id, type: 'basic', scheme: 'basic' };
  }
  if (type === 'apiKey') {
    return { id, type: 'apiKey', name: def.name as string, in: def.in as 'header' | 'query' | 'cookie' };
  }
  if (type === 'oauth2') {
    return { id, type: 'oauth2', flows: def.flows as Record<string, unknown> };
  }
  if (type === 'basic') {
    return { id, type: 'basic', scheme: 'basic' };
  }
  return { id, type: 'bearer', scheme: 'bearer' };
}

function extractSecurityRequirementIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  for (const requirement of raw as Array<Record<string, unknown>>) {
    Object.keys(requirement).forEach((id) => ids.add(id));
  }
  return Array.from(ids);
}

function mergeParameters(
  pathLevel: Record<string, unknown>[],
  opLevel: Record<string, unknown>[],
): ApiParameter[] {
  const byKey = new Map<string, Record<string, unknown>>();
  for (const p of [...pathLevel, ...opLevel]) {
    if (p.in === 'body' || p.in === 'formData') continue; // handled as requestBody (v2)
    const key = `${p.in}:${p.name}`;
    byKey.set(key, p); // operation-level overrides path-level due to ordering
  }
  return Array.from(byKey.values()).map((p) => ({
    name: p.name as string,
    in: p.in as ParamLocation,
    required: Boolean(p.required),
    schema: (p.schema as JsonSchema) ?? (paramToSchema(p)),
    description: p.description as string | undefined,
    example: p.example,
  }));
}

/** Swagger 2.0 puts type/format directly on the parameter instead of nesting a schema. */
function paramToSchema(p: Record<string, unknown>): JsonSchema {
  return {
    type: p.type as string | undefined,
    format: p.format as string | undefined,
    enum: p.enum as unknown[] | undefined,
    default: p.default,
    items: p.items as JsonSchema | undefined,
  };
}

function extractV3RequestBody(raw: Record<string, unknown> | undefined): RequestBodyDefinition | null {
  if (!raw) return null;
  const content = (raw.content as Record<string, Record<string, unknown>>) ?? {};
  const contentType = Object.keys(content)[0] ?? 'application/json';
  const media = content[contentType] ?? {};
  return {
    required: Boolean(raw.required),
    contentType,
    schema: (media.schema as JsonSchema) ?? null,
    example: media.example ?? extractFirstExample(media.examples as Record<string, Record<string, unknown>> | undefined),
    examples: media.examples as Record<string, unknown> | undefined,
  };
}

function extractV2BodyParam(opParams: Record<string, unknown>[]): RequestBodyDefinition | null {
  const bodyParam = opParams.find((p) => p.in === 'body');
  if (bodyParam) {
    return {
      required: Boolean(bodyParam.required),
      contentType: 'application/json',
      schema: (bodyParam.schema as JsonSchema) ?? null,
      example: (bodyParam.schema as Record<string, unknown> | undefined)?.example,
    };
  }
  const formParams = opParams.filter((p) => p.in === 'formData');
  if (formParams.length > 0) {
    const properties: Record<string, JsonSchema> = {};
    formParams.forEach((p) => {
      properties[p.name as string] = paramToSchema(p);
    });
    return {
      required: formParams.some((p) => p.required),
      contentType: 'application/x-www-form-urlencoded',
      schema: { type: 'object', properties },
      example: undefined,
    };
  }
  return null;
}

function extractFirstExample(examples: Record<string, Record<string, unknown>> | undefined): unknown {
  if (!examples) return undefined;
  const first = Object.values(examples)[0];
  return first?.value;
}

function extractResponses(raw: Record<string, unknown> | undefined, isV3: boolean): ResponseDefinition[] {
  if (!raw) return [];
  return Object.entries(raw).map(([statusCode, def]) => {
    const definition = def as Record<string, unknown>;
    if (isV3) {
      const content = (definition.content as Record<string, Record<string, unknown>>) ?? {};
      const contentType = Object.keys(content)[0];
      return {
        statusCode,
        description: definition.description as string | undefined,
        contentType,
        schema: contentType ? (content[contentType].schema as JsonSchema) : null,
      };
    }
    return {
      statusCode,
      description: definition.description as string | undefined,
      contentType: 'application/json',
      schema: (definition.schema as JsonSchema) ?? null,
    };
  });
}
