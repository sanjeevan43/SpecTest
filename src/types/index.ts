export interface SwaggerPageInfo {
  url: string;
  detected: boolean;
  framework: string;
  detectedAt: number;
}

export type ExtensionMessage =
  | { type: 'SWAGGER_DETECTED'; payload: SwaggerPageInfo }
  | { type: 'GET_STATE' };

export interface BackgroundStateResponse {
  ok: boolean;
  detected: boolean;
  pageInfo: SwaggerPageInfo | null;
}

// --- Step 2 Types ---

export interface ApiSchema {
  type?: string;
  format?: string;
  required?: string[];
  properties?: Record<string, ApiSchema>;
  items?: ApiSchema;
  enum?: unknown[];
  nullable?: boolean;
  description?: string;
  example?: unknown;
  ref?: string;
}

export interface ApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie' | 'body';
  required: boolean;
  description?: string;
  schema?: ApiSchema;
  defaultValue?: unknown;
  example?: unknown;
}

export interface ApiRequestBody {
  contentType: string;
  required: boolean;
  description?: string;
  schema?: ApiSchema;
  example?: unknown;
  examples?: Record<string, unknown>;
}

export interface ApiResponse {
  statusCode: string;
  description: string;
  contentType?: string;
  schema?: ApiSchema;
  example?: unknown;
  examples?: Record<string, unknown>;
}

export interface ApiEndpoint {
  id: string; // generated: method + path
  method: string;
  path: string;
  summary?: string;
  description?: string;
  operationId?: string;
  tags: string[];
  consumes: string[];
  produces: string[];
  security?: Record<string, string[]>[];
  deprecated: boolean;
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: ApiResponse[];
}

export interface ParsedApiDocument {
  title: string;
  version: string;
  description?: string;
  openApiVersion: string;
  baseUrl: string;
  serverUrls: string[];
  endpoints: ApiEndpoint[];
  schemas: Record<string, ApiSchema>;
}
