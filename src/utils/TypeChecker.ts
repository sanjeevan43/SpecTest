export class TypeChecker {
  /**
   * Checks if a value matches the expected OpenAPI type.
   */
  public static check(value: unknown, expectedType: string, nullable: boolean = false): boolean {
    if (value === null || value === undefined) {
      return nullable;
    }

    switch (expectedType) {
      case 'string':
        return typeof value === 'string';

      case 'number':
        return typeof value === 'number' && !isNaN(value);

      case 'integer':
        return typeof value === 'number' && Number.isInteger(value);

      case 'boolean':
        return typeof value === 'boolean';

      case 'array':
        return Array.isArray(value);

      case 'object':
        return typeof value === 'object' && !Array.isArray(value);

      case 'null':
        return value === null;

      default:
        // Loose fallback
        return true;
    }
  }

  /**
   * Returns a friendly string description of JavaScript type.
   */
  public static getFriendlyType(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'number' && Number.isInteger(value)) return 'integer';
    return typeof value;
  }
}
