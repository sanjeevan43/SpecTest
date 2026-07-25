# Architecture Guide

## Overview

Swagger API Auto Tester is a Chrome Manifest V3 extension built with a clean, layered architecture designed for:

- **Zero external service dependency** in v1 (fully in-browser)
- **Open/Closed extensibility** via plugin interfaces (Step 12+)
- **Future cloud readiness** via defined ICloudBackend / INotificationChannel interfaces
- **Testability** — every service is a stateless class or pure function

---

## Folder Structure

```
SpecTest/
├── src/
│   ├── assets/               # Extension icons (PNG)
│   ├── background/           # Chrome Service Worker
│   │   └── index.ts          # SW entry point (install, message routing)
│   ├── config/               # Typed configuration & versioning
│   │   ├── AppConfig.ts      # Feature flags, defaults, runtime config
│   │   └── VersionManager.ts # Schema migration runner
│   ├── content/              # Content script injected into every tab
│   │   ├── index.tsx         # Sidebar mount point, Swagger detection trigger
│   │   └── index.css
│   ├── models/               # Pure data models (no logic)
│   │   ├── Authentication.ts
│   │   ├── Environment.ts
│   │   ├── Report.ts
│   │   ├── ReportSummary.ts
│   │   ├── TestCase.ts
│   │   ├── TestSuite.ts
│   │   ├── ValidationResult.ts
│   │   ├── ValidationError.ts
│   │   └── ...
│   ├── parsers/              # OpenAPI document parsing
│   │   ├── SwaggerDetector.ts
│   │   └── OpenApiParser.ts
│   ├── plugins/              # Plugin system (Open/Closed extension points)
│   │   ├── interfaces/
│   │   │   ├── IAuthProvider.ts
│   │   │   ├── ICloudSync.ts    # Future cloud interfaces
│   │   │   ├── IExporter.ts
│   │   │   ├── IReportFormatter.ts
│   │   │   ├── ITestGenerator.ts
│   │   │   └── IValidator.ts
│   │   └── PluginRegistry.ts
│   ├── popup/                # Extension popup (minimal, opens sidebar)
│   ├── services/             # Business logic — stateless classes
│   │   ├── ApiExecutor.ts
│   │   ├── AuthenticationManager.ts
│   │   ├── DependencyResolver.ts
│   │   ├── EnvironmentManager.ts
│   │   ├── RequestBuilder.ts
│   │   ├── ResponseValidator.ts
│   │   ├── ReportGenerator.ts
│   │   ├── TestCaseGenerator.ts
│   │   ├── ValidationEngine.ts
│   │   └── WorkflowEngine.ts
│   ├── store/                # Zustand reactive state (persisted to chrome.storage.local)
│   │   ├── apiStore.ts
│   │   ├── authenticationStore.ts
│   │   ├── environmentStore.ts
│   │   ├── reportStore.ts
│   │   ├── testStore.ts
│   │   └── validationStore.ts
│   ├── storage/              # Chrome storage abstraction layer
│   │   ├── HistoryStorage.ts
│   │   └── SecureStorage.ts
│   ├── types/                # TypeScript type definitions
│   │   ├── index.ts          # Barrel — ParsedApiDocument, ApiEndpoint, etc.
│   │   ├── ApiRequest.ts
│   │   ├── ApiResponse.ts
│   │   └── ApiExecutionResult.ts
│   ├── utils/                # Shared utilities
│   │   ├── Logger.ts         # Structured logging with context scoping
│   │   └── ErrorHandler.ts   # Error normalization, React ErrorBoundary
│   ├── hooks/                # React custom hooks
│   │   ├── useApiRunner.ts
│   │   └── useReportStore.ts
│   └── components/           # React UI components
│       ├── ui/               # Primitive atoms (Button, Badge, Card, etc.)
│       └── panels/           # Domain components (EndpointCard, HistoryPanel, etc.)
├── tests/
│   ├── fixtures/             # Static test data (swaggerPetstore.json)
│   ├── mocks/                # API mocks (chromeMock.ts)
│   ├── setup.ts              # Global Vitest setup
│   └── unit/                 # Unit test files
├── scripts/
│   └── package-extension.ts  # ZIP packaging script
├── docs/                     # Documentation
├── .github/
│   └── workflows/            # GitHub Actions CI/CD
├── manifest.config.ts        # Chrome MV3 manifest
├── vite.config.ts            # Vite + @crxjs build config
├── vitest.config.ts          # Vitest test config
└── package.json
```

