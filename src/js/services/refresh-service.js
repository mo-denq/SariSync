/* One read-only refresh pipeline. New save/live events during a request cause
   a trailing reload; older responses never overwrite a newer requested view. */
(() => {
  let config = null, running = null, revision = 0, generation = 0;
  let lastReturn = 0;
  function configure(options) { config = options; }
  function stop() { generation++; revision++; config = null; running = null; }
  function request(reason = 'manual') {
    if (!config || !config.ready()) return Promise.resolve({ skipped: true });
    if (running && reason === 'manual') return running;
    const version = ++revision;
    if (running) return running;
    const current = config, token = generation;
    running = (async () => {
      // Defer work so even an immediate offline failure clears the shared lock.
      await Promise.resolve();
      current.status('loading');
      try {
        let seen = version, result;
        do {
          seen = revision;
          if (navigator.onLine === false) throw new Error('offline');
          let timeout;
          try {
            result = await Promise.race([current.load(), new Promise((_, reject) => {
              timeout = setTimeout(() => reject(new Error('Refresh timed out')), 20000);
            })]);
          } finally { clearTimeout(timeout); }
          if (token !== generation || !current.ready()) return { skipped: true };
        } while (seen !== revision);
        current.apply(result);
        current.status(result.priceHistoryError ? 'partial' : 'ready');
        if (reason === 'manual') current.notify(result.priceHistoryError
          ? 'Products updated, but price history could not refresh. Please retry.'
          : 'Price book updated.');
        return { ok: true, partial: Boolean(result.priceHistoryError) };
      } catch (error) {
        if (token !== generation) return { skipped: true };
        const offline = navigator.onLine === false;
        current.status(offline ? 'offline' : 'error');
        if (reason === 'manual') current.notify(offline
          ? 'Offline—showing saved data. Reconnect and try Refresh.'
          : 'Could not refresh. Your displayed products are unchanged. Tap Refresh to retry.');
        return { ok: false, error };
      } finally { if (token === generation) running = null; }
    })();
    return running;
  }
  function resume() {
    if (!config?.ready() || document.hidden || Date.now() - lastReturn < 1500) return;
    lastReturn = Date.now();
    config.reconnect();
    request('return');
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });
  window.addEventListener('pageshow', resume);
  window.addEventListener('online', resume);
  window.addEventListener('offline', () => config?.status('offline'));
  window.SariSyncRefresh = { configure, request, stop };
})();
