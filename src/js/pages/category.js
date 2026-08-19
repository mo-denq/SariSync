/*
  FILE: src/js/pages/category.js
  CATEGORY PAGE CONTROLLER
  This file powers category.html. It reads the selected category from the URL,
  gets the latest product list saved by Home, shows only matching items, and
  filters the category list when the user searches.
*/
const storage = window.SariSyncLocalStorage;
const session = storage.readJson(storage.KEYS.SESSION, null);
if (!session) window.location.replace('../auth/login.html');

const params = new URLSearchParams(window.location.search);
const categoryName = params.get('name') || 'Category';
const storedProducts = storage.readJson(storage.KEYS.PRODUCTS, []);
const allProducts = window.SariSyncSearchService.filterByCategory(
  storedProducts,
  categoryName
);
const { peso } = window.SariSyncUtils;
const categoryThemes = {
  'BEVERAGES': 'beverages', 'CANNED GOODS': 'canned', 'PANTRY & CONDIMENTS': 'pantry',
  'SNACKS & SWEETS': 'snacks', 'PERSONAL CARE': 'personal-care', 'HOUSEHOLD & GENERAL': 'household',
  'SCHOOL SUPPLIES': 'school', 'VEGETABLES': 'vegetables', 'TOBACCO': 'tobacco'
};

const title = document.getElementById('categoryTitle');
const count = document.getElementById('categoryCount');
const accent = document.getElementById('categoryAccent');
const items = document.getElementById('categoryItems');
const backLink = document.querySelector('.back-link');

backLink?.addEventListener('click', event => {
  event.preventDefault();
  const destination = backLink.href;
  const navigateBack = () => window.location.assign(destination);

  if (window.SariSyncPageTransition) {
    window.SariSyncPageTransition.back(
      document.querySelector('.category-page'),
      navigateBack
    );
  } else {
    navigateBack();
  }
});

title.textContent = categoryName;
document.title = `SariSync — ${categoryName}`;
count.textContent = `${allProducts.length} items`;
accent.classList.add(
  categoryThemes[window.SariSyncCategoryModel.normalizeName(categoryName)] ||
  'beverages'
);

function productMark(product) { return `<span class="product-mark" style="background:${product.tone || '#eef0ed'}" aria-hidden="true"><i></i><i></i><i></i></span>`; }
function render(list) {
  items.innerHTML = list.length ? list.map(product => `<article class="category-item-card"><div class="category-item-main">${productMark(product)}<div><strong>${product.name}</strong><span>Updated ${product.updated || 'recently'}${product.updatedBy ? ` by ${product.updatedBy}` : ''}</span></div></div><div class="category-item-price"><span>RETAIL</span><strong>${peso(product.retail)}</strong>${product.wholesale ? `<small>Wholesale ${peso(product.wholesale)}</small>` : ''}</div></article>`).join('') : `<div class="category-empty"><strong>No matching products</strong><span>Try another search term or add an item to this category.</span></div>`;
}

document.getElementById('itemSearch').addEventListener('input', event => {
  render(window.SariSyncSearchService.searchByName(
    allProducts,
    event.target.value
  ));
});
render(allProducts);
