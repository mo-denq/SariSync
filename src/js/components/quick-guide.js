/* One short introduction. Only its dismissal preference is saved here, never
   product data. Native dialog supplies modal focus containment and inertness. */
(() => {
  const VERSION = 'v1';
  const dismissedThisVisit = new Set();
  let dialog = null;
  const keyFor = userId => `sarisync:quick-guide:${VERSION}:${userId}`;
  function wasDismissed(userId) {
    return dismissedThisVisit.has(userId) || window.SariSyncLocalStorage.read(keyFor(userId)) === 'dismissed';
  }
  function isBusy() {
    return !document.getElementById('homeAuthGuard')?.hidden ||
      document.getElementById('appShell')?.hidden ||
      !document.getElementById('scannerPanel')?.hidden ||
      document.querySelector('dialog[open], .product-archive-confirm-overlay, .category-confirm-overlay, #secondaryPage:not([hidden]) form');
  }
  function open(userId, automatic = false) {
    if (!userId || dialog || isBusy()) return false;
    if (automatic && (wasDismissed(userId) || document.getElementById('homePage')?.hidden)) return false;
    const queued = window.SariSyncOfflineEditQueue?.readQueue(window.SariSyncState.getSession()?.storeCode, userId) || [];
    if (queued.length) {
      if (!automatic) window.SariSyncToast.show('Finish reviewing your pending changes first, then reopen the guide.');
      return false;
    }
    const opener = document.activeElement;
    dialog = document.createElement('dialog');
    dialog.className = 'quick-guide';
    dialog.setAttribute('aria-labelledby', 'quickGuideTitle');
    dialog.innerHTML = `<p class="eyebrow">QUICK APP GUIDE</p><h2 id="quickGuideTitle">Your shared price book</h2>
      <ol><li><strong>Search</strong><span>Find a product by its name. Check its size and category.</span></li>
      <li><strong>Scan</strong><span>Scan a saved barcode to view the price. No match? Search by name.</span></li>
      <li><strong>Edit</strong><span>Open the product and choose “Edit price or details” when permitted.</span></li>
      <li><strong>Save</strong><span>Double-check your changes, then save. Online saves update the shared book. Offline edits stay on this phone until they successfully sync.</span></li></ol>
      <p class="subtle">Reopen this anytime in Settings. A new browser/device or cleared browser storage can show it again.</p>
      <div class="quick-guide-actions"><button type="button" data-dismiss="skip">Skip for now</button><button type="button" data-dismiss="done">Got it</button></div>`;
    const close = () => {
      dismissedThisVisit.add(userId);
      const saved = window.SariSyncLocalStorage.save(keyFor(userId), 'dismissed');
      dialog.close(); dialog.remove(); dialog = null;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      if (!saved) window.SariSyncToast.show('Guide closed. Your browser could not remember this preference for next time.');
    };
    dialog.querySelectorAll('[data-dismiss]').forEach(button => button.addEventListener('click', close));
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    document.body.appendChild(dialog);
    if (typeof dialog.showModal !== 'function') {
      dialog.remove(); dialog = null;
      window.SariSyncToast.show('Search by name or scan a barcode. Open an item to edit, review, and save.');
      return false;
    }
    dialog.showModal();
    dialog.querySelector('[data-dismiss="done"]').focus();
    return true;
  }
  async function openFromSettings() {
    try {
      const session = await window.SariSyncAuthSession.getCachedSession();
      if (!session?.user?.id) { window.SariSyncToast.show('Sign in to open the app guide.'); return; }
      if (window.SariSyncNavigation.getActivePage() !== 'Settings') return;
      open(session.user.id);
    } catch { window.SariSyncToast.show('Unable to open the guide. Please try again.'); }
  }
  window.SariSyncQuickGuide = { showAfterLoad: userId => open(userId, true), openFromSettings };
})();
