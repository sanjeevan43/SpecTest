/**
 * @file tests/unit/RequestBuilder.test.ts
 * @description Unit tests for RequestBuilder — URL construction, path parameter
 * substitution, body generation, header merging, and sample schema generation.
 *
 * Endpoint IDs in this project use "METHOD:path" format (e.g. "GET:/pet/{petId}").
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RequestBuilder } from '../../src/services/RequestBuilder';
import { OpenApiParser } from '../../src/parsers/OpenApiParser';
import { useEnvironmentStore } from '../../src/store/environmentStore';
import petstoreFixture from '../fixtures/swaggerPetstore.json';

const PETSTORE_JSON = JSON.stringify(petstoreFixture);
const BASE_URL = 'https://petstore3.swagger.io/api/v3';
const SOURCE_URL = `${BASE_URL}/openapi.json`;

// Parse once — shared across all tests
const petDoc = OpenApiParser.parseString(PETSTORE_JSON, SOURCE_URL);

// ---------------------------------------------------------------------------
// Helper — throws if endpoint not found so test fails with a useful message
// ---------------------------------------------------------------------------

function findEndpoint(id: string) {
  const ep = petDoc.endpoints.find((e) => e.id === id);
  if (!ep) {
    const available = petDoc.endpoints.slice(0, 5).map((e) => e.id).join(', ');
    throw new Error(`Endpoint "${id}" not found. Sample IDs: ${available}`);
  }
  return ep;
}

// ---------------------------------------------------------------------------
// URL Construction
// ---------------------------------------------------------------------------

describe('RequestBuilder.build — URL construction', () => {
  it('builds a URL for GET /store/inventory (no path params)', () => {
    const ep = findEndpoint('GET:/store/inventory');
    const req = RequestBuilder.build(ep, BASE_URL);
    expect(req.url).toBe(`${BASE_URL}/store/inventory`);
    expect(req.method).toBe('GET');
  });

  it('replaces {petId} path parameter in URL', () => {
    const ep = findEndpoint('GET:/pet/{petId}');
    const req = RequestBuilder.build(ep, BASE_URL, { petId: '42' });
    expect(req.url).toBe(`${BASE_URL}/pet/42`);
  });

  it('URL-encodes special characters in path parameters', () => {
    const ep = findEndpoint('GET:/pet/{petId}');
    const req = RequestBuilder.build(ep, BASE_URL, { petId: 'hello world' });
    expect(req.url).toContain('hello%20world');
  });

  it('handles baseUrl with trailing slash — no double slash in URL path', () => {
    const ep = findEndpoint('GET:/store/inventory');
    const req = RequestBuilder.build(ep, `${BASE_URL}/`);
    // Extract just the path portion (after the origin) and check for double-slash
    const pathPart = req.url.replace(/^https?:\/\/[^/]+/, '');
    expect(pathPart).not.toContain('//');
    expect(req.url).toContain('/store/inventory');
  });
});

// ---------------------------------------------------------------------------
// Request Body
// ---------------------------------------------------------------------------

describe('RequestBuilder.build — request body', () => {
  it('generates a body object for POST /pet', () => {
    const ep = findEndpoint('POST:/pet');
    const req = RequestBuilder.build(ep, BASE_URL);
    expect(req.body).toBeDefined();
    expect(typeof req.body).toBe('object');
  });

  it('sets Content-Type header from requestBody.contentType', () => {
    const ep = findEndpoint('POST:/pet');
    const req = RequestBuilder.build(ep, BASE_URL);
    expect(req.headers['Content-Type']).toBe('application/json');
  });

  it('returns null body for GET endpoints', () => {
    const ep = findEndpoint('GET:/store/inventory');
    const req = RequestBuilder.build(ep, BASE_URL);
    expect(req.body).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// generateSampleFromSchema
// ---------------------------------------------------------------------------

describe('RequestBuilder.generateSampleFromSchema', () => {
  it('returns "string" for string type', () => {
    expect(RequestBuilder.generateSampleFromSchema({ type: 'string' })).toBe('string');
  });

  it('returns 0 for number type', () => {
    expect(RequestBuilder.generateSampleFromSchema({ type: 'number' })).toBe(0);
  });

  it('returns 0 for integer type', () => {
    expect(RequestBuilder.generateSampleFromSchema({ type: 'integer' })).toBe(0);
  });

  it('returns false for boolean type', () => {
    expect(RequestBuilder.generateSampleFromSchema({ type: 'boolean' })).toBe(false);
  });

  it('returns an array with one item for array type', () => {
    const result = RequestBuilder.generateSampleFromSchema({
      type: 'array',
      items: { type: 'string' },
    });
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[]).length).toBe(1);
  });

  it('returns an object with properties for object type', () => {
    const result = RequestBuilder.generateSampleFromSchema({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age:  { type: 'integer' },
      },
    }) as Record<string, unknown>;
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('age');
  });

  it('returns the example value when provided', () => {
    expect(
      RequestBuilder.generateSampleFromSchema({ type: 'string', example: 'foo-bar' }),
    ).toBe('foo-bar');
  });

  it('returns an ISO date-time string for date-time format', () => {
    const result = RequestBuilder.generateSampleFromSchema({ type: 'string', format: 'date-time' });
    expect(typeof result).toBe('string');
    expect((result as string).includes('T')).toBe(true);
  });

  it('returns the first enum value for enum schemas', () => {
    expect(
      RequestBuilder.generateSampleFromSchema({ type: 'string', enum: ['a', 'b', 'c'] }),
    ).toBe('a');
  });
});

// ---------------------------------------------------------------------------
// Environment global headers merged into request
// ---------------------------------------------------------------------------

describe('RequestBuilder.build — global headers from environment store', () => {
  beforeEach(() => {
    useEnvironmentStore.getState().reset();
  });

  it('applies global headers to the built request', () => {
    useEnvironmentStore.getState().setGlobalHeaders({ 'X-Test-Header': 'test-value' });
    const ep = findEndpoint('GET:/store/inventory');
    const req = RequestBuilder.build(ep, BASE_URL);
    expect(req.headers['X-Test-Header']).toBe('test-value');
  });

  it('does not include global header when not set', () => {
    const ep = findEndpoint('GET:/store/inventory');
    const req = RequestBuilder.build(ep, BASE_URL);
    expect(req.headers['X-Test-Header']).toBeUndefined();
  });
});
