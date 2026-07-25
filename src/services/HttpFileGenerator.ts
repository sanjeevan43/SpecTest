import type { ApiExecutionDetail } from '../models/Report';
import { SecureStorage } from '../storage/SecureStorage';

export class HttpFileGenerator {
  /**
   * Generates a standard .http REST client file content from executions list.
   */
  public static generate(apis: ApiExecutionDetail[], maskSensitive: boolean = true): string {
    const blocks: string[] = [];

    blocks.push('# Swagger API Auto Tester - REST Client Configuration\n');

    apis.forEach((api) => {
      const parts: string[] = [];

      parts.push(`### ${api.id}`);
      
      // Request Line
      let targetPath = api.path;
      const queryKeys = Object.keys(api.resolvedParameters || {});
      const queryParams = queryKeys
        .filter((k) => !api.path.includes(`{${k}}`))
        .map((k) => {
          let v = api.resolvedParameters[k];
          if (maskSensitive && (k.toLowerCase().includes('token') || k.toLowerCase().includes('key'))) {
            v = SecureStorage.mask(v);
          }
          return `${k}=${v}`;
        });

      if (queryParams.length > 0) {
        targetPath += '?' + queryParams.join('&');
      }

      parts.push(`${api.method.toUpperCase()} {{baseUrl}}${targetPath}`);

      // Headers
      const headers = api.requestHeaders || {};
      for (const key of Object.keys(headers)) {
        let val = headers[key];
        if (maskSensitive && this.isSensitiveHeader(key)) {
          val = SecureStorage.mask(val);
        }
        parts.push(`${key}: ${val}`);
      }

      // Add a blank line before request body
      if (api.requestBody) {
        parts.push('');
        const bodyStr =
          typeof api.requestBody === 'string'
            ? api.requestBody
            : JSON.stringify(api.requestBody, null, 2);
        parts.push(bodyStr);
      }

      blocks.push(parts.join('\n'));
    });

    return blocks.join('\n\n# ==========================================\n\n');
  }

  private static isSensitiveHeader(name: string): boolean {
    const lower = name.toLowerCase();
    return (
      lower.includes('authorization') ||
      lower.includes('token') ||
      lower.includes('api-key') ||
      lower.includes('cookie')
    );
  }
}
