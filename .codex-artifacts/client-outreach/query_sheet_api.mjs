import { Workbook } from "@oai/artifact-tool";
const workbook = Workbook.create();
console.log(workbook.help("worksheet.name", { include: "index,examples,notes", maxChars: 3000 }).ndjson);
console.log(workbook.help("worksheet.delete", { include: "index,examples,notes", maxChars: 3000 }).ndjson);
