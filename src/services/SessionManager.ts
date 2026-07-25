import { useAuthenticationStore } from '../store/authenticationStore';
import { useEnvironmentStore } from '../store/environmentStore';
import { TokenManager } from './TokenManager';

export class SessionManager {
  /**
   * Tracks and evaluates the active session metadata status.
   */
  public static getSessionStatus(): {
    currentUser: string;
    environmentName: string;
    authMethod: string;
    isExpired: boolean;
    expiresInSeconds: number;
  } {
    const authState = useAuthenticationStore.getState();
    const envState = useEnvironmentStore.getState();

    const currentEnv = envState.environments.find((e) => e.id === envState.selectedEnvironmentId);
    const envName = currentEnv ? currentEnv.name : 'None';

    const tokenVal = authState.currentAuth.token || authState.currentAuth.oauthAccessToken;
    
    let isExpired = false;
    let expiresInSeconds = -1;
    let username = authState.currentAuth.username || 'Anonymous';

    if (tokenVal) {
      const parsed = TokenManager.parseToken(tokenVal);
      isExpired = TokenManager.isExpired(parsed.expiresAt);
      expiresInSeconds = parsed.expiresInSeconds || 0;
      
      const decoded = TokenManager.decodeJwt(tokenVal);
      if (decoded && (decoded.sub || decoded.username || decoded.email)) {
        username = decoded.sub || decoded.username || decoded.email;
      }
    }

    return {
      currentUser: username,
      environmentName: envName,
      authMethod: authState.currentAuth.method,
      isExpired,
      expiresInSeconds,
    };
  }

  /**
   * Automatically clears session credentials on log out.
   */
  public static logout(): void {
    const authState = useAuthenticationStore.getState();
    authState.clearAuth();
  }
}
