/**
 * @file PluginRegistry.ts
 * @description Central registry for all installed plugins.
 *
 * Design (SOLID — Open/Closed Principle):
 * - Core extension behavior is closed for modification
 * - New capabilities (validators, exporters, auth providers, test generators) are
 *   added by registering plugin implementations, not editing service classes
 * - Registry is a simple Map-based singleton with type-safe accessors
 * - Plugins are validated on registration (id, name, version required)
 * - Future: UI will read registered plugins to populate Settings → Plugins tab
 */

import type { IValidator } from './interfaces/IValidator';
import type { IExporter } from './interfaces/IExporter';
import type { IAuthProvider } from './interfaces/IAuthProvider';
import type { ITestGenerator } from './interfaces/ITestGenerator';
import type { IReportFormatter } from './interfaces/IReportFormatter';
import { createLogger } from '../utils/Logger';

const log = createLogger('service');

// ---------------------------------------------------------------------------
// Plugin Registry
// ---------------------------------------------------------------------------

interface PluginBase {
  readonly id: string;
  readonly name: string;
  readonly version: string;
}

function assertPlugin(plugin: PluginBase, type: string): void {
  if (!plugin.id) throw new Error(`${type} plugin must have an 'id'`);
  if (!plugin.name) throw new Error(`${type} plugin must have a 'name'`);
  if (!plugin.version) throw new Error(`${type} plugin must have a 'version'`);
}

class PluginRegistry {
  private readonly validators   = new Map<string, IValidator>();
  private readonly exporters    = new Map<string, IExporter>();
  private readonly authProviders = new Map<string, IAuthProvider>();
  private readonly testGenerators = new Map<string, ITestGenerator>();
  private readonly reportFormatters = new Map<string, IReportFormatter>();

  // ---- Validators ----------------------------------------------------------

  registerValidator(plugin: IValidator): void {
    assertPlugin(plugin, 'Validator');
    if (this.validators.has(plugin.id)) {
      log.warn(`Validator '${plugin.id}' is already registered — overwriting`);
    }
    this.validators.set(plugin.id, plugin);
    log.info(`Registered validator: ${plugin.name} v${plugin.version}`);
  }

  getValidators(): IValidator[] {
    return Array.from(this.validators.values());
  }

  getValidator(id: string): IValidator | undefined {
    return this.validators.get(id);
  }

  // ---- Exporters -----------------------------------------------------------

  registerExporter(plugin: IExporter): void {
    assertPlugin(plugin, 'Exporter');
    if (this.exporters.has(plugin.id)) {
      log.warn(`Exporter '${plugin.id}' is already registered — overwriting`);
    }
    this.exporters.set(plugin.id, plugin);
    log.info(`Registered exporter: ${plugin.name} v${plugin.version}`);
  }

  getExporters(): IExporter[] {
    return Array.from(this.exporters.values());
  }

  getExporter(id: string): IExporter | undefined {
    return this.exporters.get(id);
  }

  // ---- Auth Providers ------------------------------------------------------

  registerAuthProvider(plugin: IAuthProvider): void {
    assertPlugin(plugin, 'AuthProvider');
    if (this.authProviders.has(plugin.id)) {
      log.warn(`AuthProvider '${plugin.id}' is already registered — overwriting`);
    }
    this.authProviders.set(plugin.id, plugin);
    log.info(`Registered auth provider: ${plugin.name} v${plugin.version}`);
  }

  getAuthProviders(): IAuthProvider[] {
    return Array.from(this.authProviders.values());
  }

  getAuthProvider(id: string): IAuthProvider | undefined {
    return this.authProviders.get(id);
  }

  // ---- Test Generators -----------------------------------------------------

  registerTestGenerator(plugin: ITestGenerator): void {
    assertPlugin(plugin, 'TestGenerator');
    if (this.testGenerators.has(plugin.id)) {
      log.warn(`TestGenerator '${plugin.id}' is already registered — overwriting`);
    }
    this.testGenerators.set(plugin.id, plugin);
    log.info(`Registered test generator: ${plugin.name} v${plugin.version}`);
  }

  getTestGenerators(): ITestGenerator[] {
    return Array.from(this.testGenerators.values());
  }

  getTestGenerator(id: string): ITestGenerator | undefined {
    return this.testGenerators.get(id);
  }

  // ---- Report Formatters ---------------------------------------------------

  registerReportFormatter(plugin: IReportFormatter): void {
    assertPlugin(plugin, 'ReportFormatter');
    if (this.reportFormatters.has(plugin.id)) {
      log.warn(`ReportFormatter '${plugin.id}' is already registered — overwriting`);
    }
    this.reportFormatters.set(plugin.id, plugin);
    log.info(`Registered report formatter: ${plugin.name} v${plugin.version}`);
  }

  getReportFormatters(): IReportFormatter[] {
    return Array.from(this.reportFormatters.values());
  }

  getReportFormatter(id: string): IReportFormatter | undefined {
    return this.reportFormatters.get(id);
  }

  // ---- Utility -------------------------------------------------------------

  /** Returns a summary of all registered plugins for the Settings UI. */
  getSummary(): {
    validators: number;
    exporters: number;
    authProviders: number;
    testGenerators: number;
    reportFormatters: number;
  } {
    return {
      validators: this.validators.size,
      exporters: this.exporters.size,
      authProviders: this.authProviders.size,
      testGenerators: this.testGenerators.size,
      reportFormatters: this.reportFormatters.size,
    };
  }

  /** Removes all registered plugins (useful for testing). */
  clear(): void {
    this.validators.clear();
    this.exporters.clear();
    this.authProviders.clear();
    this.testGenerators.clear();
    this.reportFormatters.clear();
  }
}

/** Module-level singleton — import and use directly. */
export const pluginRegistry = new PluginRegistry();
