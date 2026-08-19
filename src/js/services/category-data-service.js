/*
  FILE: src/js/services/category-data-service.js
  PURPOSE: Keeps owner-only category database actions away from page layout.

  Members can read active categories. Only the active store owner may create,
  rename, archive, or restore a category. The database functions verify that
  rule; this browser service only sends the requested action and turns common
  database messages into clear messages for the person using the app.
*/
(function initialiseCategoryDataService() {
  function client() {
    return window.SariSyncAuthSession.getClient();
  }

  async function getOwnerCategories() {
    const { data, error } = await client().rpc('get_my_owner_categories_with_counts');
    if (error) throw friendlyError(error);
    return Array.isArray(data) ? data : [];
  }

  async function saveCategory(category) {
    const { data, error } = await client().rpc('save_category_for_current_owner', {
      p_category_id: category.id || null,
      p_name: category.name,
      p_display_order: Number(category.displayOrder) || 0,
      p_is_active: category.isActive !== false
    });
    if (error) throw friendlyError(error);
    return Array.isArray(data) ? data[0] : data;
  }

  // Keeps database wording from becoming a confusing technical error toast.
  function friendlyError(error) {
    const message = String(error?.message || 'Could not save category.');
    if (/only the active store owner|permission denied/i.test(message)) {
      return new Error('Only the store owner can manage categories.');
    }
    if (/already exists in this store|duplicate key/i.test(message)) {
      const match = message.match(/([A-Z0-9&/ -]+) already exists/i);
      const name = match ? match[1].trim() : 'This category';
      return new Error(`${name} already exists in this store.`);
    }
    return new Error(message);
  }

  window.SariSyncCategoryDataService = { getOwnerCategories, saveCategory };
})();
