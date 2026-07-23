import { STORAGE_KEYS } from '@/constants';
import type {
  AuthCredential,
  HistoryEntry,
  ParsedApiDocument,
  RunnerConfig,
  SwaggerPageInfo,
} from '@/models/types';

/**
 * Thin, typed wrapper around chrome.storage.local.
 * Centralizing this means every read/write goes through one place, so key names
 * and (de)serialization never drift between background/content/sidebar/popup.
 */
class ChromeStorageService {
  private async get<T>(key: string, fallback: T): Promise<T> {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve((result[key] as T) ?? fallback);
      });
    });
  }

  private async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  }

  // Settings -----------------------------------------------------------------
  getSettings(fallback: RunnerConfig): Promise<RunnerConfig> {
    return this.get(STORAGE_KEYS.SETTINGS, fallback);
  }
  setSettings(config: RunnerConfig): Promise<void> {
    return this.set(STORAGE_KEYS.SETTINGS, config);
  }

  // History --------------------------------------------------------------------
  getHistory(): Promise<HistoryEntry[]> {
    return this.get<HistoryEntry[]>(STORAGE_KEYS.HISTORY, []);
  }
  async addHistoryEntry(entry: HistoryEntry, maxEntries: number): Promise<void> {
    const history = await this.getHistory();
    const updated = [entry, ...history].slice(0, maxEntries);
    await this.set(STORAGE_KEYS.HISTORY, updated);
  }
  clearHistory(): Promise<void> {
    return this.set(STORAGE_KEYS.HISTORY, []);
  }

  // Tokens / captured auth -------------------------------------------------------
  getTokens(): Promise<Record<string, AuthCredential>> {
    return this.get<Record<string, AuthCredential>>(STORAGE_KEYS.TOKENS, {});
  }
  async saveToken(cred: AuthCredential): Promise<void> {
    const tokens = await this.getTokens();
    tokens[cred.schemeId] = cred;
    await this.set(STORAGE_KEYS.TOKENS, tokens);
  }
  async clearTokens(): Promise<void> {
    await this.set(STORAGE_KEYS.TOKENS, {});
  }

  // Last parsed document (per-origin cache) -------------------------------------
  getLastDocument(): Promise<ParsedApiDocument | null> {
    return this.get<ParsedApiDocument | null>(STORAGE_KEYS.LAST_DOCUMENT, null);
  }
  setLastDocument(doc: ParsedApiDocument): Promise<void> {
    return this.set(STORAGE_KEYS.LAST_DOCUMENT, doc);
  }

  // Detected swagger pages, keyed by tabId ---------------------------------------
  getSwaggerPages(): Promise<Record<number, SwaggerPageInfo>> {
    return this.get<Record<number, SwaggerPageInfo>>(STORAGE_KEYS.SWAGGER_PAGES, {});
  }
  async setSwaggerPage(info: SwaggerPageInfo): Promise<void> {
    const pages = await this.getSwaggerPages();
    pages[info.tabId] = info;
    await this.set(STORAGE_KEYS.SWAGGER_PAGES, pages);
  }
  async removeSwaggerPage(tabId: number): Promise<void> {
    const pages = await this.getSwaggerPages();
    delete pages[tabId];
    await this.set(STORAGE_KEYS.SWAGGER_PAGES, pages);
  }
}

export const chromeStorage = new ChromeStorageService();
