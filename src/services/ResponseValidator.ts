import type { ApiEndpoint, ParsedApiDocument } from '../types';
import type { ApiResponse } from '../types/ApiResponse';
import type { ValidationError } from '../models/ValidationError';
import { JsonSchemaValidator } from './JsonSchemaValidator';

export class ResponseValidator {
  /**
   * Validates an HTTP response against the OpenAPI endpoint spec.
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
  ): { isValid: boolean; errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 1. Status Code Validation
    const actualStatus = String(response.statusCode);
    const documentedResponse = endpoint.responses.find(
      (r) => r.statusCode === actualStatus || r.statusCode === 'default'
    );

    if (!documentedResponse) {
      // Find any documented status codes to show mismatch
      const expectedCodes = endpoint.responses.map((r) => r.statusCode).join(', ');
      errors.push({
        path: 'status',
        errorType: 'status_mismatch',
        expected: `One of [${expectedCodes}]`,
        actual: actualStatus,
        message: `Status code mismatch: received undocumented status code ${actualStatus} (Expected one of [${expectedCodes}]).`,
        suggestion: 'Verify that the backend conforms to the documented HTTP status codes in the OpenAPI spec.',
      });
      return { isValid: false, errors, warnings };
    }

    // 2. Content Type Validation
    const actualContentType = response.headers['content-type'] || '';
    if (documentedResponse.contentTypes && documentedResponse.contentTypes.length > 0) {
      const match = documentedResponse.contentTypes.some((type) =>
        actualContentType.toLowerCase().includes(type.toLowerCase())
      );

      if (!match) {
        errors.push({
          path: 'headers.content-type',
          errorType: 'content_type_mismatch',
          expected: documentedResponse.contentTypes.join(' or '),
          actual: actualContentType,
          message: `Content-Type mismatch: expected header to match "${documentedResponse.contentTypes.join(' or ')}", but received "${actualContentType}".`,
          suggestion: 'Ensure the backend controller sets the proper Content-Type header in response headers.',
        });
      }
    }

    // 3. Response Body Schema Validation
    if (documentedResponse.schema && response.body !== undefined) {
      JsonSchemaValidator.validate(
        response.body,
        documentedResponse.schema,
        document,
        'body',
        errors,
        warnings,
        settings
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
