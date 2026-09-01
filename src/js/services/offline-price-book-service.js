/*
  FILE: src/js/services/offline-price-book-service.js
  PURPOSE: Keeps a recent, device-only copy of one store's price book so a
  family member can still look up saved prices during a temporary outage.

  RESPONSIBILITIES:
  - Save products, categories, and recent price changes after a successful
    Supabase load.
  - Keep each saved copy separate by store code.
  - Return a safe copy when the browser is offline.
  - Tell write features to wait for the later offline-edit queue.

  BEGINNER NOTE:
  This is a cache (a saved copy), not a second database. It is only used on
  this device while the internet is unavailable. It never sends edits to
  Supabase by itself.
*/
(function initialiseOfflinePriceBookService() {
  const CACHE_PREFIX = 'sariSyncOfflinePriceBook:';

  function cacheKey(storeCode) {
    const safeStoreCode = String(storeCode || '').trim().toUpperCase();
    return safeStoreCode ? `${CACHE_PREFIX}${safeStoreCode}` : null;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function savePriceBook({ storeCode, priceBook, recentPriceUpdates = [] } = {}) {
    const key = cacheKey(storeCode);
    if (!key || !priceBook) return false;

    return window.SariSyncLocalStorage.saveJson(key, {
      savedAt: new Date().toISOString(),
      priceBook: {
        categories: Array.isArray(priceBook.categories) ? priceBook.categories : [],
        products: Array.isArray(priceBook.products) ? priceBook.products : []
      },
      recentPriceUpdates: Array.isArray(recentPriceUpdates) ? recentPriceUpdates : []
    });
  }

  function getCachedPriceBook(storeCode) {
    const key = cacheKey(storeCode);
    const cached = key ? window.SariSyncLocalStorage.readJson(key, null) : null;

    if (!cached?.priceBook || !Array.isArray(cached.priceBook.products)) return null;
    return clone(cached);
  }

  function isOffline() {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }

  function isLikelyNetworkError(error) {
    if (isOffline()) return true;
    const message = String(error?.message || error || '').toLowerCase();
    return /failed to fetch|network request failed|networkerror|load failed|connection.*(?:failed|refused)|offline/.test(message);
  }

  function requireOnlineForChange() {
    if (!isOffline()) return;
    throw new Error('You are offline. Price lookup still works; reconnect before saving changes.');
  }

  function formatSavedAt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'a recent saved copy';
    return date.toLocaleString('en-PH', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  window.SariSyncOfflinePriceBook = {
    savePriceBook,
    getCachedPriceBook,
    isOffline,
    isLikelyNetworkError,
    requireOnlineForChange,
    formatSavedAt
  };
})();
