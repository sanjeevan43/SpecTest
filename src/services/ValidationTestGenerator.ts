import type { ApiEndpoint } from '../types';
import type { TestCase } from '../models/TestCase';
import { SchemaDataGenerator } from './SchemaDataGenerator';

export class ValidationTestGenerator {
  /**
   * Generates validation-specific test cases for an endpoint.
   */
  public static generate(
    endpoint: ApiEndpoint,
    schemaGen: SchemaDataGenerator
  ): TestCase[] {
    const testCases: TestCase[] = [];

    // 1. Missing Required Query Parameters
    const requiredQueryParams = endpoint.parameters.filter(
      (p) => p.in === 'query' && p.required
    );

    if (requiredQueryParams.length > 0) {
      requiredQueryParams.forEach((param) => {
        testCases.push({
          id: `${endpoint.id}-validation-missing-query-${param.name}`,
          name: `Missing Required Query Parameter [${param.name}]`,
          endpointId: endpoint.id,
          type: 'validation',
          requestOverrides: {
            queryParams: {
              [param.name]: '', // Empty out the required query parameter
            },
          },
          assertions: {
            expectedStatusCodes: [400, 422, 404],
          },
          status: 'pending',
          result: null,
        });
      });
    }

    // 2. Duplicate Query Parameter
    const queryParams = endpoint.parameters.filter((p) => p.in === 'query');
    if (queryParams.length > 0) {
      const firstParam = queryParams[0];
      testCases.push({
        id: `${endpoint.id}-validation-duplicate-query-${firstParam.name}`,
        name: `Duplicate Query Parameter [${firstParam.name}]`,
        endpointId: endpoint.id,
        type: 'validation',
        requestOverrides: {
          // Pass duplicate parameters in a custom way or queryParams values
          queryParams: {
            [firstParam.name]: 'value1&' + firstParam.name + '=value2',
          },
        },
        assertions: {
          expectedStatusCodes: [400, 422, 200, 204], // Some servers accept duplicates or fail
        },
        status: 'pending',
        result: null,
      });
    }

    // 3. Invalid Enum Value inside Body/Schema
    if (endpoint.requestBody && endpoint.requestBody.schema) {
      const invalidEnumPayload = schemaGen.generateInvalid(endpoint.requestBody.schema, 'enum');
      if (invalidEnumPayload) {
        testCases.push({
          id: `${endpoint.id}-validation-body-enum`,
          name: 'Request Body Invalid Enum Match',
          endpointId: endpoint.id,
          type: 'validation',
          requestOverrides: {
            body: invalidEnumPayload,
          },
          assertions: {
            expectedStatusCodes: [400, 422],
          },
          status: 'pending',
          result: null,
        });
      }
    }

    return testCases;
  }
}
