export interface AIParameterDependency {
  parameterName: string;
  sourceEndpointId: string; // e.g. "POST:/students"
  sourceJsonPath?: string; // e.g. "$.id" or "id"
}

export interface InferenceResult {
  executionOrder: string[]; // List of endpoint IDs in order, e.g. ["POST:/auth", "POST:/students", "GET:/students/{id}"]
  dependencies: Record<string, AIParameterDependency[]>; // Key: endpoint ID. Value: list of parameter mappings
  entityRelationships: {
    parentEntity: string;
    childEntity: string;
    relationshipType: string; // e.g. "one-to-many"
  }[];
  nestedResources: {
    endpointId: string;
    parentParameterName: string;
    childParameterName: string;
  }[];
}
