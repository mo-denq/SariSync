/*
  FILE: src/js/pages/add-product.js
  PURPOSE: Controls the Add Product page shown inside the shared app shell.

  RESPONSIBILITIES:
  - Hides the Home dashboard and opens the shared secondary-page area.
  - Renders the Add Product heading and the shared product form.
  - Connects the page's Back button to Home.
  - Starts the existing form and barcode-scanning behavior.

  The reusable fields and save behavior come from components/product-form.js.
*/
(function initialiseAddProductPage() {
  function render(context) {
    if (!context) return;

    const {
      screen,
      homePage,
      setHomeHeader,
      categories,
      activeDeviceName,
      onSaved
    } = context;

    setHomeHeader(false);
    homePage.hidden = true;
    screen.hidden = false;

    window.SariSyncPageHeader.mount(screen, {
      kicker: 'NEW PRODUCT',
      title: 'Add a product',
      description: 'Save a new item to the shared price book.',
      backTarget: 'Home'
    });
    window.SariSyncProductForm.mount(screen, {
      categories,
      activeDeviceName,
      onSaved
    });
  }

  window.SariSyncAddProduct = { render };
})();
