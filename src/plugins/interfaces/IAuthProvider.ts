/**
 * @file IAuthProvider.ts
 * @description Plugin interface for custom authentication providers.
 *
 * Implement this interface to add non-standard auth flows:
 * SAML, mTLS, AWS SigV4, Azure AD, custom SSO, etc.
 * without touching the built-in AuthenticationManager.
 */

import type { ApiRequest } from '../../types/ApiRequest';

export interface AuthCredentials {
  /** Raw key-value pairs of credentials (e.g., { clientId, clientSecret }) */
  [key: string]: string;
}

export interface AuthToken {
  /** The resolved authorization header value (e.g., "Bearer eyJhb...") */
  authorizationHeader: string;
  /** Expiry timestamp in ms since epoch, if known */
  expiresAt?: number;
  /** Any extra headers to inject (e.g., x-api-key, x-amz-security-token) */
  extraHeaders?: Record<string, string>;
}

/**
 * Custom Auth Provider plugin contract.
 *
 * @example
 * class AwsSigV4Provider implements IAuthProvider {
 *   readonly id = 'com.myorg.aws-sigv4';
 *   readonly name = 'AWS Signature V4';
 *   readonly version = '1.0.0';
 *   async authenticate(credentials: AuthCredentials): Promise<AuthToken> { ... }
 *   inject(request: ApiRequest, token: AuthToken): ApiRequest { ... }
 * }
 */
export interface IAuthProvider {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  /** Short label for the dropdown in Auth & Envs tab */
  readonly label: string;
  /** Field definitions for the credential form in the Settings UI */
  readonly credentialFields: ReadonlyArray<{
    key: string;
    label: string;
    type: 'text' | 'password' | 'url';
    required: boolean;
    placeholder?: string;
  }>;

  /**
   * Performs the authentication flow and returns a resolved token.
   * Called once per session (or after expiry).
   */
  authenticate(credentials: AuthCredentials): Promise<AuthToken>;

  /**
   * Injects auth headers/params into an outgoing request.
   * Called before every API execution.
   */
  inject(request: ApiRequest, token: AuthToken): ApiRequest;

  /**
   * Returns true if the provided token is still valid.
   * Called before each request to decide whether to re-authenticate.
   */
  isValid(token: AuthToken): boolean;
}
