import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import path from 'node:path';
import manifest from './manifest.config';
import pkg from './package.json';

export default defineConfig(({ mode }) => ({
  plugins: [react(), crx({ manifest })],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  // Inject app version into all bundles so Logger can read it
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    'import.meta.env.APP_VERSION': JSON.stringify(pkg.version),
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    // Production: minify with esbuild (fast, good compression)
    minify: mode === 'production' ? 'esbuild' : false,

    // Enable source maps for production debugging (external — not bundled)
    sourcemap: mode !== 'production',

    rollupOptions: {
      output: {
        // Stable, meaningful chunk names for caching
        chunkFileNames: 'assets/chunk-[hash].js',

        // Manual chunk splitting for optimal caching:
        // - vendor: large stable libraries (React, Zustand)
        // - pdf: jsPDF loaded only on demand
        // - xlsx: xlsx loaded only on demand
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/zustand')) {
            return 'vendor-zustand';
          }
          if (id.includes('node_modules/jspdf')) {
            return 'vendor-pdf';
          }
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/axios')) {
            return 'vendor-axios';
          }
          if (id.includes('node_modules/js-yaml')) {
            return 'vendor-yaml';
          }
        },
      },

      // Tree-shake unused exports
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
    },

    // Raise chunk size warning threshold (extension bundles are expected to be larger)
    chunkSizeWarningLimit: 1500,
  },

  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },

  // Optimize deps pre-bundling for faster dev server
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'lucide-react', 'clsx'],
  },
}));

