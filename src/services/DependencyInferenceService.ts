import { AIService } from './AIService';
import { useDependencyStore } from '../store/dependencyStore';
import type { ParsedApiDocument } from '../types';

export class DependencyInferenceService {
  /**
   * Attempts to resolve a path parameter using AI-inferred relationships.
   */
  public static async resolveParameter(
    paramName: string,
    endpointId: string,
    document: ParsedApiDocument
  ): Promise<{ value: string; sourceDetails: string } | null> {
    try {
      const inference = await AIService.infer(document);
      if (!inference) return null;

      // Look up parameter mapping in AI dependencies
      const endpointDeps = inference.dependencies[endpointId];
      if (endpointDeps) {
        const matchingParam = endpointDeps.find(
          (d) => d.parameterName.toLowerCase() === paramName.toLowerCase()
        );

        if (matchingParam) {
          // Find if we have cached entities harvested from the source endpoint
          const store = useDependencyStore.getState();
          // We can check if any cached entities match this parameter name
          const cachedEntities = store.entityCache[paramName] || [];
          if (cachedEntities.length > 0) {
            // Find one harvested from the specific source endpoint if possible, or grab the latest
            const matchedEntity = cachedEntities.find(
              (e) => e.source.toLowerCase().includes(matchingParam.sourceEndpointId.toLowerCase())
            ) || cachedEntities[0];

            return {
              value: matchedEntity.value,
              sourceDetails: `Resolved via AI dependency mapping [${matchingParam.sourceEndpointId}]`
            };
          }
        }
      }

      // Check nested resources if matching
      const nested = inference.nestedResources.find(
        (n) => n.endpointId === endpointId && (n.parentParameterName === paramName || n.childParameterName === paramName)
      );
      if (nested) {
        const store = useDependencyStore.getState();
        const cachedEntities = store.entityCache[paramName] || [];
        if (cachedEntities.length > 0) {
          return {
            value: cachedEntities[0].value,
            sourceDetails: `Resolved via AI nested resource mapping [${nested.parentParameterName} -> ${nested.childParameterName}]`
          };
        }
      }

      return null;
    } catch (e) {
      console.warn('[AI Dependency Inference] Failed to resolve parameter using AI:', e);
      return null;
    }
  }
}
