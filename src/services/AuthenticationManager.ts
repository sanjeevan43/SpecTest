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
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        resolve(null);
        return;
      }
      chrome.runtime.sendMessage({ type: 'SCRAPE_SWAGGER_AUTH' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }
}
