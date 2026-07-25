import type { ApiRequest } from '../types/ApiRequest';
import { useAuthenticationStore } from '../store/authenticationStore';

export class AuthInterceptor {
  /**
   * Automatically injects current authentication details into the request.
   */
  public static inject(request: ApiRequest): ApiRequest {
    const authState = useAuthenticationStore.getState();
    const auth = authState.currentAuth;

    if (auth.method === 'anonymous') {
      return request;
    }

    const headers = { ...request.headers };
    const queryParams = { ...request.queryParams };

    if (auth.method === 'bearer') {
      const tokenVal = auth.token || auth.oauthAccessToken;
      if (tokenVal) {
        headers['Authorization'] = `Bearer ${tokenVal}`;
      }
    } else if (auth.method === 'basic') {
      if (auth.username && auth.password) {
        const credentials = `${auth.username}:${auth.password}`;
        headers['Authorization'] = `Basic ${btoa(credentials)}`;
      }
    } else if (auth.method === 'apiKey') {
      const name = auth.apiKeyName || 'api_key';
      const val = auth.apiKeyValue || '';
      const location = auth.apiKeyIn || 'header';

      if (location === 'header') {
        headers[name] = val;
      } else if (location === 'query') {
        queryParams[name] = val;
      }
    } else if (auth.method === 'cookie') {
      const name = auth.cookieName || 'session';
      const val = auth.cookieValue || '';
      headers['Cookie'] = `${name}=${val}`;
    }

    return {
      ...request,
      headers,
      queryParams,
    };
  }
}
