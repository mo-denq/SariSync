/*
  FILE: src/js/components/toast.js
  PURPOSE: Displays SariSync's short temporary notification messages.

  RESPONSIBILITIES:
  - Place a message inside the existing #toast element.
  - Show the toast using the existing CSS class.
  - Give longer messages more reading time, up to eight seconds.
  - Reset the timer when a new message appears before the old one closes.

  This file controls behavior only. The existing toast appearance remains in
  the shared CSS file.
*/
(function initialiseToastComponent() {
  const displayDuration = window.SariSyncConstants.TOAST_DURATION_MS;
  let hideTimer = null;

  function show(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const text = String(message ?? '');
    toast.textContent = text;
    toast.classList.add('show');

    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, Math.max(displayDuration, Math.min(8000, text.length * 55)));
  }

  window.SariSyncToast = { show };
})();
