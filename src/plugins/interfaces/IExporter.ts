/**
 * @file IExporter.ts
 * @description Plugin interface for custom report/data exporters.
 *
 * Implement this interface to add new export formats (e.g., JUnit XML,
 * Allure, TestRail, Azure Test Plans) without modifying core report code.
 */

import type { Report } from '../../models/Report';

export interface ExportOutput {
  /** File content as string (text, XML, JSON, CSV, etc.) */
  content: string;
  /** MIME type for the download blob */
  mimeType: string;
  /** Suggested filename including extension */
  filename: string;
}

/**
 * Custom Exporter plugin contract.
 *
 * @example
 * class JUnitExporter implements IExporter {
 *   readonly id = 'com.myorg.junit-exporter';
 *   readonly name = 'JUnit XML Exporter';
 *   readonly version = '1.0.0';
 *   readonly fileExtension = 'xml';
 *   readonly label = 'JUnit XML';
 *   export(report: Report): ExportOutput { ... }
 * }
 */
export interface IExporter {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  /** Short label shown on the export button, e.g. "JUnit XML" */
  readonly label: string;
  /** File extension without leading dot, e.g. "xml" */
  readonly fileExtension: string;

  /**
   * Converts a Report into an exportable payload.
   * Must never throw — return empty content on error.
   */
  export(report: Report): ExportOutput | Promise<ExportOutput>;
}
