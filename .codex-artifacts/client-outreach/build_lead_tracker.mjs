import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const reference = "C:/Users/Yasmien/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-project-tracker/assets/reference.xlsx";
const outputDir = "C:/Users/Yasmien/OneDrive - sdca.edu.ph/Documents/Digital Price Book/.codex-artifacts/client-outreach/outputs";
const outputPath = `${outputDir}/Lead and Follow-up Tracker.xlsx`;
const previewPath = `${outputDir}/Lead Tracker Preview.png`;
const guidePreviewPath = `${outputDir}/Lead Tracker Instructions Preview.png`;

await fs.mkdir(outputDir, { recursive: true });
const input = await FileBlob.load(reference);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("Project Plan");

sheet.showGridLines = false;
sheet.deleteAllDrawings();
sheet.freezePanes.unfreeze();
for (const address of ["B10:B39", "D10:D39", "E10:E39", "F10:F39"]) {
  sheet.getRange(address).dataValidation.clear();
}
for (const address of [
  "B8:I8", "K8:AD8", "B41:AD42", "S6:V6", "W5:Z5", "W6:Z6",
  "AA5:AD5", "AA6:AD6", "C6:E6", "H6:I6", "K5:N5", "K6:N6",
  "O5:R5", "O6:R6", "F6:G6", "B2:R2", "S2:AD2", "B4:I4",
  "K4:AD4", "C5:E5", "H5:I5", "S5:V5", "F5:G5",
]) {
  sheet.unmergeCells(address);
}
sheet.getRange("A1:AD200").clear({ applyTo: "all" });
const blankCells = Array.from({ length: 200 }, () => Array(30).fill(null));
sheet.getRange("A1:AD200").formulas = blankCells;
sheet.getRange("A1:AD200").values = blankCells;
sheet.getRange("A1:AD200").conditionalFormats.deleteAll();
for (const address of ["E10:E39", "F10:F39", "K10:AD39"]) {
  sheet.getRange(address).conditionalFormats.deleteAll();
}
for (const [address, rows, columns] of [
  ["L9:AD9", 1, 19],
  ["I10:I39", 30, 1],
  ["K10:T19", 10, 10],
  ["U10:AD19", 10, 10],
  ["K20:T29", 10, 10],
  ["U20:AD29", 10, 10],
  ["K30:T39", 10, 10],
  ["U30:AD39", 10, 10],
]) {
  const range = sheet.getRange(address);
  range.clear({ applyTo: "contents" });
  range.formulas = Array.from({ length: rows }, () => Array(columns).fill(""));
}

const PURPLE = "#3F3296";
const LIGHT_PURPLE = "#F2EDFF";
const PALE_PURPLE = "#FAF8FF";
const BORDER = "#D9E0E6";
const TEXT = "#17212B";
const INPUT = "#FFF2CC";
const INPUT_BORDER = "#D6C26E";
const BLUE = "#0432FF";
const WHITE = "#FFFFFF";
const GREEN_FILL = "#DDF8F3";
const GREEN_TEXT = "#087E5D";
const AMBER_FILL = "#FFF3CD";
const AMBER_TEXT = "#8A5A00";
const RED_FILL = "#FFE3EA";
const RED_TEXT = "#C23647";
const GRAY_FILL = "#EEF1F4";
const GRAY_TEXT = "#58616B";

const font = { name: "Arial", size: 9, color: TEXT };
sheet.getRange("A1:Q120").format = { fill: WHITE, font };

sheet.mergeCells("B2:Q2");
sheet.getRange("B2").values = [["Lead and Follow-up Tracker"]];
sheet.getRange("B2:Q2").format = {
  fill: PURPLE,
  font: { name: "Arial", size: 15, bold: true, color: WHITE },
  horizontalAlignment: "left",
  verticalAlignment: "center",
};
sheet.getRange("B2:Q2").format.rowHeight = 34;

sheet.mergeCells("B4:I4");
sheet.mergeCells("K4:Q4");
sheet.getRange("B4").values = [["OUTREACH PROFILE"]];
sheet.getRange("K4").values = [["PIPELINE SUMMARY"]];
for (const address of ["B4:I4", "K4:Q4"]) {
  sheet.getRange(address).format = {
    fill: LIGHT_PURPLE,
    font: { name: "Arial", size: 10, bold: true, color: PURPLE },
    horizontalAlignment: "left",
    verticalAlignment: "center",
  };
}

