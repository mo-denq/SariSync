/*
  FILE: src/js/services/search-service.js
  PURPOSE: Provides consistent product searching and category filtering for
  every SariSync screen.

  RESPONSIBILITIES:
  - Search product names using partial, case-insensitive matching.
  - Search category names using partial, case-insensitive matching.
  - Search barcode text using partial, case-insensitive matching.
  - Find one exact barcode after a camera scan.
  - Filter products to one selected category.
  - Apply an optional result limit without changing the original product list.

  Product data still comes from product-repository.js or a page's cached list.
  This service only searches the list it receives and does not save data.
*/
(function initialiseSearchService() {
  function normalize(value) {
    return String(value ?? '').trim().toUpperCase();
  }

  function normalizeCategory(value) {
    return window.SariSyncCategoryModel.normalizeName(value);
  }

  function searchProducts(products, query, options = {}) {
    const {
      fields = ['name', 'category', 'barcode'],
      limit = null
    } = options;
    const term = normalize(query);

    const matches = term
      ? products.filter(product =>
          fields.some(field => normalize(product[field]).includes(term))
        )
      : [...products];

    return Number.isInteger(limit) && limit >= 0
      ? matches.slice(0, limit)
      : matches;
  }

  function searchByName(products, query, limit = null) {
    return searchProducts(products, query, { fields: ['name'], limit });
  }

  function searchByCategory(products, query, limit = null) {
    return searchProducts(products, query, { fields: ['category'], limit });
  }

  function searchByBarcode(products, query, limit = null) {
    return searchProducts(products, query, { fields: ['barcode'], limit });
  }

  function filterByCategory(products, category, allValue = 'All') {
    const selectedCategory = normalizeCategory(category);
    if (!selectedCategory || selectedCategory === normalizeCategory(allValue)) {
      return [...products];
    }

    return products.filter(product =>
      window.SariSyncCategoryModel.matches(
        product.category,
        selectedCategory
      )
    );
  }

  function findByBarcode(products, barcode) {
    const expectedBarcode = normalize(barcode);
    if (!expectedBarcode) return null;

    return products.find(product =>
      normalize(product.barcode) === expectedBarcode
    ) || null;
  }

  window.SariSyncSearchService = {
    searchProducts,
    searchByName,
    searchByCategory,
    searchByBarcode,
    filterByCategory,
    findByBarcode
  };
})();
