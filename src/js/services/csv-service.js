/*
  FILE: src/js/services/csv-service.js
  PURPOSE: Provides the shared CSV import-selection and export-download actions
  used by Home and Settings.

  RESPONSIBILITIES:
  - Open the hidden CSV file picker.
  - Read an owner-selected CSV file and check its required columns.
  - Send valid rows to Supabase's protected CSV import function.
  - Build a correctly escaped CSV backup from the current product list.
  - Download that backup as sarisync-price-book.csv.
  - Preserve optional blank fields as empty cells instead of writing 0 or
    "undefined".

  IMPORTANT:
  Import is store-scoped. This file never decides whether someone is allowed
  to import; Supabase checks that the signed-in person is the active owner.
*/
(function initialiseCsvServiceModule() {
  let serviceContext = null;
  const REQUIRED_IMPORT_COLUMNS = ['item name', 'category', 'retail price'];

  function optionalValue(value) {
    return value === null || value === undefined || value === '' ? '' : value;
  }

  function escapeCell(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
  }

  function buildCsv(products) {
    const productRows = products.map(product => [
      optionalValue(product.barcode),
      product.name,
      product.category,
      optionalValue(product.costPrice),
      product.retail,
      optionalValue(product.wholesale),
      optionalValue(product.bottleDeposit),
      optionalValue(product.notes)
    ]);

    return [window.SariSyncConstants.CSV_COLUMNS, ...productRows]
      .map(row => row.map(escapeCell).join(','))
      .join('\n');
  }

  /* CSV files can contain commas inside quoted notes, such as
     "Buy 2, save 1". This small parser keeps those cells together without
     adding another library to the prototype. */
  function parseCsvText(csvText) {
    const rows = [];
    let row = [];
    let cell = '';
    let insideQuotes = false;

    for (let index = 0; index < csvText.length; index += 1) {
      const character = csvText[index];
      const nextCharacter = csvText[index + 1];

      if (character === '"') {
        if (insideQuotes && nextCharacter === '"') {
          cell += '"';
          index += 1;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (character === ',' && !insideQuotes) {
        row.push(cell);
        cell = '';
      } else if (character === '\n' && !insideQuotes) {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else if (character !== '\r') {
        cell += character;
      }
    }

    if (insideQuotes) {
      throw new Error('The CSV has an unfinished quoted cell. Check the file and try again.');
    }

    if (row.length || cell) {
      row.push(cell);
      rows.push(row);
    }

    return rows.filter(csvRow => csvRow.some(value => String(value).trim() !== ''));
  }

  function normaliseHeader(header) {
    return String(header || '')
      .replace(/^\uFEFF/, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function readMoney(value, label, rowNumber, required = false) {
    const rawValue = String(value ?? '').trim();

    if (!rawValue) {
      if (required) {
        throw new Error(`Row ${rowNumber}: ${label} is required.`);
      }
      return null;
    }

    const cleanedValue = rawValue.replace(/[₱,\s]/g, '');
    if (!/^\d+(\.\d+)?$/.test(cleanedValue)) {
      throw new Error(`Row ${rowNumber}: ${label} must be a valid non-negative number.`);
    }

    const amount = Number(cleanedValue);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`Row ${rowNumber}: ${label} must be a valid non-negative number.`);
    }

    return amount;
  }

  function prepareImportRows(csvText) {
    const csvRows = parseCsvText(csvText);
    if (!csvRows.length) {
      throw new Error('The CSV file is empty.');
    }

    const headers = csvRows[0].map(normaliseHeader);
    const missingColumns = REQUIRED_IMPORT_COLUMNS.filter(
      column => !headers.includes(column)
    );

    if (missingColumns.length) {
      throw new Error(`Missing required column: ${missingColumns.join(', ')}.`);
    }

    const rows = csvRows.slice(1).map((cells, index) => {
      const rowNumber = index + 2;
      const source = Object.fromEntries(headers.map((header, cellIndex) => [
        header,
        String(cells[cellIndex] ?? '').trim()
      ]));

      const itemName = source['item name'];
      const category = source.category;
      if (!itemName) throw new Error(`Row ${rowNumber}: item name is required.`);
      if (!category) throw new Error(`Row ${rowNumber}: category is required.`);

      return {
        barcode: source.barcode || '',
        'item name': itemName,
        category,
        'cost price': readMoney(source['cost price'], 'cost price', rowNumber),
        'retail price': readMoney(source['retail price'], 'retail price', rowNumber, true),
        'wholesale price': readMoney(source['wholesale price'], 'wholesale price', rowNumber),
        'bottle deposit': readMoney(source['bottle deposit'], 'bottle deposit', rowNumber),
        notes: source.notes || ''
      };
    });

    if (!rows.length) {
      throw new Error('The CSV file has column names but no product rows.');
    }

    return rows;
  }

  function pluralise(count, singular, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
  }

  function importSummaryMessage(summary) {
    const inserted = Number(summary?.inserted_count) || 0;
    const skipped = Number(summary?.skipped_duplicate_barcode_count) || 0;
    const createdCategories = Number(summary?.created_category_count) || 0;
    const parts = [];

    parts.push(inserted
      ? `Imported ${pluralise(inserted, 'product')}`
      : 'No new products imported');
    if (createdCategories) parts.push(`created ${pluralise(createdCategories, 'category', 'categories')}`);
    if (skipped) parts.push(`skipped ${pluralise(skipped, 'duplicate barcode')}`);
    return `${parts.join('. ')}.`;
  }

  // Sends the same import result to the small toast and to Settings. The
  // Settings message stays visible, so an owner can read an error after the
  // temporary toast fades away.
  function reportImportStatus(message, state = 'info') {
    window.SariSyncToast.show(message);
    document.dispatchEvent(new CustomEvent('sariSync:csv-import-status', {
      detail: { message, state }
    }));
  }

  async function importSelectedFile(selectedFile) {
    window.SariSyncOfflinePriceBook?.requireOnlineForChange?.();
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      throw new Error('Choose a CSV file (.csv) to import.');
    }

    reportImportStatus('Checking your CSV price list...');
    const importRows = prepareImportRows(await selectedFile.text());
    reportImportStatus(`Importing ${pluralise(importRows.length, 'product')}...`);

    const client = window.SariSyncAuthSession?.getClient?.();
    if (!client) {
      throw new Error('Your signed-in account is not ready. Refresh and try again.');
    }

    const { data, error } = await client.rpc(
      'import_csv_products_for_current_owner',
      { p_rows: importRows }
    );

    if (error) throw error;
    const summary = Array.isArray(data) ? data[0] : data;
    const message = importSummaryMessage(summary);
    reportImportStatus(message, 'success');
    document.dispatchEvent(new CustomEvent('sariSync:csv-imported', {
      detail: { summary, message }
    }));
    return summary;
  }

  function initialise(context) {
    serviceContext = context;

    context.importInput?.addEventListener('change', async event => {
      const selectedFile = event.target.files?.[0];
      try {
        await importSelectedFile(selectedFile);
      } catch (error) {
        const fallback = 'Unable to import that CSV file.';
        reportImportStatus(
          window.SariSyncFeedback?.messageFor(error, fallback) || fallback,
          'error'
        );
      } finally {
        // Clearing this lets the owner select the same corrected file again.
        event.target.value = '';
      }
    });
  }

  function openImportPicker() {
    serviceContext?.importInput?.click();
  }

  function exportPriceBook() {
    if (!serviceContext) return;

    const csv = buildCsv(serviceContext.products);
    const url = URL.createObjectURL(new Blob([csv], {
      type: 'text/csv;charset=utf-8'
    }));
    const downloadLink = Object.assign(document.createElement('a'), {
      href: url,
      download: window.SariSyncConstants.CSV_BACKUP_FILENAME
    });

    downloadLink.click();
    URL.revokeObjectURL(url);
    window.SariSyncToast.show('CSV backup exported');
  }

  window.SariSyncCsvService = {
    initialise,
    openImportPicker,
    exportPriceBook,
    buildCsv,
    parseCsvText,
    prepareImportRows,
    reportImportStatus
  };
})();