---

## Architectural Layers

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (React)                      │
│  components/panels/  ←→  hooks/  ←→  store/            │
└──────────────────────────┬──────────────────────────────┘
                           │ reactive state reads/writes
┌──────────────────────────▼──────────────────────────────┐
│                  Logic Layer (Services)                  │
│  ApiExecutor · RequestBuilder · ValidationEngine        │
│  TestCaseGenerator · DependencyResolver · ReportGenerator│
└──────────────────────────┬──────────────────────────────┘
                           │ models & types
┌──────────────────────────▼──────────────────────────────┐
│                  Data Layer (Models + Storage)           │
│  models/ · store/ · storage/                            │
│  chrome.storage.local                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Extension Lifecycle

```
1. chrome.runtime.onInstalled
   └── VersionManager.runMigrations()
   └── loadConfig()

2. Content Script Injection (document_idle)
   └── SwaggerDetector.discoverSpecUrls()
   └── OpenApiParser.parse(url)
   └── apiStore.setDocument(doc)
   └── React sidebar mounts

3. User clicks "Run All"
   └── useApiRunner.runAll()
   └── WorkflowEngine.sortEndpoints()  [Login→Create→Read→Update→Delete]
   └── for each endpoint:
       ├── DependencyResolver.resolveEndpointParameters()
       ├── AuthenticationManager.harvestSwaggerAuth()
       ├── RequestBuilder.build()
       ├── AuthInterceptor.inject()
       ├── ApiExecutor.execute()  [with retry + abort]
       ├── ValidationEngine.validate()
       └── IdResolver.harvest()  [extract IDs for next run]

4. User clicks "Export"
   └── ReportGenerator.generateReport()
   └── PdfReportGenerator | HtmlReportGenerator | CsvReportGenerator ...
```

---

## Message Flow (Background ↔ Content Script)

```
Content Script                Background SW
─────────────────             ──────────────
sendMessage({type: 'INIT'})  →  registers tab
sendMessage({type: 'PING'})  →  responds with {version}
onMessage({type: 'OPEN'})   ←  popup click triggers sidebar open
```

---

## Plugin System

Five extension point interfaces in `src/plugins/interfaces/`:

| Interface | Purpose |
|---|---|
| `IValidator` | Custom response validation rules |
| `IExporter` | Custom export formats (JUnit, Allure, etc.) |
| `IAuthProvider` | Custom auth flows (SAML, AWS SigV4, mTLS) |
| `ITestGenerator` | Custom test scenario generators |
| `IReportFormatter` | Custom report templates / branding |

Register implementations via `pluginRegistry` (module singleton):

```typescript
import { pluginRegistry } from './plugins/PluginRegistry';
pluginRegistry.registerValidator(new MyCustomValidator());
```

---

## Future Cloud Architecture (Extension Points)

Defined but NOT implemented in v1:

- `ICloudBackend` — push/pull runs to a remote backend
- `ITeamWorkspace` — shared environments and reports
- `IScheduledRun` — cron-based test execution
- `INotificationChannel` — Slack, Teams, GitHub, Jira, Azure DevOps

---

## Security Considerations

| Area | Implementation |
|---|---|
| Tokens in logs | `AppConfig.security.maskTokensInLogs` gates output |
| Tokens in reports | `maskTokensInReports` removes auth headers before export |
| Storage encryption | `SecureStorage.ts` encrypts sensitive credentials |
| XSS in response body | Response bodies rendered in `<pre>` / JSON viewer, never `innerHTML` |
| Content script isolation | No DOM mutation outside the extension sidebar container |
| Permissions | `storage`, `activeTab`, `tabs` — minimal required permissions |
| host_permissions | `<all_urls>` — required to call any API from the page's origin |
