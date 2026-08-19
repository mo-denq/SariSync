/*
  FILE: src/js/components/product-card.js
  PURPOSE: Renders the repeated product marks and product-row layouts used
  across SariSync.

  RESPONSIBILITIES:
  - Render the small visual product mark.
  - Render Browse and Update Price product rows.
  - Render Home search-result rows.
  - Render the complete Updates-page rows.
  - Preserve the data-product or data-edit-product click attributes requested
    by each page.

  This component only creates display markup. Searching, filtering, selecting,
  and editing products remain the responsibility of their pages.
*/
(function initialiseProductCardComponent() {
  function mark(product) {
    return `
      <span class="product-mark" style="background:${product.tone || '#eef0ed'}" aria-hidden="true">
        <i></i><i></i><i></i>
      </span>
    `;
  }

  function browseRows(products, options) {
    const {
      peso,
      emptyText = 'No products are in this category yet.',
      action = 'product'
    } = options;
    const dataAttribute = action === 'edit'
      ? 'data-edit-product'
      : 'data-product';

    if (!products.length) {
      return `<div class="last-updated">${emptyText}</div>`;
    }

    return products.map(product => `
      <button class="browse-row" ${dataAttribute}="${product.id}" type="button">
        ${mark(product)}
        <span>
          <strong>${product.name}</strong>
          <small>${product.category}</small>
        </span>
        <span class="browse-price">${peso(product.retail)}</span>
      </button>
    `).join('');
  }

  function searchRows(products, options) {
    const {
      peso,
      emptyText = 'No products found. Try another word.'
    } = options;

    if (!products.length) {
      return `<div class="result-row"><span>${emptyText}</span></div>`;
    }

    return products.map(product => `
      <button class="result-row" data-product="${product.id}" type="button">
        ${mark(product)}
        <span>
          <strong>${product.name}</strong>
          <small>${product.category}</small>
        </span>
        <span class="result-price">${peso(product.retail)}</span>
      </button>
    `).join('');
  }

  function updateRows(products, options) {
    const { activeDeviceName, peso } = options;

    return products.map(product => `
      <button class="update-row" data-product="${product.id}" type="button">
        ${mark(product)}
        <span>
          <strong>${product.name}</strong>
          <small>${product.updated} · Updated by ${product.updatedBy || activeDeviceName}</small>
        </span>
        <span class="price-change ${product.direction === 'down' ? 'down' : ''}">
          ${product.change}<br>
          <span class="browse-price">${peso(product.retail)}</span>
        </span>
      </button>
    `).join('');
  }

  window.SariSyncProductCard = {
    mark,
    browseRows,
    searchRows,
    updateRows
  };
})();
