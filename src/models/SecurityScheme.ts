export type SecuritySchemeType = 'apiKey' | 'http' | 'oauth2' | 'openIdConnect' | 'cookie';
export type SecuritySchemeIn = 'header' | 'query' | 'cookie';

export interface SecurityScheme {
  id: string; // key inside securitySchemes
  type: SecuritySchemeType;
  name?: string; // header/query/cookie parameter name
  in?: SecuritySchemeIn;
  scheme?: string; // e.g. "bearer", "basic"
  bearerFormat?: string;
  flows?: any; // OAuth2 authorization flows
  openIdConnectUrl?: string;
}
