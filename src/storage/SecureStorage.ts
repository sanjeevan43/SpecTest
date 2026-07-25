export class SecureStorage {
  /**
   * Masks sensitive credentials like tokens or passwords for UI logs.
   */
  public static mask(secret?: string): string {
    if (!secret) return 'Not set';
    if (secret.length <= 8) return '********';
    return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
  }

  /**
   * Securely saves sensitive information.
   */
  public static async saveSecureValue(key: string, value: string): Promise<void> {
    try {
      // Obfuscate value using simple Base64 to prevent plain-text inspection
      const obfuscated = btoa(value);
      await chrome.storage.local.set({ [key]: obfuscated });
    } catch {}
  }

  /**
   * Retrieves and restores obfuscated credentials.
   */
  public static async getSecureValue(key: string): Promise<string | null> {
    try {
      const res = await chrome.storage.local.get(key);
      const val = res[key];
      if (!val) return null;
      return atob(val);
    } catch {
      return null;
    }
  }
}
