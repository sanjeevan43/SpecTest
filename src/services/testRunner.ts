import { v4 as uuidv4 } from 'uuid';
import type {
  ApiEndpoint,
  AuthCredential,
  ParsedApiDocument,
  RunnerConfig,
  RunSummary,
  TestResult,
} from '@/models/types';
import { getOrderedFamilies, ResourceIdRegistry, resolveDependentParams } from './dependencyEngine';
import { buildTestCases, type TestCaseSpec } from './testCaseBuilder';
import { generateParamValues, generateRequestBody } from './dataGenerator';
import { buildAuthArtifacts } from './authManager';
import { executeRequestWithRetry } from './httpClient';
import { validateAgainstSchema } from './schemaValidator';
import { generateCurl } from '@/utils/curlGenerator';
import { resolvePath } from '@/utils/idExtractor';
import { CONTENT_TYPE_JSON } from '@/constants';

export interface RunOptions {
  document: ParsedApiDocument;
  config: RunnerConfig;
  credentials: Record<string, AuthCredential>;
  /** Restrict the run to a subset of endpoints (Run Selected / Run Tag / Retry Failed). */
  endpointFilter?: (endpoint: ApiEndpoint) => boolean;
  onProgress?: (partial: TestResult) => void;
  isStopped?: () => boolean;
}

export interface RunOutput {
  summary: RunSummary;
  results: TestResult[];
}

/** Runs every applicable test case for every endpoint, respecting dependency order + concurrency. */
export async function runTests({
  document,
  config,
  credentials,
  endpointFilter,
  onProgress,
  isStopped,
}: RunOptions): Promise<RunOutput> {
  const runId = uuidv4();
  const startedAt = Date.now();
  const registry = new ResourceIdRegistry();
  const results: TestResult[] = [];

  const endpoints = endpointFilter ? document.endpoints.filter(endpointFilter) : document.endpoints;
  const families = getOrderedFamilies(endpoints);

  // Run resource families concurrently up to `config.concurrency`, but each family internally
  // executes its endpoints (and their test-case variants) strictly in order, since later steps
  // depend on ids captured earlier in the same family.
  await runWithConcurrency(families, config.concurrency, async (family) => {
    for (const endpoint of family) {
      if (isStopped?.()) return;
      const testCases = buildTestCases(endpoint, config);
      for (const testCase of testCases) {
        if (isStopped?.()) return;
        const result = await executeTestCase(endpoint, testCase, document, config, credentials, registry);
        results.push(result);
        onProgress?.(result);
        if (config.delayBetweenRequestsMs > 0) {
          await sleep(config.delayBetweenRequestsMs);
        }
      }
    }
  });

  const finishedAt = Date.now();
  const summary = computeSummary(runId, startedAt, finishedAt, results);
  return { summary, results };
}

