import { useDependencyStore } from '../store/dependencyStore';
import { PathParameterResolver } from './PathParameterResolver';
import type { ResolvedParameter } from '../models/ResolvedParameter';
import type { ParsedApiDocument, ApiEndpoint } from '../types';

export class DependencyResolver {
  /**
   * Resolves all path parameters of the given endpoint.
   */
  public static async resolveEndpointParameters(
    endpoint: ApiEndpoint,
    document: ParsedApiDocument,
    executeEndpointFn: (endpoint: ApiEndpoint) => Promise<unknown>
  ): Promise<ResolvedParameter[]> {
    const store = useDependencyStore.getState();
    const pathParams = endpoint.parameters.filter((p) => p.in === 'path');

    if (pathParams.length === 0) {
      return [];
    }

    const resolved: ResolvedParameter[] = [];

    for (const param of pathParams) {
      if (!store.isDependencyEngineEnabled) {
        // Resolve using manual override or fallback generation only if engine is disabled
        const manualVal = store.manualMappings[param.name];
        if (manualVal) {
          resolved.push({
            name: param.name,
            value: manualVal,
            source: 'user',
            sourceDetails: 'User manual override (Engine Disabled)',
          });
        } else {
          // Generated fallback value
          const fallback = param.schema ? String(param.schema.example || param.schema.default || '1') : '1';
          resolved.push({
            name: param.name,
            value: fallback,
            source: 'generated',
            sourceDetails: 'Auto-generated fallback (Engine Disabled)',
          });
        }
        continue;
      }

      // Run full resolution pipeline
      const result = await PathParameterResolver.resolve(
        param.name,
        endpoint.id,
        document,
        executeEndpointFn
      );
      resolved.push(result);
    }

    return resolved;
  }
}
