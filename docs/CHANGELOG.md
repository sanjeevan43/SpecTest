# Changelog

All notable changes to Swagger API Auto Tester are documented here.

This project adheres to [Semantic Versioning](https://semver.org/) and
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

---

## [Unreleased]

*(Changes that are merged but not yet released)*

---

## [1.0.0] — 2026-07-25

### Added

#### Step 1 — Foundation
- Chrome Manifest V3 extension scaffold (Vite + CRXJS + React 18 + TypeScript 5)
- Content script injection and sidebar mounting
- Background service worker with message routing
- Zustand stores: `apiStore`, `environmentStore`, `authenticationStore`, `validationStore`, `testStore`, `reportStore`

#### Step 2 — OpenAPI Parsing
- `SwaggerDetector` — auto-detects Swagger spec URLs from DOM, scripts, and page context
- `OpenApiParser` — parses OpenAPI 3.x and Swagger 2.0 (JSON + YAML), normalizes endpoints, resolves `$ref` schemas

#### Step 3 — API Execution Engine
- `ApiExecutor` — executes HTTP requests with retry, backoff, abort signal support
- `RequestBuilder` — builds typed `ApiRequest` from endpoint spec with body generation
- `HeaderBuilder` — resolves auth + environment headers
- `ResponseParser` — parses and normalizes HTTP responses
- `useApiRunner` hook — orchestrates run/runAll/stop/retryFailed with Zustand state updates

#### Step 4 — Dependency & Path Parameter Resolution
- `DependencyResolver` — resolves `{pathParam}` from previous run results
- `IdResolver` — harvests entity IDs from response bodies
- `PathParameterResolver` — multi-strategy resolver (harvested, example, default, generated)
- `WorkflowEngine` — sorts endpoints in Login→Create→Read→Update→Delete order

#### Step 5 — Intelligent Test Case Generation
- `TestCaseGenerator` — orchestrates multi-type test generation per endpoint
- `PositiveTestGenerator` — happy-path test cases from spec examples
- `NegativeTestGenerator` — invalid inputs, wrong types, missing required fields
- `BoundaryValueGenerator` — min/max/edge values for numeric and string params
- `ValidationTestGenerator` — format, enum, pattern constraint violations
- `SchemaDataGenerator` + `RandomDataGenerator` — synthetic data generation

#### Step 6 — Response Validation Engine
- `JsonSchemaValidator` — recursive schema validation (type, required, enum, format, nested objects, arrays)
- `ValidationEngine` — per-endpoint validation orchestration with scoring (0–100)
- `ResponseComparator` — structural diff between expected and actual responses
- `SchemaResolver` + `TypeChecker` utilities
- `ValidationResult`, `ValidationError`, `ValidationSummary` models

#### Step 7 — Authentication & Environment Management
- `AuthenticationManager` — detects and harvests auth from Swagger UI (Bearer, Basic, API Key, OAuth2)
- `TokenManager` — stores and refreshes tokens
- `SessionManager` — manages session state and auto-login
- `EnvironmentManager` — variable substitution in URLs and headers
- Four default environments: Local / Development / QA / Production

#### Step 8 — Export & Report System
- `ReportGenerator` — aggregates execution results into a structured `Report`
- `PdfReportGenerator`, `HtmlReportGenerator`, `JsonReportGenerator`, `CsvReportGenerator`, `ExcelReportGenerator`, `MarkdownReportGenerator`
- `CollectionGenerator` — exports Postman Collection v2.1
- `CurlGenerator` — generates cURL commands per endpoint
- `HttpFileGenerator` — generates `.http` file format

#### Step 10 — Modern UI
- Professional DevTools-style sidebar with tabs (Endpoints, Tests, Validation, Reports, Environments, Settings)
- UI component library: `Button`, `Badge`, `Card`, `TabBar`, `SearchFilter`, `StatCard`, `FormControls`
- `EndpointCard` with method color-coding, status indicators, response viewer

#### Step 12 — Production Readiness
- `Logger` — structured, scoped logging with log level gating
- `ErrorHandler` — error normalization, React `ErrorBoundary`, `safeAsync` wrapper
- `AppConfig` — typed feature flags, execution/retention/UI/security config, Chrome storage persistence
- `VersionManager` — schema version tracking and sequential migration runner
- Plugin system: `IValidator`, `IExporter`, `IAuthProvider`, `ITestGenerator`, `IReportFormatter`, `ICloudSync`
- `PluginRegistry` — type-safe plugin registration and retrieval
- GitHub Actions CI workflow (lint → typecheck → unit tests → build → package)
- GitHub Actions release workflow (tag-triggered → validate → build → ZIP → GitHub Release)
- Unit tests: `OpenApiParser`, `RequestBuilder`, `SchemaValidator`, `AppConfig`, `Logger`, `PluginRegistry`
- Test infrastructure: Chrome mock, Vitest config, jsdom setup, Petstore fixture
- Build optimizations: manual chunk splitting, esbuild minification, tree-shaking
- Documentation: `ARCHITECTURE.md`, `INSTALLATION.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `API.md`, `PRIVACY_POLICY.md`
- MIT `LICENSE`

---

## Future Roadmap

| Version | Planned |
|---|---|
| 1.1.0 | Cloud synchronization (ICloudBackend implementation) |
| 1.2.0 | Team workspaces and shared environments |
| 1.3.0 | Scheduled automated test runs |
| 1.4.0 | Slack / MS Teams / Jira notification integrations |
| 1.5.0 | AI-powered bug analysis and test suggestions |
| 2.0.0 | GraphQL and gRPC endpoint support |
