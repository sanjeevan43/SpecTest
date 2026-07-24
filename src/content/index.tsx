import { createRoot } from 'react-dom/client';
import { SidebarApp } from '@/sidebar/SidebarApp';
import { discoverSpecUrl, isLikelySwaggerUrl, detectFramework } from '@/parsers/specDiscovery';
import { sendToBackground, onMessage } from '@/services/messageBus';
import { useAppStore } from '@/hooks/useAppStore';
import type { SwaggerPageInfo } from '@/models/types';
import sidebarStyles from './index.css?inline';

main().catch((err) => console.error('[Swagger API Auto Tester]', err));

let isInitialized = false;

async function initExtension(forced = false): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  const specUrl = forced ? null : await discoverSpecUrl(document, window.location);
  const framework = detectFramework(document.documentElement.innerHTML);

  const pageInfo: SwaggerPageInfo = {
    tabId: -1, // filled in by the background worker from the message sender
    url: window.location.href,
    detectedAt: Date.now(),
    specUrl,
    framework: forced ? 'swagger-ui' : framework,
  };

  const detectResponse = await sendToBackground<{ ok: boolean; tabId: number }>('SWAGGER_DETECTED', pageInfo);
  if (!detectResponse?.ok) {
    isInitialized = false;
    return;
  }
  const tabId = detectResponse.tabId;

  if (specUrl) {
    await sendToBackground('PARSE_DOCUMENT', { specUrl, tabId });
    await captureSwaggerUiAuth(tabId);
  } else {
    await sendToBackground('SET_PARSE_ERROR', { error: 'No spec URL discovered automatically.', tabId });
  }

  mountSidebar(tabId);
}

async function main(): Promise<void> {
  // Always listen for popup commands, so we can be activated manually on any page
  onMessage('OPEN_SIDEBAR', () => {
    initExtension(true).then(() => {
      useAppStore.getState().setSidebarOpen(true);
    });
  });
  onMessage('TOGGLE_SIDEBAR', () => {
    initExtension(true).then(() => {
      const state = useAppStore.getState();
      state.setSidebarOpen(!state.sidebarOpen);
    });
  });

  if (looksLikeSwaggerPage()) {
    await initExtension(false);
  }
}

/** Only run full detection (which involves network probing) on pages that plausibly are Swagger/OpenAPI UIs. */
function looksLikeSwaggerPage(): boolean {
  if (isLikelySwaggerUrl(window.location.href)) return true;
  if (document.getElementById('swagger-ui')) return true;
  if (document.title.toLowerCase().includes('swagger')) return true;
  if (document.querySelector('.swagger-ui')) return true;
  return false;
}

/** Reads Swagger UI's persisted "authorized" localStorage entry (if present) and forwards it to background. */
async function captureSwaggerUiAuth(tabId: number): Promise<void> {
  try {
    const raw = window.localStorage.getItem('authorized');
    await sendToBackground('CAPTURE_AUTH', { rawLocalStorageValue: raw, tabId });
  } catch {
    // localStorage may be inaccessible in some sandboxed frames — safe to ignore.
  }
}

function mountSidebar(tabId: number): void {
  const host = document.createElement('div');
  host.id = 'swagger-api-auto-tester-host';
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = sidebarStyles;
  shadowRoot.appendChild(style);

  const mountPoint = document.createElement('div');
  mountPoint.id = 'swagger-api-auto-tester-root';
  shadowRoot.appendChild(mountPoint);

  const root = createRoot(mountPoint);
  root.render(<SidebarApp tabId={tabId} />);
}


