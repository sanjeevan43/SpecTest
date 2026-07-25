import { useEnvironmentStore } from '../store/environmentStore';
import { useAuthenticationStore } from '../store/authenticationStore';
import { useDependencyStore } from '../store/dependencyStore';

export class EnvironmentManager {
  /**
   * Resolves environment variables recursively in any string, object, or array.
   */
  public static resolve<T>(target: T): T {
    if (!target) return target;

    const envState = useEnvironmentStore.getState();
    if (!envState.isVariablesEnabled) {
      return target;
    }

    const variables = this.collectVariables();

    if (typeof target === 'string') {
      return this.resolveString(target, variables) as T;
    }

    if (Array.isArray(target)) {
      return target.map((item) => this.resolve(item)) as T;
    }

    if (typeof target === 'object') {
      const obj = { ...target } as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        obj[key] = this.resolve(obj[key]);
      }
      return obj as T;
    }

    return target;
  }

  private static collectVariables(): Record<string, string> {
    const vars: Record<string, string> = {};

    // 1. Dynamic Variables
    vars['currentDate'] = new Date().toISOString().split('T')[0];
    vars['currentTimestamp'] = String(Date.now());
    vars['randomUUID'] = crypto.randomUUID();

    // 2. Load Environment Variables from current profile
    const envState = useEnvironmentStore.getState();
    const currentEnv = envState.environments.find((e) => e.id === envState.selectedEnvironmentId);
    if (currentEnv) {
      Object.assign(vars, currentEnv.variables);
      vars['baseUrl'] = currentEnv.baseUrl;
    }

    // 3. Load active harvested token
    const authState = useAuthenticationStore.getState();
    const tokenVal = authState.currentAuth.token || authState.currentAuth.oauthAccessToken || '';
    vars['token'] = tokenVal;

    // 4. Load harvested entities from dependencyStore
    const depState = useDependencyStore.getState();
    Object.keys(depState.entityCache).forEach((key) => {
      const list = depState.entityCache[key] || [];
      if (list.length > 0) {
        vars[key] = list[0].value;
      }
    });

    // 5. Load manual overrides
    Object.assign(vars, depState.manualMappings);

    return vars;
  }

  private static resolveString(str: string, variables: Record<string, string>): string {
    let resolved = str;
    const placeholderRegex = /\{\{([^}]+)\}\}/g;

    let match;
    // Loop to replace nested parameters
    while ((match = placeholderRegex.exec(resolved)) !== null) {
      const fullPlaceholder = match[0];
      const varName = match[1].trim();
      const val = variables[varName] !== undefined ? variables[varName] : '';

      resolved = resolved.replace(fullPlaceholder, val);
      // Reset regex index to scan string again from start
      placeholderRegex.lastIndex = 0;
    }

    return resolved;
  }
}
