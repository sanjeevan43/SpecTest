import type { Report } from '../models/Report';

export class PdfReportGenerator {
  /**
   * Generates a printable print-styled window representation.
   */
  public static generate(report: Report): string {
    return `
<html>
<head>
  <title>API Test Execution Report - ${report.title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #333;
      padding: 40px;
    }
    h1 {
      border-bottom: 2px solid #333;
      padding-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
    }
    .score-block {
      font-size: 24px;
      font-weight: bold;
      color: #0284c7;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <h1>API Test Execution Report</h1>
  <div style="margin-top: 20px;">Swagger Title: <strong>${report.swaggerTitle}</strong></div>
  <div>Execution Date: <strong>${new Date(report.executionDate).toLocaleString()}</strong></div>
  <div>Environment: <strong>${report.environmentName}</strong></div>
  <div class="score-block">Success Rate: ${report.summary.successRate}% | Validation Score: ${report.summary.averageValidationScore}%</div>

  <table>
    <thead>
      <tr>
        <th>Method</th>
        <th>Path</th>
        <th>Status</th>
        <th>Code</th>
        <th>Latency</th>
      </tr>
    </thead>
    <tbody>
      ${report.apis.map((api) => `
        <tr>
          <td><strong>${api.method.toUpperCase()}</strong></td>
          <td>${api.path}</td>
          <td>${api.status}</td>
          <td>${api.statusCode || 'N/A'}</td>
          <td>${api.durationMs}ms</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
    `;
  }
}
