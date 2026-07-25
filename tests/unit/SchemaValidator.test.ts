/**
 * @file tests/unit/SchemaValidator.test.ts
 * @description Unit tests for JsonSchemaValidator.
 *
 * The real signature is:
 *   validate(value, schema, document, path, errors[], warnings[], settings, depth?)
 *
 * The validator mutates the errors[] / warnings[] arrays (no return value).
 * ValidationError uses the `errorType` field (not `type`).
 */

import { describe, it, expect } from 'vitest';
import { JsonSchemaValidator } from '../../src/services/JsonSchemaValidator';
import type { ApiSchema } from '../../src/types';
import type { ValidationError } from '../../src/models/ValidationError';

// ---------------------------------------------------------------------------
// Helper: minimal ParsedApiDocument stub matching the actual interface
// ---------------------------------------------------------------------------

const EMPTY_DOC: import('../../src/types').ParsedApiDocument = {
  title: 'Test API',
  version: '1.0.0',
  openApiVersion: '3.0.0',
  baseUrl: 'https://example.com',
  serverUrls: [],
  endpoints: [],
  schemas: {},
};

const DEFAULT_SETTINGS = {
  ignoreOptionalFields: false,
  ignoreAdditionalProperties: false,
  strictMode: false,
};

/**
 * Convenience wrapper: runs the validator and returns collected errors.
 */
function runValidate(value: unknown, schema: ApiSchema, doc = EMPTY_DOC): ValidationError[] {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  JsonSchemaValidator.validate(value, schema, doc, 'root', errors, warnings, DEFAULT_SETTINGS);
  return errors;
}

// ---------------------------------------------------------------------------
// Primitive type checks
// ---------------------------------------------------------------------------

describe('JsonSchemaValidator — primitive types', () => {
  it('string value passes string schema', () => {
    expect(runValidate('hello', { type: 'string' })).toHaveLength(0);
  });

  it('number passed to string schema → type_mismatch error', () => {
    const errors = runValidate(42, { type: 'string' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].errorType).toBe('type_mismatch');
  });

  it('integer value passes integer schema', () => {
    expect(runValidate(10, { type: 'integer' })).toHaveLength(0);
  });

  it('boolean true passes boolean schema', () => {
    expect(runValidate(true, { type: 'boolean' })).toHaveLength(0);
  });

  it('string "true" fails boolean schema → type_mismatch', () => {
    const errors = runValidate('true', { type: 'boolean' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].errorType).toBe('type_mismatch');
  });

  it('null passes when schema is nullable: true', () => {
    expect(runValidate(null, { type: 'string', nullable: true })).toHaveLength(0);
  });

  it('null fails when schema is NOT nullable', () => {
    const errors = runValidate(null, { type: 'string', nullable: false });
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Required fields
// ---------------------------------------------------------------------------

describe('JsonSchemaValidator — required fields', () => {
  const schema: ApiSchema = {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name:  { type: 'string' },
      email: { type: 'string' },
      age:   { type: 'integer' },
    },
  };

  it('reports missing required "email" field', () => {
    const errors = runValidate({ name: 'Alice' }, schema);
    expect(errors.some((e) => e.path.includes('email'))).toBe(true);
  });

  it('passes when all required fields are present', () => {
    expect(runValidate({ name: 'Alice', email: 'a@b.com' }, schema)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Enum validation
// ---------------------------------------------------------------------------

describe('JsonSchemaValidator — enum', () => {
  const schema: ApiSchema = { type: 'string', enum: ['available', 'pending', 'sold'] };

  it('passes for a value in the enum list', () => {
    expect(runValidate('available', schema)).toHaveLength(0);
  });

  it('reports enum_violation for a value NOT in the enum list', () => {
    const errors = runValidate('unknown', schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].errorType).toBe('enum_violation');
  });
});

// ---------------------------------------------------------------------------
// Nested objects
// ---------------------------------------------------------------------------

describe('JsonSchemaValidator — nested objects', () => {
  const schema: ApiSchema = {
    type: 'object',
    properties: {
      address: {
        type: 'object',
        required: ['city'],
        properties: {
          city: { type: 'string' },
          zip:  { type: 'string' },
        },
      },
    },
  };

  it('reports missing required nested field "city"', () => {
    const errors = runValidate({ address: { zip: '12345' } }, schema);
    expect(errors.some((e) => e.path.includes('city'))).toBe(true);
  });

  it('passes when all nested required fields are present', () => {
    expect(runValidate({ address: { city: 'Mumbai' } }, schema)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Arrays
// ---------------------------------------------------------------------------

describe('JsonSchemaValidator — arrays', () => {
  it('validates an array of strings', () => {
    expect(runValidate(['a', 'b'], { type: 'array', items: { type: 'string' } })).toHaveLength(0);
  });

  it('reports errors for non-integer items in an integer array', () => {
    const errors = runValidate(['not-a-number', 'also-not'], { type: 'array', items: { type: 'integer' } });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('reports type_mismatch when value is a string but schema is array', () => {
    const errors = runValidate('not-an-array', { type: 'array', items: { type: 'string' } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].errorType).toBe('type_mismatch');
  });
});
