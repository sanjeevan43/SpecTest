# Installation Guide

## Requirements

| Requirement | Version |
|---|---|
| Google Chrome | 114+ (Manifest V3 required) |
| Node.js | 20+ (for development) |
| npm | 10+ (for development) |

---

## Option A — Chrome Web Store *(Coming soon)*

1. Visit the [Chrome Web Store listing](#)
2. Click **Add to Chrome**
3. Navigate to any Swagger UI page and click the extension icon

---

## Option B — Manual Installation (Unpacked Extension)

Use this method to install the pre-built release ZIP or your own build.

### Step 1 — Get the extension files

**From a release ZIP:**
```bash
# Download the latest release from GitHub Releases
# Then unzip:
unzip swagger-api-auto-tester-1.0.0.zip -d swagger-api-auto-tester/
```

**Build from source:**
```bash
git clone https://github.com/your-org/swagger-api-auto-tester.git
cd swagger-api-auto-tester
npm install
npm run build:prod
# Built files are in dist/
```

### Step 2 — Enable Developer Mode in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Toggle **Developer mode** on (top-right corner)

### Step 3 — Load the extension

1. Click **Load unpacked**
2. Select the `dist/` folder (from build) or the unzipped folder (from ZIP)
3. The **Swagger API Auto Tester** icon appears in the Chrome toolbar

### Step 4 — Pin the extension *(optional)*

1. Click the puzzle piece icon in the Chrome toolbar
2. Find **Swagger API Auto Tester** and click the pin icon

---

## Option C — Development Setup

For contributors who want to run the extension with hot-reload:

```bash
git clone https://github.com/your-org/swagger-api-auto-tester.git
cd swagger-api-auto-tester
npm install
npm run dev
```

Then load `dist/` as an unpacked extension (as in Option B, Step 2-3).
The extension will hot-reload when source files change.

---

## First Use

1. Navigate to any Swagger UI page, e.g.: `https://petstore.swagger.io`
2. Click the extension icon — the sidebar opens on the right
3. The extension automatically detects and parses the OpenAPI spec
4. All endpoints appear in the **Endpoints** tab
5. Click **Run All** or expand any endpoint and click **Run**
6. View results, then go to **Reports** → **Export** to download

---

## Permissions Explained

The extension requests the following Chrome permissions:

| Permission | Why it's needed |
|---|---|
| `storage` | Save test history, environments, and settings locally |
| `activeTab` | Read the current tab's URL and inject the sidebar |
| `tabs` | Communicate between the popup and the content script |
| `<all_urls>` (host permission) | Execute API requests to any server from the page's origin |

**No data is ever sent to external servers.** All execution happens in-browser.

---

## Troubleshooting

### Extension icon not appearing
- Ensure Developer mode is enabled at `chrome://extensions`
- Try reloading the extension

### Swagger spec not detected
- Check that the page is using Swagger UI (look for the `/swagger-ui` URL or Swagger branding)
- Open DevTools → Console and check for `[SAT]` prefixed log messages
- Try manually entering the spec URL in the extension's **Settings** tab

### API requests failing with CORS errors
- The extension executes requests from the page's origin — CORS rules apply
- Ensure the backend's CORS policy allows the origin of the Swagger UI page
- For local development, consider `--disable-web-security` (for testing only)

### "Storage quota exceeded" error
- Go to **Settings → History** and reduce the maximum saved runs
- Or click **Clear History** to delete all saved runs
