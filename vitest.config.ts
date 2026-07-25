import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    // Use jsdom to simulate a browser environment (DOM APIs, window, etc.)
    environment: 'jsdom',

    // Global test setup — installs Chrome mocks, polyfills, storage resets
    setupFiles: ['./tests/setup.ts'],

    // Make describe/it/expect/vi available globally without explicit imports
    globals: true,

    // Test file patterns
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.d.ts',
        'src/assets/**',
        'src/popup/main.tsx',        // entry point only
        'src/background/index.ts',   // Chrome SW — tested via integration
        'src/content/index.tsx',     // DOM injection — tested via e2e
        'src/walkthrough.md',
      ],
      thresholds: {
        lines: 60,
        functions: 55,
        branches: 50,
        statements: 60,
      },
    },

    // Suppress irrelevant Vite HMR / React warnings in test output
    silent: false,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  // Inject Vite define replacements so src code using import.meta.env works in tests
  define: {
    'import.meta.env.MODE': JSON.stringify('test'),
    __APP_VERSION__: JSON.stringify('1.0.0-test'),
  },
});
