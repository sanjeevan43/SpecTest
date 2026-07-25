import jsYaml from 'js-yaml';
import type {
  ParsedApiDocument,
  ApiEndpoint,
  ApiParameter,
  ApiRequestBody,
  ApiResponse,
  ApiSchema,
} from '../types';

export class OpenApiParser {
  /**
   * Fetches, parses, and normalizes a Swagger/OpenAPI document from a URL.
   */
  public static async parse(url: string): Promise<ParsedApiDocument> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch specification from ${url} (Status: ${response.status})`);
    }
    const rawText = await response.text();
    return this.parseString(rawText, url);
  }

  /**
   * Parses and normalizes raw JSON or YAML string data.
   */
  public static parseString(rawText: string, sourceUrl: string): ParsedApiDocument {
    let rawDoc: any;
    
    // Determine whether JSON or YAML
    const trimmed = rawText.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        rawDoc = JSON.parse(rawText);
      } catch (err) {
        throw new Error(`Malformed JSON specification: ${(err as Error).message}`);
      }
    } else {
      try {
        rawDoc = jsYaml.load(rawText);
      } catch (err) {
        throw new Error(`Malformed YAML specification: ${(err as Error).message}`);
      }
    }

    if (!rawDoc || typeof rawDoc !== 'object') {
      throw new Error('Invalid document structure: root must be a JSON object.');
    }

    const isOpenApi3 = typeof rawDoc.openapi === 'string';
    const isSwagger2 = typeof rawDoc.swagger === 'string';

    if (!isOpenApi3 && !isSwagger2) {
      throw new Error('Unsupported document format. Must be OpenAPI 3.x or Swagger 2.0.');
    }

    const openApiVersion = isOpenApi3 ? rawDoc.openapi : rawDoc.swagger;
    const info = rawDoc.info || {};
    const title = info.title || 'API Document';
    const version = info.version || '1.0.0';
    const description = info.description;

    // Resolve base paths and server URLs
    let serverUrls: string[] = [];
    let baseUrl = '';

    if (isOpenApi3) {
      if (Array.isArray(rawDoc.servers) && rawDoc.servers.length > 0) {
        serverUrls = rawDoc.servers.map((s: any) => s.url);
        baseUrl = serverUrls[0];
      } else {
        // Fallback to origin
        baseUrl = new URL(sourceUrl).origin;
        serverUrls = [baseUrl];
      }
    } else {
      // Swagger 2.0
      const host = rawDoc.host || new URL(sourceUrl).host;
      const basePath = rawDoc.basePath || '';
      const schemes = Array.isArray(rawDoc.schemes) ? rawDoc.schemes : [new URL(sourceUrl).protocol.replace(':', '')];
      serverUrls = schemes.map((s: string) => `${s}://${host}${basePath}`);
      baseUrl = serverUrls[0] || `${new URL(sourceUrl).protocol}//${host}${basePath}`;
    }

    // Capture schemas definitions
    const rawSchemas = isOpenApi3 ? (rawDoc.components?.schemas || {}) : (rawDoc.definitions || {});
    const schemas: Record<string, ApiSchema> = {};
    for (const name of Object.keys(rawSchemas)) {
      schemas[name] = this.normalizeSchema(rawSchemas[name]);
    }

    // Resolve helper for references within this document
    const resolveRef = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      if (obj.$ref && typeof obj.$ref === 'string') {
        const refPath = obj.$ref;
        if (refPath.startsWith('#/components/schemas/')) {
          const schemaName = refPath.replace('#/components/schemas/', '');
          return { ...this.resolveRefPath(rawDoc, refPath), ref: schemaName };
        }
        if (refPath.startsWith('#/definitions/')) {
          const schemaName = refPath.replace('#/definitions/', '');
          return { ...this.resolveRefPath(rawDoc, refPath), ref: schemaName };
        }
        return this.resolveRefPath(rawDoc, refPath);
      }
      return obj;
    };

    // Parse endpoints
    const endpoints: ApiEndpoint[] = [];
    const paths = rawDoc.paths || {};

    for (const path of Object.keys(paths)) {
      const pathItem = paths[path] || {};
      // Inherited path-level parameters
      const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

      const methods = ['get', 'post', 'put', 'delete', 'options', 'head', 'patch', 'trace'];
      for (const method of methods) {
        const operation = pathItem[method];
        if (!operation || typeof operation !== 'object') continue;

        const summary = operation.summary;
        const opDescription = operation.description;
        const operationId = operation.operationId;
        const tags = Array.isArray(operation.tags) ? operation.tags : [];
        const consumes = Array.isArray(operation.consumes) ? operation.consumes : [];
        const produces = Array.isArray(operation.produces) ? operation.produces : [];
        const security = operation.security || rawDoc.security || undefined;
        const deprecated = operation.deprecated === true;

        // Merge operation-level and path-level parameters
        const operationParams = Array.isArray(operation.parameters) ? operation.parameters : [];
        const rawParams = [...pathParameters, ...operationParams];

        const parameters: ApiParameter[] = rawParams.map((paramRef: any) => {
          const param = resolveRef(paramRef);
          return {
            name: param.name || '',
            in: param.in || 'query',
            required: param.required === true,
            description: param.description,
            schema: param.schema ? this.normalizeSchema(resolveRef(param.schema)) : this.normalizeSchema(param),
            defaultValue: param.default ?? (param.schema ? param.schema.default : undefined),
            example: param.example ?? (param.schema ? param.schema.example : undefined),
          };
        });

        // Request Body (OpenAPI 3.x spec structure)
        let requestBody: ApiRequestBody | undefined;
        if (operation.requestBody) {
          const bodyRef = resolveRef(operation.requestBody);
          const content = bodyRef.content || {};
          const firstType = Object.keys(content)[0] || 'application/json';
          const typeConfig = content[firstType] || {};
          requestBody = {
            contentType: firstType,
            required: bodyRef.required === true,
            description: bodyRef.description,
            schema: this.normalizeSchema(resolveRef(typeConfig.schema)),
            example: typeConfig.example,
            examples: typeConfig.examples,
          };
        } else if (method !== 'get' && method !== 'delete') {
          // Fallback check for Swagger 2.0 "in: body" parameter mapping
          const bodyParam = parameters.find((p) => p.in === 'body');
          if (bodyParam) {
            requestBody = {
              contentType: consumes[0] || 'application/json',
              required: bodyParam.required,
              description: bodyParam.description,
              schema: bodyParam.schema,
              example: bodyParam.example,
            };
          }
        }

        // Responses
        const responses: ApiResponse[] = [];
        const rawResponses = operation.responses || {};
        for (const statusCode of Object.keys(rawResponses)) {
          const respRef = resolveRef(rawResponses[statusCode]);
          const content = respRef.content || {};
          const contentTypes = Object.keys(content);

          if (contentTypes.length > 0) {
            contentTypes.forEach((contentType) => {
              const typeConfig = content[contentType] || {};
              responses.push({
                statusCode,
                description: respRef.description || '',
                contentType,
                schema: this.normalizeSchema(resolveRef(typeConfig.schema)),
                example: typeConfig.example,
                examples: typeConfig.examples,
              });
            });
          } else {
            // Swagger 2.0 or empty response schema fallback
            responses.push({
              statusCode,
              description: respRef.description || '',
              schema: respRef.schema ? this.normalizeSchema(resolveRef(respRef.schema)) : undefined,
              example: respRef.examples,
            });
          }
        }

        endpoints.push({
          id: `${method.toUpperCase()}:${path}`,
          method: method.toUpperCase(),
          path,
          summary,
          description: opDescription,
          operationId,
          tags,
          consumes,
          produces,
          security,
          deprecated,
          parameters: parameters.filter((p) => p.in !== 'body'), // Filter body parameter out since we mapped it to requestBody
          requestBody,
          responses,
        });
      }
    }

    return {
      title,
      version,
      description,
      openApiVersion,
      baseUrl,
      serverUrls,
      endpoints,
      schemas,
    };
  }

  private static resolveRefPath(root: any, ref: string): any {
    if (!ref.startsWith('#/')) return {};
    const parts = ref.split('/').slice(1);
    let current = root;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return {};
      }
    }
    return current;
  }

  private static normalizeSchema(raw: any): ApiSchema {
    if (!raw || typeof raw !== 'object') return {};

    const schema: ApiSchema = {};
    if (typeof raw.type === 'string') schema.type = raw.type;
    if (typeof raw.format === 'string') schema.format = raw.format;
    if (Array.isArray(raw.required)) schema.required = raw.required;
    if (typeof raw.nullable === 'boolean') schema.nullable = raw.nullable;
    if (typeof raw.description === 'string') schema.description = raw.description;
    if (raw.example !== undefined) schema.example = raw.example;
    if (Array.isArray(raw.enum)) schema.enum = raw.enum;

    if (raw.properties && typeof raw.properties === 'object') {
      schema.properties = {};
      for (const key of Object.keys(raw.properties)) {
        schema.properties[key] = this.normalizeSchema(raw.properties[key]);
      }
    }

    if (raw.items && typeof raw.items === 'object') {
      schema.items = this.normalizeSchema(raw.items);
    }

    if (raw.$ref && typeof raw.$ref === 'string') {
      const parts = raw.$ref.split('/');
      schema.ref = parts[parts.length - 1];
    }

    return schema;
  }
}