async function executeTestCase(
  endpoint: ApiEndpoint,
  testCase: TestCaseSpec,
  document: ParsedApiDocument,
  config: RunnerConfig,
  credentials: Record<string, AuthCredential>,
  registry: ResourceIdRegistry,
): Promise<TestResult> {
  const startedAt = Date.now();
  const grouped = generateParamValues(endpoint.parameters);

  const pathValues = {
    ...resolveDependentParams(endpoint, registry, grouped.path),
    ...testCase.pathOverrides,
  };
  const queryValues = { ...grouped.query, ...testCase.queryOverrides };
  (testCase.queryOmit ?? []).forEach((name) => delete queryValues[name]);

  const headerValues: Record<string, string> = {};
  for (const [name, value] of Object.entries(grouped.header)) {
    headerValues[name] = String(value);
  }
  Object.assign(headerValues, testCase.headerOverrides ?? {});
  (testCase.headerOmit ?? []).forEach((name) => delete headerValues[name]);

  const auth = buildAuthArtifacts(endpoint.security, credentials);
  Object.assign(headerValues, auth.headers);
  Object.assign(queryValues, auth.query);

  const baseUrl = config.baseUrlOverride || document.baseUrl;
  const resolvedPathTemplate = resolvePath(endpoint.path, pathValues);
  const url = buildUrl(baseUrl, resolvedPathTemplate, queryValues);

  const body = endpoint.requestBody ? generateRequestBody(endpoint.requestBody) : undefined;
  if (body !== undefined && !headerValues['Content-Type']) {
    headerValues['Content-Type'] = endpoint.requestBody?.contentType ?? CONTENT_TYPE_JSON;
  }

  const { result: httpResult, attempts } = await executeRequestWithRetry(
    { method: endpoint.method, url, headers: headerValues, data: body, timeoutMs: config.requestTimeoutMs },
    config.retryCount,
    config.delayBetweenRequestsMs,
  );

  if (httpResult.status && httpResult.status >= 200 && httpResult.status < 300) {
    registry.ingestResponse(httpResult.body);
  }

  const matchingResponseSchema = endpoint.responses.find((r) => r.statusCode === String(httpResult.status))?.schema;
  const schemaIssues = config.validateSchema ? validateAgainstSchema(httpResult.body, matchingResponseSchema) : [];

  const status = deriveStatus(testCase, httpResult.status, httpResult.error, schemaIssues.length > 0);

  return {
    id: uuidv4(),
    endpointId: endpoint.id,
    method: endpoint.method,
    path: endpoint.path,
    resolvedUrl: url,
    tags: endpoint.tags,
    kind: testCase.kind,
    status,
    requestHeaders: headerValues,
    requestBody: body,
    responseStatus: httpResult.status,
    responseHeaders: httpResult.headers,
    responseBody: httpResult.body,
    responseSize: httpResult.size,
    timing: httpResult.timing,
    error: httpResult.error,
    schemaIssues,
    retryCount: attempts,
    startedAt,
    finishedAt: Date.now(),
    curl: generateCurl({ method: endpoint.method, url, headers: headerValues, body }),
  };
}

function deriveStatus(
  testCase: TestCaseSpec,
  statusCode: number | undefined,
  error: string | undefined,
  hasSchemaIssues: boolean,
): TestResult['status'] {
  if (error) return 'failed';
  if (statusCode === 401 || statusCode === 403) return 'unauthorized';

  if (testCase.expectedStatuses && statusCode) {
    return testCase.expectedStatuses.includes(statusCode) ? 'passed' : 'failed';
  }

  if (testCase.kind === 'expected_404_after_delete') {
    return statusCode === 404 ? 'passed' : 'failed';
  }

  if (statusCode && statusCode >= 200 && statusCode < 300) {
    return hasSchemaIssues ? 'validation_error' : 'passed';
  }

  return 'failed';
}

function buildUrl(baseUrl: string, path: string, query: Record<string, unknown>): string {
  const url = new URL(path.startsWith('http') ? path : `${baseUrl.replace(/\/$/, '')}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function computeSummary(runId: string, startedAt: number, finishedAt: number, results: TestResult[]): RunSummary {
  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const unauthorized = results.filter((r) => r.status === 'unauthorized').length;
  const validationErrors = results.filter((r) => r.status === 'validation_error').length;

  const timedResults = results.filter((r) => r.timing);
  const averageTimeMs = timedResults.length
    ? timedResults.reduce((sum, r) => sum + (r.timing?.total ?? 0), 0) / timedResults.length
    : 0;

  const sorted = [...timedResults].sort((a, b) => (a.timing?.total ?? 0) - (b.timing?.total ?? 0));

  return {
    runId,
    startedAt,
    finishedAt,
    total: results.length,
    passed,
    failed,
    skipped,
    unauthorized,
    validationErrors,
    averageTimeMs,
    fastestEndpointId: sorted[0]?.endpointId,
    slowestEndpointId: sorted[sorted.length - 1]?.endpointId,
  };
}

/** Minimal concurrency-limited task pool (no external dep needed for this). */
async function runWithConcurrency<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item === undefined) return;
      await task(item);
    }
  });
  await Promise.all(workers);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
