import type { TestCase } from './TestCase';

export interface TestSuite {
  id: string; // e.g. "positive-only"
  name: string;
  testCases: TestCase[];
}
