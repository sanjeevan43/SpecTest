export interface DependencyNode {
  endpointId: string; // e.g. "GET:/students/{id}"
  dependencies: string[]; // parameter names it requires, e.g. ["id"]
  upstreamEndpoints: string[]; // endpoints that can supply these parameters
  downstreamEndpoints: string[]; // endpoints that consume this endpoint's output parameters
}
