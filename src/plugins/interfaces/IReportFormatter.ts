/**
 * @file IReportFormatter.ts
 * @description Plugin interface for custom report template/format renderers.
 *
 * Unlike IExporter (which serializes existing Report data to a file),
 * IReportFormatter controls *how* the report is visually structured/rendered —
 * useful for custom branding, executive summaries, portal integrations, etc.
 */

import type { Report } from '../../models/Report';

export interface FormatterOptions {
  /** Whether to include request/response bodies */
  includePayloads: boolean;
  /** Whether to mask tokens and credentials */
  maskSensitiveData: boolean;
  /** Custom branding color (hex) */
  brandColor?: string;
  /** Custom logo URL */
  logoUrl?: string;
  /** Extra metadata to embed in the header */
  metadata?: Record<string, string>;
}

export interface RenderedReport {
  /** The fully rendered output (HTML string, PDF bytes as base64, etc.) */
  output: string;
  /** MIME type of the output */
  mimeType: string;
  /** Suggested filename */
  filename: string;
  /** Whether `output` is base64-encoded binary (e.g., PDF) */
  isBinary?: boolean;
}

/**
 * Custom Report Formatter plugin contract.
 */
export interface IReportFormatter {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly label: string;

  render(report: Report, options: FormatterOptions): RenderedReport | Promise<RenderedReport>;
}
