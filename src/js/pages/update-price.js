/*
  FILE: src/js/pages/update-price.js
  PURPOSE: Controls the page where a user finds a product to update.

  RESPONSIBILITIES:
  - Opens the Update Price view inside the shared secondary-page area.
  - Displays the product search field and category filters.
  - Filters products by name, barcode, and selected category.
  - Marks product rows so selecting one opens the existing Edit Item page.
  - Use the shared Product Card and Page Header components.

  The Edit Item form and its save behavior live in edit-product.js and the
  shared Product Form component.
*/
(function initialiseUpdatePricePage() {
  function render(context) {
    if (!context) return;

    const {
      screen,
      homePage,
      setHomeHeader,
      products,
      categories
    } = context;

    setHomeHeader(false);
    homePage.hidden = true;
    screen.hidden = false;
    window.SariSyncPageHeader.mount(screen, {
      kicker: 'UPDATE PRICE',
      title: 'Find a product',
      description: 'Search for the item you want to update.',
      backTarget: 'Home'
    });
    screen.insertAdjacentHTML('beforeend', `
      <div class="browse-search">
        <input
          id="updateSearch"
          type="search"
          placeholder="Search product name or barcode"
          aria-label="Search product to update"
          autofocus
        />
      </div>
      <div class="category-filter update-category-filter">
        <button class="filter-chip active" data-update-category="All" type="button">
          All categories
        </button>
        ${window.SariSyncCategoryModel.sortAlphabetically(categories).map(category => `
          <button class="filter-chip" data-update-category="${category.name}" type="button">
            ${category.name}
          </button>
        `).join('')}
      </div>
      <div id="updateProducts" class="browse-list">
        ${window.SariSyncProductCard.browseRows(products, {
          peso: window.SariSyncUtils.peso,
          emptyText: 'No products found.',
          action: 'edit'
        })}
      </div>
    `);

    let selectedCategory = 'All';
    const searchField = screen.querySelector('#updateSearch');
    const productList = screen.querySelector('#updateProducts');

    function renderMatches() {
      const categoryProducts = window.SariSyncSearchService.filterByCategory(
        products,
        selectedCategory
      );
      const matches = window.SariSyncSearchService.searchProducts(
        categoryProducts,
        searchField.value,
        { fields: ['name', 'barcode'] }
      );

      productList.innerHTML = window.SariSyncProductCard.browseRows(matches, {
        peso: window.SariSyncUtils.peso,
        emptyText: 'No products match that search.',
        action: 'edit'
      });
    }

    searchField.addEventListener('input', renderMatches);

    screen.querySelectorAll('[data-update-category]').forEach(button => {
      button.addEventListener('click', () => {
        selectedCategory = button.dataset.updateCategory;
        screen.querySelectorAll('[data-update-category]').forEach(item => {
          item.classList.toggle('active', item === button);
        });
        renderMatches();
      });
    });
  }

  window.SariSyncUpdatePrice = { render };
})();
