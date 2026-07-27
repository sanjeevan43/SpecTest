import { useDependencyStore } from '../store/dependencyStore';
import type { ResolvedParameter } from '../models/ResolvedParameter';
import type { ParsedApiDocument, ApiEndpoint } from '../types';
import { IdResolver } from './IdResolver';

export class PathParameterResolver {
  /**
   * Resolves a single path parameter by traversing the priority pipeline.
   * If a collection query is required, triggers it using the provided fetch executor function.
   */
  public static async resolve(
    paramName: string,
    endpointId: string,
    document: ParsedApiDocument,
    executeEndpointFn: (endpoint: ApiEndpoint) => Promise<unknown>
  ): Promise<ResolvedParameter> {
    const store = useDependencyStore.getState();

    // Pipeline Priority 1: Check manual user mappings override first
    const manualVal = store.manualMappings[paramName];
    if (manualVal) {
      return {
        name: paramName,
        value: manualVal,
        source: 'user',
        sourceDetails: 'User manual override',
      };
    }

    // Pipeline Priority 2: Stored/Harvested ID cache (from POST/etc.)
    const cachedEntities = store.entityCache[paramName] || [];
    if (cachedEntities.length > 0) {
      const entity = cachedEntities[0]; // grab the most recently harvested ID
      return {
        name: paramName,
        value: entity.value,
        source: 'cache',
        sourceDetails: `Harvested from ${entity.source}`,
      };
    }

    // Pipeline Priority 3: Collection Lookup
    // Find if a GET collection endpoint exists for this resource (e.g. GET /students for studentId)
    const collectionEndpoint = this.findCollectionEndpoint(paramName, document);
    if (collectionEndpoint) {
      try {
        console.log(`[Dependency Engine] No ID found for "${paramName}". Triggering collection query GET: ${collectionEndpoint.path}`);
        
        // Execute the collection GET query
        const responseData = await executeEndpointFn(collectionEndpoint);
        
        // Harvest any IDs returned in the collection response
        IdResolver.harvest(responseData, `${collectionEndpoint.method} ${collectionEndpoint.path}`);

        // Recheck cache after harvesting
        const updatedCache = useDependencyStore.getState().entityCache[paramName] || [];
        if (updatedCache.length > 0) {
          const entity = updatedCache[0];
          return {
            name: paramName,
            value: entity.value,
            source: 'collection',
            sourceDetails: `Query resolved via GET ${collectionEndpoint.path}`,
          };
        }
      } catch (err) {
        console.warn(`[Dependency Engine] Collection query lookup failed:`, err);
      }
    }

    // Pipeline Priority 3.5: AI-Assisted Inference
    const aiStore = (await import('../store/aiStore')).useAIStore.getState();
    if (aiStore.enabled) {
      try {
        const aiResolution = await (
          await import('./DependencyInferenceService')
        ).DependencyInferenceService.resolveParameter(paramName, endpointId, document);
        if (aiResolution) {
          return {
            name: paramName,
            value: aiResolution.value,
            source: 'collection', // reuse source or map it
            sourceDetails: aiResolution.sourceDetails,
          };
        }
      } catch (err) {
        console.warn(`[Dependency Engine] AI Inference parameter lookup failed:`, err);
      }
    }

    // Pipeline Priority 4: Generated Fallback from Schema
    const endpoint = document.endpoints.find((e) => e.id === endpointId);
    const paramSpec = endpoint?.parameters.find((p) => p.name === paramName);
    if (paramSpec?.schema) {
      const generatedVal = this.generateFallbackValue(paramSpec.schema);
      return {
        name: paramName,
        value: String(generatedVal),
        source: 'generated',
        sourceDetails: 'Auto-generated fallback value',
      };
    }

    // Pipeline Priority 5: Missing
    return {
      name: paramName,
      value: '',
      source: 'missing',
    };
  }

  private static findCollectionEndpoint(paramName: string, document: ParsedApiDocument): ApiEndpoint | null {
    const entityName = paramName.replace(/Id$/i, '').replace(/ID$/i, '').replace(/_id$/i, '').toLowerCase();

    // Look for GET endpoints that return arrays/lists of this resource
    // E.g. GET /students or GET /api/v1/students
    const match = document.endpoints.find((ep) => {
      if (ep.method !== 'GET') return false;
      // Exclude endpoints that have path parameters (contains '{') to ensure we match a pure collection query
      if (ep.path.includes('{')) return false;
      
      const pathSegments = ep.path.split('/').filter((s) => s && !s.startsWith('{'));
      if (pathSegments.length === 0) return false;

      const lastSegment = pathSegments[pathSegments.length - 1].toLowerCase();
      // Ensure the endpoint is a collection segment (plural segment matching entity name, e.g. "students")
      return (
        lastSegment.includes(entityName) ||
        this.singularize(lastSegment) === entityName
      );
    });

    return match || null;
  }

  private static generateFallbackValue(schema: any): unknown {
    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (schema.enum && schema.enum.length > 0) return schema.enum[0];

    switch (schema.type) {
      case 'integer':
      case 'number':
        return 1;
      case 'boolean':
        return true;
      default:
        return '1'; // Default string fallback for IDs
    }
  }

  private static singularize(word: string): string {
    const lower = word.toLowerCase();
    if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y';
    if (lower.endsWith('es') && !lower.endsWith('sches') && !lower.endsWith('sses')) return lower.slice(0, -1);
    if (lower.endsWith('s') && !lower.endsWith('ss') && !lower.endsWith('us') && !lower.endsWith('is')) return lower.slice(0, -1);
    return lower;
  }
}
