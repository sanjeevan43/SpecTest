import type { Report, ApiExecutionDetail, TestCaseExecutionDetail } from '../models/Report';
import type { ReportSummary } from '../models/ReportSummary';
import { useApiStore } from '../store/apiStore';
import { useTestStore } from '../store/testStore';
import { useValidationStore } from '../store/validationStore';
import { useEnvironmentStore } from '../store/environmentStore';
import { useAuthenticationStore } from '../store/authenticationStore';

export class ReportGenerator {
  /**
   * Orchestrates the aggregation of active run results into a cohesive Report model.
   */
  public static generateReport(title: string): Report {
    const apiState = useApiStore.getState();
    const testState = useTestStore.getState();
    const validationState = useValidationStore.getState();
    const envState = useEnvironmentStore.getState();
    const authState = useAuthenticationStore.getState();

    const now = new Date().toISOString();
    const activeEnv = envState.environments.find((e) => e.id === envState.selectedEnvironmentId);
    const envName = activeEnv ? activeEnv.name : 'Default';

    // 1. Gather API executions
    const apis: ApiExecutionDetail[] = [];
    const executionTimes: number[] = [];
    let passedApis = 0;
    let failedApis = 0;
    let totalValidationScoreSum = 0;
    let validationCount = 0;
    let totalValidationErrors = 0;

    const endpoints = apiState.document?.endpoints || [];
    endpoints.forEach((ep) => {
      const runRes = apiState.executionResults[ep.id];
      const valRes = validationState.validationResults[ep.id];

      if (runRes) {
        if (runRes.status === 'passed') passedApis++;
        if (runRes.status === 'failed') failedApis++;
        executionTimes.push(runRes.durationMs || 0);

        let valErrorsList: string[] = [];
        if (valRes) {
          valErrorsList = valRes.errors.map((e) => `${e.path}: ${e.message}`);
          totalValidationScoreSum += valRes.score;
          validationCount++;
          totalValidationErrors += valRes.errors.length;
        }

        apis.push({
          id: ep.id,
          method: ep.method,
          path: ep.path,
          statusCode: runRes.response?.statusCode,
          statusText: runRes.response?.statusText,
          durationMs: runRes.durationMs || 0,
          status: runRes.status,
          validationScore: valRes?.score,
          validationErrors: valErrorsList,
          requestHeaders: runRes.request?.headers || {},
          requestBody: runRes.request?.body ? JSON.stringify(runRes.request.body) : undefined,
          responseHeaders: runRes.response?.headers || {},
          responseBody: runRes.response?.body ? JSON.stringify(runRes.response.body) : undefined,
          resolvedParameters: runRes.request?.pathParams || {},
        });
      }
    });

    // 2. Gather Test cases
    const testCases: TestCaseExecutionDetail[] = [];
    const allScenarios = Object.values(testState.scenarios).flat();
    allScenarios.forEach((tc) => {
      const testVal = validationState.validationResults[`${tc.endpointId}-test-${tc.id}`];
      testCases.push({
        id: tc.id,
        name: tc.name,
        type: tc.type,
        status: tc.status,
        durationMs: tc.result?.actualDurationMs || 0,
        expectedResult: `Status codes: [${tc.assertions.expectedStatusCodes.join(', ')}]`,
        actualResult: tc.result?.actualStatusCode ? `Received status: ${tc.result.actualStatusCode}` : 'N/A',
        validationScore: testVal?.score,
      });
    });

    // 3. Compute stats
    const totalApis = endpoints.length;
    const executed = apis.length;
    const successRate = executed > 0 ? Math.round((passedApis / executed) * 100) : 0;
    const averageValidationScore = validationCount > 0 ? Math.round(totalValidationScoreSum / validationCount) : 100;

    const sortedTimes = [...executionTimes].sort((a, b) => a - b);
    const totalTimes = executionTimes.reduce((acc, t) => acc + t, 0);
    const averageResponseTimeMs = executionTimes.length > 0 ? Math.round(totalTimes / executionTimes.length) : 0;
    
    const medianResponseTimeMs = sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length / 2)] : 0;
    const p95ResponseTimeMs = sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length * 0.95)] : 0;
    const p99ResponseTimeMs = sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length * 0.99)] : 0;

    let fastestApiId = '';
    let fastestTimeMs = Infinity;
    let slowestApiId = '';
    let slowestTimeMs = -Infinity;

    apis.forEach((a) => {
      if (a.durationMs < fastestTimeMs) {
        fastestTimeMs = a.durationMs;
        fastestApiId = a.id;
      }
      if (a.durationMs > slowestTimeMs) {
        slowestTimeMs = a.durationMs;
        slowestApiId = a.id;
      }
    });

    if (fastestTimeMs === Infinity) fastestTimeMs = 0;
    if (slowestTimeMs === -Infinity) slowestTimeMs = 0;

    const summary: ReportSummary = {
      totalApis,
      executed,
      passed: passedApis,
      failed: failedApis,
      skipped: totalApis - executed,
      warnings: 0,
      validationErrors: totalValidationErrors,
      averageResponseTimeMs,
      medianResponseTimeMs,
      p95ResponseTimeMs,
      p99ResponseTimeMs,
      fastestApiId,
      fastestTimeMs,
      slowestApiId,
      slowestTimeMs,
      successRate,
      averageValidationScore,
    };

    return {
      id: crypto.randomUUID(),
      title,
      swaggerTitle: apiState.document?.title || 'OpenAPI Specification',
      baseUrl: apiState.selectedServerUrl || '',
      executionDate: now,
      durationMs: totalTimes,
      environmentName: envName,
      authMethod: authState.currentAuth.method,
      summary,
      apis,
      testCases,
    };
  }
}
