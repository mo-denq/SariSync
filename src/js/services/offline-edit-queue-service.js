/*
  FILE: src/js/services/offline-edit-queue-service.js
  PURPOSE: Holds safe product edits made while a device temporarily has no
  internet, then sends them through the existing protected Supabase function
  once that same account reconnects.

  VERSION 1 SCOPE:
  - Queues edits to existing products only. Each edit already has a real
    product ID, so it can be checked safely by Supabase later.
  - Does not queue new products, CSV imports, category changes, or archives.
    Those actions need extra conflict checks and remain online-only for now.

  SECURITY NOTE:
  The queue contains only the edited product fields. It contains no password,
  service-role key, or permission decision. Supabase still verifies the signed
  in account, store membership, and product access when it finally saves.
*/
(function initialiseOfflineEditQueueService() {
  const KEY_PREFIX = 'sariSyncOfflineEditQueue:';
  let flushInProgress = false;

  function safePart(value) {
    return String(value || '').trim();
  }

  function queueKey(storeCode, userId) {
    const store = safePart(storeCode).toUpperCase();
    const user = safePart(userId);
    return store && user ? `${KEY_PREFIX}${store}:${user}` : null;
  }

  function readQueue(storeCode, userId) {
    const key = queueKey(storeCode, userId);
    const queue = key ? window.SariSyncLocalStorage.readJson(key, []) : [];
    return Array.isArray(queue) ? queue : [];
  }

  function saveQueue(storeCode, userId, queue) {
    const key = queueKey(storeCode, userId);
    if (!key) throw new Error('Your store session is not ready. Reconnect and try again.');
    if (!window.SariSyncLocalStorage.saveJson(key, queue)) {
      throw new Error('This device could not save the offline change. Free some browser storage and try again.');
    }
  }

  function newId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function queueProductUpdate({ storeCode, userId, productId, product, categoryId }) {
    if (!safePart(productId) || !safePart(categoryId)) {
      throw new Error('This product is missing information needed for offline saving.');
    }

    const queue = readQueue(storeCode, userId);
    const entry = {
      id: newId(),
      type: 'update-product',
      createdAt: new Date().toISOString(),
      productId,
      categoryId,
      product: JSON.parse(JSON.stringify(product))
    };

    /* Keep only the latest unsent edit for one product. This avoids sending
       every small typo correction when a person changes the same item twice
       before reconnecting. */
    const existingIndex = queue.findIndex(item =>
      item?.type === 'update-product' && String(item.productId) === String(productId)
    );
    if (existingIndex >= 0) queue.splice(existingIndex, 1, entry);
    else queue.push(entry);

    saveQueue(storeCode, userId, queue);
    return entry;
  }

  async function currentQueueContext() {
    const session = await window.SariSyncAuthSession?.getCachedSession?.();
    const storeCode = window.SariSyncState?.getSession?.()?.storeCode;
    const userId = session?.user?.id;
    return { storeCode, userId };
  }

  /* Sends a queue item through the existing product service. Because this
     function runs only after the browser is online, that service calls the
     same protected Supabase RPC used by normal Save changes. */
  async function flushForCurrentUser() {
    if (flushInProgress || window.SariSyncOfflinePriceBook?.isOffline?.()) {
      return { syncedCount: 0, pendingCount: 0, skipped: true };
    }

    const { storeCode, userId } = await currentQueueContext();
    if (!storeCode || !userId) return { syncedCount: 0, pendingCount: 0, skipped: true };

    flushInProgress = true;
    try {
      const queue = readQueue(storeCode, userId);
      const remaining = [];
      let syncedCount = 0;

      for (const entry of queue) {
        try {
          if (entry?.type !== 'update-product') continue;
          await window.SariSyncProductDataService.updateProductForCurrentUser(
            entry.productId,
            entry.product,
            entry.categoryId,
            { skipOfflineQueue: true }
          );
          syncedCount += 1;
        } catch (error) {
          /* Keep an unsent edit. It can be retried on the next connection;
             no data is silently discarded because a retry failed. */
          remaining.push({ ...entry, lastError: String(error?.message || error) });
        }
      }

      saveQueue(storeCode, userId, remaining);
      return { syncedCount, pendingCount: remaining.length, skipped: false };
    } finally {
      flushInProgress = false;
    }
  }

  window.SariSyncOfflineEditQueue = {
    queueProductUpdate,
    readQueue,
    flushForCurrentUser
  };
})();
