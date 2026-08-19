/*
  FILE: src/js/services/store-access.js
  PURPOSE: Keeps authenticated store-setup requests separate from the page UI.

  RESPONSIBILITIES:
  - Ask Supabase whether the current signed-in user belongs to a store.
  - Create a store for a signed-in owner through a protected database function.
  - Join a store through a protected database function.

  BEGINNER NOTE:
  This file does not contain a secret key. The browser uses the signed-in
  person's Supabase session, while the database functions verify auth.uid()
  before they create or return store information.
*/
import { supabase } from './supabase.js';

async function call(functionName, parameters = {}) {
  const { data, error } = await supabase.rpc(functionName, parameters);
  if (error) throw makeStoreAccessError(error);

  return Array.isArray(data) ? (data[0] || null) : data;
}

function makeStoreAccessError(error) {
  const originalMessage = String(error?.message || '');

  if (/failed to fetch|network|load failed/i.test(originalMessage)) {
    return new Error('SariSync could not reach the store service. Check your connection and try again.');
  }

  if (/PGRST202|could not find the function/i.test(originalMessage)) {
    return new Error('Store access setup is not ready yet. Ask the owner to finish the Supabase setup.');
  }

  return new Error(originalMessage || 'Unable to complete the store request. Please try again.');
}

export async function getMyStoreAccess() {
  return call('get_my_store_access');
}

export async function createMyStore(details) {
  return call('create_store_for_current_user', {
    p_store_name: details.storeName,
    p_barangay: details.barangay,
    p_city: details.city,
    p_province: details.province,
    p_street_address: details.streetAddress || null
  });
}

export async function joinStore(storeCode) {
  const normalizedCode = String(storeCode || '').trim().toUpperCase();
  if (!normalizedCode) throw new Error('Enter a store code.');

  return call('join_store_for_current_user', {
    p_store_code: normalizedCode
  });
}
