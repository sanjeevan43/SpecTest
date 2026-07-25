import type { Report } from '../models/Report';

export class JsonReportGenerator {
  /**
   * Generates formatted JSON file containing entire report execution tree.
   */
  public static generate(report: Report): string {
    return JSON.stringify(report, null, 2);
  }
}
