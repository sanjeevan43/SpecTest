/**
 * @file tests/unit/SwaggerDetector.test.ts
 * @description Unit tests for SwaggerDetector — URL validation, common path generation,
 * DOM scraping patterns, and absolute URL resolution.
 *
 * SwaggerDetector uses browser DOM APIs (document.querySelectorAll, window.location)
 * which are provided by jsdom via vitest.config.ts `environment: 'jsdom'`.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// All tests share a jsdom environment (no need to mock window manually).
// We test SwaggerDetector via its public discoverSpecUrls() method.
// ---------------------------------------------------------------------------

describe('SwaggerDetector — discoverSpecUrls', () => {
  beforeEach(() => {
    // Ensure clean DOM before each test
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('returns an array', async () => {
    const { SwaggerDetector } = await import('../../src/parsers/SwaggerDetector');
    const urls = await SwaggerDetector.discoverSpecUrls();
    expect(Array.isArray(urls)).toBe(true);
  });

  it('includes standard fallback paths from the current origin', async () => {
    const { SwaggerDetector } = await import('../../src/parsers/SwaggerDetector');
    const urls = await SwaggerDetector.discoverSpecUrls();
    // addCommonPaths() unconditionally adds these
    const hasApiDocs = urls.some(
      (u) => u.includes('/v3/api-docs') || u.includes('/swagger.json') || u.includes('/openapi.json'),
    );
    expect(hasApiDocs).toBe(true);
  });

  it('scrapes a swagger.json href from an anchor element', async () => {
    document.body.innerHTML = `<a href="/custom/swagger.json">API Docs</a>`;
    const { SwaggerDetector } = await import('../../src/parsers/SwaggerDetector');
    const urls = await SwaggerDetector.discoverSpecUrls();
    // The custom path should appear in the result
    expect(urls.some((u) => u.includes('/custom/swagger.json'))).toBe(true);
  });

  it('filters out chrome-extension:// and file:// URLs', async () => {
    document.body.innerHTML = `
      <a href="chrome-extension://abc123/swagger.json">bad1</a>
      <a href="file:///local/openapi.json">bad2</a>
    `;
    const { SwaggerDetector } = await import('../../src/parsers/SwaggerDetector');
    const urls = await SwaggerDetector.discoverSpecUrls();
    // Every returned URL must start with http
    expect(urls.every((u) => u.startsWith('http'))).toBe(true);
  });

  it('extracts URL from inline script containing url: "/openapi.json"', async () => {
    document.head.innerHTML = `<script>SwaggerUIBundle({ url: "/openapi.json" })</script>`;
    const { SwaggerDetector } = await import('../../src/parsers/SwaggerDetector');
    const urls = await SwaggerDetector.discoverSpecUrls();
    // Should find /openapi.json from the inline script
    expect(urls.some((u) => u.includes('/openapi.json'))).toBe(true);
  });

  it('returns no duplicate URLs — the Set deduplication works', async () => {
    // /swagger.json is already in addCommonPaths(). Adding same href from DOM should
    // not result in duplicate entries.
    document.body.innerHTML = `<a href="/swagger.json">Link 1</a>`;
    const { SwaggerDetector } = await import('../../src/parsers/SwaggerDetector');
    const urls = await SwaggerDetector.discoverSpecUrls();

    // Check that URL array contains no duplicates (each URL is unique)
    const uniqueUrls = new Set(urls);
    expect(uniqueUrls.size).toBe(urls.length);
  });
});
