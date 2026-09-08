/*
  FILE: src/js/pages/product-details.js
  PURPOSE: Product Details and Price Lookup page controller.

  RESPONSIBILITIES:
  - Show the selected product's current retail price prominently.
  - Show cost, wholesale price, bottle deposit, barcode, and optional notes.
  - Show who last updated the product and when it was updated.
  - Display the shared Edit Price or Details action.
  - Use the shared Page Header component.

  The selected product and active device name come from state/store.js. The
  actual edit form remains in the shared product workflow.
*/
(function initialiseProductDetailsPage() {
  function render(context) {
    if (!context) return;

    const {
      screen,
      homePage,
      peso,
      setHomeHeader
    } = context;
    const product = window.SariSyncState.getSelectedProduct();
    const activeDeviceName = window.SariSyncState.getActiveDeviceName();

    if (!product) return;

    setHomeHeader(false);
    homePage.hidden = true;
    screen.hidden = false;

    window.SariSyncPageHeader.mount(screen, {
      kicker: 'PRICE LOOKUP',
      title: product.name,
      description: product.category,
      backTarget: 'Home',
      onBack: context.onBack
    });
    screen.insertAdjacentHTML('beforeend', `
      <div class="price-panel">
        <small>RETAIL PRICE</small>
        <strong>${peso(product.retail)}</strong>
      </div>

      <div class="detail-facts">
        <div class="detail-fact">
          <span>COST PRICE</span>
          <strong>${product.costPrice ? peso(product.costPrice) : 'Not set'}</strong>
        </div>
        <div class="detail-fact">
          <span>WHOLESALE PRICE</span>
          <strong>${product.wholesale ? peso(product.wholesale) : 'Not set'}</strong>
        </div>
        <div class="detail-fact">
          <span>BOTTLE DEPOSIT</span>
          <strong>${product.bottleDeposit ? peso(product.bottleDeposit) : 'None'}</strong>
        </div>
        <div class="detail-fact full">
          <span>BARCODE</span>
          <strong>${product.barcode || 'Not yet scanned'}</strong>
        </div>
        ${product.notes ? `
          <div class="detail-fact full">
            <span>NOTES</span>
            <strong>${product.notes}</strong>
          </div>
        ` : ''}
      </div>

      <div class="last-updated">
        Last updated <b>${product.updated}</b> by
        <b>${product.updatedBy || activeDeviceName}</b>
      </div>

      <button class="edit-button" id="editProduct" type="button">
        Edit price or details
      </button>`);
  }

  window.SariSyncProductDetails = { render };
})();
