/*
  FILE: src/js/state/store.js
  PURPOSE: Keeps SariSync's current session information in one shared place
  while the application is open.

  RESPONSIBILITIES:
  - Read the existing sariSyncSession through the shared storage adapter.
  - Store the current login session.
  - Provide the active physical-store name.
  - Provide the current device/user display name.
  - Remember which product the user most recently selected.

  IMPORTANT:
  "State store" means the app's temporary memory. It is not the sari-sari
  store and it is not the Supabase stores table. Product-list management stays
  in repositories/product-repository.js.
*/
(function initialiseAppState() {
  const { titleCase, formatStoreName } = window.SariSyncUtils;
  const storage = window.SariSyncLocalStorage;

  function readSavedSession() {
    return storage.readJson(storage.KEYS.SESSION, null);
  }

  const state = {
    session: readSavedSession(),
    selectedProduct: null
  };

  function getSession() {
    return state.session;
  }

  function getActiveStoreName() {
    return formatStoreName(
      state.session?.storeName || window.SariSyncConstants.DEFAULT_STORE_NAME
    );
  }

  function getActiveDeviceName() {
    return titleCase(
      state.session?.deviceName || window.SariSyncConstants.DEFAULT_DEVICE_NAME
    );
  }

  function getSelectedProduct() {
    return state.selectedProduct;
  }

  function setSelectedProduct(product) {
    state.selectedProduct = product || null;
    return state.selectedProduct;
  }

  window.SariSyncState = {
    getSession,
    getActiveStoreName,
    getActiveDeviceName,
    getSelectedProduct,
    setSelectedProduct
  };
})();
