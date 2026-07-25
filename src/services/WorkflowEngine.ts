import type { ApiEndpoint, ApiResponse } from '../types';
import { useDependencyStore } from '../store/dependencyStore';

export class WorkflowEngine {
  /**
   * Sorts endpoints in logical workflow execution order:
   * 1. Login/Auth endpoints (/login, /signin, /token, /auth)
   * 2. POST (Create)
   * 3. GET (Read)
   * 4. PUT/PATCH (Update)
   * 5. DELETE (Delete)
   */
  public static sortEndpoints(endpoints: ApiEndpoint[]): ApiEndpoint[] {
    const sorted = [...endpoints];

    return sorted.sort((a, b) => {
      const orderA = this.getSortOrder(a);
      const orderB = this.getSortOrder(b);

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // If same method type, ensure login endpoints go first within their group
      const isLoginA = this.isLoginPath(a.path);
      const isLoginB = this.isLoginPath(b.path);
      if (isLoginA && !isLoginB) return -1;
      if (!isLoginA && isLoginB) return 1;

      // Otherwise maintain alphabetical path order
      return a.path.localeCompare(b.path);
    });
  }

  private static getSortOrder(endpoint: ApiEndpoint): number {
    const path = endpoint.path.toLowerCase();
    const method = endpoint.method.toUpperCase();

    // 1. Auth/Login endpoints
    if (this.isLoginPath(path)) {
      return 0;
    }

    // 2. Create (POST)
    if (method === 'POST') {
      return 1;
    }

    // 3. Read (GET)
    if (method === 'GET') {
      return 2;
    }

    // 4. Update (PUT/PATCH)
    if (method === 'PUT' || method === 'PATCH') {
      return 3;
    }

    // 5. Delete (DELETE)
    if (method === 'DELETE') {
      return 4;
    }

    return 5; // Default fallback for other HTTP methods
  }

  public static isLoginPath(path: string): boolean {
    const p = path.toLowerCase();
    return (
      p.includes('/login') ||
      p.includes('/signin') ||
      p.includes('/token') ||
      p.includes('/auth')
    );
  }

  /**
   * Inspects response data from login endpoints to extract authentication token.
   * Looks for properties like "token", "accessToken", "access_token", "jwt", etc.
   */
  public static extractAndSaveAuthToken(responseBody: unknown): void {
    if (!responseBody || typeof responseBody !== 'object') return;
    const body = responseBody as Record<string, unknown>;

    const tokenKeys = ['token', 'accessToken', 'access_token', 'jwt', 'idToken', 'id_token'];
    
    // Recursive search for token property
    const findToken = (obj: any): string | null => {
      if (!obj || typeof obj !== 'object') return null;

      for (const key of Object.keys(obj)) {
        if (tokenKeys.some((tk) => key.toLowerCase() === tk.toLowerCase())) {
          if (typeof obj[key] === 'string') return obj[key];
        }
        if (typeof obj[key] === 'object') {
          const res = findToken(obj[key]);
          if (res) return res;
        }
      }
      return null;
    };

    const token = findToken(body);
    if (token) {
      console.log('[Workflow Engine] Successfully extracted authentication token from login response.');
      useDependencyStore.getState().setAccessToken(token);
    }
  }
}
