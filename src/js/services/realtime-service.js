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
    clearPendingRefresh();
    activeStoreId = null;
    refreshHandler = null;

    if (!channel) return;
    const currentChannel = channel;
    channel = null;
    await getClient()?.removeChannel?.(currentChannel);
  }

  async function start({ onStoreChange, debounceMs = DEFAULT_DEBOUNCE_MS } = {}) {
    const client = getClient();
    if (!client) throw new Error('Your signed-in account is not ready. Refresh and try again.');

    const storeId = await getCurrentStoreId(client);
    if (!storeId) return false;

    // Calling start again after a screen refresh reuses the existing listener.
    if (channel && activeStoreId === storeId) {
      refreshHandler = onStoreChange || refreshHandler;
      return true;
    }

    await stop();
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

    channel = nextChannel.subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('SariSync real-time connection status:', status);
      }
    });
    return true;
  }

  // Closing the tab should also close the browser's live connection promptly.
  window.addEventListener?.('pagehide', () => { stop(); });

  window.SariSyncRealtime = { start, stop };
})();
