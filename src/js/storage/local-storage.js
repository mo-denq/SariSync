/*
  FILE: src/js/storage/local-storage.js
  PURPOSE: Gives SariSync one safe place to read, save, and remove information
  stored by the browser on this device.

  RESPONSIBILITIES:
  - Keep the existing browser-storage key names in one place.
  - Read and save plain text values.
  - Read and save JavaScript objects and arrays as JSON.
  - Return a safe fallback when saved JSON is missing or damaged.
  - Remove a saved value when it is no longer needed.

  BEGINNER NOTE:
  localStorage is small browser memory that remains after refreshing the page.
  This adapter only organizes existing prototype storage. It is not a database,
  does not synchronize devices, and does not connect to Supabase.
*/
(function initialiseLocalStorageAdapter() {
  const KEYS = Object.freeze({
    SESSION: 'sariSyncSession',
    PRODUCTS: 'sariSyncProducts',
    DEVICE_ID: 'sariSyncDeviceId'
  });

  function read(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, String(value));
      return true;
    } catch {
      return false;
    }
  }

  function readJson(key, fallback = null) {
    const savedValue = read(key);
    if (savedValue === null) return fallback;

    try {
      return JSON.parse(savedValue);
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      return save(key, JSON.stringify(value));
    } catch {
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  window.SariSyncLocalStorage = {
    KEYS,
    read,
    save,
    readJson,
    saveJson,
    remove
  };
})();
