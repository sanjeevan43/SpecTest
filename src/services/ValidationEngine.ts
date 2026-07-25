import type { ApiEndpoint, ParsedApiDocument } from '../types';
import type { ApiResponse } from '../types/ApiResponse';
import type { ValidationResult } from '../models/ValidationResult';
import { ResponseValidator } from './ResponseValidator';

export class ValidationEngine {
  /**
   * Evaluates response details and calculates structural compliance scores.
   */
  public static validate(
    response: ApiResponse,
    endpoint: ApiEndpoint,
    document: ParsedApiDocument,
    settings: {
      ignoreOptionalFields: boolean;
      ignoreAdditionalProperties: boolean;
      strictMode: boolean;
    }
  ): ValidationResult {
    const startTime = Date.now();

    const { isValid, errors, warnings } = ResponseValidator.validate(
      response,
      endpoint,
      document,
      settings
    );

    // Calculate score
    const score = this.calculateScore(errors, warnings, settings.strictMode);

    return {
      endpointId: endpoint.id,
      isValid,
      score,
      errors,
      warnings,
      validationTimeMs: Date.now() - startTime,
    };
  }

  private static calculateScore(
    errors: any[],
    warnings: any[],
    strictMode: boolean
  ): number {
    let score = 100;

    // Deduct penalties
    errors.forEach((err) => {
      switch (err.errorType) {
        case 'status_mismatch':
          score -= 40;
          break;
        case 'content_type_mismatch':
          score -= 15;
          break;
        case 'missing_property':
          score -= 10;
          break;
        case 'type_mismatch':
          score -= 10;
          break;
        case 'value_out_of_bounds':
        case 'enum_violation':
        case 'format_violation':
          score -= 5;
          break;
        case 'unexpected_property':
          // additional properties error under strict mode
          score -= 5;
          break;
        default:
          score -= 5;
          break;
      }
    });

    // Deduct warnings if not strict
    if (!strictMode) {
      warnings.forEach((warn) => {
        if (warn.errorType === 'unexpected_property') {
          score -= 2; // small penalty for undocumented properties
        } else {
          score -= 1;
        }
      });
    }

    return Math.max(0, score);
  }
}
