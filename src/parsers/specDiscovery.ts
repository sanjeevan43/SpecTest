import { COMMON_SPEC_PATHS, FRAMEWORK_FINGERPRINTS, SWAGGER_URL_PATTERNS } from '@/constants';
import type { SwaggerPageInfo } from '@/models/types';

/** True if the current page URL matches any known Swagger/OpenAPI URL convention. */
export function isLikelySwaggerUrl(url: string): boolean {
  return SWAGGER_URL_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Looks at the live DOM for clues pointing at the actual OpenAPI JSON/YAML document:
 *  1. Swagger UI's `window.ui` config / `<script>` initializer with `url:` or `urls:`
 *  2. A `<link rel="...openapi...">` or similar meta tag
 *  3. Falls back to probing common well-known spec paths relative to the origin.
 */
export async function discoverSpecUrl(document: Document, location: Location): Promise<string | null> {
  const fromScripts = findSpecUrlInInlineScripts(document, location.origin);
  if (fromScripts) return fromScripts;

  const fromMeta = findSpecUrlInMeta(document, location.origin);
  if (fromMeta) return fromMeta;

  // If the current URL itself looks like a JSON/YAML doc (rare, but some teams link directly), use it.
  if (/\.(json|yaml|yml)(\?.*)?$/i.test(location.pathname)) {
    return location.href;
  }

  return probeCommonPaths(location.origin);
}

function findSpecUrlInInlineScripts(document: Document, origin: string): string | null {
  const scripts = Array.from(document.querySelectorAll('script'));
  for (const script of scripts) {
    const text = script.textContent ?? '';
    if (!text.includes('url')) continue;

    // Matches: url: "/v3/api-docs"  |  url: '/swagger.json'  |  "url":"https://.../openapi.json"
    const singleMatch = text.match(/url\s*:\s*["']([^"']+)["']/);
    if (singleMatch) return resolveUrl(singleMatch[1], origin);

    // Matches SwaggerUIBundle urls: [{ url: "...", name: "..." }]
    const multiMatch = text.match(/urls\s*:\s*\[\s*{\s*url\s*:\s*["']([^"']+)["']/);
    if (multiMatch) return resolveUrl(multiMatch[1], origin);
  }
  return null;
}

function findSpecUrlInMeta(document: Document, origin: string): string | null {
  const link = document.querySelector('link[rel*="openapi" i], link[type*="openapi" i]');
  const href = link?.getAttribute('href');
  if (href) return resolveUrl(href, origin);
  return null;
}

async function probeCommonPaths(origin: string): Promise<string | null> {
  for (const path of COMMON_SPEC_PATHS) {
    const candidate = `${origin}${path}`;
    try {
      const res = await fetch(candidate, { method: 'GET', credentials: 'include' });
      if (res.ok) {
        const contentType = res.headers.get('content-type') ?? '';
        if (contentType.includes('json') || contentType.includes('yaml') || path.endsWith('.json') || path.endsWith('.yaml')) {
          return candidate;
        }
      }
    } catch {
      // ignore network errors while probing, try next candidate
    }
  }
  return null;
}

function resolveUrl(maybeRelative: string, origin: string): string {
  try {
    return new URL(maybeRelative, origin).toString();
  } catch {
    return maybeRelative;
  }
}

/** Labels which Swagger flavor is being served, purely for nicer UI copy. */
export function detectFramework(html: string): SwaggerPageInfo['framework'] {
  for (const { match, framework } of FRAMEWORK_FINGERPRINTS) {
    if (match.test(html)) return framework;
  }
  return 'swagger-ui';
}
