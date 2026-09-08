/*
  FILE: src/js/pages/home.js
  HOME DASHBOARD CONTROLLER
  This file makes index.html interactive. It renders Home cards, searches the
  price book, opens product details, renders Home plus the remaining shared
  in-app views, and passes category data to category.html.
  Browse behavior lives in browse.js, the complete
  update-history view lives in updates.js, store controls live in settings.js,
  account details live in profile.js, price lookup lives in product-details.js,
  the Add Product page lives in add-product.js, product selection for price
  updates lives in update-price.js, and item editing lives in edit-product.js.
  Product forms come from components/product-form.js, Price Pulse rendering
  comes from components/price-pulse.js, and the compact category cards come
  from components/category-preview.js. CSV file actions come from
  services/csv-service.js, and current session/selection information comes
  from state/store.js. Product data comes through product-repository.js; common
  formatting comes from utils.js. Shared view switching is kept in
  src/js/navigation.js, while camera scanning is intentionally kept in
  barcode.js.
*/
const categories = [];
const products = window.SariSyncProductRepository.getAllProducts();
const priceUpdates = [];
let priceHistoryError = null;
const { peso, firstName, initials } = window.SariSyncUtils;
const appState = window.SariSyncState;
const $ = (id) => document.getElementById(id);
const CATEGORY_RETURN_SCROLL_KEY = 'sariSyncCategoryReturnScrollY';
function setHomeHeader(visible) { $('appHeader')?.toggleAttribute('hidden', !visible); }

/*
  HOME AUTHENTICATION GUARD
  Home stays hidden until the shared authentication service confirms a real
  Supabase session. localStorage remains useful for prototype display details,
  but it is never accepted as proof that somebody is signed in.
*/
function setAuthGuardChecking() {
  $('homeAuthTitle').textContent = 'Checking your account...';
  $('homeAuthMessage').textContent =
    'Please wait while SariSync verifies your signed-in session.';
  $('homeAuthRetry').hidden = true;
  document.querySelector('.home-auth-spinner')?.removeAttribute('hidden');
}

function showAuthGuardError() {
  $('homeAuthTitle').textContent = 'Unable to check your account';
  $('homeAuthMessage').textContent =
    'Check your internet connection, then try again.';
  $('homeAuthRetry').hidden = false;
  document.querySelector('.home-auth-spinner')?.setAttribute('hidden', '');
}

function showPriceBookLoadError(error) {
  $('homeAuthTitle').textContent = 'Unable to load your price book';
  $('homeAuthMessage').textContent = error?.message ||
    'Check your connection, then try again.';
  $('homeAuthRetry').hidden = false;
  document.querySelector('.home-auth-spinner')?.setAttribute('hidden', '');
}

function replaceCategories(nextCategories) {
  categories.splice(0, categories.length, ...nextCategories);
}

function replacePriceUpdates(nextPriceUpdates, nextError = null) {
  priceUpdates.splice(0, priceUpdates.length, ...(nextPriceUpdates || []));
  priceHistoryError = nextError;
}

function applyLoadedPriceBook(priceBook, nextPriceUpdates = [], nextPriceHistoryError = null) {
  window.SariSyncProductRepository.replaceAllProducts(priceBook.products);
  replaceCategories(priceBook.categories);
  replacePriceUpdates(nextPriceUpdates, nextPriceHistoryError);

  // Replace any old browser cache so category pages cannot reopen a previous
  // demo list after the real store price book has loaded.
  window.SariSyncLocalStorage.saveJson(
    window.SariSyncLocalStorage.KEYS.PRODUCTS,
    priceBook.products
  );

  // Save a device-only fallback after every successful cloud load. The cache
  // is scoped to the store code so it cannot be reused for another store.
  window.SariSyncOfflinePriceBook?.savePriceBook?.({
    storeCode: appState.getSession()?.storeCode,
    priceBook,
    recentPriceUpdates: nextPriceUpdates
  });
}

function setConnectionStatus({ offline = false, savedAt = null } = {}) {
  const button = $('syncButton');
  const label = $('syncText');
  if (!button || !label) return;

  button.classList.toggle('is-offline', offline);
  button.disabled = offline;
  button.title = offline ? 'Offline: showing the latest saved copy on this device.' : '';
  label.textContent = offline ? 'Offline' : 'Synced';

  if (offline && savedAt) {
    window.SariSyncToast?.show(`Offline: showing prices saved ${window.SariSyncOfflinePriceBook.formatSavedAt(savedAt)}.`);
  }
}

