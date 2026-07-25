import type { AuthMethod } from './Authentication';

export interface Session {
  currentUser?: string;
  currentEnvironmentId: string;
  currentAuthMethod: AuthMethod;
  lastAuthenticationTimestamp?: number;
  sessionExpirationTimestamp?: number;
}
