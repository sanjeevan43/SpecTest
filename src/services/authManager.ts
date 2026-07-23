import type { AuthCredential, SecurityScheme } from '@/models/types';

interface SwaggerUiAuthEntry {
  name: string;
  schemeName?: string;
  value: string | { username?: string; password?: string };
}

/**
 * Swagger UI, when "persistAuthorization" is enabled (or always, in-memory), keeps the
 * values a human typed into the "Authorize" dialog under localStorage key "authorized".
 * We read that directly so the user never has to re-enter credentials for us.
 *
 * Shape (Swagger UI internal, best-effort — schema not officially documented, but stable
 * across the swagger-ui-react versions people actually ship):
 *   { "petstore_auth": { name: "petstore_auth", schemeName: "petstore_auth", value: "abc123" } }
 */
export function parseSwaggerUiAuthorized(
  rawLocalStorageValue: string | null,
  securitySchemes: Record<string, SecurityScheme>,
): AuthCredential[] {
  if (!rawLocalStorageValue) return [];

  let parsed: Record<string, SwaggerUiAuthEntry>;
  try {
    parsed = JSON.parse(rawLocalStorageValue);
  } catch {
    return [];
  }

  const credentials: AuthCredential[] = [];
  for (const [schemeId, entry] of Object.entries(parsed)) {
    const scheme = securitySchemes[schemeId];
    if (!scheme || !entry?.value) continue;

    if (scheme.type === 'basic' && typeof entry.value === 'object') {
      const { username = '', password = '' } = entry.value;
      credentials.push({
        schemeId,
        type: 'basic',
        value: btoa(`${username}:${password}`),
        headerName: 'Authorization',
        location: 'header',
        capturedAt: Date.now(),
        source: 'swagger-ui',
      });
      continue;
    }

    const stringValue = typeof entry.value === 'string' ? entry.value : '';
    if (!stringValue) continue;

    if (scheme.type === 'bearer' || scheme.type === 'oauth2') {
      credentials.push({
        schemeId,
        type: scheme.type,
        value: stringValue,
        headerName: 'Authorization',
        location: 'header',
        capturedAt: Date.now(),
        source: 'swagger-ui',
      });
    } else if (scheme.type === 'apiKey') {
      credentials.push({
        schemeId,
        type: 'apiKey',
        value: stringValue,
        headerName: scheme.in === 'header' ? scheme.name : undefined,
        paramName: scheme.in !== 'header' ? scheme.name : undefined,
        location: scheme.in,
        capturedAt: Date.now(),
        source: 'swagger-ui',
      });
    }
  }
  return credentials;
}

/**
 * Given the security schemes an endpoint requires plus whatever credentials we've
 * captured so far, builds the concrete headers/query/cookies to attach to the request.
 */
export function buildAuthArtifacts(
  requiredSchemeIds: string[],
  credentials: Record<string, AuthCredential>,
): { headers: Record<string, string>; query: Record<string, string>; cookies: Record<string, string> } {
  const headers: Record<string, string> = {};
  const query: Record<string, string> = {};
  const cookies: Record<string, string> = {};

  for (const schemeId of requiredSchemeIds) {
    const cred = credentials[schemeId];
    if (!cred) continue;

    const prefix = cred.type === 'bearer' || cred.type === 'oauth2' ? 'Bearer ' : cred.type === 'basic' ? 'Basic ' : '';

    if (cred.location === 'header' && cred.headerName) {
      headers[cred.headerName] = `${prefix}${cred.value}`;
    } else if (cred.location === 'query' && cred.paramName) {
      query[cred.paramName] = cred.value;
    } else if (cred.location === 'cookie' && cred.paramName) {
      cookies[cred.paramName] = cred.value;
    }
  }

  return { headers, query, cookies };
}

/** Captures an Authorization/API-key header seen on an outgoing Swagger UI XHR (webRequest fallback). */
export function credentialFromObservedHeader(headerName: string, headerValue: string): AuthCredential | null {
  const lower = headerName.toLowerCase();
  if (lower === 'authorization') {
    const [scheme, ...rest] = headerValue.split(' ');
    const value = rest.join(' ');
    const type = scheme.toLowerCase() === 'basic' ? 'basic' : 'bearer';
    return {
      schemeId: '__observed_authorization__',
      type,
      value: value || headerValue,
      headerName: 'Authorization',
      location: 'header',
      capturedAt: Date.now(),
      source: 'response',
    };
  }
  if (lower === 'x-api-key' || lower === 'api-key' || lower === 'apikey') {
    return {
      schemeId: '__observed_api_key__',
      type: 'apiKey',
      value: headerValue,
      headerName,
      location: 'header',
      capturedAt: Date.now(),
      source: 'response',
    };
  }
  return null;
}
