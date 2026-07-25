/**
 * @file tests/unit/OpenApiParser.test.ts
 * @description Unit tests for OpenApiParser — JSON/YAML parsing, endpoint extraction,
 * schema normalization, path parameter detection, and error handling.
 *
 * Endpoint IDs are formatted as "METHOD:path" (e.g. "GET:/pet/{petId}").
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenApiParser } from '../../src/parsers/OpenApiParser';
import petstoreFixture from '../fixtures/swaggerPetstore.json';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PETSTORE_JSON = JSON.stringify(petstoreFixture);
const SOURCE_URL = 'https://petstore3.swagger.io/api/v3/openapi.json';

const PETSTORE_YAML = `
openapi: "3.0.0"
info:
  title: "Minimal API"
  version: "1.0.0"
servers:
  - url: "https://api.example.com"
paths:
  /items:
    get:
      operationId: listItems
      summary: List all items
      tags:
        - items
      responses:
        "200":
          description: OK
`;

// ---------------------------------------------------------------------------
// parseString — JSON
// ---------------------------------------------------------------------------

describe('OpenApiParser.parseString (JSON)', () => {
  it('parses a valid OpenAPI 3.0 JSON document', () => {
    const doc = OpenApiParser.parseString(PETSTORE_JSON, SOURCE_URL);

    expect(doc.title).toBe('Petstore API');
    expect(doc.version).toBe('1.0.0');
    expect(doc.openApiVersion).toBe('3.0.0');
    expect(doc.baseUrl).toBe('https://petstore3.swagger.io/api/v3');
    expect(doc.endpoints.length).toBeGreaterThan(0);
  });

  it('endpoint IDs follow "METHOD:path" format', () => {
    const doc = OpenApiParser.parseString(PETSTORE_JSON, SOURCE_URL);
    const ids = doc.endpoints.map((e) => e.id);

    // Verify format: no spaces between method and path (colon separator)
    expect(ids).toContain('GET:/pet/{petId}');
    expect(ids).toContain('DELETE:/pet/{petId}');
    expect(ids).toContain('POST:/pet');
  });

  it('extracts path parameters correctly', () => {
    const doc = OpenApiParser.parseString(PETSTORE_JSON, SOURCE_URL);
    const getPet = doc.endpoints.find((e) => e.id === 'GET:/pet/{petId}');

    expect(getPet).toBeDefined();
    expect(getPet!.parameters.length).toBeGreaterThan(0);
    const petIdParam = getPet!.parameters.find((p) => p.name === 'petId');
    expect(petIdParam).toBeDefined();
    expect(petIdParam!.in).toBe('path');
    expect(petIdParam!.required).toBe(true);
  });

  it('attaches tags to endpoints', () => {
    const doc = OpenApiParser.parseString(PETSTORE_JSON, SOURCE_URL);
    const getPet = doc.endpoints.find((e) => e.id === 'GET:/pet/{petId}');

    expect(getPet).toBeDefined();
    expect(getPet!.tags).toContain('pet');
  });

  it('extracts schemas from components', () => {
    const doc = OpenApiParser.parseString(PETSTORE_JSON, SOURCE_URL);

    expect(doc.schemas).toHaveProperty('Pet');
    expect(doc.schemas['Pet'].type).toBe('object');
  });

  it('detects request bodies on POST /pet', () => {
    const doc = OpenApiParser.parseString(PETSTORE_JSON, SOURCE_URL);
    const addPet = doc.endpoints.find((e) => e.id === 'POST:/pet');

    expect(addPet).toBeDefined();
    expect(addPet!.requestBody).toBeDefined();
    expect(addPet!.requestBody!.required).toBe(true);
  });

  it('endpoint method field is uppercase', () => {
    const doc = OpenApiParser.parseString(PETSTORE_JSON, SOURCE_URL);
    for (const ep of doc.endpoints) {
      expect(ep.method).toBe(ep.method.toUpperCase());
    }
  });

  it('stores serverUrls array', () => {
    const doc = OpenApiParser.parseString(PETSTORE_JSON, SOURCE_URL);
    expect(Array.isArray(doc.serverUrls)).toBe(true);
    expect(doc.serverUrls.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// parseString — YAML
// ---------------------------------------------------------------------------

describe('OpenApiParser.parseString (YAML)', () => {
  it('parses a valid OpenAPI 3.0 YAML document', () => {
    const doc = OpenApiParser.parseString(PETSTORE_YAML, 'https://api.example.com/openapi.yaml');

    expect(doc.title).toBe('Minimal API');
    expect(doc.baseUrl).toBe('https://api.example.com');
    expect(doc.endpoints.length).toBe(1);
    // ID format: "METHOD:path"
    expect(doc.endpoints[0].id).toBe('GET:/items');
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('OpenApiParser.parseString (error cases)', () => {
  it('throws on malformed JSON', () => {
    expect(() => OpenApiParser.parseString('{invalid json', 'https://api.example.com')).toThrow();
  });

  it('throws when document lacks openapi/swagger keys', () => {
    const invalid = JSON.stringify({ title: 'Not an API spec' });
    expect(() => OpenApiParser.parseString(invalid, 'https://api.example.com')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// parse() — fetch integration
// ---------------------------------------------------------------------------

describe('OpenApiParser.parse (fetch)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches and parses a document from a URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => PETSTORE_JSON,
    }));

    const doc = await OpenApiParser.parse('https://petstore.swagger.io/v3/openapi.json');
    expect(doc.title).toBe('Petstore API');
  });

  it('throws when fetch returns non-200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => '',
    }));

    await expect(
      OpenApiParser.parse('https://example.com/missing.json'),
    ).rejects.toThrow();
  });
});
