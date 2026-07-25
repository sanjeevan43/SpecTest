export interface ReportSummary {
  totalApis: number;
  executed: number;
  passed: number;
  failed: number;
  skipped: number;
  warnings: number;
  validationErrors: number;
  averageResponseTimeMs: number;
  medianResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  fastestApiId: string;
  fastestTimeMs: number;
  slowestApiId: string;
  slowestTimeMs: number;
  successRate: number; // 0-100
  averageValidationScore: number; // 0-100
}
