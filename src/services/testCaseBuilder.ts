import type { ApiEndpoint, ApiParameter, RunnerConfig, TestCaseKind } from '@/models/types';
import { NEGATIVE_ID_TEST_CASES } from '@/constants';
import { extractPathParamNames } from '@/utils/idExtractor';

export interface TestCaseSpec {
  kind: TestCaseKind;
  pathOverrides?: Record<string, unknown>;
  queryOverrides?: Record<string, unknown>;
  queryOmit?: string[];
  headerOverrides?: Record<string, string>;
  headerOmit?: string[];
  expectedStatuses?: number[];
}

/** Builds every test case that should run for a given endpoint, gated by the runner config. */
export function buildTestCases(endpoint: ApiEndpoint, config: RunnerConfig): TestCaseSpec[] {
  const cases: TestCaseSpec[] = [{ kind: 'happy_path' }];

  const idParamNames = extractPathParamNames(endpoint.path);
  if (config.runNegativeTests && idParamNames.length > 0) {
    const primaryIdParam = idParamNames[idParamNames.length - 1];
    for (const negative of NEGATIVE_ID_TEST_CASES) {
      cases.push({
        kind: negative.kind,
        pathOverrides: { [primaryIdParam]: negative.value },
        expectedStatuses: [400, 401, 403, 404, 422],
      });
    }
  }

  if (config.runQueryParamTests) {
    const queryParams = endpoint.parameters.filter((p) => p.in === 'query');
    const requiredQuery = queryParams.filter((p) => p.required);
    for (const param of requiredQuery) {
      cases.push({ kind: 'missing_required_query', queryOmit: [param.name], expectedStatuses: [400, 422] });
    }
    for (const param of queryParams) {
      const invalidValue = invalidValueFor(param);
      if (invalidValue !== undefined) {
        cases.push({ kind: 'invalid_query', queryOverrides: { [param.name]: invalidValue }, expectedStatuses: [400, 422] });
      }
    }
  }

  if (config.runHeaderTests) {
    const headerParams = endpoint.parameters.filter((p) => p.in === 'header' && p.required);
    for (const param of headerParams) {
      cases.push({ kind: 'missing_required_header', headerOmit: [param.name], expectedStatuses: [400, 401] });
    }
  }

  return cases;
}

function invalidValueFor(param: ApiParameter): unknown {
  const type = Array.isArray(param.schema.type) ? param.schema.type[0] : param.schema.type;
  switch (type) {
    case 'integer':
    case 'number':
      return 'not-a-number';
    case 'boolean':
      return 'not-a-boolean';
    case 'string':
      if (param.schema.enum) return '__invalid_enum_value__';
      return undefined;
    default:
      return undefined;
  }
}
