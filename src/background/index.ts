import { fetchAndParseSpec } from '@/parsers/openapiParser';
import { runTests } from '@/services/testRunner';
import { parseSwaggerUiAuthorized, credentialFromObservedHeader } from '@/services/authManager';
import { chromeStorage } from '@/storage/chromeStorage';
import { MAX_HISTORY_ENTRIES } from '@/constants';
import {
  DEFAULT_RUNNER_CONFIG,
  type ApiEndpoint,
  type AuthCredential,
  type ExtensionMessage,
  type ParsedApiDocument,
  type RunnerConfig,
  type RunSummary,
  type SwaggerPageInfo,
  type TestResult,
} from '@/models/types';

interface TabState {
  pageInfo?: SwaggerPageInfo;
  document?: ParsedApiDocument;
  results: TestResult[];
  summary?: RunSummary;
  credentials: Record<string, AuthCredential>;
  isRunning: boolean;
  stopRequested: boolean;
  parseError?: string;
}

const tabStates = new Map<number, TabState>();

function getOrCreateTabState(tabId: number): TabState {
  let state = tabStates.get(tabId);
  if (!state) {
    state = { results: [], credentials: {}, isRunning: false, stopRequested: false };
    tabStates.set(tabId, state);
  }
  return state;
}

async function getConfig(): Promise<RunnerConfig> {
  return chromeStorage.getSettings(DEFAULT_RUNNER_CONFIG);
}

// ---------------------------------------------------------------------------
// webRequest-based auth capture: Swagger UI's own XHR calls carry the exact
// Authorization / API-key headers a human already typed in. We snoop those as
// a fallback for whenever localStorage persistence isn't enabled.
// ---------------------------------------------------------------------------
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!details.tabId || details.tabId < 0 || !details.requestHeaders) return;
    const state = tabStates.get(details.tabId);
    if (!state) return;

    for (const header of details.requestHeaders) {
      const cred = credentialFromObservedHeader(header.name, header.value ?? '');
      if (cred) {
        state.credentials[cred.schemeId] = cred;
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders', 'extraHeaders'],
);

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);
  chromeStorage.removeSwaggerPage(tabId).catch(() => undefined);
});

// ---------------------------------------------------------------------------
// Message handling
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: err instanceof Error ? err.message : String(err) }));
  return true; // keep the message channel open for the async response
});

async function handleMessage(message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
  const tabId = message.tabId ?? sender.tab?.id;

  switch (message.type) {
    case 'SWAGGER_DETECTED': {
      if (tabId === undefined) return { ok: false };
      const info = message.payload as SwaggerPageInfo;
      const state = getOrCreateTabState(tabId);
      state.pageInfo = info;
      await chromeStorage.setSwaggerPage(info);
      return { ok: true, tabId };
    }

    case 'PARSE_DOCUMENT': {
      if (tabId === undefined) return { ok: false, error: 'No tab id' };
      const { specUrl } = message.payload as { specUrl: string };
      const state = getOrCreateTabState(tabId);
      try {
        const document = await fetchAndParseSpec(specUrl);
        state.document = document;
        state.parseError = undefined;
        await chromeStorage.setLastDocument(document);
        return { ok: true, document };
      } catch (err) {
        state.parseError = err instanceof Error ? err.message : String(err);
        return { ok: false, error: state.parseError };
      }
    }

    case 'CAPTURE_AUTH': {
      if (tabId === undefined) return { ok: false };
      const state = getOrCreateTabState(tabId);
      const { rawLocalStorageValue } = message.payload as { rawLocalStorageValue: string | null };
      if (state.document) {
        const found = parseSwaggerUiAuthorized(rawLocalStorageValue, state.document.securitySchemes);
        for (const cred of found) {
          state.credentials[cred.schemeId] = cred;
          await chromeStorage.saveToken(cred);
        }
      }
      return { ok: true, credentials: state.credentials };
    }

    case 'GET_STATE': {
      const resolvedTabId = (message.payload as { tabId?: number } | undefined)?.tabId ?? tabId;
      if (resolvedTabId === undefined) return { ok: false };
      const state = getOrCreateTabState(resolvedTabId);
      const config = await getConfig();
      const history = await chromeStorage.getHistory();
      return { ok: true, state, config, history };
    }

    case 'RUN_ALL':
    case 'RUN_SELECTED':
    case 'RUN_TAG':
    case 'RUN_FAILED':
    case 'RETRY_FAILED': {
      if (tabId === undefined) return { ok: false, error: 'No tab id' };
      return runForTab(tabId, message.type, message.payload as Record<string, unknown> | undefined);
    }

    case 'STOP_RUN': {
      if (tabId === undefined) return { ok: false };
      const state = getOrCreateTabState(tabId);
      state.stopRequested = true;
      return { ok: true };
    }

    case 'CLEAR_RESULTS': {
      if (tabId === undefined) return { ok: false };
      const state = getOrCreateTabState(tabId);
      state.results = [];
      state.summary = undefined;
      return { ok: true };
    }

    case 'OPEN_SIDEBAR':
    case 'TOGGLE_SIDEBAR': {
      const targetTabId = (message.payload as { tabId?: number } | undefined)?.tabId ?? tabId;
      if (targetTabId === undefined) return { ok: false };
      await chrome.tabs.sendMessage(targetTabId, { type: message.type }).catch(() => undefined);
      return { ok: true };
    }

    default:
      return { ok: false, error: `Unhandled message type: ${message.type}` };
  }
}