function showCachedPriceBook(cached) {
  applyLoadedPriceBook(cached.priceBook, cached.recentPriceUpdates || []);
  renderHome();
  applySessionDisplay();
  $('homeAuthGuard').hidden = true;
  $('appShell').hidden = false;
  setConnectionStatus({ offline: true, savedAt: cached.savedAt });
  openRequestedProduct();
}

/* Price Pulse is a helpful dashboard section, but it must not stop the entire
   price book from opening if only its history request is temporarily unavailable. */
async function loadPriceBookAndPulse() {
  const priceBook = await window.SariSyncProductDataService.loadCurrentStorePriceBook();

  try {
    const recentPriceUpdates = await window.SariSyncProductDataService.loadRecentPriceUpdates();
    return { priceBook, recentPriceUpdates, priceHistoryError: null };
  } catch (error) {
    console.warn('Price Pulse history could not load:', error);
    return { priceBook, recentPriceUpdates: [], priceHistoryError: error };
  }
}

function showCsvImportStatus(detail) {
  const status = $('csvImportStatus');
  if (!status || !detail?.message) return;

  status.hidden = false;
  status.textContent = detail.message;
  status.dataset.state = detail.state || 'info';
}

async function refreshPriceBookAfterCsvImport(event) {
  showCsvImportStatus({
    message: 'Import succeeded. Refreshing your price book...',
    state: 'info'
  });

  try {
    const { priceBook, recentPriceUpdates, priceHistoryError: historyError } = await loadPriceBookAndPulse();
    applyLoadedPriceBook(priceBook, recentPriceUpdates, historyError);
    renderHome();
    showCsvImportStatus({
      message: `${event.detail?.message || 'Import succeeded.'} Your price book is ready.`,
      state: 'success'
    });
  } catch (error) {
    showCsvImportStatus({
      message: `Imported, but the screen could not refresh: ${error?.message || 'try refreshing the page.'}`,
      state: 'error'
    });
  }
}

/* Reload the shared Supabase data after one product is added so Home, Browse,
   and category pages use the same real list immediately. */
async function refreshPriceBookAfterProductSave(saveResult = null) {
  if (saveResult?.queued) {
    /* Keep the visible offline edit in the saved device copy. The outbox will
       call Supabase after reconnection, then Home reloads the official copy. */
    window.SariSyncOfflinePriceBook?.savePriceBook?.({
      storeCode: appState.getSession()?.storeCode,
      priceBook: { categories, products },
      recentPriceUpdates: priceUpdates
    });
    renderHome();
    setConnectionStatus({ offline: true });
    return;
  }

  const { priceBook, recentPriceUpdates, priceHistoryError: historyError } = await loadPriceBookAndPulse();
  applyLoadedPriceBook(priceBook, recentPriceUpdates, historyError);
  renderHome();
}

/* Runs after a normal cloud load or an online event. It sends each stored
   existing-product edit through the same protected Supabase function used by
   a normal Save changes click, then reloads the official store price book. */
async function syncPendingOfflineEdits() {
  const result = await window.SariSyncOfflineEditQueue?.flushForCurrentUser?.();
  if (!result?.syncedCount) return result;

  const { priceBook, recentPriceUpdates, priceHistoryError: historyError } = await loadPriceBookAndPulse();
  applyLoadedPriceBook(priceBook, recentPriceUpdates, historyError);
  renderHome();
  window.SariSyncToast?.show(
    `${result.syncedCount} offline ${result.syncedCount === 1 ? 'change' : 'changes'} synced to the shared price book.`
  );
  return result;
}

/* REAL-TIME STORE REFRESH
   This is called by the shared Realtime service after another device changes a
   product, category, or saved price-history record. It reloads the source of
   truth from Supabase instead of trusting the event payload, then refreshes
   only the visible list or category selector so an unfinished product form is
   not erased. */
