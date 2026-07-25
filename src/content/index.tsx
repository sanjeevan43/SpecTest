import { createRoot } from 'react-dom/client';
import React, { useEffect, useState } from 'react';
import type { SwaggerPageInfo } from '../types';
import contentStyles from './index.css?inline';
import { SwaggerDetector } from '../parsers/SwaggerDetector';
import { OpenApiParser } from '../parsers/OpenApiParser';
import { useApiStore } from '../store/apiStore';
import { ApiPanel } from '../components/ApiPanel';
import { DependencyGraph } from '../services/DependencyGraph';
import { useDependencyStore } from '../store/dependencyStore';

// --- Detection Heuristics ---

function detectFramework(): string | null {
  const html = document.documentElement.innerHTML.toLowerCase();
  
  if (document.getElementById('swagger-ui') || document.querySelector('.swagger-ui')) {
    if (html.includes('springdoc')) return 'SpringDoc';
    if (html.includes('fastapi')) return 'FastAPI';
    if (html.includes('nestjs')) return 'NestJS';
    if (html.includes('microsoft.aspnetcore')) return 'ASP.NET';
    return 'Swagger UI';
  }

  if (document.getElementById('redoc-container') || html.includes('redoc-container') || html.includes('redoc.standalone.js')) {
    return 'ReDoc / OpenAPI UI';
  }

  const url = window.location.href.toLowerCase();
  if (url.includes('/swagger') || url.includes('/api-docs') || url.includes('/openapi')) {
    return 'OpenAPI URL Signature';
  }

  const title = document.title.toLowerCase();
  if (title.includes('swagger') || title.includes('openapi') || title.includes('api playground') || title.includes('api docs')) {
    return 'Document Title Match';
  }

  return null;
}

function runPageContextDetection(): Promise<string | null> {
  return new Promise((resolve) => {
    const scriptContent = `
      (function() {
        const detected = !!(window.SwaggerUIBundle || window.swaggerUI || window.ui || window.Redoc);
        document.documentElement.setAttribute('data-swagger-detected-var', detected ? 'true' : 'false');
      })();
    `;
    const script = document.createElement('script');
    script.textContent = scriptContent;
    document.documentElement.appendChild(script);
    script.remove();

    const result = document.documentElement.getAttribute('data-swagger-detected-var');
    document.documentElement.removeAttribute('data-swagger-detected-var');
    
    if (result === 'true') {
      resolve('Global Variable Match');
    } else {
      resolve(null);
    }
  });
}

async function performDetection(): Promise<SwaggerPageInfo | null> {
  let framework = detectFramework();
  if (!framework) {
    framework = await runPageContextDetection();
  }

  if (framework) {
    return {
      url: window.location.href,
      detected: true,
      framework,
      detectedAt: Date.now(),
    };
  }

  return null;
}

// --- App Root Component ---

const AppRoot: React.FC = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [discoveredUrls, setDiscoveredUrls] = useState<string[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  const { setDocument, setLoading, setError } = useApiStore();
  const loadFromStorage = useDependencyStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleInitClick = async () => {
    console.log('Swagger API Auto Tester initialized');
    setIsPanelOpen(true);
    setLoading(true);

    try {
      const urls = await SwaggerDetector.discoverSpecUrls();
      setDiscoveredUrls(urls);

      if (urls.length === 0) {
        throw new Error(
          'No OpenAPI/Swagger specification document URLs could be auto-detected on this page.'
        );
      }

      // Default selection to the first match
      const targetUrl = urls[0];
      setSelectedUrl(targetUrl);
      await loadAndParseSpec(targetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleUrlSelect = async (url: string) => {
    setSelectedUrl(url);
    await loadAndParseSpec(url);
  };

  const loadAndParseSpec = async (url: string) => {
    setLoading(true);
    try {
      const doc = await OpenApiParser.parse(url);
      setDocument(doc);
      // Build dependency graph
      DependencyGraph.build(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <>
      {/* Floating API Test Button */}
      <button
        onClick={handleInitClick}
        className="fixed right-6 top-1/2 z-[2147483647] -translate-y-1/2 flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-semibold text-xs shadow-lg shadow-blue-500/30 border border-blue-400/20 transition-all duration-300 ease-in-out cursor-pointer select-none active:scale-95 animate-[float_3s_ease-in-out_infinite] floating-btn-hover"
        aria-label="API Test"
        title="Swagger API Auto Tester"
      >
        <svg
          className="w-5 h-5 mb-0.5 text-white transition-transform duration-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <span className="text-[10px] tracking-wide font-bold">API Test</span>
      </button>

      {/* Inspect Panel overlay */}
      {isPanelOpen && (
        <ApiPanel
          onClose={() => setIsPanelOpen(false)}
          discoveredUrls={discoveredUrls}
          onSelectUrl={handleUrlSelect}
          selectedUrl={selectedUrl}
        />
      )}
    </>
  );
};

// --- Initialization ---

async function main() {
  const pageInfo = await performDetection();

  if (pageInfo) {
    try {
      chrome.runtime.sendMessage({
        type: 'SWAGGER_DETECTED',
        payload: pageInfo,
      });
    } catch (err) {
      console.warn('[Swagger API Auto Tester] Could not send message to background service worker:', err);
    }

    const container = document.createElement('div');
    container.id = 'swagger-api-auto-tester-host';
    document.body.appendChild(container);

    const shadowRoot = container.attachShadow({ mode: 'open' });
    
    const styleElement = document.createElement('style');
    styleElement.textContent = contentStyles;
    shadowRoot.appendChild(styleElement);

    const mountPoint = document.createElement('div');
    mountPoint.id = 'swagger-api-auto-tester-root';
    shadowRoot.appendChild(mountPoint);

    const root = createRoot(mountPoint);
    root.render(
      <React.StrictMode>
        <AppRoot />
      </React.StrictMode>
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
