import type { ApiSchema, ParsedApiDocument } from '../types';
import { SchemaResolver } from '../utils/SchemaResolver';
import { TypeChecker } from '../utils/TypeChecker';

export interface DiffItem {
  path: string;
  status: 'matched' | 'missing' | 'added' | 'mismatched';
  expected: string;
  actual: string;
}

export class ResponseComparator {
  /**
   * Generates structural difference data between expected schema and actual payload.
   */
  public static compare(
    body: unknown,
    schema: ApiSchema,
    document: ParsedApiDocument
  ): DiffItem[] {
    const diffs: DiffItem[] = [];
    const resolved = SchemaResolver.resolve(schema, document);
    this.compareRecursive(body, resolved, document, 'body', diffs);
    return diffs;
  }

  private static compareRecursive(
    value: unknown,
    schema: ApiSchema,
    document: ParsedApiDocument,
    path: string,
    diffs: DiffItem[]
  ): void {
    if (!schema) return;

    const resolvedSchema = SchemaResolver.resolve(schema, document);

    // 1. Missing case
    if (value === undefined || value === null) {
      const isNullable = resolvedSchema.nullable || false;
      if (!isNullable) {
        diffs.push({
          path,
          status: 'missing',
          expected: resolvedSchema.type || 'any',
          actual: 'missing',
        });
      } else {
        diffs.push({
          path,
          status: 'matched',
          expected: `${resolvedSchema.type} (nullable)`,
          actual: 'null',
        });
      }
      return;
    }

    // 2. Type mismatch check
    if (resolvedSchema.type) {
      const match = TypeChecker.check(value, resolvedSchema.type, resolvedSchema.nullable);
      if (!match) {
        diffs.push({
          path,
          status: 'mismatched',
          expected: resolvedSchema.type,
          actual: TypeChecker.getFriendlyType(value),
        });
        return;
      }
    }

    // 3. Object properties recursive check
    if (resolvedSchema.type === 'object' && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      const properties = resolvedSchema.properties || {};

      // Check documented schema fields
      for (const key of Object.keys(properties)) {
        this.compareRecursive(
          obj[key],
          properties[key],
          document,
          `${path}.${key}`,
          diffs
        );
      }

      // Check undocumented fields
      for (const key of Object.keys(obj)) {
        if (properties[key] === undefined) {
          diffs.push({
            path: `${path}.${key}`,
            status: 'added',
            expected: 'none',
            actual: TypeChecker.getFriendlyType(obj[key]),
          });
        }
      }
      return;
    }

    // 4. Array items recursive check
    if (resolvedSchema.type === 'array' && Array.isArray(value)) {
      const arr = value;
      const itemsSchema = resolvedSchema.items;

      if (itemsSchema) {
        // Sample first few items to prevent giant visual lists in UI
        const sampleSize = Math.min(arr.length, 3);
        for (let i = 0; i < sampleSize; i++) {
          this.compareRecursive(
            arr[i],
            itemsSchema,
            document,
            `${path}[${i}]`,
            diffs
          );
        }
        if (arr.length > sampleSize) {
          diffs.push({
            path: `${path}[...]`,
            status: 'matched',
            expected: `array items schema (total items: ${arr.length})`,
            actual: `array items schema (total items: ${arr.length})`,
          });
        }
      }
      return;
    }

    // 5. Default Match case
    diffs.push({
      path,
      status: 'matched',
      expected: resolvedSchema.type || 'any',
      actual: String(value),
    });
  }
}
