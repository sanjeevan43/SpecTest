import type { ApiSchema } from '../types';
import { RandomDataGenerator } from './RandomDataGenerator';

export class SchemaDataGenerator {
  private rand: RandomDataGenerator;

  constructor(seed: string = 'antigravity') {
    this.rand = new RandomDataGenerator(seed);
  }

  /**
   * Generates a valid data structure satisfying the schema.
   */
  public generateValid(schema: ApiSchema): unknown {
    if (schema.example !== undefined) return schema.example;
    if (schema.enum && schema.enum.length > 0) return this.rand.pick(schema.enum);

    switch (schema.type) {
      case 'object': {
        const obj: Record<string, unknown> = {};
        const props = schema.properties || {};
        for (const key of Object.keys(props)) {
          obj[key] = this.generateValid(props[key]);
        }
        return obj;
      }

      case 'array': {
        const itemSchema = schema.items || {};
        return [this.generateValid(itemSchema)];
      }

      case 'integer':
      case 'number':
        return this.rand.nextInt(1, 100);

      case 'boolean':
        return this.rand.pick([true, false]);

      case 'string':
        if (schema.format === 'date-time') return this.rand.nextDateTime();
        if (schema.format === 'date') return this.rand.nextDate();
        if (schema.format === 'email') return this.rand.nextEmail();
        if (schema.format === 'uuid') return this.rand.nextUuid();
        return this.rand.nextString(8);

      default:
        return null;
    }
  }

  /**
   * Generates a boundary case matching schema bounds (e.g. min, max, minLength, maxLength).
   */
  public generateBoundary(schema: ApiSchema, mode: 'min' | 'max' | 'underMin' | 'overMax'): unknown {
    if (schema.type === 'object') {
      const obj: Record<string, unknown> = {};
      const props = schema.properties || {};
      for (const key of Object.keys(props)) {
        obj[key] = this.generateBoundary(props[key], mode);
      }
      return obj;
    }

    if (schema.type === 'array') {
      const itemSchema = schema.items || {};
      if (mode === 'min' || mode === 'underMin') {
        return []; // Empty array boundary
      }
      // Return a larger array for max/overMax
      return Array.from({ length: 5 }, () => this.generateValid(itemSchema));
    }

    // Number limits
    if (schema.type === 'integer' || schema.type === 'number') {
      // In Swagger, schema limits may have minimum/maximum or we can generate boundary defaults
      const hasMin = schema.example !== undefined; // Check boundaries if any
      const base = 100;
      if (mode === 'min') return 0;
      if (mode === 'underMin') return -1;
      if (mode === 'max') return 1000000;
      if (mode === 'overMax') return 100000000;
    }

    // String lengths
    if (schema.type === 'string') {
      if (mode === 'min' || mode === 'underMin') return ''; // Empty string
      if (mode === 'max') return this.rand.nextString(128); // Standard max
      if (mode === 'overMax') return this.rand.nextString(1000); // Exceed limit
    }

    return this.generateValid(schema);
  }

  /**
   * Generates a negative structure that violates data types, schemas, or constraints.
   */
  public generateInvalid(schema: ApiSchema, errorType: 'type' | 'enum' | 'format'): unknown {
    if (schema.type === 'object') {
      const obj: Record<string, unknown> = {};
      const props = schema.properties || {};
      for (const key of Object.keys(props)) {
        obj[key] = this.generateValid(props[key]);
      }
      // Inject invalid field or delete required fields at parent handler layer
      return obj;
    }

    if (errorType === 'type') {
      // Return wrong type
      switch (schema.type) {
        case 'integer':
        case 'number':
          return 'not-a-number';
        case 'boolean':
          return 'not-a-boolean';
        case 'string':
          return 12345;
        default:
          return {};
      }
    }

    if (errorType === 'enum' && schema.enum && schema.enum.length > 0) {
      return 'invalid-enum-value-12345';
    }

    if (errorType === 'format' && schema.type === 'string') {
      if (schema.format === 'email') return 'invalid-email-address';
      if (schema.format === 'uuid') return 'invalid-uuid-format';
      if (schema.format === 'date-time' || schema.format === 'date') return 'invalid-date-format';
    }

    return null;
  }
}
