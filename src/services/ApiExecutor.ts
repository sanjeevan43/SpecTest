import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import type { ApiRequest } from '../types/ApiRequest';
import type { ApiResponse } from '../types/ApiResponse';
import { ResponseParser } from './ResponseParser';

export class ApiExecutor {
  /**
   * Executes a single API request with support for retry, cancel signal, and metrics recording.
   */
  public static async execute(
    apiRequest: ApiRequest,
    signal?: AbortSignal,
    maxRetries: number = 3,
    onRetry?: (attempt: number, error: string) => void
  ): Promise<ApiResponse> {
    let attempt = 0;
    
    // Calculate approximate request size
    const requestSize = ResponseParser.calculateSize(apiRequest.body, apiRequest.headers);

    const config: AxiosRequestConfig = {
      method: apiRequest.method,
      url: apiRequest.url,
      headers: apiRequest.headers,
      params: apiRequest.queryParams,
      data: apiRequest.body,
      signal,
      timeout: 15000, // 15 seconds timeout
      validateStatus: () => true, // Treat all responses as completed, handle status codes at parsing layer
    };

    while (true) {
      const startTime = performance.now();
      try {
        const response = await axios(config);
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        return ResponseParser.parse(response, duration, requestSize);
      } catch (err) {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        const isCancel = axios.isCancel(err) || (err instanceof Error && err.name === 'CanceledError');
        if (isCancel) {
          return {
            statusCode: 0,
            statusText: 'Request Cancelled',
            headers: {},
            body: { message: 'Execution cancelled by the user.' },
            durationMs: duration,
            requestSize,
            responseSize: 0,
          };
        }

        // Retry check for network errors or transient timeouts (non-cancel cases)
        attempt++;
        const errorMessage = this.getFriendlyErrorMessage(err);
        
        if (attempt <= maxRetries && this.isRetryableError(err)) {
          if (onRetry) {
            onRetry(attempt, errorMessage);
          }
          // Brief backoff delay
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          continue;
        }

        // Return error as a simulated response block
        return {
          statusCode: this.getErrorCode(err),
          statusText: 'Execution Error',
          headers: {},
          body: { error: errorMessage },
          durationMs: duration,
          requestSize,
          responseSize: ResponseParser.calculateSize({ error: errorMessage }),
        };
      }
    }
  }

  private static isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      // Retry on network failures or server errors (5xx), but not on client errors (4xx)
      const status = error.response?.status;
      return !status || status >= 500;
    }
    return true;
  }

  private static getErrorCode(error: unknown): number {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') return 408; // Request Timeout
      if (error.response) return error.response.status;
    }
    return 500;
  }

  private static getFriendlyErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const err = error as AxiosError;
      if (err.code === 'ERR_NETWORK') {
        return 'Network Error: Please check if the server is running and CORS allows connections from browser extensions.';
      }
      if (err.code === 'ECONNABORTED') {
        return 'Timeout Error: The server took too long to respond (timeout limit: 15s).';
      }
      if (err.response) {
        const status = err.response.status;
        const msg = (err.response.data as any)?.message || err.response.statusText;
        switch (status) {
          case 401: return 'Unauthorized: Authenticaton credentials are missing or invalid.';
          case 403: return 'Forbidden: You do not have permissions to access this endpoint.';
          case 404: return 'Not Found: The requested URL was not found on the server.';
          case 405: return 'Method Not Allowed: This request method is not supported by the path.';
          case 409: return 'Conflict: Request conflicts with the state of the target resource.';
          case 422: return 'Unprocessable Entity: The payload parameters did not satisfy server constraints.';
          case 429: return 'Too Many Requests: Rate limits exceeded. Try again later.';
          case 500: return 'Internal Server Error: The server encountered an unexpected error.';
          case 502: return 'Bad Gateway: The server received an invalid response from upstream.';
          case 503: return 'Service Unavailable: Server is overloaded or down for maintenance.';
          default:
            return `Request failed with status code ${status}: ${msg}`;
        }
      }
    }
    return error instanceof Error ? error.message : String(error);
  }
}
