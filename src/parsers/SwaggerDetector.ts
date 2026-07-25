/**
 * Service to detect OpenAPI / Swagger specifications in the active page context.
 */
export class SwaggerDetector {
  /**
   * Scrapes the page DOM and context to find potential OpenAPI specification URLs.
   * Returns a list of unique, absolute URLs.
   */
  public static async discoverSpecUrls(): Promise<string[]> {
    const urls: Set<string> = new Set();

    // 1. Gather URLs from DOM elements (links, anchor tags, etc.)
    this.scrapeDom(urls);

    // 2. Add typical fallback endpoints relative to the current origin
    this.addCommonPaths(urls);

    // 3. Inject page-context detection to inspect window variables (SwaggerUIBundle, ui, etc.)
    const pageContextUrls = await this.detectFromPageContext();
    for (const url of pageContextUrls) {
      if (url) {
        urls.add(this.resolveAbsoluteUrl(url));
      }
    }

    return Array.from(urls).filter(url => this.isValidUrl(url));
  }

  private static scrapeDom(urls: Set<string>): void {
    // Check links and scripts
    const elements = document.querySelectorAll('link[href], a[href], script[src]');
    const specPatterns = [
      /swagger.*\.json$/i,
      /swagger.*\.ya?ml$/i,
      /openapi.*\.json$/i,
      /openapi.*\.ya?ml$/i,
      /api-docs$/i,
      /v\d+\/api-docs$/i,
    ];

    elements.forEach((el) => {
      const href = el.getAttribute('href') || el.getAttribute('src');
      if (!href) return;

      const isCandidate = specPatterns.some((pattern) => pattern.test(href)) ||
        href.includes('/swagger/v1/') ||
        href.includes('/v2/api-docs') ||
        href.includes('/v3/api-docs') ||
        href.includes('api-docs.json');

      if (isCandidate) {
        urls.add(this.resolveAbsoluteUrl(href));
      }
    });

    // Check script tags containing inline configuration JSON or parameters (e.g., config urls)
    document.querySelectorAll('script').forEach((script) => {
      if (script.src) return;
      const content = script.textContent || '';
      
      // Match URL values inside JS config blocks, e.g., url: "/swagger.json" or "url": "..."
      const urlRegex = /(?:url|specUrl)\s*:\s*["']([^"']+)["']/gi;
      let match;
      while ((match = urlRegex.exec(content)) !== null) {
        urls.add(this.resolveAbsoluteUrl(match[1]));
      }

      // Check for config JSON blocks in Swagger UI setups
      if (content.includes('urls:') || content.includes('SwaggerUIBundle')) {
        const urlsRegex = /["']url["']\s*:\s*["']([^"']+)["']/g;
        while ((match = urlsRegex.exec(content)) !== null) {
          urls.add(this.resolveAbsoluteUrl(match[1]));
        }
      }
    });
  }

  private static addCommonPaths(urls: Set<string>): void {
    const origin = window.location.origin;
    const paths = [
      '/swagger.json',
      '/openapi.json',
      '/swagger/v1/swagger.json',
      '/swagger/index.html',
      '/v3/api-docs',
      '/v2/api-docs',
      '/api-docs',
      '/api/swagger.json',
      '/api/openapi.json',
      '/api/v1/swagger.json',
    ];

    paths.forEach((path) => {
      urls.add(origin + path);
    });
  }

  private static detectFromPageContext(): Promise<string[]> {
    return new Promise((resolve) => {
      const scriptContent = `
        (function() {
          const urls = [];
          
          // 1. Check window.ui config
          if (window.ui && typeof window.ui.getConfigs === 'function') {
            const config = window.ui.getConfigs();
            if (config.url) urls.push(config.url);
            if (Array.isArray(config.urls)) {
              config.urls.forEach(u => { if (u && u.url) urls.push(u.url); });
            }
          }

          // 2. Check window.SwaggerUIBundle options
          if (window.SwaggerUIBundle) {
            // Some UI instances store setup config in global variables or attributes
            // We can also extract from scripts matching instantiation calls
          }

          // 3. Search document body for swagger-config or similar attributes
          const swaggerConfigEl = document.getElementById('swagger-config');
          if (swaggerConfigEl && swaggerConfigEl.textContent) {
            try {
              const cfg = JSON.parse(swaggerConfigEl.textContent);
              if (cfg.url) urls.push(cfg.url);
              if (Array.isArray(cfg.urls)) {
                cfg.urls.forEach(u => { if (u && u.url) urls.push(u.url); });
              }
            } catch (e) {}
          }

          document.documentElement.setAttribute('data-swagger-detected-urls', JSON.stringify(urls));
        })();
      `;

      const script = document.createElement('script');
      script.textContent = scriptContent;
      document.documentElement.appendChild(script);
      script.remove();

      const rawUrls = document.documentElement.getAttribute('data-swagger-detected-urls');
      document.documentElement.removeAttribute('data-swagger-detected-urls');

      if (rawUrls) {
        try {
          resolve(JSON.parse(rawUrls) as string[]);
        } catch {
          resolve([]);
        }
      } else {
        resolve([]);
      }
    });
  }

  private static resolveAbsoluteUrl(path: string): string {
    try {
      return new URL(path, window.location.href).href;
    } catch {
      return path;
    }
  }

  private static isValidUrl(urlStr: string): boolean {
    try {
      const parsed = new URL(urlStr);
      // Ensure HTTP/S scheme and not a browser extension resource
      return parsed.protocol.startsWith('http');
    } catch {
      return false;
    }
  }
}
