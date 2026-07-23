/**
 * Resolves local `$ref` pointers (e.g. "#/components/schemas/Student") within an
 * already-parsed OpenAPI/Swagger 2.0 document. Remote/external refs are left as-is
 * (out of scope — the vast majority of real-world specs are self-contained).
 */
export function resolveRefs<T>(document: unknown): T {
  const seen = new WeakMap<object, unknown>();

  function resolve(node: unknown, depth: number): unknown {
    if (depth > 40 || node === null || typeof node !== 'object') return node;

    if (seen.has(node as object)) return seen.get(node as object);

    if (Array.isArray(node)) {
      const result: unknown[] = [];
      seen.set(node as object, result);
      node.forEach((item, i) => {
        result[i] = resolve(item, depth + 1);
      });
      return result;
    }

    const obj = node as Record<string, unknown>;
    if (typeof obj.$ref === 'string' && obj.$ref.startsWith('#/')) {
      const target = lookupPointer(document, obj.$ref);
      if (target !== undefined) {
        // Resolve the target itself (in case of nested refs), then merge any sibling keys.
        const resolvedTarget = resolve(target, depth + 1);
        const { $ref, ...siblings } = obj;
        void $ref;
        if (Object.keys(siblings).length > 0 && typeof resolvedTarget === 'object' && resolvedTarget !== null) {
          return { ...(resolvedTarget as object), ...resolve(siblings, depth + 1) as object };
        }
        return resolvedTarget;
      }
      return obj;
    }

    const result: Record<string, unknown> = {};
    seen.set(node as object, result);
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolve(value, depth + 1);
    }
    return result;
  }

  return resolve(document, 0) as T;
}

function lookupPointer(document: unknown, ref: string): unknown {
  const segments = ref
    .replace(/^#\//, '')
    .split('/')
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));

  let current: unknown = document;
  for (const segment of segments) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
