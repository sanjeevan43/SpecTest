import type { ApiEndpoint, ResourceIdStore } from '@/models/types';
import { extractIdsFromResponse, extractPathParamNames } from '@/utils/idExtractor';

/** In-memory store of every resource id we've seen come back from a response, reusable across the whole run. */
export class ResourceIdRegistry {
  private store: ResourceIdStore = {};

  ingestResponse(body: unknown): void {
    const found = extractIdsFromResponse(body);
    for (const [key, values] of Object.entries(found)) {
      this.store[key] = [...(this.store[key] ?? []), ...values];
    }
  }

  /** Most recently captured value for a given path-param name (case-insensitive, falls back to generic "id"). */
  latestFor(paramName: string): unknown | undefined {
    const key = paramName.toLowerCase();
    if (this.store[key]?.length) return this.store[key][this.store[key].length - 1];
    if (this.store['id']?.length) return this.store['id'][this.store['id'].length - 1];
    return undefined;
  }

  reset(): void {
    this.store = {};
  }

  snapshot(): ResourceIdStore {
    return this.store;
  }
}

/** Assigns a numeric priority so CRUD ops on the same resource run in a sane, dependency-respecting order. */
const METHOD_ORDER: Record<string, number> = {
  post: 0,
  get: 1,
  put: 2,
  patch: 3,
  delete: 4,
};

/**
 * Groups endpoints by their "resource family" (path with trailing id-params stripped) and
 * orders them: POST (create) -> GET (read by id) -> PUT -> PATCH -> DELETE -> GET (expect 404).
 * Endpoints belonging to different resource families are ordered by family discovery order,
 * but families whose collection GET can supply another family's id run earlier.
 */
export function buildExecutionOrder(endpoints: ApiEndpoint[]): ApiEndpoint[] {
  return getOrderedFamilies(endpoints).flat();
}

/**
 * Same grouping/ordering as `buildExecutionOrder`, but keeps each resource family as its
 * own array so the runner can execute families in parallel while preserving strict
 * in-order execution *within* a family (create -> read -> update -> delete -> verify-404).
 */
export function getOrderedFamilies(endpoints: ApiEndpoint[]): ApiEndpoint[][] {
  const families = new Map<string, ApiEndpoint[]>();

  for (const endpoint of endpoints) {
    const familyKey = resourceFamilyKey(endpoint.path);
    const group = families.get(familyKey) ?? [];
    group.push(endpoint);
    families.set(familyKey, group);
  }

  const orderedFamilies = Array.from(families.entries()).sort((a, b) => {
    const aDepth = extractPathParamNames(a[0]).length;
    const bDepth = extractPathParamNames(b[0]).length;
    return aDepth - bDepth;
  });

  return orderedFamilies.map(([, group]) => {
    const sorted = [...group].sort((a, b) => (METHOD_ORDER[a.method] ?? 9) - (METHOD_ORDER[b.method] ?? 9));
    const hasDelete = sorted.some((e) => e.method === 'delete');
    const getByIdIndex = sorted.findIndex((e) => e.method === 'get' && extractPathParamNames(e.path).length > 0);
    if (hasDelete && getByIdIndex !== -1) {
      return [...sorted, { ...sorted[getByIdIndex], id: `${sorted[getByIdIndex].id}::post-delete-check` }];
    }
    return sorted;
  });
}

/** Strips the last `{param}` segment(s) so `/students/{id}` and `/students` land in the same family. */
function resourceFamilyKey(path: string): string {
  return path.replace(/\/\{[^}]+\}\s*$/, '');
}

/** Resolves every path param on an endpoint, preferring freshly captured ids over generated fallbacks. */
export function resolveDependentParams(
  endpoint: ApiEndpoint,
  registry: ResourceIdRegistry,
  generatedFallback: Record<string, unknown>,
): Record<string, unknown> {
  const paramNames = extractPathParamNames(endpoint.path);
  const resolved: Record<string, unknown> = {};
  for (const name of paramNames) {
    resolved[name] = registry.latestFor(name) ?? generatedFallback[name] ?? 1;
  }
  return resolved;
}
