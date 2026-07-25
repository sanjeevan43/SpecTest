# Chrome Web Store — Store Listing

## Extension Name
Swagger API Auto Tester

## Short Description *(132 chars max)*
Automatically detect and test every API on any Swagger / OpenAPI page. No setup needed.

## Full Description *(Max 16,000 chars)*

**Swagger API Auto Tester** is the fastest way to test REST APIs documented with Swagger or OpenAPI.

Open any page running Swagger UI — the extension automatically detects the spec, generates intelligent test cases, runs every endpoint, and validates the responses. No manual configuration. No code to write.

---

### ✅ Zero Setup — Just Navigate

The extension automatically detects Swagger / OpenAPI specifications on any page. It works with:
- Swagger UI (all versions)
- OpenAPI 3.x (JSON + YAML)
- Swagger 2.0 (JSON + YAML)
- Spring Boot Actuator / SpringDoc
- FastAPI, Django REST Framework, Express, and more

---

### 🚀 Run APIs Instantly

- **Run All** — execute every endpoint in the correct order (login → create → read → update → delete)
- **Run Single** — test any individual endpoint with one click
- **Smart Dependency Resolution** — path parameters like `{petId}` are automatically resolved from previous responses
- **Retry with Backoff** — failed requests are automatically retried up to 3 times

---

### 🧪 Automatic Test Case Generation

For every endpoint, the extension generates:
- **Positive tests** — using spec examples and valid data
- **Negative tests** — invalid types, missing required fields, wrong enums
- **Boundary tests** — min/max values, empty strings, very long strings
- **Validation tests** — format violations, pattern mismatches

---

### ✔️ Response Validation

Every response is automatically validated against the OpenAPI specification:
- Type matching (string, integer, boolean, array, object)
- Required field presence
- Enum constraint enforcement
- Nested object recursion
- Status code matching
- Validation score (0–100) per endpoint

---

### 🔐 Authentication Support

- **Bearer Token** — auto-harvested from the Swagger UI "Authorize" dialog
- **API Key** — header, query parameter, or cookie
- **Basic Auth** — username and password
- **OAuth2** — authorization code and implicit flows
- Credentials you enter in Swagger UI are automatically reused

---

### 🌍 Environment Management

Create and switch between environments (Local, Dev, QA, UAT, Production):
- Different base URLs per environment
- Variable substitution (`{{tenantId}}`, `{{baseUrl}}`)
- Custom headers per environment
- Timeout and retry policies per environment

---

### 📊 Reports & Export

Download professional test reports in:
- **PDF** — executive-ready with charts and summary table
- **HTML** — interactive, shareable test report
- **JSON** — machine-readable for CI/CD integration
- **CSV** / **Excel** — for stakeholder reporting
- **Markdown** — for GitHub/Confluence
- **Postman Collection** — import and re-run in Postman
- **cURL** — copy individual requests as cURL commands
- **.http file** — for VS Code REST Client

---

### 📈 History & Analytics

- Every test run is saved locally
- Search and filter past runs
- Detect regressions (pass → fail transitions, latency spikes)
- Compare two runs side by side
- View pass rate trends, latency percentiles, health scores

---

### 🔒 Privacy First

- **All data stays in your browser** — nothing is sent to any server
- No account required
- No analytics or tracking
- Clear all data at any time from Settings

---

## Category
Developer Tools

## Tags (max 5)
api testing, swagger, openapi, rest api, developer tools

## Screenshots Guide
1. Screenshot 1: Extension sidebar open on Swagger Petstore — showing endpoint list with status badges
2. Screenshot 2: "Run All" in progress — showing endpoints executing with status indicators
3. Screenshot 3: Endpoint expanded with response body, status code, and validation score
4. Screenshot 4: Reports tab — PDF export button, HTML preview, success rate chart
5. Screenshot 5: Settings tab — Environment selector, auth configuration

## Promotional Images
- Small tile: 440×280px — logo centered on dark gradient background
- Large tile: 920×680px — feature showcase collage
- Marquee: 1400×560px — "Test your entire API in seconds" tagline

## Primary Language
English
