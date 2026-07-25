# Walkthrough - Step 9: Reporting & Export System

This document provides a summary of the implementation details, files, and verification procedures for Step 9 of the "Swagger API Auto Tester" Chrome extension.

## Changes Made

### Shared Models
- [src/models/ExportFormat.ts](file:///Users/sanjeev/Project/SpecTest/src/models/ExportFormat.ts): Supported report file target formats (PDF, HTML, JSON, CSV, EXCEL, MARKDOWN).
- [src/models/ReportSummary.ts](file:///Users/sanjeev/Project/SpecTest/src/models/ReportSummary.ts): Model capturing overall execution percentiles (average response latency, median, P95, P99) and compliance totals.
- [src/models/Report.ts](file:///Users/sanjeev/Project/SpecTest/src/models/Report.ts): Document tracking full test run execution trees.
- [src/models/Collection.ts](file:///Users/sanjeev/Project/SpecTest/src/models/Collection.ts): Mapping schemas for Postman/Bruno/Insomnia collections.

### Storage & Store
- [src/store/reportStore.ts](file:///Users/sanjeev/Project/SpecTest/src/store/reportStore.ts): Tracks saved historical reports, comparison selectors, and options filters.

### Core Export Services
- [src/services/CurlGenerator.ts](file:///Users/sanjeev/Project/SpecTest/src/services/CurlGenerator.ts): Converts a request details structure into standard cURL shell scripts.
- [src/services/HttpFileGenerator.ts](file:///Users/sanjeev/Project/SpecTest/src/services/HttpFileGenerator.ts): Outputs JetBrains / VS Code REST Client standard `.http` file formats.
- [src/services/CollectionGenerator.ts](file:///Users/sanjeev/Project/SpecTest/src/services/CollectionGenerator.ts): Handles mapping of variables to Postman Collections, Bruno `.bru` configs, and Insomnia Workspace configurations.
- [src/services/MarkdownReportGenerator.ts](file:///Users/sanjeev/Project/SpecTest/src/services/MarkdownReportGenerator.ts): Generates tables and summaries in GitHub-flavored markdown.
- [src/services/CsvReportGenerator.ts](file:///Users/sanjeev/Project/SpecTest/src/services/CsvReportGenerator.ts): Assembles flat CSV logs.
- [src/services/JsonReportGenerator.ts](file:///Users/sanjeev/Project/SpecTest/src/services/JsonReportGenerator.ts): Compiles full test execution JSON outputs.
- [src/services/ExcelReportGenerator.ts](file:///Users/sanjeev/Project/SpecTest/src/services/ExcelReportGenerator.ts): Assembles multi-tab spreadsheet files.
- [src/services/HtmlReportGenerator.ts](file:///Users/sanjeev/Project/SpecTest/src/services/HtmlReportGenerator.ts): Compiles HTML reports containing search/filter options.
- [src/services/PdfReportGenerator.ts](file:///Users/sanjeev/Project/SpecTest/src/services/PdfReportGenerator.ts): Builds browser-printable layouts.
- [src/services/ReportGenerator.ts](file:///Users/sanjeev/Project/SpecTest/src/services/ReportGenerator.ts): Coordinating factory summarizing execution results and sorting percentiles.

### UI Panel updates
- [src/components/ApiPanel.tsx](file:///Users/sanjeev/Project/SpecTest/src/components/ApiPanel.tsx):
  - Adds a new **Reports tab** where users can create execution reports, download recent reports in 6 formats, and export Postman collections.
  - Presents a **Compare Reports dashboard** showing delta latency (P95), validation differences, and highlighting New Failures vs Resolved Failures.
  - Adds a copy cURL button to all executed card headers.
