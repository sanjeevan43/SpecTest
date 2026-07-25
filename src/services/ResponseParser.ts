import type { ApiResponse } from '../types/ApiResponse';

export class ResponseParser {
  /**
   * Parses an Axios / HTTP response into our unified ApiResponse structure.
   */
  public static parse(
    axiosResponse: any,
    durationMs: number,
    requestSize: number
  ): ApiResponse {
    const status = axiosResponse.status;
    const statusText = axiosResponse.statusText || '';
    const headers: Record<string, string> = {};
    
    // Normalize headers to standard key-value map
    if (axiosResponse.headers) {
      Object.keys(axiosResponse.headers).forEach((key) => {
        headers[key] = String(axiosResponse.headers[key]);
      });
    }

    const body = axiosResponse.data;
    const responseSize = this.calculateSize(body, headers);

    return {
      statusCode: status,
      statusText,
      headers,
      body,
      durationMs,
      requestSize,
      responseSize,
    };
  }

  /**
   * Helper to estimate size of payload in bytes.
   */
  public static calculateSize(body: unknown, headers?: Record<string, string>): number {
    let size = 0;

    // Estimate body size
    if (body !== undefined && body !== null) {
      if (typeof body === 'string') {
        size += this.getStringByteLength(body);
      } else if (typeof body === 'object') {
        try {
          size += this.getStringByteLength(JSON.stringify(body));
        } catch {
          // ignore parsing error
        }
      }
    }

    // Add headers size
    if (headers) {
      Object.keys(headers).forEach((key) => {
        size += this.getStringByteLength(key) + this.getStringByteLength(headers[key]) + 4; // ": " + "\r\n"
      });
    }

    return size;
  }

  private static getStringByteLength(str: string): number {
    try {
      return new TextEncoder().encode(str).length;
    } catch {
      return str.length; // fallback
    }
  }
}
