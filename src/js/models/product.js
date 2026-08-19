/*
  FILE: src/js/models/product.js
  PURPOSE: Defines what a SariSync product looks like and keeps product values
  consistent before the repository saves them.

  RESPONSIBILITIES:
  - List the fields used by a product record.
  - Clean text, price, and optional values in one place.
  - Keep product names uppercase for consistent searching and sorting.
  - Check the required product name, category, and retail price.

  BEGINNER NOTE:
  A "model" is a shared description of data. This file does not store the
  product list and does not connect to Supabase. The Product Repository remains
  responsible for reading and changing the current mock product array.
*/
(function initialiseProductModel() {
  const PRODUCT_FIELDS = Object.freeze([
    'id',
    'barcode',
    'name',
    'category',
    'costPrice',
    'retail',
    'previousPrice',
    'wholesale',
    'bottleDeposit',
    'notes',
    'unit',
    'tone',
    'updated',
    'updatedAt',
    'updatedBy',
    'change',
    'direction',
    'isActive'
  ]);

  function cleanText(value) {
    return String(value ?? '').trim();
  }

  function optionalNumber(value) {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function numberOrZero(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function normalize(productValues = {}) {
    return {
      ...productValues,
      barcode: cleanText(productValues.barcode),
      name: cleanText(productValues.name).toUpperCase(),
      category: cleanText(productValues.category) ||
        window.SariSyncConstants.DEFAULT_PRODUCT_CATEGORY,
      costPrice: numberOrZero(productValues.costPrice),
      retail: optionalNumber(productValues.retail),
      wholesale: optionalNumber(productValues.wholesale),
      bottleDeposit: numberOrZero(productValues.bottleDeposit),
      notes: cleanText(productValues.notes)
    };
  }

  function validate(productValues = {}) {
    const product = normalize(productValues);
    const errors = [];

    if (!product.name) errors.push('Product name is required.');
    if (!product.category) errors.push('Category is required.');
    if (product.retail === null) errors.push('Retail price is required.');

    [
      ['Cost price', product.costPrice],
      ['Retail price', product.retail],
      ['Wholesale price', product.wholesale],
      ['Bottle deposit', product.bottleDeposit]
    ].forEach(([label, value]) => {
      if (value !== null && value < 0) {
        errors.push(`${label} cannot be negative.`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      product
    };
  }

  function requireValid(productValues) {
    const result = validate(productValues);
    if (!result.isValid) {
      throw new Error(result.errors[0]);
    }
    return result.product;
  }

  window.SariSyncProductModel = {
    PRODUCT_FIELDS,
    normalize,
    validate,
    requireValid
  };
})();
