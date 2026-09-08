/*
  FILE: src/js/pages/archived-products.js
  PURPOSE: Shows an owner's archived products and restores a selected item.

  RESPONSIBILITIES:
  - Ask the shared product-data service for the current owner's archived list.
  - Display only a clear restore action; no permanent deletion happens here.
  - Refresh the shared price book after a successful restore.

  SECURITY NOTE:
  The page never decides who is an owner. Supabase verifies the signed-in owner
  inside the protected functions before it returns or restores any product.
*/
(function initialiseArchivedProductsPage() {
  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function formatArchivedAt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently';

    return date.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  async function render(context) {
    const { screen, homePage, setHomeHeader, peso, onRestored } = context || {};
    if (!screen) return;

    setHomeHeader?.(false);
    if (homePage) homePage.hidden = true;
    screen.hidden = false;

    window.SariSyncPageHeader.mount(screen, {
      kicker: 'STORE MANAGEMENT',
      title: 'Archived products',
      description: 'Restore an item to return it to the active price book.',
      backTarget: 'Settings'
    });
    // This explains direct navigation; the protected RPC still enforces access.
    if (String(window.SariSyncState.getSession()?.role || '').toLowerCase() !== 'owner') {
      screen.insertAdjacentHTML('beforeend', '<p class="permission-note">Only the store owner can view and restore archived products.</p>');
      return;
    }
    screen.insertAdjacentHTML('beforeend', `
      <section id="archivedProductsContent" aria-live="polite">
        <p class="archived-products-note">Archived items are hidden from Home, Browse, and Recent Updates. Their saved price history remains safe.</p>
        <p class="archived-products-empty">Loading archived products&hellip;</p>
      </section>`);

    const content = document.getElementById('archivedProductsContent');
    try {
      const products = await window.SariSyncProductDataService.loadArchivedProductsForCurrentOwner();
      if (!products.length) {
        content.innerHTML = `
          <p class="archived-products-note">Archived items are hidden from Home, Browse, and Recent Updates. Their saved price history remains safe.</p>
          <div class="archived-products-empty"><strong>No archived products</strong><br />Products you archive will appear here and can be restored later.</div>`;
        return;
      }

      content.innerHTML = `
        <p class="archived-products-note">${products.length} archived ${products.length === 1 ? 'product' : 'products'}. Restoring an item makes it visible in the active price book again.</p>
        ${products.map(product => `
          <article class="archived-product-card">
            <div>
              <strong>${escapeHtml(product.name)}</strong>
              <span>${escapeHtml(product.category || 'UNCATEGORIZED')} · ${peso(product.retail)} · Archived ${formatArchivedAt(product.updatedAt)}</span>
            </div>
            <button type="button" data-restore-product="${escapeHtml(product.id)}">Restore</button>
          </article>`).join('')}`;

      content.querySelectorAll('[data-restore-product]').forEach(button => {
        button.addEventListener('click', async () => {
          const productId = button.dataset.restoreProduct;
          const originalLabel = button.textContent;
          button.disabled = true;
          button.textContent = 'Restoring...';

          try {
            await window.SariSyncProductDataService.restoreProductForCurrentOwner(productId);
            await onRestored?.();
            window.SariSyncToast.show('Product restored to the active price book');
            render(context);
          } catch (error) {
            button.disabled = false;
            button.textContent = originalLabel;
            window.SariSyncToast.show(window.SariSyncFeedback.messageFor(error, 'Unable to restore this product. Please try again.'));
          }
        });
      });
    } catch (error) {
      content.innerHTML = `<div class="archived-products-empty"><strong>Archived products are unavailable</strong><br />${escapeHtml(window.SariSyncFeedback.messageFor(error, 'Refresh and try again.'))}</div>`;
    }
  }

  window.SariSyncArchivedProducts = { render };
})();
