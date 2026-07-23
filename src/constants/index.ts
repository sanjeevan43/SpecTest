/** Shared constants — no magic strings scattered across the codebase. */

export const SWAGGER_URL_PATTERNS: RegExp[] = [
  /\/swagger(?:[/?#]|$)/i,
  /\/swagger-ui(?:[/?#]|$)/i,
  /\/swagger\/index\.html/i,
  /\/openapi(?:[/?#]|$)/i,
  /\/api-docs(?:[/?#]|$)/i,
  /\/redoc(?:[/?#]|$)/i,
];

/** Common spec locations to probe relative to origin when auto-discovering the JSON/YAML doc. */
export const COMMON_SPEC_PATHS: string[] = [
  '/v3/api-docs',
  '/v2/api-docs',
  '/swagger/v1/swagger.json',
  '/swagger/v1/swagger.yaml',
  '/openapi.json',
  '/openapi.yaml',
  '/api-docs.json',
  '/api-docs',
  '/swagger.json',
  '/swagger.yaml',
];

/** Known path-parameter identifiers we should specifically understand & chain (spec's example list, generalized). */
export const KNOWN_ID_PARAM_NAMES: string[] = [
  'id',
  'userId',
  'studentId',
  'parentId',
  'driverId',
  'busId',
  'routeId',
  'orderId',
  'productId',
  'classId',
  'customerId',
  'accountId',
  'itemId',
  'invoiceId',
  'employeeId',
  'departmentId',
];

export const NEGATIVE_ID_TEST_CASES = [
  { kind: 'invalid_id', value: 'invalid-id-999999' },
  { kind: 'negative_id', value: -1 },
  { kind: 'zero_id', value: 0 },
  { kind: 'string_id', value: 'abc' },
  { kind: 'empty_id', value: '' },
  { kind: 'null_id', value: null },
  { kind: 'large_number_id', value: 9007199254740991 },
] as const;

export const EXPECTED_ERROR_CODES = [400, 401, 403, 404, 422];

export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  HISTORY: 'history',
  REPORTS: 'reports',
  TOKENS: 'tokens',
  PREFERENCES: 'preferences',
  LAST_DOCUMENT: 'lastDocument',
  SWAGGER_PAGES: 'swaggerPages',
} as const;

export const MAX_HISTORY_ENTRIES = 20;

export const DEFAULT_CONCURRENCY = 4;
export const DEFAULT_RETRY_COUNT = 3;
export const DEFAULT_TIMEOUT_MS = 15000;

/** Framework fingerprints used to label the detected Swagger flavor for nicer UX copy. */
export const FRAMEWORK_FINGERPRINTS: Array<{
  match: RegExp;
  framework:
    | 'spring-boot'
    | 'fastapi'
    | 'nestjs'
    | 'aspnet'
    | 'django'
    | 'express'
    | 'swagger-ui';
}> = [
  { match: /springfox|springdoc/i, framework: 'spring-boot' },
  { match: /fastapi/i, framework: 'fastapi' },
  { match: /nestjs/i, framework: 'nestjs' },
  { match: /swashbuckle|asp\.net/i, framework: 'aspnet' },
  { match: /drf-yasg|django/i, framework: 'django' },
  { match: /swagger-jsdoc|express/i, framework: 'express' },
];

export const CONTENT_TYPE_JSON = 'application/json';
