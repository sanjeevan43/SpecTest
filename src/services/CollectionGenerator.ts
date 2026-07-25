import type { ApiExecutionDetail } from '../models/Report';
import type { PostmanCollection, PostmanRequest } from '../models/Collection';

export class CollectionGenerator {
  /**
   * Generates a complete Postman Collection v2.1 document.
   */
  public static toPostman(
    collectionName: string,
    apis: ApiExecutionDetail[]
  ): PostmanCollection {
    const items: PostmanRequest[] = apis.map((api) => {
      // Split path to match Postman segments
      const cleanPath = api.path.startsWith('/') ? api.path.slice(1) : api.path;
      const pathSegments = cleanPath.split('/').map((seg) => {
        // Replace path variable syntax {id} with postman :id syntax
        if (seg.startsWith('{') && seg.endsWith('}')) {
          return ':' + seg.slice(1, -1);
        }
        return seg;
      });

      const hostSegments = ['{{baseUrl}}'];

      const headers = Object.keys(api.requestHeaders || {}).map((key) => ({
        key,
        value: api.requestHeaders[key],
      }));

      const queryParams = Object.keys(api.resolvedParameters || {})
        .filter((k) => !api.path.includes(`{${k}}`))
        .map((k) => ({
          key: k,
          value: api.resolvedParameters[k],
        }));

      const requestObj: PostmanRequest = {
        name: api.id,
        request: {
          method: api.method.toUpperCase(),
          header: headers,
          url: {
            raw: `{{baseUrl}}/${cleanPath}`,
            host: hostSegments,
            path: pathSegments,
            query: queryParams.length > 0 ? queryParams : undefined,
          },
        },
      };

      if (api.requestBody) {
        requestObj.request.body = {
          mode: 'raw',
          raw:
            typeof api.requestBody === 'string'
              ? api.requestBody
              : JSON.stringify(api.requestBody, null, 2),
        };
      }

      return requestObj;
    });

    return {
      info: {
        name: collectionName,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: items,
    };
  }

  /**
   * Generates a Bruno Collection config file format.
   */
  public static toBruno(apis: ApiExecutionDetail[]): string {
    const lines: string[] = [];
    lines.push('name: Bruno API Collection');
    lines.push('type: http');
    lines.push('seq: 1');
    lines.push('');

    apis.forEach((api) => {
      lines.push(`### ${api.id}`);
      lines.push(`meta {`);
      lines.push(`  name: ${api.id}`);
      lines.push(`  type: http`);
      lines.push(`  seq: 1`);
      lines.push(`}`);
      lines.push('');
      lines.push(`${api.method.toLowerCase()} {`);
      lines.push(`  url: {{baseUrl}}${api.path}`);
      lines.push(`  body: json`);
      lines.push(`  auth: none`);
      lines.push(`}`);
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Generates Insomnia Import JSON file configuration.
   */
  public static toInsomnia(collectionName: string, apis: ApiExecutionDetail[]): any {
    const resources: any[] = [
      {
        _id: 'wrk_1',
        _type: 'workspace',
        name: collectionName,
        parentId: null,
      },
    ];

    apis.forEach((api, index) => {
      const id = `req_${index + 1}`;
      const headers = Object.keys(api.requestHeaders || {}).map((k) => ({
        name: k,
        value: api.requestHeaders[k],
      }));

      resources.push({
        _id: id,
        _type: 'request',
        parentId: 'wrk_1',
        name: api.id,
        method: api.method.toUpperCase(),
        url: `{{baseUrl}}${api.path}`,
        headers,
        body: api.requestBody
          ? {
              mimeType: 'application/json',
              text:
                typeof api.requestBody === 'string'
                  ? api.requestBody
                  : JSON.stringify(api.requestBody),
            }
          : {},
      });
    });

    return {
      _type: 'export',
      __export_format: 4,
      resources,
    };
  }
}
