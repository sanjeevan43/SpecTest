export class SecureKeyStorage {
  private static readonly KEY_PREFIX = 'sec_key_';

  /**
   * Masks a key displaying only the last 4 characters if long enough.
   */
  public static maskKey(key?: string | null): string {
    if (!key) return '';
    if (key.length <= 4) return '****';
    const maskedLength = key.length - 4;
    return '*'.repeat(maskedLength) + key.slice(-4);
  }

  /**
   * Saves provider API key securely in chrome.storage.local
   */
  public static async saveKey(provider: string, apiKey: string): Promise<void> {
    if (!apiKey) return;
    try {
      const obfuscated = btoa(apiKey);
      const storageKey = `${this.KEY_PREFIX}${provider}`;
      await chrome.storage.local.set({ [storageKey]: obfuscated });
    } catch (e) {
      console.error('Error saving key obfuscation');
    }
  }

  /**
   * Retrieves provider API key from chrome.storage.local
   */
  public static async getKey(provider: string): Promise<string> {
    try {
      const storageKey = `${this.KEY_PREFIX}${provider}`;
      const res = await chrome.storage.local.get(storageKey);
      const obfuscated = res[storageKey];
      if (!obfuscated) return '';
      return atob(obfuscated);
    } catch {
      return '';
    }
  }

  /**
   * Clears the saved key for the provider
   */
  public static async clearKey(provider: string): Promise<void> {
    try {
      const storageKey = `${this.KEY_PREFIX}${provider}`;
      await chrome.storage.local.remove(storageKey);
    } catch {}
  }
}
