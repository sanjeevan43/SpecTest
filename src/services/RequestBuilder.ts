import type { ApiEndpoint, ApiSchema } from '../types';
import type { ApiRequest } from '../types/ApiRequest';
import { HeaderBuilder } from './HeaderBuilder';
import { EnvironmentManager } from './EnvironmentManager';
import { useEnvironmentStore } from '../store/environmentStore';

export class RequestBuilder {
  /**
   * Generates a request object from endpoint specification.
   */
   public static build(
    endpoint: ApiEndpoint,
    baseUrl: string,
    paramOverrides?: Record<string, string>
  ): ApiRequest {
    const queryParams: Record<string, string> = {};
    const pathParams: Record<string, string> = {};
    const headerParams: Record<string, string> = {};

    // 1. Process parameters (path, query, header, cookie)
    endpoint.parameters.forEach((param) => {
      let val = this.resolveParameterValue(param.schema, param.defaultValue, param.example);

      if (paramOverrides && paramOverrides[param.name] !== undefined) {
        val = paramOverrides[param.name];
      }

      if (param.in === 'path') {
        pathParams[param.name] = String(val);
      } else if (param.in === 'query') {
        queryParams[param.name] = String(val);
      } else if (param.in === 'header') {
        headerParams[param.name] = String(val);
      }
    });

    // 2. Build absolute URL replacing path parameter placeholders
    let resolvedPath = endpoint.path;
    Object.keys(pathParams).forEach((key) => {
      resolvedPath = resolvedPath.replace(`{${key}}`, encodeURIComponent(pathParams[key]));
    });

    // Strip trailing slash of baseUrl and leading slash of path if necessary
    const formattedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const formattedPath = resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`;
    const url = `${formattedBase}${formattedPath}`;

    // 3. Resolve Request Body
    let body: unknown = null;
    let requestContentType: string | undefined;

    if (endpoint.requestBody) {
      requestContentType = endpoint.requestBody.contentType;
      if (endpoint.requestBody.example !== undefined) {
        body = endpoint.requestBody.example;
      } else if (endpoint.requestBody.examples && Object.keys(endpoint.requestBody.examples).length > 0) {
        const firstKey = Object.keys(endpoint.requestBody.examples)[0];
        const exObj = endpoint.requestBody.examples[firstKey];
        body = typeof exObj === 'object' && exObj !== null && 'value' in exObj ? (exObj as any).value : exObj;
      } else if (endpoint.requestBody.schema) {
        body = this.generateSampleFromSchema(endpoint.requestBody.schema);
      }
    }

    // 4. Build standard & authorization headers
    const authHeaders = HeaderBuilder.build(
      endpoint.security,
      endpoint.consumes,
      endpoint.produces
    );

    // 5. Merge custom global and environment headers
    const envState = useEnvironmentStore.getState();
    const activeEnv = envState.environments.find((e) => e.id === envState.selectedEnvironmentId);

    if (activeEnv?.headers) {
      Object.assign(headerParams, activeEnv.headers);
    }
    if (envState.globalHeaders) {
      Object.assign(headerParams, envState.globalHeaders);
    }

    const headers = {
      ...authHeaders,
      ...headerParams,
    };

    if (requestContentType) {
      headers['Content-Type'] = requestContentType;
    }

    const request: ApiRequest = {
      method: endpoint.method,
      url,
      headers,
      queryParams,
      pathParams,
      body,
      contentType: requestContentType,
    };

    // Resolve environment variables using EnvironmentManager
    return EnvironmentManager.resolve(request);
  }

  private static resolveParameterValue(
    schema?: ApiSchema,
    defaultValue?: unknown,
    example?: unknown
  ): unknown {
    if (defaultValue !== undefined) return defaultValue;
    if (example !== undefined) return example;
    if (!schema) return 'value';

    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (schema.enum && schema.enum.length > 0) return schema.enum[0];

    // Fallbacks based on schema type
    switch (schema.type) {
      case 'integer':
      case 'number':
        return 1;
      case 'boolean':
        return true;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return 'string';
    }
  }

  /**
   * Generates a mock object payload recursively based on the schema model.
   */
  public static generateSampleFromSchema(schema: ApiSchema): unknown {
    if (schema.example !== undefined) return schema.example;
    if (schema.enum && schema.enum.length > 0) return schema.enum[0];

    // Resolve refs if they are flattened (we just look at type)
    if (schema.type === 'object') {
      const obj: Record<string, unknown> = {};
      const props = schema.properties || {};
      for (const key of Object.keys(props)) {
        obj[key] = this.generateSampleFromSchema(props[key]);
      }
      return obj;
    }

    if (schema.type === 'array') {
      const itemSchema = schema.items || {};
      return [this.generateSampleFromSchema(itemSchema)];
    }

    switch (schema.type) {
      case 'integer':
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'string':
        if (schema.format === 'date-time') return new Date().toISOString();
        if (schema.format === 'date') return new Date().toISOString().split('T')[0];
        return 'string';
      default:
        return null;
    }
  }
}
