import type { ApiSchema, ParsedApiDocument } from '../types';
import type { ValidationError } from '../models/ValidationError';
import { JsonSchemaValidator } from './JsonSchemaValidator';

export class SchemaValidator {
  /**
   * High-level validation of payload against schema.
   */
  public static validatePayload(
    payload: unknown,
    schema: ApiSchema,
    document: ParsedApiDocument,
    settings: {
      ignoreOptionalFields: boolean;
      ignoreAdditionalProperties: boolean;
      strictMode: boolean;
    }
  ): { errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    JsonSchemaValidator.validate(
      payload,
      schema,
      document,
      'body',
      errors,
      warnings,
      settings
    );

    return { errors, warnings };
  }
}
