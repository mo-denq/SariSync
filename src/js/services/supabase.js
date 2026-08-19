/*
  FILE: src/js/services/supabase.js
  PURPOSE: Creates the Supabase client used by authentication and future cloud
  data features. Keep credentials/configuration here instead of scattering them
  across page files. The current prototype still falls back to local browser data.
*/
// Pin the library version so a future CDN update cannot unexpectedly change
// prototype behavior between browser refreshes.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.6/+esm';

const config = window.SariSyncSupabaseConfig;

if (!config?.url || !config?.publishableKey) {
  throw new Error('SariSync Supabase configuration is missing.');
}

export const supabase = createClient(config.url, config.publishableKey);
