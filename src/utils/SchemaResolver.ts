import type { ParsedApiDocument, ApiSchema } from '../types';

export class SchemaResolver {
  private static cache: Map<string, ApiSchema> = new Map();

  /**
   * Resolves references inside a schema.
   */
  public static resolve(
    schema: any,
    document: ParsedApiDocument,
    seenRefs: Set<string> = new Set()
  ): ApiSchema {
    if (!schema) return { type: 'object' };

    // If it's a reference
    if (schema.$ref && typeof schema.$ref === 'string') {
      const refPath = schema.$ref;

      if (seenRefs.has(refPath)) {
        // Prevent infinite recursion on circular references
        return { type: 'object', description: 'Circular reference detected' };
      }

      if (this.cache.has(refPath)) {
        return this.cache.get(refPath)!;
      }

      seenRefs.add(refPath);
      const resolved = this.lookupRef(refPath, document);
      const fullyResolved = this.resolve(resolved, document, seenRefs);
      
      this.cache.set(refPath, fullyResolved);
      return fullyResolved;
    }

    // Recursively resolve sub-schemas in properties
    if (schema.properties) {
      const resolvedProps: Record<string, ApiSchema> = {};
      for (const key of Object.keys(schema.properties)) {
        resolvedProps[key] = this.resolve(schema.properties[key], document, new Set(seenRefs));
      }
      schema.properties = resolvedProps;
    }

    // Recursively resolve items in arrays
    if (schema.items) {
      schema.items = this.resolve(schema.items, document, new Set(seenRefs));
    }

    // Recursively resolve combinators
    const combinators = ['oneOf', 'anyOf', 'allOf'];
    for (const comb of combinators) {
      if (schema[comb] && Array.isArray(schema[comb])) {
        schema[comb] = schema[comb].map((sub: any) => this.resolve(sub, document, new Set(seenRefs)));
      }
    }

    if (schema.not) {
      schema.not = this.resolve(schema.not, document, new Set(seenRefs));
    }

    return schema as ApiSchema;
  }

  private static lookupRef(refPath: string, document: ParsedApiDocument): any {
    // Expected format: "#/components/schemas/Student"
    const prefix = '#/components/schemas/';
    if (refPath.startsWith(prefix)) {
      const schemaName = refPath.substring(prefix.length);
      const schema = document.schemas[schemaName];
      if (schema) return schema;
    }
    return { type: 'object' };
  }

  public static clearCache() {
    this.cache.clear();
  }
}
