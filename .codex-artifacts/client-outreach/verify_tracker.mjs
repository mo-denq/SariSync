import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const outputDir = "C:/Users/Yasmien/OneDrive - sdca.edu.ph/Documents/Digital Price Book/.codex-artifacts/client-outreach/outputs";
const workbookPath = `${outputDir}/Lead and Follow-up Tracker.xlsx`;
const previewPath = `${outputDir}/Lead Tracker Preview.png`;

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const sheetName = "Lead Tracker";

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 12000,
  tableMaxRows: 12,
  tableMaxCols: 18,
  tableMaxCellChars: 120,
});
console.log(summary.ndjson);

const formulas = await workbook.inspect({
  kind: "formula",
  sheetId: sheetName,
  range: "A1:AD120",
  maxChars: 12000,
  options: { maxResults: 100 },
});
console.log(formulas.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
  maxChars: 8000,
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName,
  autoCrop: "all",
  scale: 1.2,
  format: "png",
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
console.log(previewPath);
