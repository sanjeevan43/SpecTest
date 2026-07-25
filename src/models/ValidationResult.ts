import type { ValidationError } from './ValidationError';

export interface ValidationResult {
  endpointId: string;
  isValid: boolean;
  score: number; // 0 to 100
  errors: ValidationError[];
  warnings: ValidationError[];
  validationTimeMs: number;
}
