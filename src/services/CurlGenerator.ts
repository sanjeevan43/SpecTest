import type { ApiRequest } from '../types/ApiRequest';
import { SecureStorage } from '../storage/SecureStorage';

export class CurlGenerator {
  /**
   * Generates a copy-pasteable cURL command from an ApiRequest object.
   */
  public static generate(request: ApiRequest, maskSensitive: boolean = true): string {
    const parts = ['curl'];

    // Add HTTP Method
    parts.push(`-X ${request.method.toUpperCase()}`);

    // Add Headers
    const headers = request.headers || {};
    for (const key of Object.keys(headers)) {
      let value = headers[key];
      if (maskSensitive && this.isSensitiveHeader(key)) {
        value = SecureStorage.mask(value);
      }
      // Escape single quotes inside headers
      parts.push(`-H '${key}: ${value.replace(/'/g, "'\\''")}'`);
    }

    // Add Query Params to URL
    let targetUrl = request.url;
    const query = request.queryParams || {};
    const queryKeys = Object.keys(query);
    if (queryKeys.length > 0) {
      const queryString = queryKeys
        .map((k) => {
          let v = query[k];
          if (maskSensitive && this.isSensitiveQuery(k)) {
            v = SecureStorage.mask(v);
          }
          return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
        })
        .join('&');
      targetUrl += (targetUrl.includes('?') ? '&' : '?') + queryString;
    }

    // Add URL
    parts.push(`'${targetUrl.replace(/'/g, "'\\''")}'`);

    // Add Request Body
    if (request.body) {
      const payloadStr =
        typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body);
      parts.push(`-d '${payloadStr.replace(/'/g, "'\\''")}'`);
    }

    return parts.join(' \\\n  ');
  }

  private static isSensitiveHeader(name: string): boolean {
    const lower = name.toLowerCase();
    return (
      lower.includes('authorization') ||
      lower.includes('token') ||
      lower.includes('api-key') ||
      lower.includes('apikey') ||
      lower.includes('cookie') ||
      lower.includes('password')
    );
  }

  private static isSensitiveQuery(name: string): boolean {
    const lower = name.toLowerCase();
    return (
      lower.includes('token') ||
      lower.includes('key') ||
      lower.includes('pass')
    );
  }
}
