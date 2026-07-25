import type { ApiEndpoint } from '../types';
import type { TestCase } from '../models/TestCase';
import { SchemaDataGenerator } from './SchemaDataGenerator';

export class NegativeTestGenerator {
  /**
   * Generates negative test cases for the endpoint.
   */
  public static generate(
    endpoint: ApiEndpoint,
    schemaGen: SchemaDataGenerator
  ): TestCase[] {
    const testCases: TestCase[] = [];

    // 1. Missing Authorization Test Case
    testCases.push({
      id: `${endpoint.id}-negative-missing-auth`,
      name: 'Missing Authorization Header',
      endpointId: endpoint.id,
      type: 'negative',
      requestOverrides: {
        headers: {
          'Authorization': '',
          'api_key': '',
        },
      },
      assertions: {
        expectedStatusCodes: [401, 403, 404, 400], // Often returns 401/403 (or 404 if hidden)
      },
      status: 'pending',
      result: null,
    });

    // 2. Invalid Authorization Test Case
    testCases.push({
      id: `${endpoint.id}-negative-invalid-auth`,
      name: 'Invalid Authorization Token',
      endpointId: endpoint.id,
      type: 'negative',
      requestOverrides: {
        headers: {
          'Authorization': 'Bearer invalid_auth_token_value_xyz_123',
          'api_key': 'invalid_api_key_xyz_123',
        },
      },
      assertions: {
        expectedStatusCodes: [401, 403, 400],
      },
      status: 'pending',
      result: null,
    });

    // 3. Path Parameters - Invalid / Negatives / Very Large values
    const pathParams = endpoint.parameters.filter((p) => p.in === 'path');
    pathParams.forEach((param) => {
      // Negative ID
      testCases.push({
        id: `${endpoint.id}-negative-path-neg-${param.name}`,
        name: `Negative Path Parameter [${param.name} = -9999]`,
        endpointId: endpoint.id,
        type: 'negative',
        requestOverrides: {
          pathParams: {
            [param.name]: '-9999',
          },
        },
        assertions: {
          expectedStatusCodes: [404, 400, 422],
        },
        status: 'pending',
        result: null,
      });

      // Invalid alphanumeric ID
      testCases.push({
        id: `${endpoint.id}-negative-path-str-${param.name}`,
        name: `Non-numeric Path Parameter [${param.name} = "invalid_id"]`,
        endpointId: endpoint.id,
        type: 'negative',
        requestOverrides: {
          pathParams: {
            [param.name]: 'invalid_id_value_123',
          },
        },
        assertions: {
          expectedStatusCodes: [404, 400, 422],
        },
        status: 'pending',
        result: null,
      });
    });

    // 4. Request Body - Wrong Data Types, Bad format keys
    if (endpoint.requestBody && endpoint.requestBody.schema) {
      const invalidTypePayload = schemaGen.generateInvalid(endpoint.requestBody.schema, 'type');
      if (invalidTypePayload) {
        testCases.push({
          id: `${endpoint.id}-negative-body-type`,
          name: 'Request Body Wrong Parameter Types',
          endpointId: endpoint.id,
          type: 'negative',
          requestOverrides: {
            body: invalidTypePayload,
          },
          assertions: {
            expectedStatusCodes: [400, 422],
          },
          status: 'pending',
          result: null,
        });
      }

      const invalidFormatPayload = schemaGen.generateInvalid(endpoint.requestBody.schema, 'format');
      if (invalidFormatPayload) {
        testCases.push({
          id: `${endpoint.id}-negative-body-format`,
          name: 'Request Body Invalid Value Formats (Bad Email/UUID/Date)',
          endpointId: endpoint.id,
          type: 'negative',
          requestOverrides: {
            body: invalidFormatPayload,
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
