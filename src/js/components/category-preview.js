/*
  FILE: src/js/components/category-preview.js
  PURPOSE: Renders the compact category-card preview shown on the Home page.

  RESPONSIBILITIES:
  - Show only the number of categories requested by Home.
  - Count matching products without letter-case differences.
  - Preserve each category's existing label, color class, and click attribute.

  BEGINNER NOTE:
  This component only creates category-card markup. Home still decides the
  responsive preview limit and handles what happens after a card is selected.
*/
(function initialiseCategoryPreview() {
  function render(options) {
    const {
      container,
      categories,
      products,
      limit,
      categoryModel
    } = options;

    container.innerHTML = categories.slice(0, limit).map(category => {
      const count = products.filter(product =>
        categoryModel.matches(product.category, category.name)
      ).length;

      return `<button class="category-card ${category.className}" data-category="${category.name}" type="button"><span class="category-mark" aria-hidden="true"></span><strong>${category.name}</strong><span>${count} products</span><i class="arrow">›</i></button>`;
    }).join('');
  }

  window.SariSyncCategoryPreview = { render };
})();
