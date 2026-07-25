import { useDependencyStore } from '../store/dependencyStore';

export class HeaderBuilder {
  /**
   * Automatically resolves and constructs authorization and standard headers.
   * Scrapes Swagger's own localStorage authorization values if present.
   */
  public static build(
    endpointSecurity?: Record<string, string[]>[],
    consumes: string[] = [],
    produces: string[] = []
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    // 1. Content-Type and Accept headers
    const contentType = consumes.includes('application/json')
      ? 'application/json'
      : consumes[0] || 'application/json';
    
    const accept = produces.includes('application/json')
      ? 'application/json'
      : produces[0] || 'application/json';

    headers['Content-Type'] = contentType;
    headers['Accept'] = accept;

    // 2. Inject authorization token from dependencyStore if present
    const storeToken = useDependencyStore.getState().accessToken;
    if (storeToken) {
      headers['Authorization'] = storeToken.startsWith('Bearer ') ? storeToken : `Bearer ${storeToken}`;
    }

    // 3. Extract authorization from Swagger UI's local storage settings
    try {
      const authorizedRaw = window.localStorage.getItem('authorized') || 
                            window.localStorage.getItem('oauth2') || 
                            '';
      if (authorizedRaw) {
        const authData = JSON.parse(authorizedRaw);
        
        // Loop through all saved auth schemes in localStorage
        for (const key of Object.keys(authData)) {
          const authObj = authData[key];
          if (!authObj || !authObj.value) continue;

          const type = authObj.type || authObj.in; // API key, Basic, Bearer, etc.
          const value = authObj.value;

          if (type === 'header') {
            // API key in header
            const headerName = authObj.name || 'api_key';
            headers[headerName] = value;
          } else if (type === 'apiKey' && authObj.in === 'header') {
            headers[authObj.name || 'api_key'] = value;
          } else if (type === 'oauth2' || authObj.scheme === 'bearer') {
            headers['Authorization'] = value.startsWith('Bearer ') ? value : `Bearer ${value}`;
          } else if (authObj.scheme === 'basic') {
            // Basic auth (value is typically username/password or base64 token)
            headers['Authorization'] = value.startsWith('Basic ') ? value : `Basic ${value}`;
          }
        }
      }
    } catch {
      // Ignore if localStorage is sandboxed or inaccessible
    }

    return headers;
  }
}
