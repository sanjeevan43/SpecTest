# Swagger API Auto Tester

A Chrome Extension (Manifest V3) that automatically detects any Swagger/OpenAPI page and tests every endpoint without leaving the browser — dependency-aware execution (auto ID chaining), negative testing, query/header testing, response-schema validation, performance timing, and rich exports (JSON/CSV/Excel/HTML/PDF/Postman/Bruno/.http).

## Tech stack
Chrome MV3 · React 18 · TypeScript · Vite · `@crxjs/vite-plugin` · Tailwind CSS · Zustand · Axios · js-yaml · jsPDF · SheetJS (xlsx) · chrome.storage

## Project layout
```
src/
  background/   service worker: owns per-tab state, runs the test engine, captures auth via webRequest
  content/      content script: detects Swagger pages, mounts the sidebar, captures Swagger UI auth
  sidebar/      floating in-page React UI (resizable, collapsible, dark/light)
  popup/        toolbar popup: status, quick run, open sidebar
  components/   shared + sidebar-specific React components
  services/     openapi test runner, dependency engine, auth manager, http client, report generators
  parsers/      OpenAPI/Swagger 2.0+3.x parsing, $ref resolution, spec discovery
  storage/      typed chrome.storage.local wrapper
  models/       shared TypeScript types
  constants/    detection patterns, id-param dictionary, storage keys
  utils/        curl generation, id extraction, random/example data generation, formatters
```

## Getting started

```bash
npm install
npm run dev      # starts Vite in watch mode for local development
```

Then, in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the generated `dist/` folder
4. Visit any Swagger UI / `/openapi` / `/api-docs` page — the floating ⚡ button appears automatically

While `npm run dev` is running, edits to `src/` hot-reload directly in the loaded extension.

## Production build

```bash
npm run build     # outputs to dist/, ready to zip and load unpacked or submit to the Web Store
```

## Linting & formatting

```bash
npm run lint
npm run format
```

## How detection works
The content script checks the page URL against common Swagger conventions (`/swagger`, `/swagger-ui`, `/openapi`, `/api-docs`, …) and DOM fingerprints (`#swagger-ui`, page title). Once matched, it looks for the underlying JSON/YAML spec via inline `SwaggerUIBundle` config, `<link>` tags, or a list of common well-known spec paths, then hands the URL to the background worker to fetch, parse, and normalize (OpenAPI 3.x and Swagger 2.0 both supported).

## Auth handling
Credentials already entered into Swagger UI's "Authorize" dialog are read directly from `localStorage.authorized` (when persisted) and/or sniffed from the page's own outgoing `Authorization`/API-key headers via `chrome.webRequest`. You should never have to log in twice.

## Notes on scope
This is a from-scratch, fully wired implementation of the full feature spec (detection, parsing, dependency-aware CRUD chaining, negative/query/header testing, schema diffing, timing breakdown, sidebar UI, filters, all 5 report formats, Postman/Bruno/.http export, settings, popup, history). A few of the more exotic bonus visualizations (dedicated latency graph, failure heatmap, environment-diff view) are intentionally minimal in this pass — the underlying data (timing, pass/fail per endpoint, per-run history) is already collected and stored, so they're straightforward follow-ups if you want them fleshed out further.
