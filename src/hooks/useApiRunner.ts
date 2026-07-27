import { useRef, useState } from 'react';
import { useApiStore } from '../store/apiStore';
import { RequestBuilder } from '../services/RequestBuilder';
import { ApiExecutor } from '../services/ApiExecutor';
import { DependencyResolver } from '../services/DependencyResolver';
import { WorkflowEngine } from '../services/WorkflowEngine';
import { IdResolver } from '../services/IdResolver';
import { useValidationStore } from '../store/validationStore';
import { ValidationEngine } from '../services/ValidationEngine';
import { AuthInterceptor } from '../services/AuthInterceptor';
import { AuthenticationManager } from '../services/AuthenticationManager';
import type { ApiEndpoint } from '../types';

export function useApiRunner() {
  const {
    document,
    selectedServerUrl,
    updateExecutionResult,
    executionResults,
  } = useApiStore();

  const [isRunningAll, setIsRunningAll] = useState(false);
  const activeControllers = useRef<Map<string, AbortController>>(new Map());
  const stopRequested = useRef(false);

  /**
   * Runs a single endpoint by ID.
   */
  const runEndpoint = async (endpointId: string): Promise<void> => {
    if (!document || !selectedServerUrl) return;

    const endpoint = document.endpoints.find((e) => e.id === endpointId);
    if (!endpoint) return;

    // Abort existing run for this endpoint if any
    const existingController = activeControllers.current.get(endpointId);
    if (existingController) {
      existingController.abort();
    }

    const controller = new AbortController();
    activeControllers.current.set(endpointId, controller);

    updateExecutionResult(endpointId, {
      status: 'running',
      error: null,
      request: null,
      response: null,
      retryCount: 0,
      resolvedParameters: [],
    });

    try {
      // 1. Resolve path parameters
      const executeCollectionFetch = async (collectionEndpoint: ApiEndpoint): Promise<unknown> => {
        const reqObj = RequestBuilder.build(collectionEndpoint, selectedServerUrl);
        const resObj = await ApiExecutor.execute(reqObj, undefined, 0); // no retry
        return resObj.body;
      };

      const resolvedParams = await DependencyResolver.resolveEndpointParameters(
        endpoint,
        document,
        executeCollectionFetch
      );

      // Save resolved parameters details to store immediately so UI updates
      updateExecutionResult(endpointId, { resolvedParameters: resolvedParams });

      // Check if any path parameter is unresolved/missing
      const missing = resolvedParams.filter((rp) => rp.source === 'missing');
      if (missing.length > 0) {
        updateExecutionResult(endpointId, {
          status: 'failed',
          error: `Missing Parameter: Path parameter(s) [${missing.map((m) => m.name).join(', ')}] could not be resolved.`,
        });
        return;
      }

      // Convert resolved parameters array to record
      const paramOverrides: Record<string, string> = {};
      resolvedParams.forEach((rp) => {
        paramOverrides[rp.name] = rp.value;
      });

      // 2. Harvest credentials entered in Swagger UI dynamically
      await AuthenticationManager.harvestSwaggerAuth();

      // 3. Build request with resolved overrides
      let request = RequestBuilder.build(endpoint, selectedServerUrl, paramOverrides);

      // Inject Authorization details
      request = AuthInterceptor.inject(request);
      updateExecutionResult(endpointId, { request });

      // 4. Execute
      const response = await ApiExecutor.execute(
        request,
        controller.signal,
        3, // max 3 retries
        (attempt, errorMsg) => {
          updateExecutionResult(endpointId, {
            retryCount: attempt,
            error: `Retry ${attempt}/3: ${errorMsg}`,
          });
        }
      );

      const isCancelled = response.statusText === 'Request Cancelled';
      const isSuccess = response.statusCode >= 200 && response.statusCode < 300;
      const status = response.statusCode >= 200 && response.statusCode < 400 ? 'passed' : 'failed';

      updateExecutionResult(endpointId, {
        status: isCancelled ? 'cancelled' : status,
        response,
        durationMs: response.durationMs,
        error: response.statusCode >= 400 || isCancelled ? response.statusText || 'Error response received' : null,
      });

      // 3.5. Run OpenAPI Validation
      const validationState = useValidationStore.getState();
      if (validationState.settings.enableValidation && !isCancelled) {
        const valResult = ValidationEngine.validate(
          response,
          endpoint,
          document,
          validationState.settings
        );
        validationState.setValidationResult(endpointId, valResult);
      }

      // 4. Post-execution hooks: Token and ID harvesting on success
      if (isSuccess && response.body) {
        // If login endpoint, extract auth tokens
        if (WorkflowEngine.isLoginPath(endpoint.path)) {
          WorkflowEngine.extractAndSaveAuthToken(response.body);
        }
        // Scan for returned IDs to harvest entities
        IdResolver.harvest(response.body, `${endpoint.method} ${endpoint.path}`);
      }
    } catch (err) {
      updateExecutionResult(endpointId, {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      activeControllers.current.delete(endpointId);
    }
  };

  /**
   * Runs all endpoints sequentially in workflow sorted order.
   */
  const runAll = async (endpointsList?: ApiEndpoint[]): Promise<void> => {
    const list = endpointsList || document?.endpoints || [];
    if (list.length === 0) return;

    // Apply logical workflow ordering (Login -> Create -> Read -> Update -> Delete)
    let sortedList = WorkflowEngine.sortEndpoints(list);

    try {
      const aiStore = (await import('../store/aiStore')).useAIStore.getState();
      if (aiStore.enabled && document) {
        const { WorkflowGenerator } = await import('../services/WorkflowGenerator');
        sortedList = await WorkflowGenerator.sortEndpointsWithAI(sortedList, document);
      }
    } catch (e) {
      console.warn('[AI Workflow Sort] Failed to sort with AI, using default order.', e);
    }

    setIsRunningAll(true);
    stopRequested.current = false;

    for (const ep of sortedList) {
      if (stopRequested.current) {
        break;
      }
      await runEndpoint(ep.id);
    }

    setIsRunningAll(false);
  };

  /**
   * Stops/cancels all running operations.
   */
  const stop = (): void => {
    stopRequested.current = true;
    
    activeControllers.current.forEach((controller, endpointId) => {
      controller.abort();
      updateExecutionResult(endpointId, {
        status: 'cancelled',
        error: 'Execution stopped by user.',
      });
    });

    activeControllers.current.clear();
    setIsRunningAll(false);
  };

  /**
   * Retries only the endpoints that have failed.
   */
  const retryFailed = async (): Promise<void> => {
    if (!document) return;

    const failedEndpoints = document.endpoints.filter((ep) => {
      const result = executionResults[ep.id];
      return result && (result.status === 'failed' || result.status === 'cancelled');
    });

    if (failedEndpoints.length === 0) return;

    await runAll(failedEndpoints);
  };

  return {
    runEndpoint,
    runAll,
    stop,
    retryFailed,
    isRunningAll,
    activeCount: activeControllers.current.size,
  };
}