function refreshOpenProductCategorySelector() {
  const selector = $('secondaryPage')?.querySelector('#productCategory');
  if (!selector) return;

  const previousSelection = selector.value;
  selector.innerHTML = window.SariSyncCategoryModel.sortAlphabetically(categories)
    .map(category => `<option value="${category.name}">${category.name}</option>`)
    .join('');

  if (Array.from(selector.options).some(option => option.value === previousSelection)) {
    selector.value = previousSelection;
  }
}

function refreshVisibleStoreViewAfterRealtime() {
  const home = $('homePage');
  const screen = $('secondaryPage');

  if (!home?.hidden) {
    renderHome();
  } else if (screen?.querySelector('#browseList')) {
    window.SariSyncBrowse.render({ screen, products, categories });
  } else if (screen?.querySelector('.update-list')) {
    window.SariSyncUpdates.render({
      screen,
      priceUpdates,
      peso,
      productCard: window.SariSyncProductCard,
      priceHistoryError,
      onRetry: () => window.location.reload()
    });
  } else if (screen?.querySelector('#updateProducts')) {
    renderUpdatePage();
  }

  // Add Product and Edit Item keep their typed values, while their category
  // dropdown receives the newly active categories from the other device.
  refreshOpenProductCategorySelector();
  document.dispatchEvent(new CustomEvent('sariSync:store-data-refreshed'));
}

async function refreshPriceBookFromRealtime() {
  const { priceBook, recentPriceUpdates, priceHistoryError: historyError } = await loadPriceBookAndPulse();
  applyLoadedPriceBook(priceBook, recentPriceUpdates, historyError);
  refreshVisibleStoreViewAfterRealtime();
  window.SariSyncToast.show('Price book updated by another device.');
}

// HOME GREETING: Uses the device's local clock, so it stays correct throughout
// the day without asking a family member to refresh or change it manually.
let homeClockTimer = null;

function getTimeBasedGreeting(hour) {
  if (hour >= 5 && hour < 12) return 'Magandang umaga';
  if (hour >= 12 && hour < 18) return 'Magandang hapon';
  return 'Magandang gabi';
}

function refreshHomeDateTime() {
  const now = new Date();
  const dateText = new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(now).replace(',', ' ·');

  const dateTime = $('homeDateTime');
  const greeting = $('greetingText');
  if (dateTime) dateTime.textContent = dateText;
  if (greeting) greeting.textContent = getTimeBasedGreeting(now.getHours());
}

function startHomeClock() {
  if (homeClockTimer) window.clearInterval(homeClockTimer);
  refreshHomeDateTime();
  homeClockTimer = window.setInterval(refreshHomeDateTime, 60000);
}

function applySessionDisplay() {
  if (!appState.getSession()) return;

  const displayName = appState.getActiveDeviceName();
  $('storeLabel').textContent = appState.getActiveStoreName();
  $('greetingName').textContent = firstName(displayName);
  $('avatarInitials').textContent = initials(displayName);
  startHomeClock();
}

