import type { ApiEndpoint } from '../types';
import type { TestCase } from '../models/TestCase';
import { SchemaDataGenerator } from './SchemaDataGenerator';

export class PositiveTestGenerator {
  /**
   * Generates a set of positive test cases for an endpoint.
   */
  public static generate(
    endpoint: ApiEndpoint,
    schemaGen: SchemaDataGenerator
  ): TestCase[] {
    const testCases: TestCase[] = [];

    // Base positive test case
    const requestOverrides: any = {};

    // 1. Generate query overrides using defaults
    const queryParams: Record<string, string> = {};
    endpoint.parameters.forEach((param) => {
      if (param.in === 'query') {
        const val = param.defaultValue ?? param.example ?? (param.schema ? schemaGen.generateValid(param.schema) : 'value');
        queryParams[param.name] = String(val);
      }
    });
    if (Object.keys(queryParams).length > 0) {
      requestOverrides.queryParams = queryParams;
    }

    // 2. Generate valid request body
    if (endpoint.requestBody) {
      let body: unknown = null;
      if (endpoint.requestBody.example !== undefined) {
        body = endpoint.requestBody.example;
      } else if (endpoint.requestBody.schema) {
        body = schemaGen.generateValid(endpoint.requestBody.schema);
      }
      requestOverrides.body = body;
    }

    // Determine expected status code from spec
    const successStatus = endpoint.responses.find((r) => r.statusCode.startsWith('2') || r.statusCode.startsWith('3'));
    const expectedCode = successStatus ? parseInt(successStatus.statusCode, 10) : 200;

    testCases.push({
      id: `${endpoint.id}-positive-base`,
      name: 'Valid Request (Happy Path)',
      endpointId: endpoint.id,
      type: 'positive',
      requestOverrides,
      assertions: {
        expectedStatusCodes: [expectedCode, 200, 201, 204],
        maxDurationMs: 1500, // 1.5 seconds threshold
      },
      status: 'pending',
      result: null,
    });

    return testCases;
  }
}
