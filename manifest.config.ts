import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

/**
 * Manifest V3 definition for "Swagger API Auto Tester".
 *
 * Permissions rationale:
 * - storage        -> persist settings / history / reports / tokens (chrome.storage)
 * - activeTab/tabs  -> know which tab is a Swagger page, message the content script
 * - scripting      -> inject the sidebar UI into the active Swagger tab
 * - webRequest      -> observe Swagger's own XHR/fetch calls to steal auth headers/tokens
 * - downloads      -> save exported reports (PDF/CSV/Excel/HTML/Postman/Bruno)
 * - host_permissions "<all_urls>" -> the extension must be able to call ANY API the
 *   Swagger doc points to (dev/staging/prod hosts are unpredictable), and must be able
 *   to read Swagger pages served from any origin.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'Swagger API Auto Tester',
  description:
    'Automatically detects Swagger/OpenAPI pages and tests every endpoint in-browser: dependency-aware execution, negative testing, schema validation, and rich reports.',
  version: pkg.version,
  icons: {
    16: 'src/assets/icon16.png',
    48: 'src/assets/icon48.png',
    128: 'src/assets/icon128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'src/assets/icon16.png',
      48: 'src/assets/icon48.png',
      128: 'src/assets/icon128.png',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.tsx'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'activeTab', 'tabs', 'scripting', 'webRequest', 'downloads'],
  host_permissions: ['<all_urls>'],
});
