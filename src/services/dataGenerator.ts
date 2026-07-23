import type { ApiParameter, JsonSchema, RequestBodyDefinition } from '@/models/types';
import { generateStringByFormat, isDateLike, isEmail, randomInt } from '@/utils/randomData';

/**
 * Produces a request body honoring the documented priority:
 *   1. Explicit `example`
 *   2. First entry in `examples`
 *   3. Schema-driven synthesis (recursively, using type/format defaults + enum-first)
 */
export function generateRequestBody(def: RequestBodyDefinition | null | undefined): unknown {
  if (!def) return undefined;
  if (def.example !== undefined && def.example !== null) return def.example;
  if (def.examples) {
    const first = Object.values(def.examples)[0];
    if (first !== undefined) return first;
  }
  if (def.schema) return generateFromSchema(def.schema, undefined, 0);
  return undefined;
}

/** Recursively synthesizes a value that satisfies a JSON Schema fragment. */
export function generateFromSchema(schema: JsonSchema | undefined, propName: string | undefined, depth: number): unknown {
  if (!schema || depth > 8) return null;

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];

  if (schema.allOf) {
    return schema.allOf.reduce<Record<string, unknown>>((acc, sub) => {
      const val = generateFromSchema(sub, propName, depth + 1);
      return typeof val === 'object' && val !== null ? { ...acc, ...(val as object) } : acc;
    }, {});
  }
  if (schema.oneOf?.length) return generateFromSchema(schema.oneOf[0], propName, depth + 1);
  if (schema.anyOf?.length) return generateFromSchema(schema.anyOf[0], propName, depth + 1);

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  switch (type) {
    case 'string':
      if (propName && isEmail(propName)) return 'test@example.com';
      if (propName && isDateLike(propName)) return new Date().toISOString();
      return generateStringByFormat(schema.format);
    case 'number':
    case 'integer':
      return schema.minimum !== undefined ? schema.minimum : randomInt(1, 100);
    case 'boolean':
      return false;
    case 'array':
      return [generateFromSchema(schema.items, propName, depth + 1)].filter((v) => v !== null);
    case 'object':
    default: {
      if (schema.properties) {
        const obj: Record<string, unknown> = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = generateFromSchema(propSchema, key, depth + 1);
        }
        return obj;
      }
      if (type === 'object' || type === undefined) return {};
      return null;
    }
  }
}

/** Generates a concrete value for a single parameter (path/query/header/cookie). */
export function generateParamValue(param: ApiParameter): unknown {
  if (param.example !== undefined) return param.example;
  if (param.schema?.default !== undefined) return param.schema.default;
  if (param.schema?.enum?.length) return param.schema.enum[0];
  return generateFromSchema(param.schema, param.name, 0);
}

/** Builds a default value map for a whole endpoint's parameters, grouped by location. */
export function generateParamValues(params: ApiParameter[]): Record<string, Record<string, unknown>> {
  const grouped: Record<string, Record<string, unknown>> = { path: {}, query: {}, header: {}, cookie: {} };
  for (const param of params) {
    grouped[param.in][param.name] = generateParamValue(param);
  }
  return grouped;
}
