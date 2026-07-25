# Internal API Reference

This document describes the public API surface of each core service.
For implementation details see inline JSDoc in the source files.

---

## Parsers

### `SwaggerDetector`
```typescript
class SwaggerDetector {
  static async discoverSpecUrls(): Promise<string[]>
}
```
Returns a list of unique, absolute URLs that may contain an OpenAPI specification.
Combines DOM scraping, common path fallbacks, and page-context JS inspection.

### `OpenApiParser`
```typescript
class OpenApiParser {
  static async parse(url: string): Promise<ParsedApiDocument>
  static parseString(rawText: string, sourceUrl: string): ParsedApiDocument
}
```
Parses OpenAPI 3.x and Swagger 2.0 from JSON or YAML. Returns a `ParsedApiDocument`
with normalized `endpoints[]`, `schemas`, `servers`, `info`, and `securitySchemes`.

---

## Execution

### `RequestBuilder`
```typescript
class RequestBuilder {
  static build(
    endpoint: ApiEndpoint,
    baseUrl: string,
    paramOverrides?: Record<string, string>
  ): ApiRequest
  static generateSampleFromSchema(schema: ApiSchema): unknown
}
```

### `ApiExecutor`
```typescript
class ApiExecutor {
  static async execute(
    request: ApiRequest,
    signal?: AbortSignal,
    maxRetries?: number,
    onRetry?: (attempt: number, error: string) => void
  ): Promise<ApiResponse>
}
```

### `useApiRunner` (React hook)
```typescript
function useApiRunner(): {
  runEndpoint: (endpointId: string) => Promise<void>
  runAll: (endpointsList?: ApiEndpoint[]) => Promise<void>
  stop: () => void
  retryFailed: () => Promise<void>
  isRunningAll: boolean
  activeCount: number
}
```

---

## Dependency Resolution

### `DependencyResolver`
```typescript
class DependencyResolver {
  static async resolveEndpointParameters(
    endpoint: ApiEndpoint,
    document: ParsedApiDocument,
    executeCollectionFetch: (ep: ApiEndpoint) => Promise<unknown>
  ): Promise<ResolvedParameter[]>
}
```

### `WorkflowEngine`
```typescript
class WorkflowEngine {
  static sortEndpoints(endpoints: ApiEndpoint[]): ApiEndpoint[]
  static isLoginPath(path: string): boolean
  static extractAndSaveAuthToken(body: unknown): void
}
```

---

## Validation

### `ValidationEngine`
```typescript
class ValidationEngine {
  static validate(
    response: ApiResponse,
    endpoint: ApiEndpoint,
    document: ParsedApiDocument,
    settings: ValidationSettings
  ): ValidationResult
}
```

### `JsonSchemaValidator`
```typescript
class JsonSchemaValidator {
  static validate(
    value: unknown,
    schema: ApiSchema,
    globalSchemas: Record<string, unknown>,
    path?: string
  ): ValidationError[]
}
```

---

## Authentication

### `AuthenticationManager`
```typescript
class AuthenticationManager {
  static async harvestSwaggerAuth(): Promise<void>
  static detectSchemes(document: ParsedApiDocument): SecurityScheme[]
}
```

### `AuthInterceptor`
```typescript
class AuthInterceptor {
  static inject(request: ApiRequest): ApiRequest
}
```

---

## Reports

### `ReportGenerator`
```typescript
class ReportGenerator {
  static generateReport(title: string): Report
}
```

---

## Configuration

### `AppConfig`
```typescript
function getConfig(): AppConfig
function loadConfig(): Promise<AppConfig>
function updateConfig(override: DeepPartial<AppConfig>): Promise<void>
function resetConfig(): Promise<void>
```

### `VersionManager`
```typescript
function getVersionInfo(): Promise<VersionInfo>
function runMigrations(): Promise<void>
function getStoredSchemaVersion(): Promise<string | null>
```

---

## Plugin System

### `PluginRegistry`
```typescript
const pluginRegistry: {
  registerValidator(plugin: IValidator): void
  registerExporter(plugin: IExporter): void
  registerAuthProvider(plugin: IAuthProvider): void
  registerTestGenerator(plugin: ITestGenerator): void
  registerReportFormatter(plugin: IReportFormatter): void
  getValidators(): IValidator[]
  getExporters(): IExporter[]
  getAuthProviders(): IAuthProvider[]
  getTestGenerators(): ITestGenerator[]
  getReportFormatters(): IReportFormatter[]
  getSummary(): { validators: number; exporters: number; authProviders: number; testGenerators: number; reportFormatters: number }
  clear(): void
}
```

---

## Utilities

### `Logger`
```typescript
function createLogger(context: LogContext): {
  debug(message: string, data?: unknown): void
  info(message: string, data?: unknown): void
  warn(message: string, data?: unknown): void
  error(message: string, data?: unknown): void
}
function installGlobalErrorHandlers(context: LogContext): void
```

### `ErrorHandler`
```typescript
function normalizeError(err: unknown, context?: string): AppError
function safeAsync<T>(fn: () => Promise<T>, context?: string): Promise<{ data: T | null; error: AppError | null }>
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState>
```
