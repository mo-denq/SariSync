# Template execution contract

## Reference

- File: `C:\Users\Yasmien\.codex\plugins\cache\openai-curated-remote\openai-templates\0.1.1\skills\artifact-template-legal-memorandum\assets\reference.docx`
- SHA-256: `D3006F9074E46823D103FE283BE19901F55F75C19811558455D7A16C61797355`
- Render: four pages inspected from `doc-template/reference-page-1.png` through `reference-page-4.png`
- Section count: one

## Page system

- Letter, 8.5 by 11 inches, portrait
- Margins: 1 inch on every side
- Header distance: 0.5 inch
- Footer distance: 0.5 inch
- No different first page and no odd-even header behavior
- One continuous document section

## Typography and paragraph system

- Garamond is embedded and is the dominant typeface; Arial appears only in minor source metadata.
- The main title is centered, uppercase, black, bold, and substantially larger than body text.
- Metadata labels appear in bold on the left with values following on the same line.
- Section headings are centered, black, bold, and underlined.
- Body paragraphs are Garamond, black, justified, with generous line spacing and paragraph spacing.
- Lists use the source numbering definitions and hanging indents where retained.

## Recurring components

- A centered light-gray uppercase running header appears at the top of pages.
- A right-aligned PAGE field appears in the footer.
- A thin horizontal rule separates the metadata block from the body.
- No tables, drawings, content controls, footnotes, or endnotes are present.

## Content flow and slots

- Header slot: replace the confidentiality placeholder with a truthful internal-use label.
- Title slot: replace `LEGAL MEMO` with the specific document title while retaining the title treatment.
- Metadata slots: replace To, From, Date, and Re with the document owner, intended user, version date, and purpose.
- Body slots: replace Background, Analysis, and Conclusion with plain internal-reference sections appropriate to the requested document.
- Existing body paragraphs are editable content slots. They may be cleared or repurposed because all source body text is placeholder or lorem ipsum.
- The footer PAGE field and its relationship are preserve-only.

## Package preservation

- Preserve `[Content_Types].xml`, package relationships, embedded fonts, font table, theme, numbering, settings, header/footer relationships, and the footer PAGE field.
- Editable parts: `word/document.xml` and the visible header text in `word/header1.xml`.
- Preserve-only assets include four Garamond font files, two Play font files, `word/theme/theme1.xml`, and relationship parts.

## Fidelity gates

- Keep Letter page geometry, one-inch margins, Garamond typography, centered title, metadata block, centered underlined headings, light-gray running header, and right-aligned page numbers.
- Every final page must be rendered and inspected for clipping, overlap, awkward page breaks, and placeholder text.
- The retained reference must remain unchanged and match the recorded SHA-256 before delivery.
