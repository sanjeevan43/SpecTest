export type AuthMethod = 'anonymous' | 'bearer' | 'basic' | 'apiKey' | 'oauth2' | 'cookie';

export interface Authentication {
  method: AuthMethod;
  token?: string;
  username?: string;
  password?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyIn?: 'header' | 'query' | 'cookie';
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  oauthExpiresAt?: number;
  cookieName?: string;
  cookieValue?: string;
}
