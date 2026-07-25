import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

/**
 * Manifest V3 definition for "Swagger API Auto Tester" - Step 1 Foundation.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'Swagger API Auto Tester',
  description:
    'Automatically detects Swagger/OpenAPI pages and tests every endpoint in-browser.',
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
  permissions: ['storage', 'activeTab', 'tabs'],
  host_permissions: ['<all_urls>'],
});
