import type { SecurityScheme } from '../models/SecurityScheme';

export class SecuritySchemeParser {
  /**
   * Parses the securitySchemes declaration from raw OpenAPI spec document.
   */
  public static parse(spec: any): SecurityScheme[] {
    const parsed: SecurityScheme[] = [];
    if (!spec) return parsed;

    const components = spec.components || {};
    const securitySchemes = components.securitySchemes || spec.securityDefinitions || {};

    for (const id of Object.keys(securitySchemes)) {
      const raw = securitySchemes[id];
      const type = raw.type;

      if (type === 'apiKey') {
        parsed.push({
          id,
          type: 'apiKey',
          name: raw.name,
          in: raw.in,
        });
      } else if (type === 'http') {
        parsed.push({
          id,
          type: 'http',
          scheme: raw.scheme,
          bearerFormat: raw.bearerFormat,
        });
      } else if (type === 'oauth2') {
        parsed.push({
          id,
          type: 'oauth2',
          flows: raw.flows,
        });
      } else if (type === 'openIdConnect') {
        parsed.push({
          id,
          type: 'openIdConnect',
          openIdConnectUrl: raw.openIdConnectUrl,
        });
      }
    }

    return parsed;
  }
}