sheet.mergeCells("C5:F5");
sheet.mergeCells("H5:I5");
sheet.mergeCells("C6:F6");
sheet.mergeCells("H6:I6");
sheet.getRange("B5:I6").values = [
  ["Workspace", "Client Outreach", null, null, null, "Developer", "CJ Sacdalan", null],
  ["Purpose", "Track leads, messages, replies, and follow-ups", null, null, null, "Last Updated", null, null],
];
sheet.getRange("H6").formulas = [["=TODAY()"]];
for (const address of ["B5", "G5", "B6", "G6"]) {
  sheet.getRange(address).format = {
    fill: WHITE,
    font: { name: "Arial", size: 9, bold: true, color: PURPLE },
    borders: { preset: "all", style: "thin", color: BORDER },
    wrapText: true,
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
}
for (const address of ["C5:F5", "H5:I5", "C6:F6", "H6:I6"]) {
  sheet.getRange(address).format = {
    fill: INPUT,
    font: { name: "Arial", size: 9, color: BLUE },
    borders: { preset: "all", style: "thin", color: INPUT_BORDER },
    wrapText: true,
    horizontalAlignment: "left",
    verticalAlignment: "center",
  };
}
sheet.getRange("H6:I6").format.numberFormat = "yyyy-mm-dd";

const metricLabels = [[
  "TOTAL LEADS",
  "CONTACTED",
  "REPLIED",
  "INTERESTED",
  "HANDOFF",
  "FOLLOW UP DUE",
  "DO NOT CONTACT",
]];
sheet.getRange("K5:Q5").values = metricLabels;
sheet.getRange("K5:Q5").format = {
  fill: WHITE,
  font: { name: "Arial", size: 8, bold: true, color: PURPLE },
  borders: { preset: "all", style: "thin", color: BORDER },
  wrapText: true,
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sheet.getRange("K6:Q6").formulas = [[
  "=COUNTA($C$10:$C$109)",
  "=COUNTIF($L$10:$L$109,\"Contacted\")",
  "=COUNTIF($L$10:$L$109,\"Replied\")",
  "=COUNTIF($L$10:$L$109,\"Interested\")",
  "=COUNTIF($L$10:$L$109,\"Handed to Developer\")",
  "=COUNTIFS($N$10:$N$109,\"<=\"&TODAY(),$N$10:$N$109,\">0\",$P$10:$P$109,\"<>Yes\")",
  "=COUNTIF($P$10:$P$109,\"Yes\")",
]];
sheet.getRange("K6:Q6").format = {
  fill: PALE_PURPLE,
  font: { name: "Arial", size: 12, bold: true, color: PURPLE },
  borders: { preset: "all", style: "thin", color: BORDER },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sheet.getRange("K6:Q6").format.numberFormat = "0";

sheet.mergeCells("B7:Q7");
sheet.getRange("B7").values = [["Add one business per row. Use only public business contact details, personalize every message, and mark opt-outs immediately."]];
sheet.getRange("B7:Q7").format = {
  fill: WHITE,
  font: { name: "Arial", size: 8, italic: true, color: GRAY_TEXT },
  horizontalAlignment: "left",
  verticalAlignment: "center",
};

sheet.mergeCells("B8:Q8");
sheet.getRange("B8").values = [["LEAD AND FOLLOW-UP LOG"]];
sheet.getRange("B8:Q8").format = {
  fill: LIGHT_PURPLE,
  font: { name: "Arial", size: 10, bold: true, color: PURPLE },
  horizontalAlignment: "left",
  verticalAlignment: "center",
};

const headers = [[
  "Date Added",
  "Business Name",
  "Industry",
  "Location",
  "Website or Social",
  "Contact Person",
  "Business Contact",
  "Source URL",
  "Opportunity Observed",
  "Fit",
  "Status",
  "Last Contact",
  "Next Follow Up",
  "Next Action",
  "Do Not Contact",
  "Notes",
]];
sheet.getRange("B9:Q9").values = headers;
sheet.getRange("B9:Q9").format = {
  fill: PURPLE,
  font: { name: "Arial", size: 9, bold: true, color: WHITE },
  borders: { preset: "all", style: "thin", color: BORDER },
  wrapText: true,
  horizontalAlignment: "center",
  verticalAlignment: "center",
};

sheet.getRange("B10:Q109").format = {
  fill: PALE_PURPLE,
  font: { name: "Arial", size: 9, color: TEXT },
  borders: { preset: "all", style: "thin", color: BORDER },
  wrapText: true,
  horizontalAlignment: "left",
  verticalAlignment: "center",
};
sheet.getRange("B10:B109").format.numberFormat = "yyyy-mm-dd";
sheet.getRange("M10:N109").format.numberFormat = "yyyy-mm-dd";
sheet.getRange("K10:K109").format.horizontalAlignment = "center";
sheet.getRange("L10:L109").format.horizontalAlignment = "center";
sheet.getRange("P10:P109").format.horizontalAlignment = "center";

let table;
try {
  table = sheet.tables.add("B9:Q109", true, "LeadTrackerTable");
  table.style = "TableStyleMedium4";
  table.showBandedColumns = false;
  table.showTotals = false;
  table.showFilterButton = true;
  // Reapply the intended header/body colors after the table style is attached.
  sheet.getRange("B9:Q9").format = {
    fill: PURPLE,
    font: { name: "Arial", size: 9, bold: true, color: WHITE },
    borders: { preset: "all", style: "thin", color: BORDER },
    wrapText: true,
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  sheet.getRange("B10:Q109").format = {
    fill: PALE_PURPLE,
    font: { name: "Arial", size: 9, color: TEXT },
    borders: { preset: "all", style: "thin", color: BORDER },
    wrapText: true,
    horizontalAlignment: "left",
    verticalAlignment: "center",
  };
  sheet.getRange("B10:B109").format.numberFormat = "yyyy-mm-dd";
  sheet.getRange("M10:N109").format.numberFormat = "yyyy-mm-dd";
  sheet.getRange("K10:K109").format.horizontalAlignment = "center";
  sheet.getRange("L10:L109").format.horizontalAlignment = "center";
  sheet.getRange("P10:P109").format.horizontalAlignment = "center";
} catch (error) {
  console.warn(`Table creation was skipped: ${error.message}`);
}

sheet.getRange("K10:K109").dataValidation = {
  rule: { type: "list", values: ["High", "Medium", "Low"] },
};
sheet.getRange("L10:L109").dataValidation = {
  rule: {
    type: "list",
    values: [
      "New",
      "Researching",
      "Draft Ready",
      "Contacted",
      "Replied",
      "Interested",
      "Not Interested",
      "Handed to Developer",
      "Closed Won",
      "Closed Lost",
    ],
  },
};
sheet.getRange("P10:P109").dataValidation = {
  rule: { type: "list", values: ["No", "Yes"] },
};

const fitRange = sheet.getRange("K10:K109");
fitRange.conditionalFormats.deleteAll();
fitRange.conditionalFormats.addCustom('=$K10="High"', { fill: GREEN_FILL, font: { color: GREEN_TEXT, bold: true } });
fitRange.conditionalFormats.addCustom('=$K10="Medium"', { fill: AMBER_FILL, font: { color: AMBER_TEXT, bold: true } });
fitRange.conditionalFormats.addCustom('=$K10="Low"', { fill: GRAY_FILL, font: { color: GRAY_TEXT, bold: true } });

const statusRange = sheet.getRange("L10:L109");
statusRange.conditionalFormats.deleteAll();
statusRange.conditionalFormats.addCustom('=OR($L10="Interested",$L10="Closed Won")', { fill: GREEN_FILL, font: { color: GREEN_TEXT, bold: true } });
statusRange.conditionalFormats.addCustom('=OR($L10="Contacted",$L10="Replied",$L10="Handed to Developer")', { fill: LIGHT_PURPLE, font: { color: PURPLE, bold: true } });
statusRange.conditionalFormats.addCustom('=OR($L10="Not Interested",$L10="Closed Lost")', { fill: GRAY_FILL, font: { color: GRAY_TEXT, bold: true } });

const followUpRange = sheet.getRange("N10:N109");
followUpRange.conditionalFormats.deleteAll();
followUpRange.conditionalFormats.addCustom('=AND($C10<>"",$N10<>"",$N10<TODAY(),$P10<>"Yes",$L10<>"Not Interested",$L10<>"Closed Won",$L10<>"Closed Lost")', { fill: RED_FILL, font: { color: RED_TEXT, bold: true } });

const dncRange = sheet.getRange("P10:P109");
dncRange.conditionalFormats.deleteAll();
dncRange.conditionalFormats.addCustom('=$P10="Yes"', { fill: RED_FILL, font: { color: RED_TEXT, bold: true } });

const widths = {
  B: 12, C: 24, D: 16, E: 18, F: 27, G: 20, H: 25, I: 29,
  J: 34, K: 10, L: 21, M: 13, N: 14, O: 23, P: 14, Q: 30,
};
for (const [column, width] of Object.entries(widths)) {
  sheet.getRange(`${column}:${column}`).format.columnWidth = width;
}
sheet.getRange("5:6").format.rowHeight = 30;
sheet.getRange("7:7").format.rowHeight = 22;
sheet.getRange("8:8").format.rowHeight = 24;
sheet.getRange("9:9").format.rowHeight = 42;
sheet.getRange("10:109").format.rowHeight = 28;

sheet.freezePanes.freezeRows(9);
sheet.freezePanes.freezeColumns(3);
sheet.tabColor = PURPLE;

const sheetName = "Project Plan";
const preview = await workbook.render({
  sheetName,
  range: "B1:Q24",
  scale: 1.2,
  format: "png",
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

const keyRanges = await workbook.inspect({
  kind: "table",
  sheetId: sheetName,
  range: "B2:Q14",
  tableMaxRows: 20,
  tableMaxCols: 20,
  tableMaxCellChars: 120,
  maxChars: 20000,
});
console.log(keyRanges.ndjson);

const formulaErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
  maxChars: 8000,
});
console.log(formulaErrors.ndjson);
console.log(outputPath);
console.log(previewPath);
