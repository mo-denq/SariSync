import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const reference = "C:/Users/Yasmien/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-project-tracker/assets/reference.xlsx";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(reference));
const sheet = workbook.worksheets.getItem("Project Plan");
const validation = sheet.getRange("B10:B39").dataValidation;
console.log("range.validation", validation);
console.log("range.validation.proto", validation ? Object.getOwnPropertyNames(Object.getPrototypeOf(validation)) : []);
console.log("sheet.dataValidations.keys", Object.keys(sheet.dataValidations ?? {}));
console.log("sheet.dataValidations.proto", Object.getOwnPropertyNames(Object.getPrototypeOf(sheet.dataValidations)));
