import type { ApiRequest } from '../types/ApiRequest';
import type { ApiResponse } from '../types/ApiResponse';

export type TestCaseType = 'positive' | 'negative' | 'boundary' | 'validation';
export type TestCaseStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface TestCaseAssertions {
  expectedStatusCodes: number[];
  expectedContentType?: string;
  maxDurationMs?: number;
}

export interface TestCase {
  id: string; // e.g. "studentId-positive-1"
  name: string;
  endpointId: string;
  type: TestCaseType;
  requestOverrides: Partial<ApiRequest>;
  assertions: TestCaseAssertions;
  status: TestCaseStatus;
  result: {
    actualStatusCode?: number;
    actualDurationMs?: number;
    response?: ApiResponse;
    error?: string;
  } | null;
}
