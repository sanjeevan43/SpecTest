import type { JsonSchema, SchemaValidationIssue } from '@/models/types';

/** Compares an actual JSON response body against its declared JSON Schema and reports drift. */
export function validateAgainstSchema(actual: unknown, schema: JsonSchema | null | undefined): SchemaValidationIssue[] {
  if (!schema) return [];
  const issues: SchemaValidationIssue[] = [];
  walk(actual, schema, '$', issues, 0);
  return issues;
}

function walk(actual: unknown, schema: JsonSchema, path: string, issues: SchemaValidationIssue[], depth: number): void {
  if (depth > 10) return;
  if (schema.oneOf?.length || schema.anyOf?.length) return; // ambiguous union — skip strict check
  if (actual === null || actual === undefined) {
    if (!schema.nullable && schema.type && schema.type !== 'null') {
      // Absence of an optional field is fine; only flag when we're inside a required check upstream.
    }
    return;
  }

  const expectedType = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  const actualType = jsTypeOf(actual);

  if (expectedType && !typesAreCompatible(expectedType, actualType)) {
    issues.push({ path, kind: 'wrong_type', expected: expectedType, actual: actualType });
    return;
  }

  if (expectedType === 'object' && schema.properties && typeof actual === 'object' && !Array.isArray(actual)) {
    const actualObj = actual as Record<string, unknown>;
    const expectedKeys = Object.keys(schema.properties);
    const requiredKeys = schema.required ?? [];

    for (const key of requiredKeys) {
      if (!(key in actualObj)) {
        issues.push({ path: `${path}.${key}`, kind: 'missing_field' });
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(actualObj)) {
        if (!expectedKeys.includes(key)) {
          issues.push({ path: `${path}.${key}`, kind: 'extra_field' });
        }
      }
    }

    for (const key of expectedKeys) {
      if (key in actualObj) {
        walk(actualObj[key], schema.properties[key], `${path}.${key}`, issues, depth + 1);
      }
    }
  } else if (expectedType === 'array' && schema.items && Array.isArray(actual)) {
    actual.slice(0, 5).forEach((item, i) => walk(item, schema.items as JsonSchema, `${path}[${i}]`, issues, depth + 1));
  }
}

function jsTypeOf(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return t;
}

function typesAreCompatible(expected: string, actual: string): boolean {
  if (expected === actual) return true;
  if (expected === 'number' && actual === 'integer') return true;
  if (expected === 'integer' && actual === 'number') return true;
  return false;
}
