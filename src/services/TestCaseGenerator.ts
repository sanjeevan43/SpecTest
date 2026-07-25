import type { ParsedApiDocument, ApiEndpoint } from '../types';
import type { TestCase } from '../models/TestCase';
import { SchemaDataGenerator } from './SchemaDataGenerator';
import { PositiveTestGenerator } from './PositiveTestGenerator';
import { NegativeTestGenerator } from './NegativeTestGenerator';
import { ValidationTestGenerator } from './ValidationTestGenerator';
import { BoundaryValueGenerator } from './BoundaryValueGenerator';

export class TestCaseGenerator {
  /**
   * Generates multiple test cases for every endpoint in the document.
   */
  public static generate(
    document: ParsedApiDocument,
    settings: {
      maxTestCases: number;
      enableBoundary: boolean;
      enableNegative: boolean;
      randomSeed: string;
      maxStringLength: number;
      maxArraySize: number;
    }
  ): Record<string, TestCase[]> {
    const scenarios: Record<string, TestCase[]> = {};
    const schemaGen = new SchemaDataGenerator(settings.randomSeed);

    document.endpoints.forEach((endpoint) => {
      let cases: TestCase[] = [];

      // 1. Generate Positive (Happy Path) Test Cases
      cases = cases.concat(PositiveTestGenerator.generate(endpoint, schemaGen));

      // 2. Generate Negative Test Cases (if enabled)
      if (settings.enableNegative) {
        cases = cases.concat(NegativeTestGenerator.generate(endpoint, schemaGen));
      }

      // 3. Generate Boundary Test Cases (if enabled)
      if (settings.enableBoundary) {
        cases = cases.concat(this.generateBoundaryTests(endpoint, schemaGen, settings));
      }

      // 4. Generate Validation Test Cases
      cases = cases.concat(ValidationTestGenerator.generate(endpoint, schemaGen));

      // Limit cases size based on config limit settings
      scenarios[endpoint.id] = cases.slice(0, settings.maxTestCases);
    });

    return scenarios;
  }

  private static generateBoundaryTests(
    endpoint: ApiEndpoint,
    schemaGen: SchemaDataGenerator,
    settings: { maxStringLength: number; maxArraySize: number }
  ): TestCase[] {
    const boundaryCases: TestCase[] = [];

    // Query parameters boundary cases
    const queryParams = endpoint.parameters.filter((p) => p.in === 'query');
    queryParams.forEach((param) => {
      if (param.schema && param.schema.type === 'string') {
        const stringBoundaries = BoundaryValueGenerator.getBoundaryStrings(settings.maxStringLength);
        
        boundaryCases.push({
          id: `${endpoint.id}-boundary-query-unicode-${param.name}`,
          name: `Unicode Query Parameter [${param.name}]`,
          endpointId: endpoint.id,
          type: 'boundary',
          requestOverrides: {
            queryParams: {
              [param.name]: stringBoundaries.unicode,
            },
          },
          assertions: {
            expectedStatusCodes: [200, 201, 204, 400],
          },
          status: 'pending',
          result: null,
        });

        boundaryCases.push({
          id: `${endpoint.id}-boundary-query-sqli-${param.name}`,
          name: `SQL Injection Query Parameter [${param.name}]`,
          endpointId: endpoint.id,
          type: 'boundary',
          requestOverrides: {
            queryParams: {
              [param.name]: stringBoundaries.sqlInjection,
            },
          },
          assertions: {
            expectedStatusCodes: [400, 422, 200, 404],
          },
          status: 'pending',
          result: null,
        });
      }
    });

    // Request body boundary cases
    if (endpoint.requestBody && endpoint.requestBody.schema) {
      // Empty Body Object
      boundaryCases.push({
        id: `${endpoint.id}-boundary-body-empty-obj`,
        name: 'Request Body Boundary: Empty Object',
        endpointId: endpoint.id,
        type: 'boundary',
        requestOverrides: {
          body: {},
        },
        assertions: {
          expectedStatusCodes: [400, 422, 200, 201, 204],
        },
        status: 'pending',
        result: null,
      });

      // Large Exceeded Bounds Body Object
      const overMaxPayload = schemaGen.generateBoundary(endpoint.requestBody.schema, 'overMax');
      if (overMaxPayload) {
        boundaryCases.push({
          id: `${endpoint.id}-boundary-body-overmax`,
          name: 'Request Body Boundary: Over Limit Ranges',
          endpointId: endpoint.id,
          type: 'boundary',
          requestOverrides: {
            body: overMaxPayload,
          },
          assertions: {
            expectedStatusCodes: [400, 422],
          },
          status: 'pending',
          result: null,
        });
      }
    }

    return boundaryCases;
  }
}
