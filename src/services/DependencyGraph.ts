import type { ParsedApiDocument, ApiEndpoint } from '../types';
import type { DependencyNode } from '../models/DependencyNode';
import { useDependencyStore } from '../store/dependencyStore';

export class DependencyGraph {
  /**
   * Generates a dependency graph mapping relations between endpoints in a parsed document.
   */
  public static build(document: ParsedApiDocument): DependencyNode[] {
    const graph: DependencyNode[] = [];
    const endpoints = document.endpoints;

    // 1. Initialize nodes
    endpoints.forEach((ep) => {
      // Find all path parameters from parameter array
      const pathParams = ep.parameters
        .filter((p) => p.in === 'path')
        .map((p) => p.name);

      graph.push({
        endpointId: ep.id,
        dependencies: pathParams,
        upstreamEndpoints: [],
        downstreamEndpoints: [],
      });
    });

    // 2. Identify relationships by mapping param name matches
    graph.forEach((node) => {
      const endpoint = endpoints.find((e) => e.id === node.endpointId);
      if (!endpoint) return;

      node.dependencies.forEach((paramName) => {
        // Find potential upstream endpoints that can generate this parameter value
        // Typically a POST or GET collection endpoint on the parent resource
        const inferredEntity = paramName.replace(/Id$/i, '').replace(/ID$/i, '').replace(/_id$/i, '');
        
        endpoints.forEach((candidate) => {
          if (candidate.id === node.endpointId) return;

          const isPost = candidate.method === 'POST';
          const isGet = candidate.method === 'GET';
          const [candMethod, candPath] = candidate.id.split(':');

          const pathSegments = candPath.split('/').filter((s) => s && !s.startsWith('{'));
          const lastSegment = pathSegments[pathSegments.length - 1] || '';
          
          const matchesResource = 
            lastSegment.toLowerCase().includes(inferredEntity.toLowerCase()) ||
            inferredEntity.toLowerCase().includes(this.singularize(lastSegment).toLowerCase());

          // A matching POST resource or a GET collection resource is upstream
          if (matchesResource) {
            if (isPost) {
              node.upstreamEndpoints.push(candidate.id);
            } else if (isGet && !candPath.includes(`{${paramName}}`)) {
              // GET collection endpoint (without this specific path variable in its URL)
              node.upstreamEndpoints.push(candidate.id);
            }
          }
        });
      });
    });

    // 3. Map downstream linkages based on upstreams
    graph.forEach((node) => {
      node.upstreamEndpoints.forEach((upstreamId) => {
        const upstreamNode = graph.find((n) => n.endpointId === upstreamId);
        if (upstreamNode && !upstreamNode.downstreamEndpoints.includes(node.endpointId)) {
          upstreamNode.downstreamEndpoints.push(node.endpointId);
        }
      });
    });

    // Save to store
    useDependencyStore.getState().setDependencyGraph(graph);

    return graph;
  }

  private static singularize(word: string): string {
    const lower = word.toLowerCase();
    if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y';
    if (lower.endsWith('es') && !lower.endsWith('sches') && !lower.endsWith('sses')) return lower.slice(0, -1);
    if (lower.endsWith('s') && !lower.endsWith('ss') && !lower.endsWith('us') && !lower.endsWith('is')) return lower.slice(0, -1);
    return lower;
  }
}
