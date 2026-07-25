import type { TestCase } from './TestCase';

export interface TestScenario {
  endpointId: string;
  testCases: TestCase[];
}
