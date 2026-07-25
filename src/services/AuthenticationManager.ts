import { useAuthenticationStore } from '../store/authenticationStore';

export class AuthenticationManager {
  /**
   * Scrapes credentials already entered in Swagger UI or local storage context.
   */
  public static async harvestSwaggerAuth(): Promise<void> {
    const authState = useAuthenticationStore.getState();
    if (!authState.settings.reuseSwaggerAuth) return;

    try {
      // 1. Injected script to scrape Swagger UI Redux state or local/session storage values
      const scraped = await this.executeScraperScript();
      if (scraped) {
        if (scraped.token) {
          authState.setCurrentAuth({
            method: 'bearer',
            token: scraped.token,
          });
          console.log('Swagger API Auto Tester: Reused Swagger UI Bearer Token.');
        } else if (scraped.apiKeyName && scraped.apiKeyValue) {
          authState.setCurrentAuth({
            method: 'apiKey',
            apiKeyName: scraped.apiKeyName,
            apiKeyValue: scraped.apiKeyValue,
            apiKeyIn: scraped.apiKeyIn || 'header',
          });
          console.log('Swagger API Auto Tester: Reused Swagger UI API Key.');
        } else if (scraped.basicUsername && scraped.basicPassword) {
          authState.setCurrentAuth({
            method: 'basic',
            username: scraped.basicUsername,
            password: scraped.basicPassword,
          });
          console.log('Swagger API Auto Tester: Reused Swagger UI Basic Auth.');
        }
      }
    } catch (e) {
      console.warn('Swagger API Auto Tester: Failed to scrape Swagger auth state', e);
    }
  }

  private static executeScraperScript(): Promise<any> {
    return new Promise((resolve) => {
      // Create a script node to execute inside the page main context
      const scriptId = 'swagger-auth-scraper-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.textContent = `
          (function() {
            try {
              let scraped = {};
              
              // 1. Inspect Swagger UI state if available
              if (window.ui && typeof window.ui.state === 'function') {
                const state = window.ui.state();
                const auth = state.get('auth');
                if (auth) {
                  const authorized = auth.get('authorized');
                  if (authorized && typeof authorized.toJS === 'function') {
                    const authMap = authorized.toJS();
                    for (const key of Object.keys(authMap)) {
                      const scheme = authMap[key];
                      if (scheme.value) {
                        // Found API Key or Token
                        if (scheme.schema && scheme.schema.type === 'apiKey') {
                          scraped.apiKeyName = scheme.schema.name;
                          scraped.apiKeyValue = scheme.value;
                          scraped.apiKeyIn = scheme.schema.in;
                        } else if (scheme.value.startsWith('Bearer ')) {
                          scraped.token = scheme.value.substring(7);
                        } else {
                          scraped.token = scheme.value;
                        }
                      } else if (scheme.username && scheme.password) {
                        scraped.basicUsername = scheme.username;
                        scraped.basicPassword = scheme.password;
                      }
                    }
                  }
                }
              }

              // 2. Check local storage if Swagger UI state was empty
              if (!scraped.token) {
                const keys = Object.keys(localStorage);
                for (const key of keys) {
                  if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')) {
                    const val = localStorage.getItem(key);
                    if (val && val.length > 20 && (val.startsWith('ey') || val.includes('.'))) {
                      scraped.token = val.replace(/["']/g, ''); // strip quotes
                      break;
                    }
                  }
                }
              }

              document.documentElement.setAttribute('data-scraped-swagger-auth', JSON.stringify(scraped));
            } catch (err) {}
          })();
        `;
        document.documentElement.appendChild(script);
      }

      // Read attribute response
      setTimeout(() => {
        try {
          const attr = document.documentElement.getAttribute('data-scraped-swagger-auth');
          if (attr) {
            resolve(JSON.parse(attr));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        } finally {
          script.remove();
          document.documentElement.removeAttribute('data-scraped-swagger-auth');
        }
      }, 100);
    });
  }
}