async function checkHomeAuthentication() {
  setAuthGuardChecking();

  let session;
  try {
    session = await window.SariSyncAuthSession.getSession();
  } catch (error) {
    const cachedSession = await window.SariSyncAuthSession.getCachedSession().catch(() => null);
    const cached = window.SariSyncOfflinePriceBook?.getCachedPriceBook?.(appState.getSession()?.storeCode);
    if (cachedSession && cached && window.SariSyncOfflinePriceBook?.isLikelyNetworkError?.(error)) {
      showCachedPriceBook(cached);
      return;
    }
    showAuthGuardError();
    return;
  }

  if (!session) {
    window.SariSyncAuthSession.clearPrototypeSession();
    window.location.replace(window.SariSyncAuthSession.getLoginPageUrl());
    return;
  }

  /* A valid Supabase session may outlive manually cleared prototype data.
     Let Login rebuild the store display session in that rare case. */
  if (!appState.getSession()) {
    window.location.replace(window.SariSyncAuthSession.getLoginPageUrl());
    return;
  }

  try {
    const { priceBook, recentPriceUpdates, priceHistoryError: historyError } = await loadPriceBookAndPulse();

    applyLoadedPriceBook(priceBook, recentPriceUpdates, historyError);
    renderHome();
    applySessionDisplay();
    $('homeAuthGuard').hidden = true;
    $('appShell').hidden = false;
    setConnectionStatus();

    let guideRecoveryReady = false;
    try {
      const recovery = await syncPendingOfflineEdits();
      guideRecoveryReady = !recovery?.pendingCount;
    } catch (error) {
      /* The edit remains in the device queue if a reconnect is brief or
         unstable. The next successful connection will try it again. */
      console.warn('Offline changes could not sync yet:', error);
    }
    openRequestedProduct();
    if (guideRecoveryReady && !historyError) window.SariSyncQuickGuide?.showAfterLoad(session.user.id);

    /* Registering the device is a helpful audit detail, not a condition for
       looking up prices. If the five-device limit is reached, Home remains
       usable and a later product edit simply records no device ID. */
    window.SariSyncDeviceService?.ensureCurrentDevice?.().catch(error => {
      console.warn('Device registration could not finish:', error);
      window.SariSyncToast?.show(
        window.SariSyncFeedback?.messageFor(
          error,
          'This device could not be registered. Price lookup still works.'
        )
      );
    });

    // A failed live connection should never prevent price lookup. The app can
    // still be used normally and can be refreshed if real-time is unavailable.
    window.SariSyncRealtime?.start?.({ onStoreChange: refreshPriceBookFromRealtime })
      .catch(error => console.warn('Real-time price-book sync could not start:', error));
  } catch (error) {
    const cached = window.SariSyncOfflinePriceBook?.getCachedPriceBook?.(appState.getSession()?.storeCode);
    if (cached && window.SariSyncOfflinePriceBook?.isLikelyNetworkError?.(error)) {
      showCachedPriceBook(cached);
      return;
    }
    showPriceBookLoadError(error);
  }
}

$('homeAuthRetry').addEventListener('click', checkHomeAuthentication);
window.addEventListener('online', () => {
  if (!$('appShell')?.hidden) {
    window.SariSyncToast?.show('Back online. Refreshing your price book...');
    checkHomeAuthentication();
  }
});
window.addEventListener('offline', () => {
  if (!$('appShell')?.hidden) setConnectionStatus({ offline: true });
});
document.addEventListener('sariSync:csv-import-status', event => {
  showCsvImportStatus(event.detail);
});
document.addEventListener('sariSync:csv-imported', refreshPriceBookAfterCsvImport);
checkHomeAuthentication();

function renderAddProductPage() {
  window.SariSyncAddProduct.render({
    screen: $('secondaryPage'),
    homePage: $('homePage'),
    setHomeHeader,
    categories,
    activeDeviceName: appState.getActiveDeviceName(),
    onSaved: refreshPriceBookAfterProductSave
  });
}

function renderUpdatePage() {
  window.SariSyncUpdatePrice.render({
    screen: $('secondaryPage'),
    homePage: $('homePage'),
    setHomeHeader,
    products,
    categories
  });
}

function renderEditProductPage(product, options = {}) {
  appState.setSelectedProduct(product);
  window.SariSyncEditProduct.render({
    product: appState.getSelectedProduct(),
    screen: $('secondaryPage'),
    homePage: $('homePage'),
    setHomeHeader,
    categories,
    activeDeviceName: appState.getActiveDeviceName(),
    onSaved: refreshPriceBookAfterProductSave,
    onArchived: refreshPriceBookAfterProductSave,
    onMissingProduct: renderUpdatePage,
    onBack: options.onBack,
    backTarget: options.backTarget || 'Browse'
  });
}

function renderProfilePage() {
  window.SariSyncProfile.render({
    screen: $('secondaryPage'),
    homePage: $('homePage'),
    session: appState.getSession() || {},
    activeDeviceName: appState.getActiveDeviceName(),
    setHomeHeader
  });
}

function renderCategoryManagementPage() {
  window.SariSyncCategoryManagement.render({
    screen: $('secondaryPage'),
    homePage: $('homePage'),
    setHomeHeader,
    onSaved: refreshPriceBookAfterProductSave
  });
}

function renderFamilyAccessPage() {
  window.SariSyncFamilyAccess.render({
    screen: $('secondaryPage'),
    homePage: $('homePage'),
    setHomeHeader
  });
}

