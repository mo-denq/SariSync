import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const reference = "C:/Users/Yasmien/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-project-tracker/assets/reference.xlsx";
const outputDir = "C:/Users/Yasmien/OneDrive - sdca.edu.ph/Documents/Digital Price Book/.codex-artifacts/client-outreach/sheet-template";

await fs.mkdir(outputDir, { recursive: true });
const input = await FileBlob.load(reference);
const workbook = await SpreadsheetFile.importXlsx(input);
const summary = await workbook.inspect({
  kind: "workbook,sheet,table,definedName,drawing",
  maxChars: 12000,
  tableMaxRows: 8,
  tableMaxCols: 12,
  tableMaxCellChars: 100,
});
console.log(summary.ndjson);

const sheetSummary = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 4000 });
console.log(sheetSummary.ndjson);
for (const table of workbook.worksheets.getItem("Project Plan").tables.items) {
  console.log("TABLE META", JSON.stringify({ name: table.name, style: table.style, showHeaders: table.showHeaders, showTotals: table.showTotals, showBandedColumns: table.showBandedColumns, showFilterButton: table.showFilterButton }));
}

for (const range of ["B2:AD2", "B4:I6", "K4:AD6", "B8:AD9", "B10:I14"]) {
  const style = await workbook.inspect({ kind: "computedStyle", sheetId: "Project Plan", range, maxChars: 5000 });
  console.log(`STYLE ${range}`);
  console.log(style.ndjson);
}

const formulas = await workbook.inspect({ kind: "formula", sheetId: "Project Plan", range: "A1:AD42", maxChars: 10000, options: { maxResults: 100 } });
console.log("FORMULAS");
console.log(formulas.ndjson);

for (const name of ["Project Plan"]) {
  try {
    const preview = await workbook.render({ sheetName: name, autoCrop: "all", scale: 1.25, format: "png" });
    await fs.writeFile(`${outputDir}/${name}.png`, new Uint8Array(await preview.arrayBuffer()));
  } catch (error) {
    console.error(`Render ${name} failed: ${error.message}`);
  }
}
