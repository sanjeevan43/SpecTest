import { useDependencyStore } from '../store/dependencyStore';
import type { StoredEntity } from '../models/StoredEntity';

export class IdResolver {
  /**
   * Scans a response payload recursively to find and harvest IDs.
   * Discovered IDs are stored in the dependency store.
   */
  public static harvest(responseBody: unknown, sourceEndpoint: string): void {
    if (responseBody === null || responseBody === undefined) return;
    
    const harvested: StoredEntity[] = [];
    this.scanRecursive(responseBody, harvested, sourceEndpoint);

    // Commit all harvested entities to store
    const store = useDependencyStore.getState();
    harvested.forEach((entity) => {
      store.addHarvestedEntity(entity);
    });
  }

  private static scanRecursive(
    node: unknown,
    harvested: StoredEntity[],
    sourceEndpoint: string
  ): void {
    if (node === null || node === undefined) return;

    // 1. Handle arrays
    if (Array.isArray(node)) {
      node.forEach((item) => this.scanRecursive(item, harvested, sourceEndpoint));
      return;
    }

    // 2. Handle objects
    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        
        // Check key matching criteria: e.g. "id", "userId", "studentId", or ending in "Id"/"ID"/"_id"
        if (this.isIdKey(key) && (typeof val === 'string' || typeof val === 'number')) {
          // Normalize key name (e.g. if key is "id" and endpoint is "POST /students", name it "studentId")
          const name = this.normalizeIdKeyName(key, sourceEndpoint);
          
          harvested.push({
            name,
            value: String(val),
            source: sourceEndpoint,
            timestamp: Date.now(),
          });
        }
        
        // Recurse on children objects/arrays
        if (typeof val === 'object') {
          this.scanRecursive(val, harvested, sourceEndpoint);
        }
      }
    }
  }

  private static isIdKey(key: string): boolean {
    const lower = key.toLowerCase();
    return (
      lower === 'id' ||
      lower.endsWith('id') ||
      lower.endsWith('_id')
    );
  }

  /**
   * Maps generic "id" keys back to specific parameters, e.g. "id" returned from "POST /students" becomes "studentId".
   */
  private static normalizeIdKeyName(key: string, sourceEndpoint: string): string {
    const lowerKey = key.toLowerCase();
    
    // If it's already a specific ID name like "studentId", return as-is (with lowercased or camelCased formatting)
    if (lowerKey !== 'id' && lowerKey !== '_id') {
      // Ensure camelCase (e.g. student_id or STUDENTID -> studentId)
      return this.toCamelCase(key);
    }

    // If key is generic "id" or "_id", infer property name from the source endpoint URL path
    // e.g. "POST /api/v1/students" -> infer entity is "student", returns "studentId"
    const [method, path] = sourceEndpoint.split(' ');
    if (!path) return 'id';

    const segments = path.split('/').filter((s) => s && !s.startsWith('{'));
    if (segments.length === 0) return 'id';

    // Get the last plural segment and singularize it
    const lastSegment = segments[segments.length - 1];
    const entityName = this.singularize(lastSegment);
    return `${entityName}Id`;
  }

  private static toCamelCase(str: string): string {
    return str
      .replace(/_([a-z])/g, (_, g) => g.toUpperCase())
      .replace(/_([A-Z])/g, (_, g) => g.toUpperCase())
      .replace(/^[A-Z]/, (g) => g.toLowerCase());
  }

  private static singularize(word: string): string {
    const lower = word.toLowerCase();
    if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y';
    if (lower.endsWith('es') && !lower.endsWith('sches') && !lower.endsWith('sses')) return lower.slice(0, -1);
    if (lower.endsWith('s') && !lower.endsWith('ss') && !lower.endsWith('us') && !lower.endsWith('is')) return lower.slice(0, -1);
    return lower;
  }
}
