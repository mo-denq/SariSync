/*
  FILE: src/js/services/product-data-service.js
  PURPOSE: Loads the signed-in family's active products and categories from
  Supabase for the browser app.

  RESPONSIBILITIES:
  - Reuse the one authenticated Supabase client from auth-session.js.
  - Ask the protected database function only for the current store's data.
  - Convert database field names into the display names used by the UI.
  - Return empty lists for a new store instead of demo products.

  SECURITY NOTE:
  This service has no service-role key and does not decide store access.
  Supabase verifies the signed-in user and their active membership.
*/
(function initialiseProductDataService() {
  const categoryThemes = {
    BEVERAGES: 'beverages',
    'CANNED GOODS': 'canned',
    'PANTRY & CONDIMENTS': 'pantry',
    'SNACKS & SWEETS': 'snacks',
    'PERSONAL CARE': 'personal-care',
    'HOUSEHOLD & GENERAL': 'household',
    'SCHOOL SUPPLIES': 'school',
    VEGETABLES: 'vegetables',
    TOBACCO: 'tobacco'
  };

  function categoryClassName(name) {
    return categoryThemes[String(name || '').trim().toUpperCase()] || 'beverages';
  }

  function displayTime(value) {
    if (!value) return 'Recently';

    const time = new Date(value);
    if (Number.isNaN(time.getTime())) return 'Recently';

    return time.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function mapCategory(category) {
    return {
      id: category.id,
      name: category.name,
      className: categoryClassName(category.name),
      displayOrder: Number(category.display_order) || 0
    };
  }

  function mapProduct(product) {
    const timestamp = product.updated_at || product.created_at;

    return {
      id: product.id,
      categoryId: product.category_id,
      barcode: product.barcode || '',
      name: product.item_name,
      category: product.category_name,
      costPrice: product.cost_price,
      retail: product.retail_price,
      wholesale: product.wholesale_price,
      bottleDeposit: product.bottle_deposit,
      notes: product.notes || '',
      tone: window.SariSyncConstants.DEFAULT_PRODUCT_TONE,
      updated: displayTime(timestamp),
      updatedAt: timestamp,
      updatedBy: product.updated_by_name || 'Store member',
      previousPrice: null,
      change: 'No change',
      direction: 'same'
    };
  }

  /*
    Converts one saved price-history row into the display shape used by the
    Price Pulse component. A price update is different from a product: it
    records the old and new values at the time somebody saved the change.
  */
  function mapPriceUpdate(update) {
    const previousRetail = update.previous_retail_price;
    const newRetail = update.new_retail_price;
    const retailDifference = previousRetail === null || previousRetail === undefined
      ? null
      : Number(newRetail) - Number(previousRetail);

    return {
      id: update.price_update_id,
      productId: update.product_id,
      name: update.product_name || 'PRODUCT',
      retail: newRetail,
      previousPrice: previousRetail,
      updated: displayTime(update.updated_at),
      updatedAt: update.updated_at,
      updatedBy: update.updated_by_name || 'Store member',
      notes: update.change_note || '',
      direction: retailDifference === null
        ? 'new'
        : retailDifference < 0
          ? 'down'
          : retailDifference > 0
            ? 'up'
            : 'same'
    };
  }

  async function loadCurrentStorePriceBook() {
    const client = window.SariSyncAuthSession?.getClient?.();
    if (!client) {
      throw new Error('Your signed-in account is not ready. Refresh and try again.');
    }

    const { data, error } = await client.rpc('get_my_active_price_book');
    if (error) throw error;

    const priceBook = Array.isArray(data) ? data[0] : data;
    return {
      categories: Array.isArray(priceBook?.categories)
        ? priceBook.categories.map(mapCategory)
        : [],
      products: Array.isArray(priceBook?.products)
        ? priceBook.products.map(mapProduct)
        : []
    };
  }

  /*
    Reads Price Pulse history through a protected database function. The
    function decides the signed-in person's store, so browser code cannot ask
    for another family's update records.
  */
  async function loadRecentPriceUpdates() {
    const client = window.SariSyncAuthSession?.getClient?.();
    if (!client) {
      throw new Error('Your signed-in account is not ready. Refresh and try again.');
    }

    const { data, error } = await client.rpc('get_my_recent_price_updates');
    if (error) throw error;

    return Array.isArray(data) ? data.map(mapPriceUpdate) : [];
  }

  /*
    Saves one product through the protected Supabase function created in
    Phase 10. The database—not the browser—decides the signed-in person's
    store, checks their membership, and verifies the category belongs there.
  */
  async function addProductForCurrentUser(product, categoryId) {
    window.SariSyncOfflinePriceBook?.requireOnlineForChange?.();
    const client = window.SariSyncAuthSession?.getClient?.();
    if (!client) {
      throw new Error('Your signed-in account is not ready. Refresh and try again.');
    }

    const { data, error } = await client.rpc('add_product_for_current_user', {
      p_item_name: product.name,
      p_category_id: categoryId,
      p_barcode: product.barcode || null,
      p_cost_price: product.costPrice,
      p_retail_price: product.retail,
      p_wholesale_price: product.wholesale,
      p_bottle_deposit: product.bottleDeposit,
      p_notes: product.notes || null
    });

    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  /*
    Sends an edit to the protected Phase 9 update function. That function
    checks store membership and creates price history when a price changes.
    The browser never updates products directly, so Price Pulse cannot be
    accidentally skipped.
  */
  async function queueProductUpdateForLater(productId, product, categoryId) {
    const cachedSession = await window.SariSyncAuthSession?.getCachedSession?.();
    const queuedEdit = window.SariSyncOfflineEditQueue?.queueProductUpdate?.({
      storeCode: window.SariSyncState?.getSession?.()?.storeCode,
      userId: cachedSession?.user?.id,
      productId,
      product,
      categoryId
    });

    if (!queuedEdit) {
      throw new Error('This change could not be saved offline. Reconnect and try again.');
    }

    return { queued: true, queueId: queuedEdit.id };
  }

  async function updateProductForCurrentUser(productId, product, categoryId, options = {}) {
    /* An existing product has a permanent database ID. When the internet is
       temporarily unavailable, save this edit in the device-only outbox. The
       existing protected RPC will still validate it after reconnection. */
    if (!options.skipOfflineQueue && window.SariSyncOfflinePriceBook?.isOffline?.()) {
      return queueProductUpdateForLater(productId, product, categoryId);
    }

    try {
      const client = window.SariSyncAuthSession?.getClient?.();
      if (!client) {
        throw new Error('Your signed-in account is not ready. Refresh and try again.');
      }

      /* A registered device is optional for the database function, but asking
         for it here lets future Price Pulse rows say which family device saved
         the change. A temporary device-service issue must not block a price
         correction, so the safe fallback remains null. */
      let deviceId = null;
      try {
        const device = await window.SariSyncDeviceService?.ensureCurrentDevice?.();
        deviceId = device?.id || null;
      } catch (error) {
        console.warn('Device attribution is unavailable for this update:', error);
      }

      const { data, error } = await client.rpc('update_product_for_current_user', {
        p_product_id: productId,
        p_item_name: product.name,
        p_category_id: categoryId,
        p_retail_price: product.retail,
        p_barcode: product.barcode || null,
        p_cost_price: product.costPrice,
        p_wholesale_price: product.wholesale,
        p_bottle_deposit: product.bottleDeposit,
        p_notes: product.notes || null,
        p_photo_url: null,
        p_change_note: null,
        p_device_id: deviceId
      });

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    } catch (error) {
      /* Some phones still report navigator.onLine as true for a few seconds
         after losing mobile data. Treat only a connection error as offline;
         validation and permission errors must remain visible to the user. */
      if (!options.skipOfflineQueue && window.SariSyncOfflinePriceBook?.isLikelyNetworkError?.(error)) {
        return queueProductUpdateForLater(productId, product, categoryId);
      }
      throw error;
    }
  }

  /* Archives instead of permanently deleting an item. The database function
     confirms that the signed-in person is the active store owner before it
     changes is_active to false. */
  async function archiveProductForCurrentUser(productId) {
    window.SariSyncOfflinePriceBook?.requireOnlineForChange?.();
    const client = window.SariSyncAuthSession?.getClient?.();
    if (!client) {
      throw new Error('Your signed-in account is not ready. Refresh and try again.');
    }

    const { data, error } = await client.rpc('archive_product_for_current_user', {
      p_product_id: productId
    });

    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  /*
    Reads only archived products owned by the signed-in store owner. This is a
    separate list so normal Home, Browse, and Updates screens stay focused on
    active products.
  */
  async function loadArchivedProductsForCurrentOwner() {
    const client = window.SariSyncAuthSession?.getClient?.();
    if (!client) {
      throw new Error('Your signed-in account is not ready. Refresh and try again.');
    }

    const { data, error } = await client.rpc('get_my_archived_products_for_current_owner');
    if (error) throw error;

    return Array.isArray(data)
      ? data.map(product => mapProduct({
        ...product,
        id: product.product_id,
        updated_at: product.archived_at
      }))
      : [];
  }

  /* Restores one archived product through the owner-only database function.
     The database checks ownership and the product's category before changing
     the item back to active. */
  async function restoreProductForCurrentOwner(productId) {
    window.SariSyncOfflinePriceBook?.requireOnlineForChange?.();
    const client = window.SariSyncAuthSession?.getClient?.();
    if (!client) {
      throw new Error('Your signed-in account is not ready. Refresh and try again.');
    }

    const { data, error } = await client.rpc('restore_product_for_current_owner', {
      p_product_id: productId
    });

    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  window.SariSyncProductDataService = {
    loadCurrentStorePriceBook,
    loadRecentPriceUpdates,
    addProductForCurrentUser,
    updateProductForCurrentUser,
    archiveProductForCurrentUser,
    loadArchivedProductsForCurrentOwner,
    restoreProductForCurrentOwner,
    mapCategory,
    mapProduct,
    mapPriceUpdate
  };
})();
