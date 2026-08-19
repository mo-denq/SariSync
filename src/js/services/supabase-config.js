/*
  FILE: src/js/services/supabase-config.js
  PURPOSE: Keeps SariSync's public Supabase connection settings in one place.

  BEGINNER NOTE:
  A publishable key is designed for browser apps and is protected by Supabase
  authentication and Row Level Security. Never place a service-role key here.
*/
(function initialiseSupabaseConfig() {
  window.SariSyncSupabaseConfig = Object.freeze({
    url: 'https://ifervpsezuqvtadncszl.supabase.co',
    publishableKey: 'sb_publishable_3_cm_jGlpcu7y1R4YeKSWw_imJ1Aj2Y'
  });
})();
