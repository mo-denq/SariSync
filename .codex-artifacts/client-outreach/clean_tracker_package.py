from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZIP_DEFLATED, ZipFile
import re
import xml.etree.ElementTree as ET


WORKBOOK_PATH = Path(
    r"C:\Users\Yasmien\OneDrive - sdca.edu.ph\Documents\Digital Price Book\.codex-artifacts\client-outreach\outputs\Lead and Follow-up Tracker.xlsx"
)

MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
ET.register_namespace("x", MAIN)
ET.register_namespace("r", REL)
NS = {"x": MAIN}

allowed_formulas = {"H6", "K6", "L6", "M6", "N6", "O6", "P6", "Q6"}
legacy_conditional_ranges = {"E10:E39", "F10:F39", "K10:AD39"}


with ZipFile(WORKBOOK_PATH, "r") as archive:
    entries = {name: archive.read(name) for name in archive.namelist()}

sheet_root = ET.fromstring(entries["xl/worksheets/sheet1.xml"])
removed_formulas = []
for cell in sheet_root.findall(".//x:c", NS):
    address = cell.get("r", "")
    formula = cell.find("x:f", NS)
    if formula is None or address in allowed_formulas:
        continue
    cell.remove(formula)
    removed_formulas.append(address)
    match = re.match(r"^[A-Z]+(\d+)$", address)
    row_number = int(match.group(1)) if match else 0
    if row_number >= 10:
        value = cell.find("x:v", NS)
        if value is not None:
            cell.remove(value)

removed_conditional_ranges = []
for conditional in list(sheet_root.findall("x:conditionalFormatting", NS)):
    address = conditional.get("sqref", "")
    if address in legacy_conditional_ranges:
        sheet_root.remove(conditional)
        removed_conditional_ranges.append(address)

entries["xl/worksheets/sheet1.xml"] = ET.tostring(
    sheet_root, encoding="utf-8", xml_declaration=True
)

workbook_root = ET.fromstring(entries["xl/workbook.xml"])
for sheet in workbook_root.findall(".//x:sheet", NS):
    if sheet.get("name") == "Project Plan":
        sheet.set("name", "Lead Tracker")
calc_properties = workbook_root.find("x:calcPr", NS)
if calc_properties is None:
    calc_properties = ET.SubElement(workbook_root, f"{{{MAIN}}}calcPr")
calc_properties.set("calcMode", "auto")
calc_properties.set("fullCalcOnLoad", "1")
calc_properties.set("forceFullCalc", "1")
entries["xl/workbook.xml"] = ET.tostring(
    workbook_root, encoding="utf-8", xml_declaration=True
)

with NamedTemporaryFile(
    prefix="lead-tracker-clean-", suffix=".xlsx", dir=WORKBOOK_PATH.parent, delete=False
) as temp_file:
    temp_path = Path(temp_file.name)

try:
    with ZipFile(temp_path, "w", ZIP_DEFLATED) as archive:
        for name, data in entries.items():
            archive.writestr(name, data)
    temp_path.replace(WORKBOOK_PATH)
finally:
    if temp_path.exists():
        temp_path.unlink()

print({"removed_formulas": removed_formulas})
print({"removed_legacy_conditional_ranges": removed_conditional_ranges})
print({"worksheet_name": "Lead Tracker"})

