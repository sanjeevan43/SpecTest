import type { Report } from '../models/Report';

export class MarkdownReportGenerator {
  /**
   * Generates a GitHub-flavored Markdown report.
   */
  public static generate(report: Report): string {
    const lines: string[] = [];

    // Title
    lines.push(`# OpenAPI Compliance Execution Report: ${report.title}`);
    lines.push(`> Generated on: \`${new Date(report.executionDate).toLocaleString()}\` | Environment: \`${report.environmentName}\` | Auth: \`${report.authMethod}\``);
    lines.push('');

    // Summary Statistics Table
    lines.push('## Executive Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('| :--- | :--- |');
    lines.push(`| **Total APIs Discovered** | ${report.summary.totalApis} |`);
    lines.push(`| **Executed** | ${report.summary.executed} |`);
    lines.push(`| **Passed** | ${report.summary.passed} |`);
    lines.push(`| **Failed** | ${report.summary.failed} |`);
    lines.push(`| **Skipped** | ${report.summary.skipped} |`);
    lines.push(`| **Validation Mismatches** | ${report.summary.validationErrors} |`);
    lines.push(`| **Avg Response Latency** | ${report.summary.averageResponseTimeMs}ms |`);
    lines.push(`| **P95 Latency** | ${report.summary.p95ResponseTimeMs}ms |`);
    lines.push(`| **Overall Success Rate** | **${report.summary.successRate}%** |`);
    lines.push(`| **Avg Validation Score** | **${report.summary.averageValidationScore}%** |`);
    lines.push('');

    // Executed APIs Table
    lines.push('## API Execution Details');
    lines.push('');
    lines.push('| Method | Path | Status | Code | Duration | Score | Errors |');
    lines.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
    report.apis.forEach((api) => {
      const errors = api.validationErrors.length > 0
        ? api.validationErrors.map((e) => `\`${e}\``).join('<br>')
        : '_None_';
      lines.push(
        `| **${api.method.toUpperCase()}** | \`${api.path}\` | \`${api.status.toUpperCase()}\` | \`${api.statusCode || 'N/A'}\` | ${api.durationMs}ms | ${api.validationScore !== undefined ? `${api.validationScore}%` : 'N/A'} | ${errors} |`
      );
    });
    lines.push('');

    // Test Cases Table if available
    if (report.testCases.length > 0) {
      lines.push('## Test Suite Results');
      lines.push('');
      lines.push('| Test Scenario | Type | Status | Latency | Assertion Result |');
      lines.push('| :--- | :--- | :--- | :--- | :--- |');
      report.testCases.forEach((tc) => {
        lines.push(
          `| **${tc.name}** | \`${tc.type.toUpperCase()}\` | \`${tc.status.toUpperCase()}\` | ${tc.durationMs}ms | Expected: \`${tc.expectedResult}\` <br> Actual: \`${tc.actualResult}\` |`
        );
      });
      lines.push('');
    }

    return lines.join('\n');
  }
}
