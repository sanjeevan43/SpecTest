export { generateJsonReport, generateCsvReport } from './jsonCsv';
export { generateExcelReport } from './excel';
export { generateHtmlReport } from './html';
export { generatePdfReport } from './pdf';
export { generatePostmanCollection } from './postman';
export { generateBrunoCollection, type BrunoFile } from './bruno';
export { generateHttpFile } from './httpFile';

/** Triggers a browser download for arbitrary text/binary content — works from sidebar/popup contexts. */
export function downloadFile(content: string | ArrayBuffer | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