async function runForTab(
  tabId: number,
  runType: ExtensionMessage['type'],
  payload: Record<string, unknown> | undefined,
): Promise<{ ok: boolean; error?: string }> {
  const state = getOrCreateTabState(tabId);
  if (!state.document) return { ok: false, error: 'No parsed OpenAPI document for this tab yet' };
  if (state.isRunning) return { ok: false, error: 'A run is already in progress' };

  state.isRunning = true;
  state.stopRequested = false;
  const config = await getConfig();

  const endpointFilter = buildEndpointFilter(runType, payload, state);

  try {
    const { summary, results } = await runTests({
      document: state.document,
      config,
      credentials: state.credentials,
      endpointFilter,
      onProgress: (result) => {
        state.results.push(result);
        chrome.tabs.sendMessage(tabId, { type: 'TEST_PROGRESS', payload: result }).catch(() => undefined);
      },
      isStopped: () => state.stopRequested,
    });

    // For "run failed subset" flows we appended to existing results above; replace with fresh set
    // for full runs so old stale entries from a previous run don't linger.
    if (runType === 'RUN_ALL') {
      state.results = results;
    }
    state.summary = summary;
    state.isRunning = false;

    await chromeStorage.addHistoryEntry(
      { summary, results: state.results, sourceUrl: state.document.sourceUrl },
      MAX_HISTORY_ENTRIES,
    );

    chrome.tabs.sendMessage(tabId, { type: 'RUN_COMPLETE', payload: { summary, results: state.results } }).catch(() => undefined);
    return { ok: true };
  } catch (err) {
    state.isRunning = false;
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function buildEndpointFilter(
  runType: ExtensionMessage['type'],
  payload: Record<string, unknown> | undefined,
  state: TabState,
): ((endpoint: ApiEndpoint) => boolean) | undefined {
  if (runType === 'RUN_SELECTED') {
    const ids = new Set((payload?.endpointIds as string[]) ?? []);
    return (endpoint) => ids.has(endpoint.id);
  }
  if (runType === 'RUN_TAG') {
    const tag = payload?.tag as string;
    return (endpoint) => endpoint.tags.includes(tag);
  }
  if (runType === 'RUN_FAILED' || runType === 'RETRY_FAILED') {
    const failedEndpointIds = new Set(
      state.results.filter((r) => r.status === 'failed' || r.status === 'unauthorized').map((r) => r.endpointId),
    );
    return (endpoint) => failedEndpointIds.has(endpoint.id);
  }
  return undefined; // RUN_ALL
}
