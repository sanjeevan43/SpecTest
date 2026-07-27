import type { ParsedApiDocument, ApiEndpoint } from '../types';

export class PromptBuilder {
  /**
   * Minimizes the OpenAPI document to extract ONLY metadata, ensuring privacy.
   */
  public static buildMetadataPayload(document: ParsedApiDocument): any {
    const endpointsMetadata = document.endpoints.map((ep: ApiEndpoint) => {
      return {
        id: ep.id,
        path: ep.path,
        method: ep.method,
        operationId: ep.operationId,
        summary: ep.summary,
        description: ep.description,
        tags: ep.tags,
        parameters: ep.parameters.map(p => ({
          name: p.name,
          in: p.in,
          required: p.required,
          description: p.description,
          schema: p.schema ? this.sanitizeSchema(p.schema) : undefined
        })),
        requestBody: ep.requestBody ? {
          required: ep.requestBody.required,
          contentType: ep.requestBody.contentType,
          schema: ep.requestBody.schema ? this.sanitizeSchema(ep.requestBody.schema) : undefined
        } : undefined,
        responses: ep.responses.map(r => ({
          statusCode: r.statusCode,
          description: r.description,
          contentType: r.contentType,
          schema: r.schema ? this.sanitizeSchema(r.schema) : undefined
        }))
      };
    });

    return {
      title: document.title,
      description: document.description,
      version: document.version,
      endpoints: endpointsMetadata
    };
  }

  /**
   * Sanitizes schemas to remove arbitrary examples/default values if they are considered sensitive,
   * while keeping type and structure metadata.
   */
  private static sanitizeSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') return schema;

    const sanitized: any = {};
    const allowedKeys = [
      'type', 'format', 'required', 'properties', 'items', 'description', 
      'ref', 'minLength', 'maxLength', 'minimum', 'maximum'
    ];

    for (const key of allowedKeys) {
      if (schema[key] !== undefined) {
        if (key === 'properties') {
          sanitized.properties = {};
          for (const propKey of Object.keys(schema.properties)) {
            sanitized.properties[propKey] = this.sanitizeSchema(schema.properties[propKey]);
          }
        } else if (key === 'items') {
          sanitized.items = this.sanitizeSchema(schema.items);
        } else {
          sanitized[key] = schema[key];
        }
      }
    }
    return sanitized;
  }

  /**
   * Constructs the final prompt text instructing the AI to output JSON matching the InferenceResult format.
   */
  public static buildPrompt(metadataPayload: any): string {
    return `Analyze the following OpenAPI metadata to infer:
1. Logical execution order (executionOrder): Sort endpoints such that dependencies are executed first (e.g. POST before GET/PUT/DELETE, parent resources before nested sub-resources).
2. Dependency graph (dependencies): Map endpoint parameters to the matching upstream endpoint ID that generates the value.
3. Entity relationships: Parents to children relationships.
4. Nested resource parameter mappings.

Return a JSON object matching this TypeScript structure:
interface AIParameterDependency {
  parameterName: string;
  sourceEndpointId: string; // e.g. "POST:/students"
  sourceJsonPath?: string; // e.g. "$.id" or "id"
}

interface InferenceResult {
  executionOrder: string[]; // List of endpoint IDs in order
  dependencies: Record<string, AIParameterDependency[]>; // Key: endpoint ID, Value: list of dependency mappings
  entityRelationships: { parentEntity: string; childEntity: string; relationshipType: string; }[];
  nestedResources: { endpointId: string; parentParameterName: string; childParameterName: string; }[];
}

Metadata:
${JSON.stringify(metadataPayload, null, 2)}`;
  }
}
