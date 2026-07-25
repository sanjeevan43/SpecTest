# Contributing Guide

Thank you for contributing to Swagger API Auto Tester!

---

## Development Setup

```bash
git clone https://github.com/your-org/swagger-api-auto-tester.git
cd swagger-api-auto-tester
npm install
npm run dev       # Start dev server with hot reload
```

Load the extension from `dist/` in `chrome://extensions` (Developer mode enabled).

---

## Project Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server with CRXJS HMR |
| `npm run build` | Development build |
| `npm run build:prod` | Production build (minified, optimized) |
| `npm run lint` | Run ESLint |
| `npm run format` | Apply Prettier formatting |
| `npm run typecheck` | Run TypeScript type checker (strict) |
| `npm run test:unit` | Run unit tests once |
| `npm run test:unit:watch` | Run unit tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run package` | Package `dist/` into a `.zip` |
| `npm run release` | Build + package in one step |

---

## Coding Standards

### TypeScript
- **Strict mode** is enforced — no implicit `any`
- Prefer `interface` for data shapes, `type` for unions/aliases
- All public API functions must have JSDoc comments
- Never use `as any` — use proper type narrowing

### Logging
Use `createLogger` — **never** use `console.log` directly in source:
```typescript
import { createLogger } from '../utils/Logger';
const log = createLogger('service'); // choose appropriate context
log.info('Request built', { url });
log.error('Execution failed', err);
```

### Error Handling
Wrap async operations with `safeAsync` or `try/catch` + `normalizeError`:
```typescript
import { safeAsync } from '../utils/ErrorHandler';
const { data, error } = await safeAsync(() => ApiExecutor.execute(req), 'ApiPanel');
```

### State Management
- State lives in Zustand stores (`src/store/`)
- Stores persist to `chrome.storage.local` via `saveToStorage()`
- Never mutate state directly — use store actions

### Services
- Services are **stateless static classes**
- No `this` state — all inputs are parameters
- No direct store imports in services (pass data in, return results)

### Components
- Atoms in `src/components/ui/` — no business logic
- Domain panels in `src/components/panels/` — compose atoms + store hooks
- Always wrap new panels with `<ErrorBoundary>`

---

## Writing Tests

All tests live in `tests/`. Run them with `npm run test:unit`.

### Unit test conventions
```typescript
// tests/unit/MyService.test.ts
import { describe, it, expect } from 'vitest';
import { MyService } from '../../src/services/MyService';

describe('MyService.methodName', () => {
  it('does X when given Y', () => {
    const result = MyService.methodName(input);
    expect(result).toEqual(expected);
  });
});
```

### Chrome mock usage
The Chrome mock is installed automatically via `tests/setup.ts`.
Use helpers to control storage:
```typescript
import { seedStorageMock, clearStorageMock } from '../mocks/chromeMock';
seedStorageMock({ sat_app_config: { ... } });
```

---

## Pull Request Process

1. Fork the repository and create a branch: `feature/my-feature` or `fix/my-bug`
2. Make your changes following the coding standards above
3. Write or update tests
4. Run `npm run lint && npm run typecheck && npm run test:unit` — all must pass
5. Update `docs/CHANGELOG.md` under `[Unreleased]`
6. Open a PR using the PR template

---

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(parser): add support for OpenAPI 3.1 webhooks
fix(executor): handle abort signal during retry
docs: update architecture guide with plugin system
test(validator): add boundary value test cases
chore: upgrade vite to 5.4.12
```

Types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `perf`, `ci`

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- `MAJOR`: Breaking changes to plugin interfaces or storage schema
- `MINOR`: New features, new plugin extension points
- `PATCH`: Bug fixes, performance improvements, documentation

To release a new version:
1. Update `package.json` version
2. Update `docs/CHANGELOG.md` (move `[Unreleased]` to `[X.Y.Z]` with date)
3. Commit: `git commit -m "chore: release vX.Y.Z"`
4. Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
5. GitHub Actions will build and publish the release automatically
