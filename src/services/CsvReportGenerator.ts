import type { Report } from '../models/Report';

export class CsvReportGenerator {
  /**
   * Generates a flat CSV file mapping executed endpoints.
   */
  public static generate(report: Report): string {
    const csv: string[] = [];

    // Metadata Header
    csv.push(`"Report Title","${report.title}"`);
    csv.push(`"Base URL","${report.baseUrl}"`);
    csv.push(`"Environment","${report.environmentName}"`);
    csv.push(`"Execution Date","${report.executionDate}"`);
    csv.push(`"Success Rate","${report.summary.successRate}%"`);
    csv.push(`"Avg Validation Score","${report.summary.averageValidationScore}%"`);
    csv.push('');

    // Headers Row
    csv.push('ID,Method,Path,Status,StatusCode,DurationMs,ValidationScore,ValidationErrorsCount');

    // Records Row
    report.apis.forEach((api) => {
      const escapedPath = api.path.replace(/"/g, '""');
      const escapedErrors = api.validationErrors.length;
      csv.push(
        `"${api.id}","${api.method.toUpperCase()}","${escapedPath}","${api.status}","${api.statusCode || ''}",${api.durationMs},${api.validationScore !== undefined ? api.validationScore : ''},${escapedErrors}`
      );
    });

    return csv.join('\n');
  }
}
