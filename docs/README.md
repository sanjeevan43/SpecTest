# Swagger API Auto Tester

> **Automatically detect and test every endpoint on any Swagger / OpenAPI page — no configuration required.**

[![CI](https://github.com/your-org/swagger-api-auto-tester/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/swagger-api-auto-tester/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](#)

---

## What It Does

Open any page running Swagger UI — the extension automatically:

1. **Detects** the OpenAPI specification (JSON or YAML, v2 or v3)
2. **Parses** all endpoints, schemas, parameters, and security schemes
3. **Generates** intelligent test cases (positive, negative, boundary, validation)
4. **Executes** every API — individually or all at once — with smart dependency resolution
5. **Validates** each response against the OpenAPI contract
6. **Reports** results with pass/fail status, response diffs, and validation scores
7. **Exports** reports in PDF, HTML, JSON, CSV, Excel, Markdown, cURL, and Postman formats
8. **Stores** history locally for regression detection and analytics

---

## Key Features

| Category | Features |
|---|---|
| **Detection** | Auto-detect Swagger UI, DOM scraping, common path fallbacks, page-context JS inspection |
| **Parsing** | OpenAPI 3.x, Swagger 2.0, JSON + YAML, `$ref` resolution, nested schemas |
| **Execution** | GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD, retry with backoff, abort/cancel, configurable timeout |
| **Auth** | Bearer, Basic, API Key, OAuth2, harvests credentials already entered in Swagger UI |
| **Environments** | Local / Dev / QA / UAT / Production profiles with variable substitution |
| **Test Generation** | Positive, negative, boundary, validation, edge case scenarios per endpoint |
| **Validation** | Schema validation (type, required, enum, format, nested objects, arrays), status code matching |
| **Dependency** | Auto-resolves path parameters from previous responses (e.g., `{petId}` from POST /pet) |
| **History** | Full run storage, search, filter, regression detection, environment comparison |
| **Analytics** | Pass rate trends, latency percentiles, health scores, top-failed endpoints |
| **Export** | PDF, HTML, JSON, CSV, Excel, Markdown, cURL, Postman Collection, HTTP file |

---

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation (Developer Mode)
See [INSTALLATION.md](INSTALLATION.md) for step-by-step instructions.

---

## Quick Start

1. Navigate to any page running Swagger UI (e.g., `https://petstore.swagger.io`)
2. Click the **Swagger API Auto Tester** icon in the Chrome toolbar
3. The sidebar opens and automatically detects the OpenAPI specification
4. Click **Run All** to execute every endpoint
5. Review results in the Endpoints tab, then export from the Reports tab

---

## Documentation

| Document | Description |
|---|---|
| [INSTALLATION.md](INSTALLATION.md) | Installation guide for end users and developers |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture, folder structure, data flow |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development setup, coding standards, PR process |
| [CHANGELOG.md](CHANGELOG.md) | Version history and release notes |
| [API.md](API.md) | Internal service API reference |
| [PRIVACY_POLICY.md](PRIVACY_POLICY.md) | Data handling and privacy policy |

---

## Tech Stack

- **Runtime**: Chrome Extension Manifest V3
- **Framework**: React 18 + TypeScript 5 (strict mode)
- **State**: Zustand 5
- **Build**: Vite 5 + @crxjs/vite-plugin
- **Testing**: Vitest + jsdom
- **Styling**: Tailwind CSS 3

---

## License

[MIT](../LICENSE) © 2026 Swagger API Auto Tester Contributors
