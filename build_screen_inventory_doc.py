# FILE: build_screen_inventory_doc.py | FOLDER: project root
# PURPOSE: Generates the screen-inventory document used to record each SariSync
# view, its purpose, entry/exit points, controls, and implementation status.
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = "SariSync_Phase_3_Screen_Inventory.docx"
BLUE, DARK, LIGHT = "2E74B5", "1F4D78", "E8EEF5"

def shade(cell):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd"); shd.set(qn("w:fill"), LIGHT); tcPr.append(shd)

def label(doc, name, value):
    p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(4)
    r = p.add_run(name + ": "); r.bold = True; r.font.color.rgb = RGBColor.from_string(DARK)
    p.add_run(value)

def screen(doc, name, purpose, entry, next_steps, back):
    doc.add_heading(name, level=2)
    label(doc, "Purpose", purpose)
    label(doc, "Where the user enters", entry)
    label(doc, "Where the user can go next", next_steps)
    label(doc, "Back button behavior", back)

doc = Document()
section = doc.sections[0]
section.top_margin = section.bottom_margin = section.left_margin = section.right_margin = Inches(1)
section.header_distance = section.footer_distance = Inches(.492)
normal = doc.styles["Normal"]; normal.font.name = "Calibri"; normal.font.size = Pt(11)
normal.paragraph_format.space_after = Pt(6); normal.paragraph_format.line_spacing = 1.25
for name, size, color, before, after in [("Heading 1",16,BLUE,18,10), ("Heading 2",13,BLUE,14,7)]:
    s = doc.styles[name]; s.font.name = "Calibri"; s.font.size = Pt(size); s.font.bold = True
    s.font.color.rgb = RGBColor.from_string(color); s.paragraph_format.space_before = Pt(before); s.paragraph_format.space_after = Pt(after)

p = doc.add_paragraph(); r = p.add_run("SariSync Phase 3"); r.bold = True; r.font.size = Pt(26); r.font.color.rgb = RGBColor.from_string(DARK)
p = doc.add_paragraph(); r = p.add_run("Screen Inventory"); r.font.size = Pt(16); r.font.color.rgb = RGBColor.from_string(BLUE)
doc.add_paragraph("A reference for the purpose, entry point, next destinations, and back behavior of every Version 1 screen.")

doc.add_heading("Navigation rules", 1)
for text in [
    "Home is the main daily-use screen.",
    "Home keeps the branded header and shared bottom navigation.",
    "Secondary screens do not repeat the branded Home header.",
    "The back arrow returns to the screen that opened the current screen.",
    "Saving a product change returns to the relevant context and refreshes Price Pulse.",
    "Bottom-navigation tabs switch destinations without duplicating the app shell."
]: doc.add_paragraph(text, style="List Bullet")

screens = [
("Login", "Sign in to an existing store account.", "App launch, signed-out session, or expired session.", "Home after sign-in; Register Store; Join Store.", "Exit authentication or close the page if supported."),
("Register Store", "Create a new store account and owner profile.", "Login -> Create/Register Store.", "Device Setup after registration; Login if cancelled.", "Return to Login without creating the account."),
("Join Store", "Let a family member join using a store code.", "Login -> Join Existing Store.", "Device Setup after a valid code; Login if cancelled.", "Return to Login without joining."),
("Device Setup", "Record the device user's nickname.", "After Register Store or Join Store.", "Home after setup; previous account step for corrections.", "Return to the previous registration or join step."),
("Home", "Daily dashboard for lookup, scanning, Price Pulse, quick actions, and category preview.", "Successful login/setup, Home tab, or app launch with an active session.", "Product Lookup; Update Price; Add Product; Browse; Updates; Settings; Category Products.", "No back button is required. Home is the root destination."),
("Browse", "Browse the complete price book, filter categories, and choose products to edit.", "Bottom navigation Browse or Home -> Categories -> View All.", "Category Products; Edit Item Details; Product Lookup; Home.", "Return to the previous screen, normally Home."),
("Updates", "Show recent changes, updater names, timestamps, and differences.", "Bottom navigation Updates or Home -> Price Pulse -> View All.", "Product Lookup; Edit Item Details; Home.", "Return to the previous screen, normally Home."),
("Settings", "Manage store controls, profile, import/export, device access, categories, and sync.", "Bottom navigation Settings.", "Profile; Import Price List; Export Backup; Category Management; Home.", "Return to the previous screen, normally Home."),
("Profile", "View and edit name, mobile, email, photo, and device nickname.", "Home avatar or Settings -> Manage Profile.", "Settings when opened from Settings; Home when opened from the avatar.", "Return to the screen that opened Profile."),
("Product Lookup", "Display current retail, optional wholesale, costs, deposits, notes, barcode, and last update.", "Home search result, barcode match, Price Pulse card, or Browse selection.", "Edit Item Details; previous list; Home.", "Return to the screen that opened the lookup."),
("Update Price", "Find an existing product before editing its price.", "Home -> Update Price quick action.", "Edit Item Details after product selection; Home if cancelled.", "Return to Home or the previous product list."),
("Edit Item Details", "Edit an existing name, category, prices, barcode, deposit, notes, or photo.", "Update Price -> Select Product; Browse -> Select Product; Product Lookup -> Edit.", "Product Lookup or Browse after save; Price Pulse refreshes after a price change.", "Discard unsaved changes and return to the opening screen."),
("Add Product", "Create a new product record.", "Home -> Add Product, floating Add button, or empty-state action.", "Home or Browse after save; barcode scanner during entry.", "Discard unsaved fields and return to the previous screen."),
("Import Price List", "Prepare and validate a CSV before adding products.", "Settings -> Store Management -> Import Price List.", "Validation result; corrected import; Settings after cancel or completion.", "Cancel import and return to Settings without changing products."),
("Export Backup", "Generate and download a CSV backup.", "Settings -> Store Management -> Export Backup.", "Download confirmation; Settings.", "Return to Settings without changing product data."),
("Category Products", "Show products in one category and allow category search.", "Home category card or Browse category filter.", "Product Lookup; Edit Item Details; Browse; Home.", "Return to Browse from Browse, or Home from a Home category card.")
]
doc.add_heading("Screen inventory", 1)
for item in screens: screen(doc, *item)

doc.add_heading("Important implementation decisions", 1)
doc.add_heading("Product Lookup versus Edit Item Details", 2)
doc.add_paragraph("Product Lookup is for reading price information. Edit Item Details is for changing information. A user should not accidentally edit a price just by looking up a product.")
doc.add_heading("Update Price versus Add Product", 2)
doc.add_paragraph("Update Price starts with an existing product search. Add Product starts with an empty form. They remain separate so users do not create duplicates accidentally.")
doc.add_heading("Back behavior", 2)
doc.add_paragraph("Back should preserve context whenever possible. Returning from Category Products should restore the selected category, and returning from Edit Item Details should return to the product or list that opened it.")
doc.add_heading("Completion checklist", 1)
for text in [
    "Every screen has a clear purpose.",
    "Every screen has a valid entry path.",
    "Every screen has a documented next destination.",
    "Every secondary screen has a back behavior.",
    "Save, cancel, empty, validation, and offline states are documented where applicable.",
    "The inventory matches the Version 1 user-flow diagrams."
]: doc.add_paragraph(text, style="List Bullet")
doc.save(OUT)
print(OUT)
