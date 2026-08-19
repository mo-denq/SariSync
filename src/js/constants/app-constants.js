/*
  FILE: src/js/constants/app-constants.js
  PURPOSE: Keeps SariSync's shared fixed values in one easy-to-find place.

  RESPONSIBILITIES:
  - Define the separate Version 1 account and active-device limits.
  - Define the Toast display duration.
  - Define the CSV column order and backup filename.
  - Define default product presentation values.
  - Define fallback store and device/user names.

  These are configuration values, not product records or Supabase data.
  Changing one of these values here updates every connected feature.
*/
(function initialiseAppConstants() {
  const csvColumns = Object.freeze([
    'Barcode',
    'Item Name',
    'Category',
    'Cost Price',
    'Retail Price',
    'Wholesale Price',
    'Bottle Deposit',
    'Notes'
  ]);

  window.SariSyncConstants = Object.freeze({
    MAX_ACTIVE_ACCOUNTS: 5,
    MAX_ACTIVE_DEVICES: 5,
    TOAST_DURATION_MS: 2600,
    CSV_BACKUP_FILENAME: 'sarisync-price-book.csv',
    CSV_COLUMNS: csvColumns,
    DEFAULT_PRODUCT_TONE: '#eee5fa',
    DEFAULT_PRODUCT_CATEGORY: 'Beverages',
    DEFAULT_STORE_NAME: 'Bahay ni Aling Rosa',
    DEFAULT_DEVICE_NAME: 'Ana Reyes'
  });
})();
