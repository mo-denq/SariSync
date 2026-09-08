/*
  FILE: src/js/pages/category-management.js
  PURPOSE: Owner-only page for adding, renaming, archiving, and restoring
  the store's product categories. It shows how many active products use each
  category before an archive action is confirmed.
*/
(function initialiseCategoryManagementPage() {
  let activeContext = null;
  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  function categoryRow(category) {
    const isActive = category.is_active !== false;
    const productCount = Number(category.active_product_count) || 0;
    const productLabel = `${productCount} active product${productCount === 1 ? '' : 's'}`;
    return `<form class="category-manage-row" data-category-id="${escapeHtml(category.id)}" data-display-order="${Number(category.display_order) || 0}" data-product-count="${productCount}">
      <div class="category-name-group">
        <input class="category-name-input" value="${escapeHtml(category.name)}" aria-label="Category name" required />
        <small class="category-product-count">${productLabel}</small>
      </div>
      <span class="category-status ${isActive ? '' : 'is-archived'}">${isActive ? 'Active' : 'Archived'}</span>
      <button class="category-archive-button" type="button" data-next-active="${isActive ? 'false' : 'true'}">${isActive ? 'Archive' : 'Restore'}</button>
      <button class="category-save-button" type="submit">Save</button>
    </form>`;
  }

  // Shows a deliberate choice before an archive hides a category from forms.
  // It does not remove products; it only makes the category inactive.
  function confirmArchive(categoryName, productCount) {
    if (productCount === 0) return Promise.resolve(true);

    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'category-confirm-overlay';
      overlay.innerHTML = `<section class="category-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="categoryArchiveTitle">
        <p class="category-confirm-kicker">ARCHIVE CATEGORY</p>
        <h2 id="categoryArchiveTitle">Archive ${escapeHtml(categoryName)}?</h2>
        <p>${escapeHtml(categoryName)} contains <strong>${productCount} active product${productCount === 1 ? '' : 's'}</strong>. Archiving it will remove it from new-product choices. Existing products will keep this category.</p>
        <div class="category-confirm-actions">
          <button type="button" class="category-confirm-cancel">Cancel</button>
          <button type="button" class="category-confirm-archive">Archive category</button>
        </div>
      </section>`;

      const close = answer => {
        overlay.remove();
        resolve(answer);
      };
      overlay.querySelector('.category-confirm-cancel').addEventListener('click', () => close(false));
      overlay.querySelector('.category-confirm-archive').addEventListener('click', () => close(true));
      overlay.addEventListener('click', event => {
        if (event.target === overlay) close(false);
      });
      document.body.append(overlay);
      overlay.querySelector('.category-confirm-cancel').focus();
    });
  }

  async function render(context) {
    activeContext = context;
    const { screen, homePage, setHomeHeader, onSaved } = context;
    setHomeHeader(false);
    homePage.hidden = true;
    screen.hidden = false;
    window.SariSyncPageHeader.mount(screen, {
      kicker: 'STORE MANAGEMENT',
      title: 'Manage categories',
      description: 'Add, rename, archive, or restore your store categories.',
      backTarget: 'Settings'
    });
    // Explain direct access before loading controls. Database checks still apply.
    if (String(window.SariSyncState.getSession()?.role || '').toLowerCase() !== 'owner') {
      screen.insertAdjacentHTML('beforeend', '<p class="permission-note">Only the store owner can manage categories. You can still browse and edit products.</p>');
      return;
    }
    screen.insertAdjacentHTML('beforeend', '<div id="categoryManageContent" class="category-manage-content"><p>Loading categories...</p></div>');
    const content = document.getElementById('categoryManageContent');

    try {
      const categories = window.SariSyncCategoryModel.sortAlphabetically(
        await window.SariSyncCategoryDataService.getOwnerCategories()
      );
      content.innerHTML = `<form id="newCategoryForm" class="category-add-form">
        <label for="newCategoryName">NEW CATEGORY</label>
        <input id="newCategoryName" required placeholder="e.g. PET SUPPLIES" />
        <button class="save-button" type="submit">Add category</button>
      </form>
      <p class="category-manage-note">Categories are listed alphabetically. Archive removes a category from new-product choices but keeps old products and price history safe. Permanent deletion is not available in Version 1.</p>
      <div class="category-manage-list">${categories.map(categoryRow).join('') || '<p>No categories yet. Add your first one above.</p>'}</div>`;

      document.getElementById('newCategoryForm').addEventListener('submit', async event => {
        event.preventDefault();
        const button = event.currentTarget.querySelector('button');
        button.disabled = true;
        button.textContent = 'Adding...';
        try {
          await window.SariSyncCategoryDataService.saveCategory({
            name: document.getElementById('newCategoryName').value,
            displayOrder: categories.length,
            isActive: true
          });
          window.SariSyncToast.show('Category added');
          await onSaved();
          render(context);
        } catch (error) {
          window.SariSyncToast.show(error.message || 'Could not add category.');
        } finally {
          button.disabled = false;
          button.textContent = 'Add category';
        }
      });

      content.querySelectorAll('.category-manage-row').forEach(form => form.addEventListener('submit', async event => {
        event.preventDefault();
        const button = form.querySelector('.category-save-button');
        button.disabled = true;
        button.textContent = 'Saving...';
        try {
          await window.SariSyncCategoryDataService.saveCategory({
            id: form.dataset.categoryId,
            name: form.querySelector('.category-name-input').value,
            // Keep the saved position without exposing a technical number
            // field. A dedicated reorder control can be added later.
            displayOrder: form.dataset.displayOrder,
            isActive: form.querySelector('.category-status').textContent === 'Active'
          });
          window.SariSyncToast.show('Category saved');
          await onSaved();
          render(context);
        } catch (error) {
          window.SariSyncToast.show(error.message || 'Could not save category.');
        } finally {
          button.disabled = false;
          button.textContent = 'Save';
        }
      }));

      content.querySelectorAll('.category-archive-button').forEach(button => button.addEventListener('click', async () => {
        const form = button.closest('.category-manage-row');
        const nextActive = button.dataset.nextActive === 'true';
        const originalText = button.textContent;
        const name = form.querySelector('.category-name-input').value;
        const productCount = Number(form.dataset.productCount) || 0;

        if (!nextActive && !await confirmArchive(name, productCount)) return;

        button.disabled = true;
        button.textContent = nextActive ? 'Restoring...' : 'Archiving...';
        try {
          await window.SariSyncCategoryDataService.saveCategory({
            id: form.dataset.categoryId,
            name,
            displayOrder: form.dataset.displayOrder,
            isActive: nextActive
          });
          window.SariSyncToast.show(nextActive ? 'Category restored' : 'Category archived');
          await onSaved();
          render(context);
        } catch (error) {
          window.SariSyncToast.show(error.message || 'Could not change the category status.');
          button.disabled = false;
          button.textContent = originalText;
        }
      }));
    } catch (error) {
      const message = error.message || 'Refresh and try again.';
      const ownerOnly = /only the store owner can manage categories/i.test(message);
      content.innerHTML = `<div class="category-empty"><strong>${ownerOnly ? 'Only the store owner can manage categories.' : 'Unable to load categories'}</strong><span>${escapeHtml(ownerOnly ? 'You can still browse the shared price book, but only the owner can change its category list.' : message)}</span></div>`;
    }
  }

  // If another family device changes a category while this owner page is open,
  // reload its counts and active/archived labels from Supabase.
  document.addEventListener('sariSync:store-data-refreshed', () => {
    if (activeContext && document.getElementById('categoryManageContent')) {
      render(activeContext);
    }
  });

  window.SariSyncCategoryManagement = { render };
})();
