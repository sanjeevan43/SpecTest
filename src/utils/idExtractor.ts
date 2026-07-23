import { KNOWN_ID_PARAM_NAMES } from '@/constants';

/**
 * Walks a JSON response body and pulls out values that look like resource identifiers,
 * keyed by the property name that held them (normalized to lowercase).
 *
 * Handles:
 *  - flat objects:              { id: 15 }
 *  - nested "data" wrappers:    { data: { id: 15 } }
 *  - arrays of resources:       { data: [{ id: 1 }, { id: 2 }] } -> takes the first
 *  - known id-like field names beyond just "id": studentId, driverId, etc.
 */
export function extractIdsFromResponse(body: unknown): Record<string, unknown[]> {
  const found: Record<string, unknown[]> = {};

  const visit = (node: unknown, depth: number): void => {
    if (depth > 6 || node === null || node === undefined) return;

    if (Array.isArray(node)) {
      // Only look at the first couple elements to avoid pathological large arrays.
      node.slice(0, 3).forEach((item) => visit(item, depth + 1));
      return;
    }

    if (typeof node === 'object') {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (isIdKey(key) && isPrimitiveId(value)) {
          const normalized = key.toLowerCase();
          found[normalized] = found[normalized] ? [...found[normalized], value] : [value];
        } else if (typeof value === 'object' && value !== null) {
          visit(value, depth + 1);
        }
      }
    }
  };

  visit(body, 0);
  return found;
}

function isIdKey(key: string): boolean {
  if (key.toLowerCase() === 'id') return true;
  if (KNOWN_ID_PARAM_NAMES.some((known) => known.toLowerCase() === key.toLowerCase())) return true;
  return /(^|[A-Za-z])id$/.test(key); // e.g. "studentId", "orderID"
}

function isPrimitiveId(value: unknown): value is string | number {
  return (typeof value === 'number' && Number.isFinite(value)) || (typeof value === 'string' && value.length > 0);
}

/** Extracts `{paramName}` tokens from a templated path, e.g. /students/{studentId}/grades/{gradeId}. */
export function extractPathParamNames(path: string): string[] {
  const matches = path.match(/{([^}]+)}/g) ?? [];
  return matches.map((m) => m.slice(1, -1));
}

/** Replaces `{paramName}` tokens in a path template with actual values. */
export function resolvePath(path: string, values: Record<string, unknown>): string {
  return path.replace(/{([^}]+)}/g, (_, name: string) => {
    const value = values[name] ?? values[name.toLowerCase()];
    return value !== undefined && value !== null ? encodeURIComponent(String(value)) : `{${name}}`;
  });
}
