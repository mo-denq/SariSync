/*
  FILE: src/js/services/auth-session.js
  PURPOSE: Provides safe account-session actions for the main SariSync app.

  RESPONSIBILITIES:
  - Reuse one Supabase browser client on the Home application shell.
  - Share that same client with authenticated feature services.
  - Read and refresh the current Supabase session.
  - End the signed-in Supabase session for the current browser/device.
  - Remove SariSync's separate prototype session after sign-out.

  BEGINNER NOTE:
  The Home shell loads Supabase as a standard browser script. This file uses
  that already-loaded browser library so Settings works without module-loading
  problems in the local prototype server.
*/

(function initialiseAuthSessionService() {
  let supabaseClient = null;

  function getClient() {
    if (!window.supabase?.createClient) {
      throw new Error('Supabase is not ready. Refresh and try again.');
    }

    const config = window.SariSyncSupabaseConfig;
    if (!config?.url || !config?.publishableKey) {
      throw new Error('SariSync Supabase configuration is missing.');
    }

    if (!supabaseClient) {
      supabaseClient = window.supabase.createClient(
        config.url,
        config.publishableKey
      );
    }

    return supabaseClient;
  }

  async function getSession() {
    const { data, error } = await getClient().auth.getSession();
    if (error) throw error;
    if (!data.session) return null;

    /* getSession restores/refreshed the browser session. getUser then asks the
       Auth server to verify that the signed-in user is still valid. */
    const { data: userData, error: userError } = await getClient().auth.getUser();
    if (userError) throw userError;
    return userData.user ? data.session : null;
  }

  /* This only reads the browser's existing Supabase session. It is used as a
     temporary offline fallback; normal online opening still verifies the user
     with Supabase through getSession() above. */
  async function getCachedSession() {
    const { data, error } = await getClient().auth.getSession();
    if (error) throw error;
    return data.session || null;
  }

  function clearPrototypeSession() {
    window.SariSyncLocalStorage.remove(window.SariSyncLocalStorage.KEYS.SESSION);
  }

  function getLoginPageUrl() {
    if (window.location.protocol === 'file:' || !window.location.host) {
      return 'http://127.0.0.1:5500/pages/auth/login.html';
    }

    return new URL('/pages/auth/login.html', window.location.origin).href;
  }

  async function signOut() {
    window.SariSyncRefresh?.stop?.();
    // Close the live store listener before ending the account session. This
    // avoids leaving an unnecessary connection open after Sign out.
    await window.SariSyncRealtime?.stop?.();
    const { error } = await getClient().auth.signOut();
    if (error) throw error;

    // Keep product demo data, but remove who is signed in on this device.
    clearPrototypeSession();
  }

  window.SariSyncAuthSession = {
    clearPrototypeSession,
    getClient,
    getCachedSession,
    getLoginPageUrl,
    getSession,
    signOut
  };
})();
