import type { Report } from '../models/Report';

export class ExcelReportGenerator {
  /**
   * Generates a multi-sheet spreadsheet XML format readable directly in Excel.
   */
  public static generate(report: Report): string {
    // We construct a standard Excel XML format (SpreadsheetML) to support tabs
    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-xml:schemas-spreadsheet"
 xmlns:o="urn:schemas-microsoft-xml:office:office"
 xmlns:x="urn:schemas-microsoft-xml:office:excel"
 xmlns:ss="urn:schemas-microsoft-xml:schemas-spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1F4E78" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="16" ss:Bold="1"/>
  </Style>
 </Styles>`;

    // TAB 1: Executive Summary
    xml += `
 <Worksheet ss:Name="Summary">
  <Table>
   <Row><Cell ss:StyleID="Title"><Data ss:Type="String">Executive Summary Report</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Swagger Title: ${report.swaggerTitle}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Date: ${new Date(report.executionDate).toLocaleDateString()}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Success Rate: ${report.summary.successRate}%</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Validation Score: ${report.summary.averageValidationScore}%</Data></Cell></Row>
   <Row ss:Index="6">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Metric</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Value</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total APIs</Data></Cell>
    <Cell><Data ss:Type="Number">${report.summary.totalApis}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Passed</Data></Cell>
    <Cell><Data ss:Type="Number">${report.summary.passed}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Failed</Data></Cell>
    <Cell><Data ss:Type="Number">${report.summary.failed}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Avg Latency (ms)</Data></Cell>
    <Cell><Data ss:Type="Number">${report.summary.averageResponseTimeMs}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>`;

    // TAB 2: Execution Results
    xml += `
 <Worksheet ss:Name="Results">
  <Table>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Method</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Path</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Code</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Latency (ms)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Validation Score</Data></Cell>
   </Row>`;

    report.apis.forEach((api) => {
      xml += `
   <Row>
    <Cell><Data ss:Type="String">${api.method}</Data></Cell>
    <Cell><Data ss:Type="String">${api.path}</Data></Cell>
    <Cell><Data ss:Type="String">${api.status}</Data></Cell>
    <Cell><Data ss:Type="Number">${api.statusCode || 0}</Data></Cell>
    <Cell><Data ss:Type="Number">${api.durationMs}</Data></Cell>
    <Cell><Data ss:Type="Number">${api.validationScore !== undefined ? api.validationScore : 0}</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
</Workbook>`;

    return xml;
  }
}
