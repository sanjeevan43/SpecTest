import type { SwaggerPageInfo, ExtensionMessage, BackgroundStateResponse } from '../types';

// In-memory store of tab detection states
const activeSwaggerTabs = new Map<number, SwaggerPageInfo>();

// Log start
console.log('[Swagger API Auto Tester] Background worker initialized.');

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  activeSwaggerTabs.delete(tabId);
});

// Listener for messages
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    if (message.type === 'SWAGGER_DETECTED') {
      if (tabId !== undefined) {
        activeSwaggerTabs.set(tabId, message.payload);
        console.log(`[Swagger API Auto Tester] Swagger detected on tab ${tabId}:`, message.payload);
      }
      sendResponse({ ok: true });
    } else if (message.type === 'GET_STATE') {
      // Find the active tab in current window to return state
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab?.id) {
          sendResponse({ ok: false, detected: false, pageInfo: null } as BackgroundStateResponse);
          return;
        }

        const info = activeSwaggerTabs.get(activeTab.id) || null;
        sendResponse({
          ok: true,
          detected: !!info,
          pageInfo: info,
        } as BackgroundStateResponse);
      });
      return true; // keeps the message channel open for async response
    } else if (message.type === 'DETECT_SWAGGER_VARS') {
      if (tabId === undefined) {
        sendResponse(null);
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          return !!((window as any).SwaggerUIBundle || (window as any).swaggerUI || (window as any).ui || (window as any).Redoc);
        },
        world: 'MAIN'
      }).then((results) => {
        const result = results?.[0]?.result;
        sendResponse(result ? 'Global Variable Match' : null);
      }).catch((err) => {
        console.error('[Swagger API Auto Tester] Error running main world detection:', err);
        sendResponse(null);
      });
      return true;
    } else if (message.type === 'DETECT_SWAGGER_URLS') {
      if (tabId === undefined) {
        sendResponse([]);
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const urls: string[] = [];
          
          // 1. Check SwaggerUI Bundle config
          const uiInstance = (window as any).ui || (window as any).swaggerUI;
          if (uiInstance) {
            // Check if there is a configs object
            if (uiInstance.getConfigs) {
              const cfg = uiInstance.getConfigs();
              if (cfg.url) urls.push(cfg.url);
              if (Array.isArray(cfg.urls)) {
                cfg.urls.forEach((u: any) => { if (u && u.url) urls.push(u.url); });
              }
            }
          }

          // 2. Search for link tags / script sources matching OpenAPI signatures
          const links = document.querySelectorAll('link[rel="stylesheet"], script[src]');
          links.forEach(el => {
            const href = el.getAttribute('href') || el.getAttribute('src');
            if (href) {
              if (href.includes('swagger-ui') || href.includes('openapi') || href.includes('redoc')) {
                // Some UI instances store setup config in global variables or attributes
              }
            }
          });

          // 3. Search document body for swagger-config or similar attributes
          const swaggerConfigEl = document.getElementById('swagger-config');
          if (swaggerConfigEl && swaggerConfigEl.textContent) {
            try {
              const cfg = JSON.parse(swaggerConfigEl.textContent);
              if (cfg.url) urls.push(cfg.url);
              if (Array.isArray(cfg.urls)) {
                cfg.urls.forEach((u: any) => { if (u && u.url) urls.push(u.url); });
              }
            } catch (e) {}
          }

          return urls;
        },
        world: 'MAIN'
      }).then((results) => {
        const result = results?.[0]?.result || [];
        sendResponse(result);
      }).catch((err) => {
        console.error('[Swagger API Auto Tester] Error running main world URL extraction:', err);
        sendResponse([]);
      });
      return true;
    } else if (message.type === 'SCRAPE_SWAGGER_AUTH') {
      if (tabId === undefined) {
        sendResponse(null);
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          try {
            const scraped: any = {};
            
            // 1. Inspect Swagger UI state if available
            const uiInstance = (window as any).ui || (window as any).swaggerUI;
            if (uiInstance && typeof uiInstance.state === 'function') {
              const state = uiInstance.state();
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

            return scraped;
          } catch (err) {
            return null;
          }
        },
        world: 'MAIN'
      }).then((results) => {
        const result = results?.[0]?.result || null;
        sendResponse(result);
      }).catch((err) => {
        console.error('[Swagger API Auto Tester] Error running main world auth scraping:', err);
        sendResponse(null);
      });
      return true;
    }
  }
);
