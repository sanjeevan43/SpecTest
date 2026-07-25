import type { Report } from '../models/Report';

export class HtmlReportGenerator {
  /**
   * Generates a fully interactive dark-mode HTML report document.
   */
  public static generate(report: Report): string {
    const passedPercent = report.summary.executed > 0
      ? Math.round((report.summary.passed / report.summary.executed) * 100)
      : 0;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>API Test Execution Report - ${report.title}</title>
  <style>
    :root {
      --bg-main: #0f172a;
      --bg-card: #1e293b;
      --border: #334155;
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --primary: #3b82f6;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    body {
      background-color: var(--bg-main);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 40px;
    }
    .header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
    }
    .metadata {
      font-size: 13px;
      color: var(--text-muted);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    .card {
      background-color: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }
    .card-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .card-value {
      font-size: 24px;
      font-weight: bold;
    }
    .filter-bar {
      margin-bottom: 20px;
    }
    .search-input {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-main);
      padding: 10px 16px;
      width: 100%;
      box-sizing: border-box;
      font-size: 14px;
    }
    .search-input:focus {
      outline: none;
      border-color: var(--primary);
    }
    .api-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .api-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .api-header {
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
    }
    .api-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .method {
      font-size: 11px;
      font-weight: bold;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .method-get { background: rgba(16, 185, 129, 0.1); color: var(--success); }
    .method-post { background: rgba(59, 130, 246, 0.1); color: var(--primary); }
    .method-put { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
    .method-delete { background: rgba(239, 68, 68, 0.1); color: var(--danger); }
    .path {
      font-family: monospace;
      font-size: 14px;
    }
    .status-badge {
      font-size: 12px;
      font-weight: bold;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .status-pass { background: rgba(16, 185, 129, 0.1); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2); }
    .status-fail { background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.2); }
    .api-details {
      padding: 20px;
      background: rgba(15, 23, 42, 0.4);
      border-top: 1px solid var(--border);
      display: none;
    }
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 8px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    pre {
      background: #090d16;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 12px;
      color: #38bdf8;
    }
  </style>
  <script>
    function toggleDetails(id) {
      const el = document.getElementById('details-' + id);
      if (el.style.display === 'block') {
        el.style.display = 'none';
      } else {
        el.style.display = 'block';
      }
    }
    function filterApis() {
      const query = document.getElementById('search').value.toLowerCase();
      const cards = document.getElementsByClassName('api-card');
      for (let card of cards) {
        const text = card.getAttribute('data-search').toLowerCase();
        if (text.includes(query)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      }
    }
  </script>
</head>
<body>
  <div class="header">
    <h1>API Test Execution Report</h1>
    <div class="metadata">
      Swagger Title: <strong>${report.swaggerTitle}</strong> &bull;
      Date: <strong>${new Date(report.executionDate).toLocaleString()}</strong> &bull;
      Environment: <strong>${report.environmentName}</strong> &bull;
      Auth Method: <strong>${report.authMethod}</strong>
    </div>
  </div>

  <div class="summary-grid">
    <div class="card">
      <div class="card-title">Success Rate</div>
      <div class="card-value" style="color: var(--success);">${report.summary.successRate}%</div>
    </div>
    <div class="card">
      <div class="card-title">Validation Score</div>
      <div class="card-value" style="color: var(--primary);">${report.summary.averageValidationScore}%</div>
    </div>
    <div class="card">
      <div class="card-title">Total / Executed</div>
      <div class="card-value">${report.summary.totalApis} / ${report.summary.executed}</div>
    </div>
    <div class="card">
      <div class="card-title">Avg Latency</div>
      <div class="card-value">${report.summary.averageResponseTimeMs}ms</div>
    </div>
  </div>

  <div class="filter-bar">
    <input type="text" id="search" oninput="filterApis()" placeholder="Search paths..." class="search-input" />
  </div>

  <div class="api-list">
    ${report.apis.map((api, idx) => `
      <div class="api-card" data-search="${api.path} ${api.method}">
        <div class="api-header" onclick="toggleDetails(${idx})">
          <div class="api-title">
            <span class="method method-${api.method.toLowerCase()}">${api.method}</span>
            <span class="path">${api.path}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="status-badge ${api.status === 'passed' ? 'status-pass' : 'status-fail'}">
              ${api.status.toUpperCase()} (${api.statusCode || 'N/A'})
            </span>
          </div>
        </div>
        <div class="api-details" id="details-${idx}">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <div class="section-title">Request Headers</div>
              <pre>${JSON.stringify(api.requestHeaders, null, 2)}</pre>
            </div>
            <div>
              <div class="section-title">Response Body</div>
              <pre>${api.responseBody ? JSON.stringify(JSON.parse(api.responseBody), null, 2) : 'No response body'}</pre>
            </div>
          </div>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>
    `;
  }
}