/* Opens the owner-only archive list from Settings. The list is loaded fresh
   from Supabase so it never relies on old browser product data. */
function renderArchivedProductsPage() {
  window.SariSyncArchivedProducts.render({
    screen: $('secondaryPage'),
    homePage: $('homePage'),
    setHomeHeader,
    peso,
    onRestored: refreshPriceBookAfterProductSave
  });
}

function renderHome() {
  /* A soft-deleted product keeps its old audit records, but it should not take
     a spot in the active Home Price Pulse after it has been archived. The
     protected Updates query uses the same active-product rule. */
  const activeProductIds = new Set(products.map(product => product.id));
  const activePriceUpdates = priceUpdates.filter(update => activeProductIds.has(update.productId));

  window.SariSyncPricePulse.render({
    container: $('updatesList'),
    // Price Pulse must receive saved price-history records, not the current
    // product list. Using `products` here made the real Supabase updates look
    // empty even though `price_updates` already contained records.
    priceUpdates: activePriceUpdates,
    peso,
    productCard: window.SariSyncProductCard,
    activeDeviceName: appState.getActiveDeviceName(),
    onEmptyAction: () => window.SariSyncNavigation.goTo('Browse'),
    priceHistoryError,
    onRetry: () => window.location.reload()
  });
  const previewLimit = window.innerWidth >= 600 ? 6 : 4;
  window.SariSyncCategoryPreview.render({
    container: $('categoryGrid'),
    categories,
    products,
    limit: previewLimit,
    categoryModel: window.SariSyncCategoryModel
  });
}

let productReturnCategory = null;

// Consume category links only after authentication and store data are ready.
function openRequestedProduct() {
  const url = new URL(window.location.href);
  const id = url.searchParams.get('product');
  if (!id) return;
  productReturnCategory = url.searchParams.get('fromCategory');
  url.searchParams.delete('product');
  url.searchParams.delete('fromCategory');
  window.history.replaceState(window.history.state, '', url);
  if (!window.SariSyncProductRepository.findProductById(id)) {
    window.SariSyncToast.show('This product is no longer available in your active price book.');
    return;
  }
  showProduct(id);
}

function showProduct(id, options = {}) {
  const product = window.SariSyncProductRepository.findProductById(id);
  if (!product) return;

  appState.setSelectedProduct(product);
  window.SariSyncProductDetails.render({
    screen: $('secondaryPage'),
    homePage: $('homePage'),
    peso,
    setHomeHeader,
    fromBarcode: options.fromBarcode === true,
    onBack: productReturnCategory ? () => {
      const name = productReturnCategory;
      productReturnCategory = null;
      openCategoryPage(name);
    } : null
  });
  // Begin lookup at its heading even if Home was scrolled to Categories.
  $('appShell')?.querySelector('.app')?.scrollTo({ top: 0, behavior: 'auto' });
}
function searchProducts(query) {
  if (!String(query).trim()) {
    $('searchResults').innerHTML = '';
    return;
  }
  const found = window.SariSyncSearchService.searchProducts(products, query, {
    fields: ['name', 'category', 'barcode'],
    limit: 5
  });
  $('searchResults').innerHTML = window.SariSyncProductCard.searchRows(found, { peso });
}
function openCategoryPage(category) {
  try {
    // The SariSync app frame is the scroll container. Save its position so a
    // person returns to the same spot after opening a separate category page.
    sessionStorage.setItem(CATEGORY_RETURN_SCROLL_KEY, String($('appShell')?.querySelector('.app')?.scrollTop || 0));
  } catch {
    /* The category page still opens if private browsing blocks storage. */
  }
  window.SariSyncLocalStorage.saveJson(
    window.SariSyncLocalStorage.KEYS.PRODUCTS,
    products
  );
  window.location.href = `pages/categories/category.html?name=${encodeURIComponent(category)}`;
}

