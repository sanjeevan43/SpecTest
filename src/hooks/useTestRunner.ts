import { useState, useRef } from 'react';
import { useTestStore } from '../store/testStore';
import { useApiStore } from '../store/apiStore';
import { TestCaseGenerator } from '../services/TestCaseGenerator';
import { RequestBuilder } from '../services/RequestBuilder';
import { ApiExecutor } from '../services/ApiExecutor';
import { DependencyResolver } from '../services/DependencyResolver';
import { useValidationStore } from '../store/validationStore';
import { ValidationEngine } from '../services/ValidationEngine';
import { AuthInterceptor } from '../services/AuthInterceptor';
import { AuthenticationManager } from '../services/AuthenticationManager';
import type { TestCase } from '../models/TestCase';
import type { ApiEndpoint } from '../types';

export function useTestRunner() {
  const { scenarios, settings, setScenarios, updateTestCase } = useTestStore();
  const { document, selectedServerUrl } = useApiStore();
  const [isRunningSuite, setIsRunningSuite] = useState(false);
  const activeAbortControllers = useRef<Map<string, AbortController>>(new Map());

  /**
   * Generates all test cases for the parsed document.
   */
  const generateAllTests = (): void => {
    if (!document) return;
    const generated = TestCaseGenerator.generate(document, settings);
    setScenarios(generated);
  };

  /**
   * Executes a single test case.
   */
  const runTestCase = async (endpoint: ApiEndpoint, testCase: TestCase): Promise<void> => {
    if (!selectedServerUrl || !document) return;

    // Abort if already running
    const existing = activeAbortControllers.current.get(testCase.id);
    if (existing) {
      existing.abort();
    }

    const controller = new AbortController();
    activeAbortControllers.current.set(testCase.id, controller);

    updateTestCase(endpoint.id, testCase.id, {
      status: 'running',
      result: null,
    });

    try {
      // 1. Resolve path parameters
      const executeCollectionFetch = async (collectionEndpoint: ApiEndpoint): Promise<unknown> => {
        const reqObj = RequestBuilder.build(collectionEndpoint, selectedServerUrl);
        const resObj = await ApiExecutor.execute(reqObj, undefined, 0);
        return resObj.body;
      };

      const resolvedParams = await DependencyResolver.resolveEndpointParameters(
        endpoint,
        document,
        executeCollectionFetch
      );

      const paramOverrides: Record<string, string> = {};
      resolvedParams.forEach((rp) => {
        paramOverrides[rp.name] = rp.value;
      });

      // Apply path param overrides from test case if any
      if (testCase.requestOverrides.pathParams) {
        Object.assign(paramOverrides, testCase.requestOverrides.pathParams);
      }

      // 2. Harvest credentials entered in Swagger UI dynamically
      await AuthenticationManager.harvestSwaggerAuth();

      // 3. Build base request
      let request = RequestBuilder.build(endpoint, selectedServerUrl, paramOverrides);

      // Inject Authorization details
      request = AuthInterceptor.inject(request);

      // Apply query overrides
      if (testCase.requestOverrides.queryParams) {
        request.queryParams = {
          ...request.queryParams,
          ...testCase.requestOverrides.queryParams,
        };
      }

      // Apply body overrides
      if (testCase.requestOverrides.body !== undefined) {
        request.body = testCase.requestOverrides.body;
      }

      // Apply header overrides
      if (testCase.requestOverrides.headers) {
        request.headers = {
          ...request.headers,
          ...testCase.requestOverrides.headers,
        };
      }

      // Re-build target url with modified query params
      const qParams = new URLSearchParams();
      Object.keys(request.queryParams).forEach((k) => qParams.append(k, request.queryParams[k]));
      const qStr = qParams.toString();
      const baseUrlPart = request.url.split('?')[0];
      request.url = qStr ? `${baseUrlPart}?${qStr}` : baseUrlPart;

      // 3. Execute request
      const response = await ApiExecutor.execute(request, controller.signal, 1);

      // 4. Assertions Evaluation
      let testPassed = true;
      let assertionError: string | undefined;

      // Expected Status Codes
      if (!testCase.assertions.expectedStatusCodes.includes(response.statusCode)) {
        testPassed = false;
        assertionError = `Expected status code in [${testCase.assertions.expectedStatusCodes.join(', ')}], but got ${response.statusCode}`;
      }

      // Expected Response Type (e.g. json vs text)
      if (testPassed && testCase.assertions.expectedContentType) {
        const actualType = response.headers['content-type'] || '';
        if (!actualType.toLowerCase().includes(testCase.assertions.expectedContentType.toLowerCase())) {
          testPassed = false;
          assertionError = `Expected content type "${testCase.assertions.expectedContentType}", but got "${actualType}"`;
        }
      }

      // Response Time Threshold
      if (testPassed && testCase.assertions.maxDurationMs) {
        if (response.durationMs > testCase.assertions.maxDurationMs) {
          testPassed = false;
          assertionError = `Response time (${response.durationMs}ms) exceeded threshold of ${testCase.assertions.maxDurationMs}ms`;
        }
      }

      // Run OpenAPI Validation
      const validationState = useValidationStore.getState();
      if (validationState.settings.enableValidation) {
        const valResult = ValidationEngine.validate(
          response,
          endpoint,
          document,
          validationState.settings
        );
        validationState.setValidationResult(`${endpoint.id}-test-${testCase.id}`, valResult);
      }

      updateTestCase(endpoint.id, testCase.id, {
        status: testPassed ? 'passed' : 'failed',
        result: {
          actualStatusCode: response.statusCode,
          actualDurationMs: response.durationMs,
          response,
          error: assertionError,
        },
      });
    } catch (err) {
      updateTestCase(endpoint.id, testCase.id, {
        status: 'failed',
        result: {
          error: err instanceof Error ? err.message : String(err),
        },
      });
    } finally {
      activeAbortControllers.current.delete(testCase.id);
    }
  };

  /**
   * Runs all test cases in a scenario or endpoint.
   */
  const runEndpointSuite = async (endpoint: ApiEndpoint, typeFilter?: string): Promise<void> => {
    const list = scenarios[endpoint.id] || [];
    const targets = list.filter((tc) => !typeFilter || tc.type === typeFilter);

    for (const tc of targets) {
      await runTestCase(endpoint, tc);
    }
  };

  /**
   * Runs all generated test cases for all endpoints.
   */
  const runAllScenarios = async (typeFilter?: string): Promise<void> => {
    if (!document) return;
    setIsRunningSuite(true);

    for (const endpoint of document.endpoints) {
      await runEndpointSuite(endpoint, typeFilter);
    }

    setIsRunningSuite(false);
  };

  return {
    generateAllTests,
    runTestCase,
    runEndpointSuite,
    runAllScenarios,
    isRunningSuite,
  };
}
