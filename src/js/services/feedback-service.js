/*
  FILE: src/js/services/feedback-service.js
  PURPOSE: Changes common technical, network, and database errors into short
  messages that make sense to a SariSync family member.

  Pages decide where to show a message: forms keep it visible near the fields,
  while saved actions use the shared temporary toast. This service only decides
  the wording; it does not change permissions or database rules.
*/
(function initialiseFeedbackService() {
  function hasText(value, expression) {
    return expression.test(String(value?.message || value || ''));
  }

  function messageFor(error, fallback = 'Something went wrong. Please try again.') {
    const original = String(error?.message || error || '').trim();

    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (isOffline || hasText(original, /failed to fetch|network|load failed|network request failed|timeout/i)) {
      return 'Internet connection unavailable. Check your connection and try again.';
    }
    if (hasText(original, /invalid login credentials|invalid.*email.*password|email.*password.*invalid/i)) {
      return 'Unable to log in. Check your email address and password.';
    }
    if (hasText(original, /email not confirmed|confirm.*email/i)) {
      return 'Confirm your email address first, then try logging in again.';
    }
    if (hasText(original, /five active devices|device limit|maximum.*devices/i)) {
      return 'This store has reached its 5-device limit. Ask the owner to remove an unused device.';
    }
    if (hasText(original, /store code.*not found|that store code|invalid.*store code/i)) {
      return 'Store code not found. Check the code shared by the store owner and try again.';
    }
    if (hasText(original, /only the active store owner|only.*owner|permission denied|not authorized|row-level security/i)) {
      return 'You do not have permission for this action.';
    }
    if (hasText(original, /already exists|duplicate key|duplicate.*barcode|barcode.*duplicate/i)) {
      return 'This category or barcode already exists in this store.';
    }
    if (hasText(original, /required|not null|must be supplied/i)) {
      return 'Required information is missing. Check the highlighted fields and try again.';
    }
    if (hasText(original, /csv|column|row \d+|quoted cell|valid non-negative number/i)) {
      return original || 'This CSV file has invalid columns or values. Check it and try again.';
    }
    if (hasText(original, /camera|permission|notallowederror|not allowed/i)) {
      return 'Camera permission was denied. Allow camera access in your browser settings and try again.';
    }

    return fallback;
  }

  window.SariSyncFeedback = { messageFor };
})();
