import type { ReportSummary } from './ReportSummary';

export interface ApiExecutionDetail {
  id: string; // e.g. "GET /pets"
  method: string;
  path: string;
  statusCode?: number;
  statusText?: string;
  durationMs: number;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled' | 'skipped';
  validationScore?: number;
  validationErrors: string[];
  requestHeaders: Record<string, string>;
  requestBody?: string;
  responseHeaders: Record<string, string>;
  responseBody?: string;
  resolvedParameters: Record<string, string>;
}

export interface TestCaseExecutionDetail {
  id: string;
  name: string;
  type: string; // positive, negative, etc.
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  durationMs: number;
  expectedResult: string;
  actualResult: string;
  validationScore?: number;
}

export interface Report {
  id: string;
  title: string;
  swaggerTitle: string;
  baseUrl: string;
  executionDate: string; // ISO string
  durationMs: number;
  environmentName: string;
  authMethod: string;
  summary: ReportSummary;
  apis: ApiExecutionDetail[];
  testCases: TestCaseExecutionDetail[];
}
