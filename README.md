# Swagger API Auto Tester

A Chrome Extension (Manifest V3) that automatically detects any Swagger/OpenAPI page and tests every endpoint without leaving the browser — dependency-aware execution (auto ID chaining), negative testing, query/header testing, response-schema validation, performance timing, and rich exports (JSON/CSV/Excel/HTML/PDF/Postman/Bruno/.http).

## Tech stack
Chrome MV3 · React 18 · TypeScript · Vite · `@crxjs/vite-plugin` · Tailwind CSS · Zustand · Axios · js-yaml · jsPDF · SheetJS (xlsx) · chrome.storage

## Project layout
```
src/
  background/   service worker: message routing, extension lifecycle
  content/      content script: detects Swagger pages, mounts the sidebar
  popup/        toolbar popup: status, quick-open sidebar
  components/   React UI components (panels/, ui/ atoms)
  services/     API executor, dependency engine, auth, validators, report generators
  parsers/      OpenAPI 3.x + Swagger 2.0 parsing, $ref resolution, spec discovery
  models/       TypeScript data models
  store/        Zustand stores (persisted to chrome.storage.local)
  storage/      Typed chrome.storage.local wrappers
  config/       AppConfig (feature flags), VersionManager (migrations)
  plugins/      Plugin interfaces + PluginRegistry (extension points)
  utils/        Logger, ErrorHandler, SchemaResolver, TypeChecker
  types/        Shared TypeScript types
```

## Getting started

```bash
npm install
npm run dev          # Vite hot-reload dev server
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `dist/` folder
4. Visit any Swagger UI page — the sidebar appears automatically

## Available scripts

```bash
npm run dev            # Development build with hot-reload
npm run build:prod     # Production build (minified, chunked)
npm run typecheck      # TypeScript strict type check
npm run lint           # ESLint
npm run format         # Prettier
npm run test:unit      # Run unit tests (Vitest)
npm run test:coverage  # Run tests + coverage report
npm run package        # Package dist/ into a .zip for Web Store
npm run release        # build:prod + package in one step
```


## How detection works
The content script checks the page URL against common Swagger conventions (`/swagger`, `/swagger-ui`, `/openapi`, `/api-docs`, …) and DOM fingerprints (`#swagger-ui`, page title). Once matched, it looks for the underlying JSON/YAML spec via inline `SwaggerUIBundle` config, `<link>` tags, or a list of common well-known spec paths, then hands the URL to the background worker to fetch, parse, and normalize (OpenAPI 3.x and Swagger 2.0 both supported).

## Auth handling
Credentials already entered into Swagger UI's "Authorize" dialog are read directly from `localStorage.authorized` (when persisted) and/or sniffed from the page's own outgoing `Authorization`/API-key headers via `chrome.webRequest`. You should never have to log in twice.

## Notes on scope
This is a from-scratch, fully wired implementation of the full feature spec (detection, parsing, dependency-aware CRUD chaining, negative/query/header testing, schema diffing, timing breakdown, sidebar UI, filters, all 5 report formats, Postman/Bruno/.http export, settings, popup, history). A few of the more exotic bonus visualizations (dedicated latency graph, failure heatmap, environment-diff view) are intentionally minimal in this pass — the underlying data (timing, pass/fail per endpoint, per-run history) is already collected and stored, so they're straightforward follow-ups if you want them fleshed out further.
