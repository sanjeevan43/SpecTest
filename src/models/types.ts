/**
 * Central domain model for Swagger API Auto Tester.
 * Every service/component imports its shapes from here to avoid duplication/drift.
 */

// ---------------------------------------------------------------------------
// HTTP primitives
// ---------------------------------------------------------------------------

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

export type ParamLocation = 'path' | 'query' | 'header' | 'cookie';

export interface ApiParameter {
  name: string;
  in: ParamLocation;
  required: boolean;
  schema: JsonSchema;
  description?: string;
  example?: unknown;
}

export interface RequestBodyDefinition {
  required: boolean;
  contentType: string;
  schema: JsonSchema | null;
  example: unknown;
  examples?: Record<string, unknown>;
}

export interface ResponseDefinition {
  statusCode: string;
  description?: string;
  contentType?: string;
  schema?: JsonSchema | null;
}

// ---------------------------------------------------------------------------
// JSON Schema (minimal subset we actually need to generate + validate data)
// ---------------------------------------------------------------------------

export interface JsonSchema {
  type?: string | string[];
  format?: string;
  enum?: unknown[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  nullable?: boolean;
  default?: unknown;
  example?: unknown;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  $ref?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  description?: string;
}

// ---------------------------------------------------------------------------
// Security / Auth
// ---------------------------------------------------------------------------

export type AuthType = 'bearer' | 'apiKey' | 'basic' | 'oauth2' | 'cookie' | 'none';

export interface SecurityScheme {
  id: string;
  type: AuthType;
  name?: string; // header/query/cookie key name for apiKey
  in?: 'header' | 'query' | 'cookie';
  scheme?: string; // e.g. "bearer"
  flows?: Record<string, unknown>;
}

export interface AuthCredential {
  schemeId: string;
  type: AuthType;
  value: string; // token, "user:pass" base64, api key value, cookie value
  headerName?: string;
  paramName?: string;
  location?: 'header' | 'query' | 'cookie';
  capturedAt: number;
  source: 'swagger-ui' | 'manual' | 'response';
}

// ---------------------------------------------------------------------------
// Parsed OpenAPI document -> internal endpoint model
// ---------------------------------------------------------------------------

export interface ApiEndpoint {
  id: string; // stable hash of method+path
  method: HttpMethod;
  path: string; // raw templated path e.g. /students/{id}
  operationId?: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: ApiParameter[];
  requestBody?: RequestBodyDefinition | null;
  responses: ResponseDefinition[];
  security: string[]; // security scheme ids required by this operation
  deprecated?: boolean;
}

export interface ParsedApiDocument {
  title: string;
  version: string;
  description?: string;
  baseUrl: string;
  servers: string[];
  tags: string[];
  endpoints: ApiEndpoint[];
  securitySchemes: Record<string, SecurityScheme>;
  schemas: Record<string, JsonSchema>;
  sourceUrl: string;
  rawFormat: 'json' | 'yaml';
}

// ---------------------------------------------------------------------------
// Dependency engine
// ---------------------------------------------------------------------------

export interface ResourceIdStore {
  // keyed by normalized param name, e.g. "id" | "studentId" -> most recent captured values
  [paramName: string]: unknown[];
}

export interface DependencyNode {
  endpointId: string;
  dependsOn: string[]; // endpointIds that must run first to supply path params
  producesParams: string[]; // path-param names this endpoint's response can satisfy
}

// ---------------------------------------------------------------------------
// Test execution
// ---------------------------------------------------------------------------

export type TestStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'unauthorized'
  | 'validation_error';

export type TestCaseKind =
  | 'happy_path'
  | 'invalid_id'
  | 'negative_id'
  | 'zero_id'
  | 'string_id'
  | 'empty_id'
  | 'null_id'
  | 'large_number_id'
  | 'missing_required_query'
  | 'invalid_query'
  | 'missing_required_header'
  | 'expected_404_after_delete';

export interface TimingBreakdown {
  dns: number;
  connect: number;
  waiting: number; // TTFB
  download: number;
  total: number;
}

export interface SchemaValidationIssue {
  path: string;
  kind: 'missing_field' | 'extra_field' | 'wrong_type';
  expected?: string;
  actual?: string;
}

export interface TestResult {
  id: string;
  endpointId: string;
  method: HttpMethod;
  path: string;
  resolvedUrl: string;
  tags: string[];
  kind: TestCaseKind;
  status: TestStatus;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  responseSize?: number;
  timing?: TimingBreakdown;
  error?: string;
  schemaIssues?: SchemaValidationIssue[];
  retryCount: number;
  startedAt: number;
  finishedAt?: number;
  curl: string;
}

export interface RunSummary {
  runId: string;
  startedAt: number;
  finishedAt?: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  unauthorized: number;
  validationErrors: number;
  averageTimeMs: number;
  fastestEndpointId?: string;
  slowestEndpointId?: string;
}

export interface HistoryEntry {
  summary: RunSummary;
  results: TestResult[];
  sourceUrl: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface RunnerConfig {
  concurrency: number;
  retryCount: number;
  requestTimeoutMs: number;
  delayBetweenRequestsMs: number;
  baseUrlOverride: string | null;
  ignoreSsl: boolean;
  autoRunOnPageLoad: boolean;
  runNegativeTests: boolean;
  runQueryParamTests: boolean;
  runHeaderTests: boolean;
  validateSchema: boolean;
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_RUNNER_CONFIG: RunnerConfig = {
  concurrency: 4,
  retryCount: 3,
  requestTimeoutMs: 15000,
  delayBetweenRequestsMs: 50,
  baseUrlOverride: null,
  ignoreSsl: false,
  autoRunOnPageLoad: false,
  runNegativeTests: true,
  runQueryParamTests: true,
  runHeaderTests: true,
  validateSchema: true,
  theme: 'system',
};

// ---------------------------------------------------------------------------
// Messaging (background <-> content <-> sidebar <-> popup)
// ---------------------------------------------------------------------------

export type ExtensionMessageType =
  | 'SWAGGER_DETECTED'
  | 'SWAGGER_NOT_FOUND'
  | 'PARSE_DOCUMENT'
  | 'DOCUMENT_PARSED'
  | 'CAPTURE_AUTH'
  | 'AUTH_CAPTURED'
  | 'RUN_ALL'
  | 'RUN_SELECTED'
  | 'RUN_TAG'
  | 'RUN_FAILED'
  | 'RETRY_FAILED'
  | 'STOP_RUN'
  | 'CLEAR_RESULTS'
  | 'TEST_PROGRESS'
  | 'RUN_COMPLETE'
  | 'OPEN_SIDEBAR'
  | 'TOGGLE_SIDEBAR'
  | 'GET_STATE'
  | 'STATE_UPDATE';

export interface ExtensionMessage<T = unknown> {
  type: ExtensionMessageType;
  payload?: T;
  tabId?: number;
}

export interface SwaggerPageInfo {
  tabId: number;
  url: string;
  detectedAt: number;
  specUrl: string | null;
  framework:
    | 'swagger-ui'
    | 'spring-boot'
    | 'fastapi'
    | 'nestjs'
    | 'aspnet'
    | 'django'
    | 'express'
    | 'unknown';
}
