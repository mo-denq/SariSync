/*
  FILE: src/js/pages/browse.js
  PURPOSE: Browse-page controller for the shared SariSync price book.

  RESPONSIBILITIES:
  - Render the complete product browser.
  - Filter products by category.
  - Search the currently selected category.
  - Use the shared Product Card and Page Header components.

  Product editing remains part of the shared product workflow.
  Browse identifies editable products with data-edit-product attributes.
*/
(function initialiseBrowsePage() {
  let selectedCategory = 'All';
  let pageContext = null;

  function visibleProducts() {
    const { products } = pageContext;
    return window.SariSyncSearchService.filterByCategory(
      products,
      selectedCategory
    );
  }

  function render(context = pageContext) {
    if (!context) return;
    pageContext = context;

    const { screen, categories } = pageContext;
    const alphabeticalCategories = window.SariSyncCategoryModel.sortAlphabetically(categories);
    const visible = visibleProducts();

    window.SariSyncPageHeader.mount(screen, {
      kicker: 'THE FULL PRICE BOOK',
      title: 'Browse &amp; manage items',
      description: 'Browse products, update prices, or edit item details.',
      backTarget: 'Home'
    });
    screen.insertAdjacentHTML('beforeend', `
      <div class="browse-search">
        <input id="browseSearch" type="search" placeholder="Search all products" aria-label="Search all products" />
      </div>
      <div class="category-filter">
        <button class="filter-chip ${selectedCategory === 'All' ? 'active' : ''}" data-browse-category="All" type="button">All items</button>
        ${alphabeticalCategories.map(category => `
          <button class="filter-chip ${selectedCategory === category.name ? 'active' : ''}" data-browse-category="${category.name}" type="button">
            ${category.name}
          </button>
        `).join('')}
      </div>
      <div id="browseList" class="browse-list">
        ${window.SariSyncProductCard.browseRows(visible, {
          peso: window.SariSyncUtils.peso,
          action: 'edit'
        })}
      </div>`);

    const searchField = screen.querySelector('#browseSearch');
    const productList = screen.querySelector('#browseList');

    function renderVisibleProducts() {
      const categoryProducts = visibleProducts();
      const matches = window.SariSyncSearchService.searchByName(
        categoryProducts,
        searchField.value
      );
      productList.innerHTML =
        window.SariSyncProductCard.browseRows(matches, {
          peso: window.SariSyncUtils.peso,
          emptyText: 'No items match that search.',
          action: 'edit'
        });
    }

    searchField?.addEventListener('input', renderVisibleProducts);

    screen.querySelectorAll('[data-browse-category]').forEach(button => {
      button.addEventListener('click', () => {
        selectedCategory = button.dataset.browseCategory;
        screen.querySelectorAll('[data-browse-category]').forEach(item => {
          item.classList.toggle('active', item === button);
        });
        renderVisibleProducts();
      });
    });
  }

  window.SariSyncBrowse = {
    render,
    getSelectedCategory: () => selectedCategory
  };
})();
