import type { ApiRequest } from './ApiRequest';
import type { ApiResponse } from './ApiResponse';
import type { ResolvedParameter } from '../models/ResolvedParameter';

export type ExecutionStatus = 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';

export interface ApiExecutionResult {
  endpointId: string;
  status: ExecutionStatus;
  request: ApiRequest | null;
  response: ApiResponse | null;
  error: string | null;
  retryCount: number;
  resolvedParameters?: ResolvedParameter[];
}
