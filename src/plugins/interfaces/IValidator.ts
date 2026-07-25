/**
 * @file IValidator.ts
 * @description Plugin interface for custom response/schema validators.
 *
 * Implement this interface to register a custom validator that runs
 * alongside (or instead of) the built-in JsonSchemaValidator.
 *
 * Future step: Registered validators will appear in Settings → Plugins.
 */

import type { ApiEndpoint } from '../../types';
import type { ValidationResult } from '../../models/ValidationResult';

export interface ValidatorContext {
  /** The raw response body (already parsed if JSON) */
  responseBody: unknown;
  /** HTTP status code returned by the server */
  statusCode: number;
  /** Response headers */
  responseHeaders: Record<string, string>;
  /** The endpoint specification from the parsed OpenAPI document */
  endpoint: ApiEndpoint;
  /** Key-value schema definitions from the root OpenAPI document */
  globalSchemas: Record<string, unknown>;
}

/**
 * Custom Validator plugin contract.
 *
 * @example
 * class MyValidator implements IValidator {
 *   readonly id = 'my-org.business-rules';
 *   readonly name = 'Business Rules Validator';
 *   readonly version = '1.0.0';
 *   async validate(ctx: ValidatorContext): Promise<ValidationResult> { ... }
 * }
 */
export interface IValidator {
  /** Unique reverse-domain identifier, e.g. "com.myorg.custom-validator" */
  readonly id: string;
  /** Display name shown in the Settings UI */
  readonly name: string;
  /** Semver version of this plugin */
  readonly version: string;
  /** Optional description shown in the plugin list */
  readonly description?: string;

  /**
   * Runs validation logic on the response context.
   * Must never throw — return a ValidationResult with errors instead.
   */
  validate(ctx: ValidatorContext): Promise<ValidationResult> | ValidationResult;
}
