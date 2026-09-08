/*
  FILE: src/js/pages/edit-product.js
  PURPOSE: Controls the Edit Item Details page for an existing product.

  RESPONSIBILITIES:
  - Opens the edit view inside the shared secondary-page area.
  - Displays the selected product's name and existing form values.
  - Returns the Back button to the screen that opened the editor.
  - Starts the existing product-form and save behavior.
  - Returns to the Update Price page if no valid product was supplied.

  The reusable fields and save behavior come from components/product-form.js.
*/
(function initialiseEditProductPage() {
  // Shows an in-app confirmation instead of the browser's plain confirm box.
  // The overlay blocks the page beneath it so archiving stays a deliberate action.
  function confirmArchive(productName, onConfirm) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'product-archive-confirm-overlay';
      overlay.innerHTML = `
        <section class="product-archive-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="productArchiveTitle">
          <p class="product-archive-confirm-kicker">ARCHIVE PRODUCT</p>
          <h2 id="productArchiveTitle">Archive ${escapeHtml(productName)}?</h2>
          <p>It will no longer appear in the active price book. Its past price history will remain safe.</p>
          <p class="product-archive-confirm-status" aria-live="polite" hidden></p>
          <div class="product-archive-confirm-actions">
            <button type="button" class="product-archive-confirm-cancel">Cancel</button>
            <button type="button" class="product-archive-confirm-action">Archive product</button>
          </div>
        </section>`;

      const close = answer => {
        document.removeEventListener('keydown', onKeyDown);
        overlay.remove();
        resolve(answer);
      };
      const onKeyDown = event => {
        if (event.key === 'Escape') close(false);
      };

      const cancelButton = overlay.querySelector('.product-archive-confirm-cancel');
      const archiveButton = overlay.querySelector('.product-archive-confirm-action');
      const status = overlay.querySelector('.product-archive-confirm-status');
      let isSubmitting = false;

      cancelButton.addEventListener('click', () => close(false));
      archiveButton.addEventListener('click', async () => {
        if (isSubmitting) return;
        isSubmitting = true;
        cancelButton.disabled = true;
        archiveButton.disabled = true;
        archiveButton.textContent = 'Archiving product...';
        status.hidden = false;
        status.classList.remove('is-error');
        status.textContent = 'Archiving product…';

        try {
          await onConfirm();
          close(true);
        } catch (error) {
          // Keep the dialog open on failure so the person can read the reason
          // and either try again or cancel instead of wondering what happened.
          status.classList.add('is-error');
          status.textContent = error?.message || 'Unable to archive this product. Try again.';
          cancelButton.disabled = false;
          archiveButton.disabled = false;
          archiveButton.textContent = 'Archive product';
          isSubmitting = false;
        }
      });
      overlay.addEventListener('click', event => {
        if (event.target === overlay) close(false);
      });
      document.body.append(overlay);
      document.addEventListener('keydown', onKeyDown);
      overlay.querySelector('.product-archive-confirm-cancel').focus();
    });
  }

  function escapeHtml(value) {
    const element = document.createElement('span');
    element.textContent = value || '';
    return element.innerHTML;
  }

  function render(context) {
    if (!context) return;

    const {
      product,
      screen,
      homePage,
      setHomeHeader,
      categories,
      activeDeviceName,
      onSaved,
      onArchived,
      onMissingProduct,
      onBack,
      backTarget = 'Browse'
    } = context;

    if (!product) {
      onMissingProduct?.();
      return;
    }

    setHomeHeader(false);
    homePage.hidden = true;
    screen.hidden = false;

    window.SariSyncPageHeader.mount(screen, {
      kicker: 'SWIFT EDIT',
      title: 'Edit item details',
      description: `Update the price and information for ${product.name}.`,
      backTarget,
      onBack
    });

    // This stays visible above the fields because every saved price change is
    // recorded in Recent Updates. It helps prevent accidental typo corrections.
    screen.insertAdjacentHTML('beforeend', `
      <aside class="price-edit-reminder" aria-label="Important saving reminder">
        <strong>Double-check before saving</strong>
        <span>Changes are recorded in Recent Updates. Review the product name and prices carefully to avoid duplicate correction entries.</span>
        <em class="price-edit-reminder-tagalog">Tingnang mabuti ang pangalan ng produkto at mga presyo bago i-save para maiwasan ang dobleng pagbabago sa Recent Updates.</em>
      </aside>`);
    window.SariSyncProductForm.mount(screen, {
      product,
      categories,
      activeDeviceName,
      onSaved
    });

    /* Archive is deliberately available only to the store owner. It keeps the
       product and its price history in Supabase, but hides the item from the
       active price book. Members never receive this destructive-looking
       control. */
    const isOwner = String(window.SariSyncState.getSession()?.role || '').toLowerCase() === 'owner';
    if (!isOwner) {
      screen.insertAdjacentHTML('beforeend', '<p class="permission-note">You can edit this product. Only the store owner can archive or restore products.</p>');
      return;
    }

    screen.insertAdjacentHTML('beforeend', `
      <section class="product-archive-section" aria-label="Archive product">
        <div>
          <strong>Archive this product</strong>
          <span>It will be removed from active lookup, but its past price history will remain safe.</span>
        </div>
        <button id="archiveProductButton" type="button">Archive product</button>
      </section>`);

    screen.querySelector('#archiveProductButton')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      const originalLabel = button.textContent;
      button.disabled = true;
      const wasArchived = await confirmArchive(product.name, async () => {
        button.textContent = 'Archiving...';
        await window.SariSyncProductDataService.archiveProductForCurrentUser(product.id);
        await Promise.resolve(onArchived?.());
      });

      if (!wasArchived) {
        button.disabled = false;
        button.textContent = originalLabel;
        return;
      }

      try {
        window.SariSyncNavigation.goTo('Home');
        window.SariSyncToast.show('Product archived from the active price book');
      } finally {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    });
  }

  window.SariSyncEditProduct = { render };
})();
