/*
  FILE: src/js/services/realtime-service.js
  PURPOSE: Keeps the signed-in family's price book fresh across devices.

  RESPONSIBILITIES:
  - Open one Supabase Realtime subscription for the signed-in person's store.
  - Listen only to products, categories, and price_updates from that store.
  - Combine closely timed database events into one screen refresh.
  - Stop the subscription when the person signs out or leaves the page.

  BEGINNER NOTE:
  A "subscription" is a small live connection to Supabase. It does not give
  the browser extra database permissions. Existing Row Level Security still
  decides which rows this signed-in person may receive.
*/
(function initialiseRealtimeService() {
  const TABLES = ['products', 'price_updates', 'categories'];
  const DEFAULT_DEBOUNCE_MS = 350;
  let channel = null;
  let activeStoreId = null;
  let pendingRefresh = null;
  let refreshHandler = null;
  let connectionStatus = 'CLOSED', starting = null, generation = 0;
  let retryTimer = null, retryDelay = 1500;

  function getClient() {
    return window.SariSyncAuthSession?.getClient?.() || null;
  }

  async function getCurrentStoreId(client) {
    const { data, error } = await client.rpc('get_my_store_access');
    if (error) throw error;

    const access = Array.isArray(data) ? data[0] : data;
    return access?.store_id || null;
  }

  function clearPendingRefresh() {
    if (!pendingRefresh) return;
    window.clearTimeout(pendingRefresh);
    pendingRefresh = null;
  }

  function queueStoreRefresh(change, debounceMs) {
    clearPendingRefresh();
    pendingRefresh = window.setTimeout(async () => {
      pendingRefresh = null;
      try {
        await refreshHandler?.(change);
      } catch (error) {
        // A live-refresh failure should not hide the already visible price book.
        console.warn('SariSync real-time refresh could not finish:', error);
        window.SariSyncToast?.show('New changes were saved. Refresh to see the latest price book.');
      }
    }, debounceMs);
  }

  async function stop() {
    generation++;
    window.clearTimeout(retryTimer);
    retryTimer = null;
    starting = null;
    connectionStatus = 'CLOSED';
    clearPendingRefresh();
    activeStoreId = null;
    refreshHandler = null;

    if (!channel) return;
    const currentChannel = channel;
    channel = null;
    await getClient()?.removeChannel?.(currentChannel);
  }

  function start(options = {}) {
    if (options.onStoreChange) refreshHandler = options.onStoreChange;
    if (starting) return starting;
    const token = generation;
    const work = startConnection(options, token);
    starting = work;
    work.finally(() => { if (starting === work) starting = null; }).catch(() => {});
    return work;
  }
  async function startConnection({ onStoreChange, debounceMs = DEFAULT_DEBOUNCE_MS } = {}, token) {
    const client = getClient();
    if (!client) throw new Error('Your signed-in account is not ready. Refresh and try again.');

    const storeId = await getCurrentStoreId(client);
    if (token !== generation) return false;
    if (!storeId) return false;

    // Calling start again after a screen refresh reuses the existing listener.
    if (channel && activeStoreId === storeId && ['SUBSCRIBED', 'CONNECTING'].includes(connectionStatus)) {
      refreshHandler = onStoreChange || refreshHandler;
      return true;
    }

    window.clearTimeout(retryTimer);
    clearPendingRefresh();
    const old = channel;
    channel = null;
    if (old) await client.removeChannel(old);
    if (token !== generation) return false;
    activeStoreId = storeId;
    refreshHandler = onStoreChange || null;

    const storeFilter = `store_id=eq.${storeId}`;
    let nextChannel = client.channel(`sarisync-store-${storeId}`);
    TABLES.forEach(table => {
      nextChannel = nextChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: storeFilter },
        payload => queueStoreRefresh({ table, payload }, debounceMs)
      );
    });

    connectionStatus = 'CONNECTING';
    channel = nextChannel;
    nextChannel.subscribe(status => {
      if (token !== generation || channel !== nextChannel) return;
      connectionStatus = status;
      if (status === 'SUBSCRIBED') {
        window.clearTimeout(retryTimer);
        retryDelay = 1500;
        queueStoreRefresh({ reconnected: true }, debounceMs);
      }
      if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        console.warn('SariSync real-time connection status:', status);
        window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(() => {
          if (token === generation && !document.hidden && navigator.onLine !== false) start({ onStoreChange: refreshHandler }).catch(() => {});
        }, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      }
    });
    return true;
  }

  // Closing the tab should also close the browser's live connection promptly.
  window.addEventListener?.('pagehide', () => { stop().catch(() => {}); });

  window.SariSyncRealtime = { start, stop };
})();
