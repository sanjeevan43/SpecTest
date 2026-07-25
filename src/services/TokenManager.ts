export interface TokenDetails {
  accessToken: string;
  issuedAt: number; // timestamp ms
  expiresAt: number; // timestamp ms
  expiresInSeconds?: number;
}

export class TokenManager {
  /**
   * Decodes JWT token payload without external dependencies.
   */
  public static decodeJwt(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payloadDecoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(payloadDecoded);
    } catch {
      return null;
    }
  }

  /**
   * Parses token payload to extract expiration times.
   */
  public static parseToken(token: string): TokenDetails {
    const now = Date.now();
    const jwt = this.decodeJwt(token);

    if (jwt) {
      const exp = jwt.exp ? jwt.exp * 1000 : now + 3600 * 1000; // default 1 hour
      const iat = jwt.iat ? jwt.iat * 1000 : now;
      return {
        accessToken: token,
        issuedAt: iat,
        expiresAt: exp,
        expiresInSeconds: Math.max(0, Math.floor((exp - now) / 1000)),
      };
    }

    // Fallback for non-JWT opaque tokens
    return {
      accessToken: token,
      issuedAt: now,
      expiresAt: now + 3600 * 1000,
      expiresInSeconds: 3600,
    };
  }

  /**
   * Evaluates if a token is close to expiring (e.g. within 5 minutes).
   */
  public static isNearExpiration(expiresAt: number, warningWindowMs: number = 300000): boolean {
    const diff = expiresAt - Date.now();
    return diff > 0 && diff <= warningWindowMs;
  }

  /**
   * Checks if a token is completely expired.
   */
  public static isExpired(expiresAt: number): boolean {
    return Date.now() >= expiresAt;
  }
}