function restoreCategoryReturnPosition() {
  const currentUrl = new URL(window.location.href);
  if (currentUrl.searchParams.get('restoreScroll') !== 'category') return;

  let savedPosition = 0;
  try {
    savedPosition = Number(sessionStorage.getItem(CATEGORY_RETURN_SCROLL_KEY)) || 0;
    sessionStorage.removeItem(CATEGORY_RETURN_SCROLL_KEY);
  } catch {
    savedPosition = 0;
  }

  currentUrl.searchParams.delete('restoreScroll');
  window.history.replaceState(window.history.state, '', currentUrl);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const appScrollArea = $('appShell')?.querySelector('.app');
      if (appScrollArea) appScrollArea.scrollTo({ top: savedPosition, behavior: 'auto' });
      document.documentElement.classList.remove('restoring-category-scroll');
      window.history.scrollRestoration = 'auto';
    });
  });
}
function renderSecondaryPage(page) {
  productReturnCategory = null;
  const home = $('homePage'); const screen = $('secondaryPage');
  if (page === 'Home') { setHomeHeader(true); home.hidden = false; screen.hidden = true; return; }
  setHomeHeader(false);
  home.hidden = true; screen.hidden = false;
  if (page === 'Settings') {
    window.SariSyncSettings.render({
      screen,
      activeStoreName: appState.getActiveStoreName(),
      productCount: products.length,
      categoryCount: categories.length,
      storeCode: appState.getSession()?.storeCode || 'Not available',
      csvService: window.SariSyncCsvService,
      onFamilyAccess: renderFamilyAccessPage,
      onCategoryManagement: renderCategoryManagementPage,
      onArchivedProducts: renderArchivedProductsPage,
      isOwner: String(appState.getSession()?.role || '').toLowerCase() === 'owner'
    });
    return;
  }
  if (page === 'Browse') {
    window.SariSyncBrowse.render({ screen, products, categories });
  } else if (page === 'Updates') {
    window.SariSyncUpdates.render({
      screen,
      priceUpdates,
      peso,
      productCard: window.SariSyncProductCard,
      priceHistoryError,
      onRetry: () => window.location.reload()
    });
  }
}
document.addEventListener('click', (e) => {
  const editProduct = e.target.closest('[data-edit-product]'); if (editProduct) {
    const fromUpdatePrice = Boolean(editProduct.closest('#updateProducts'));
    renderEditProductPage(
      window.SariSyncProductRepository.findProductById(editProduct.dataset.editProduct),
      fromUpdatePrice
        ? { onBack: renderUpdatePage }
        : { backTarget: 'Browse' }
    );
    return;
  }
  if (e.target.closest('#editProduct')) {
    const selectedProduct = appState.getSelectedProduct();
    renderEditProductPage(selectedProduct, {
      onBack: () => showProduct(selectedProduct?.id)
    });
    return;
  }
  const profileButton = e.target.closest('[data-profile]'); if (profileButton) { renderProfilePage(); return; }
  const setting = e.target.closest('[data-setting]'); if (setting) { window.SariSyncToast.show(`${setting.dataset.setting} will be available in the connected app`); return; }
  const productButton = e.target.closest('[data-product]'); if (productButton) { showProduct(productButton.dataset.product); return; }
  const categoryButton = e.target.closest('[data-category]'); if (categoryButton) { openCategoryPage(categoryButton.dataset.category); return; }
});
$('searchInput').addEventListener('input', e => searchProducts(e.target.value));
$('searchInput').addEventListener('keydown', e => { if (e.key === 'Escape') { e.target.value = ''; searchProducts(''); } });
$('addButton').addEventListener('click', renderAddProductPage);
$('avatarInitials').addEventListener('click', renderProfilePage);
$('syncButton').addEventListener('click', () => { $('syncText').textContent = 'Syncing...'; setTimeout(() => { $('syncText').textContent = 'Synced'; window.SariSyncToast.show('All family devices are up to date'); }, 650); });
window.SariSyncCsvService.initialise({
  importInput: $('importInput'),
  products
});
$('exportButton').addEventListener('click', window.SariSyncCsvService.exportPriceBook);
$('importButton').addEventListener('click', window.SariSyncCsvService.openImportPicker);
document.getElementById('quickUpdatePrice').addEventListener('click', () => renderUpdatePage());
document.getElementById('quickAddProduct').addEventListener('click', () => renderAddProductPage());
document.getElementById('quickScanBarcode').addEventListener('click', () => window.SariSyncBarcode?.open());
restoreCategoryReturnPosition();
window.SariSync = { products, searchProducts, showProduct, refreshPriceBookFromRealtime };

