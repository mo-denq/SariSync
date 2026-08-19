/*
  FILE: src/js/services/device-service.js
  PURPOSE: Registers this browser/phone as one of a family's allowed devices.

  The saved device ID is only a browser label, not a password or login token.
  Authentication still comes from Supabase. The protected function enforces
  the store membership and the Version 1 five-active-device limit.
*/
(function initialiseDeviceService() {
  let currentDevice = null;

  function savedDeviceId() {
    return window.SariSyncLocalStorage.read(window.SariSyncLocalStorage.KEYS.DEVICE_ID, null);
  }

  async function ensureCurrentDevice() {
    if (currentDevice) return currentDevice;

    const session = window.SariSyncState?.getSession?.() || {};
    const nickname = window.SariSyncUtils.titleCase(
      session.deviceName || session.fullName || 'This device'
    );
    const { data, error } = await window.SariSyncAuthSession.getClient()
      .rpc('register_current_device', {
        p_device_id: savedDeviceId(),
        p_nickname: nickname
      });
    if (error) throw error;

    currentDevice = Array.isArray(data) ? data[0] : data;
    if (currentDevice?.id) {
      window.SariSyncLocalStorage.save(window.SariSyncLocalStorage.KEYS.DEVICE_ID, currentDevice.id);
    }
    return currentDevice;
  }

  window.SariSyncDeviceService = { ensureCurrentDevice };
})();
