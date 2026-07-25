/**
 * @file ITestGenerator.ts
 * @description Plugin interface for custom test case generators.
 *
 * Implement this interface to contribute additional test scenario types
 * (e.g., security fuzzing, OWASP Top-10, contract tests) without modifying
 * the built-in TestCaseGenerator pipeline.
 */

import type { ApiEndpoint } from '../../types';
import type { TestCase } from '../../models/TestCase';

export interface TestGeneratorContext {
  /** The endpoint specification to generate tests for */
  endpoint: ApiEndpoint;
  /** All schema definitions from the OpenAPI document */
  globalSchemas: Record<string, unknown>;
  /** Maximum number of test cases to generate */
  maxTestCases: number;
}

/**
 * Custom Test Generator plugin contract.
 *
 * @example
 * class OwaspFuzzGenerator implements ITestGenerator {
 *   readonly id = 'com.myorg.owasp-fuzz';
 *   readonly name = 'OWASP Top-10 Fuzzer';
 *   readonly type = 'security';
 *   generate(ctx): TestCase[] { ... }
 * }
 */
export interface ITestGenerator {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  /**
   * Category label used to group generated test cases in the UI.
   * Built-in types: 'positive' | 'negative' | 'boundary' | 'validation'
   */
  readonly type: string;

  /**
   * Generates test cases for the given endpoint.
   * Return an empty array if no tests apply to this endpoint.
   */
  generate(ctx: TestGeneratorContext): TestCase[] | Promise<TestCase[]>;
}
