/*
  FILE: tests/app-modules.test.js
  PURPOSE: Checks SariSync's shared data and service modules without opening
  the browser or connecting to Supabase.

  BEGINNER NOTE:
  A test supplies small sample values, runs existing application functions,
  and confirms that the result is what SariSync expects. If a future change
  accidentally breaks a rule, `npm test` will identify the affected section.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function loadFresh(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
  delete require.cache[require.resolve(fullPath)];
  require(fullPath);
}

function resetBrowserWindow() {
  global.window = {};
}

test('App Constants keep the approved Version 1 fixed values', () => {
  resetBrowserWindow();
  loadFresh('src/js/constants/app-constants.js');

  const constants = window.SariSyncConstants;
  assert.equal(constants.MAX_ACTIVE_ACCOUNTS, 5);
  assert.equal(constants.MAX_ACTIVE_DEVICES, 5);
  assert.equal(constants.TOAST_DURATION_MS, 2600);
  assert.equal(constants.CSV_BACKUP_FILENAME, 'sarisync-price-book.csv');
  assert.deepEqual(constants.CSV_COLUMNS, [
    'Barcode',
    'Item Name',
    'Category',
    'Cost Price',
    'Retail Price',
    'Wholesale Price',
    'Bottle Deposit',
    'Notes'
  ]);
  assert.equal(constants.DEFAULT_PRODUCT_CATEGORY, 'Beverages');
  assert.equal(constants.DEFAULT_PRODUCT_TONE, '#eee5fa');
  assert.equal(Object.isFrozen(constants), true);
});

test('Product Model normalizes fields and rejects invalid products', () => {
  resetBrowserWindow();
  loadFresh('src/js/constants/app-constants.js');
  loadFresh('src/js/models/product.js');

  const model = window.SariSyncProductModel;
  const product = model.normalize({
    name: '  sample item  ',
    category: 'Beverages',
    barcode: ' 12345 ',
    costPrice: '',
    retail: '15.50',
    wholesale: '',
    bottleDeposit: '',
    notes: ' Per piece '
  });

  assert.equal(product.name, 'SAMPLE ITEM');
  assert.equal(product.barcode, '12345');
  assert.equal(product.costPrice, 0);
  assert.equal(product.retail, 15.5);
  assert.equal(product.wholesale, null);
  assert.equal(product.bottleDeposit, 0);
  assert.equal(product.notes, 'Per piece');
  assert.equal(model.validate(product).isValid, true);
  assert.equal(model.validate({ name: '', retail: 10 }).isValid, false);
  assert.equal(
    model.validate({ name: 'ITEM', retail: -1 }).isValid,
    false
  );
});

test('Product Repository gets, finds, adds, and updates mock products', () => {
  resetBrowserWindow();
  loadFresh('src/js/constants/app-constants.js');
  loadFresh('src/js/models/product.js');

  window.SariSyncData = {
    products: [{
      id: 1,
      name: 'FIRST ITEM',
      category: 'Beverages',
      costPrice: 8,
      retail: 10,
      wholesale: null,
      bottleDeposit: 0,
      barcode: '',
      notes: ''
    }]
  };
  loadFresh('src/js/repositories/product-repository.js');

  const repository = window.SariSyncProductRepository;
  repository.replaceAllProducts(window.SariSyncData.products);
  assert.equal(repository.isCloudDataLoaded(), true);
  assert.equal(repository.getAllProducts().length, 1);
  assert.equal(repository.findProductById('1').name, 'FIRST ITEM');

  const added = repository.addProduct({
    name: ' second item ',
    category: 'Canned Goods',
    retail: 20
  });
  assert.equal(repository.getAllProducts()[0], added);
  assert.equal(added.name, 'SECOND ITEM');

  const originalId = added.id;
  const updated = repository.updateProduct(originalId, { retail: 22 });
  assert.equal(updated.id, originalId);
  assert.equal(updated.retail, 22);
  assert.equal(repository.updateProduct('missing', { retail: 5 }), null);
});

test('Search Service finds partial text, categories, and exact barcodes', () => {
  resetBrowserWindow();
  loadFresh('src/js/models/category.js');
  loadFresh('src/js/services/search-service.js');

  const products = [
    {
      id: 1,
      name: 'LUCKY ME PANCIT CANTON',
      category: 'Snacks & Sweets',
      barcode: '480001'
    },
    {
      id: 2,
      name: 'BEAR BRAND',
      category: 'Beverages',
      barcode: '480002'
    }
  ];
  const search = window.SariSyncSearchService;

  assert.equal(search.searchByName(products, 'canton').length, 1);
  assert.equal(search.searchByCategory(products, 'bever').length, 1);
  assert.equal(
    search.filterByCategory(products, ' beverages ')[0].id,
    2
  );
  assert.equal(search.filterByCategory(products, 'All').length, 2);
  assert.equal(search.findByBarcode(products, ' 480001 ').id, 1);
  assert.equal(search.findByBarcode(products, ''), null);
});

test('Barcode scanner keeps product formats and has a cross-browser fallback', () => {
  const barcodeSource = fs.readFileSync(
    path.join(projectRoot, 'src/js/services/barcode.js'),
    'utf8'
  );
  const homeHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');

  assert.match(barcodeSource, /PRODUCT_BARCODE_FORMATS/);
  assert.match(barcodeSource, /EAN_13/);
  assert.match(barcodeSource, /BrowserMultiFormatOneDReader/);
  assert.match(barcodeSource, /openFallbackScanner/);
  assert.doesNotMatch(barcodeSource, /QR_CODE/);
  assert.match(homeHtml, /@zxing\/browser@0\.2\.1/);
});

test('CSV Service preserves column order and blank optional fields', () => {
  resetBrowserWindow();
  loadFresh('src/js/constants/app-constants.js');
  loadFresh('src/js/services/csv-service.js');

  const csv = window.SariSyncCsvService.buildCsv([{
    barcode: '',
    name: 'TEST ITEM',
    category: 'Beverages',
    costPrice: 8,
    retail: 10,
    wholesale: null,
    bottleDeposit: '',
    notes: 'Size "small"'
  }]);
  const [header, row] = csv.split('\n');

  assert.equal(
    header,
    '"Barcode","Item Name","Category","Cost Price","Retail Price",' +
      '"Wholesale Price","Bottle Deposit","Notes"'
  );
  assert.equal(
    row,
    '"","TEST ITEM","Beverages","8","10","","","Size ""small"""'
  );
});

test('CSV Service prepares the agreed product columns for secure import', () => {
  resetBrowserWindow();
  loadFresh('src/js/constants/app-constants.js');
  loadFresh('src/js/services/csv-service.js');

  const rows = window.SariSyncCsvService.prepareImportRows(
    '\uFEFFBarcode,Item Name,Category,Cost Price,Retail Price,Wholesale Price,Bottle Deposit,Notes\n' +
    '480001,Test product,Pantry & Condiments,\u20b110.00,\u20b115.50,,,"Counter, near rice"\n' +
    ',Second item,Beverages,,20.00,,1.00,'
  );

  assert.deepEqual(rows, [
    {
      barcode: '480001',
      'item name': 'Test product',
      category: 'Pantry & Condiments',
      'cost price': 10,
      'retail price': 15.5,
      'wholesale price': null,
      'bottle deposit': null,
      notes: 'Counter, near rice'
    },
    {
      barcode: '',
      'item name': 'Second item',
      category: 'Beverages',
      'cost price': null,
      'retail price': 20,
      'wholesale price': null,
      'bottle deposit': 1,
      notes: ''
    }
  ]);

  assert.throws(
    () => window.SariSyncCsvService.prepareImportRows('Item Name,Category\nITEM,BEVERAGES'),
    /Missing required column: retail price/i
  );
});

test('Product Data Service maps only the signed-in store price book', async () => {
  resetBrowserWindow();
  loadFresh('src/js/constants/app-constants.js');

  let requestedFunction = '';
  window.SariSyncAuthSession = {
    getClient() {
      return {
        async rpc(functionName) {
          requestedFunction = functionName;
          return {
            error: null,
            data: [{
              categories: [{
                id: 'category-1',
                name: 'BEVERAGES',
                display_order: 1
              }],
              products: [{
                id: 'product-1',
                category_id: 'category-1',
                barcode: '480001',
                item_name: 'TEST DRINK',
                category_name: 'BEVERAGES',
                cost_price: 10,
                retail_price: 15,
                wholesale_price: null,
                bottle_deposit: null,
                notes: 'Per bottle',
                updated_by_name: 'Nida Escalante',
                updated_at: '2026-08-14T01:00:00Z',
                created_at: '2026-08-14T01:00:00Z'
              }]
            }]
          };
        }
      };
    }
  };

  loadFresh('src/js/services/product-data-service.js');
  const priceBook = await window.SariSyncProductDataService
    .loadCurrentStorePriceBook();

  assert.equal(requestedFunction, 'get_my_active_price_book');
  assert.equal(priceBook.categories[0].name, 'BEVERAGES');
  assert.equal(priceBook.categories[0].className, 'beverages');
  assert.equal(priceBook.products[0].name, 'TEST DRINK');
  assert.equal(priceBook.products[0].retail, 15);
  assert.equal(priceBook.products[0].direction, 'same');
});

test('Product Data Service loads saved Price Pulse records and archives through protected functions', async () => {
  resetBrowserWindow();
  loadFresh('src/js/constants/app-constants.js');

  const calledFunctions = [];
  window.SariSyncAuthSession = {
    getClient() {
      return {
        async rpc(functionName, parameters) {
          calledFunctions.push({ functionName, parameters });
          if (functionName === 'get_my_recent_price_updates') {
            return {
              error: null,
              data: [{
                price_update_id: 'update-1',
                product_id: 'product-1',
                product_name: 'TEST ITEM',
                previous_retail_price: 10,
                new_retail_price: 12,
                updated_by_name: 'Nida Escalante',
                updated_at: '2026-08-15T05:00:00Z'
              }]
            };
          }
          return { error: null, data: [{ product_id: parameters.p_product_id }] };
        }
      };
    }
  };

  loadFresh('src/js/services/product-data-service.js');
  const updates = await window.SariSyncProductDataService.loadRecentPriceUpdates();
  const archived = await window.SariSyncProductDataService.archiveProductForCurrentUser('product-1');

  assert.equal(calledFunctions[0].functionName, 'get_my_recent_price_updates');
  assert.equal(updates[0].name, 'TEST ITEM');
  assert.equal(updates[0].direction, 'up');
  assert.equal(calledFunctions[1].functionName, 'archive_product_for_current_user');
  assert.deepEqual(calledFunctions[1].parameters, { p_product_id: 'product-1' });
  assert.equal(archived.product_id, 'product-1');
});

test('Local Storage reads, saves, removes, and uses safe JSON fallbacks', () => {
  const savedValues = new Map();
  global.localStorage = {
    getItem(key) {
      return savedValues.has(key) ? savedValues.get(key) : null;
    },
    setItem(key, value) {
      savedValues.set(key, String(value));
    },
    removeItem(key) {
      savedValues.delete(key);
    }
  };
  resetBrowserWindow();
  loadFresh('src/js/storage/local-storage.js');

  const storage = window.SariSyncLocalStorage;
  const session = { storeName: 'Test Store', deviceName: 'Mom' };

  assert.equal(storage.KEYS.SESSION, 'sariSyncSession');
  assert.equal(storage.readJson(storage.KEYS.SESSION, null), null);
  assert.equal(storage.saveJson(storage.KEYS.SESSION, session), true);
  assert.deepEqual(storage.readJson(storage.KEYS.SESSION), session);

  savedValues.set('damagedJson', '{not valid json');
  assert.deepEqual(storage.readJson('damagedJson', []), []);

  assert.equal(storage.remove(storage.KEYS.SESSION), true);
  assert.equal(storage.readJson(storage.KEYS.SESSION, null), null);
});

test('Offline price-book cache keeps one store saved copy separate from another', () => {
  const savedValues = new Map();
  global.localStorage = {
    getItem(key) { return savedValues.has(key) ? savedValues.get(key) : null; },
    setItem(key, value) { savedValues.set(key, String(value)); },
    removeItem(key) { savedValues.delete(key); }
  };
  const originalNavigator = Object.getOwnPropertyDescriptor(global, 'navigator');
  Object.defineProperty(global, 'navigator', {
    configurable: true,
    value: { onLine: false }
  });
  resetBrowserWindow();
  loadFresh('src/js/storage/local-storage.js');
  loadFresh('src/js/services/offline-price-book-service.js');

  const offline = window.SariSyncOfflinePriceBook;
  assert.equal(offline.savePriceBook({
    storeCode: '4yz-a1b2c3d4',
    priceBook: { products: [{ name: 'RICE', retail: 60 }], categories: [{ name: 'PANTRY' }] },
    recentPriceUpdates: [{ productId: 'rice-1' }]
  }), true);
  assert.equal(offline.getCachedPriceBook('OTHER-STORE'), null);

  const cached = offline.getCachedPriceBook('4YZ-A1B2C3D4');
  assert.equal(cached.priceBook.products[0].name, 'RICE');
  cached.priceBook.products[0].name = 'CHANGED ONLY IN TEST';
  assert.equal(offline.getCachedPriceBook('4YZ-A1B2C3D4').priceBook.products[0].name, 'RICE');
  assert.equal(offline.isLikelyNetworkError(new Error('Failed to fetch')), true);
  assert.throws(() => offline.requireOnlineForChange(), /You are offline/);
  if (originalNavigator) Object.defineProperty(global, 'navigator', originalNavigator);
  else delete global.navigator;
});

test('Offline edit queue keeps only the latest unsent edit for one product and account', () => {
  const savedValues = new Map();
  global.localStorage = {
    getItem(key) { return savedValues.has(key) ? savedValues.get(key) : null; },
    setItem(key, value) { savedValues.set(key, String(value)); },
    removeItem(key) { savedValues.delete(key); }
  };
  resetBrowserWindow();
  loadFresh('src/js/storage/local-storage.js');
  loadFresh('src/js/services/offline-edit-queue-service.js');

  const queue = window.SariSyncOfflineEditQueue;
  queue.queueProductUpdate({
    storeCode: '4yz-a1b2c3d4', userId: 'nida-id', productId: 'carrots-id',
    categoryId: 'vegetables-id', product: { name: 'CARROTS 1 KILO', retail: 130 }
  });
  queue.queueProductUpdate({
    storeCode: '4yz-a1b2c3d4', userId: 'nida-id', productId: 'carrots-id',
    categoryId: 'vegetables-id', product: { name: 'CARROTS 1 KILO', retail: 135 }
  });

  const saved = queue.readQueue('4YZ-A1B2C3D4', 'nida-id');
  assert.equal(saved.length, 1);
  assert.equal(saved[0].product.retail, 135);
  assert.equal(queue.readQueue('4YZ-A1B2C3D4', 'other-account').length, 0);
});

test('Product edits are queued locally instead of calling Supabase while offline', async () => {
  const savedValues = new Map();
  global.localStorage = {
    getItem(key) { return savedValues.has(key) ? savedValues.get(key) : null; },
    setItem(key, value) { savedValues.set(key, String(value)); },
    removeItem(key) { savedValues.delete(key); }
  };
  const originalNavigator = Object.getOwnPropertyDescriptor(global, 'navigator');
  Object.defineProperty(global, 'navigator', {
    configurable: true,
    value: { onLine: false }
  });
  resetBrowserWindow();
  loadFresh('src/js/storage/local-storage.js');
  loadFresh('src/js/services/offline-price-book-service.js');
  loadFresh('src/js/services/offline-edit-queue-service.js');
  window.SariSyncState = {
    getSession: () => ({ storeCode: '4YZ-A1B2C3D4' })
  };
  window.SariSyncAuthSession = {
    async getCachedSession() { return { user: { id: 'nida-id' } }; },
    getClient() { throw new Error('Supabase must not be called while offline'); }
  };
  loadFresh('src/js/services/product-data-service.js');

  const result = await window.SariSyncProductDataService.updateProductForCurrentUser(
    'carrots-id',
    { name: 'CARROTS 1 KILO', barcode: '', costPrice: null, retail: 135, wholesale: null, bottleDeposit: null, notes: '' },
    'vegetables-id'
  );

  assert.equal(result.queued, true);
  assert.equal(
    window.SariSyncOfflineEditQueue.readQueue('4YZ-A1B2C3D4', 'nida-id')[0].product.retail,
    135
  );
  if (originalNavigator) Object.defineProperty(global, 'navigator', originalNavigator);
  else delete global.navigator;
});

test('Shared name helpers and Category Preview preserve Home display rules', () => {
  resetBrowserWindow();
  loadFresh('src/js/services/utils.js');
  loadFresh('src/js/models/category.js');
  loadFresh('src/js/components/category-preview.js');

  assert.equal(window.SariSyncUtils.firstName('  Caleb John  '), 'Caleb');
  assert.equal(window.SariSyncUtils.initials('  Caleb   John  '), 'CJ');

  const container = { innerHTML: '' };
  window.SariSyncCategoryPreview.render({
    container,
    categories: [
      { name: 'Beverages', className: 'beverages' },
      { name: 'Canned Goods', className: 'canned' }
    ],
    products: [
      { category: 'BEVERAGES' },
      { category: ' beverages ' },
      { category: 'Canned Goods' }
    ],
    limit: 1,
    categoryModel: window.SariSyncCategoryModel
  });

  assert.match(container.innerHTML, />Beverages</);
  assert.match(container.innerHTML, />2 products</);
  assert.doesNotMatch(container.innerHTML, />Canned Goods</);
  assert.match(container.innerHTML, /data-category="Beverages"/);
});

test('Auth Session verifies a Supabase user and reuses one browser client', async () => {
  const savedValues = new Map();
  global.localStorage = {
    getItem(key) {
      return savedValues.has(key) ? savedValues.get(key) : null;
    },
    setItem(key, value) {
      savedValues.set(key, String(value));
    },
    removeItem(key) {
      savedValues.delete(key);
    }
  };

  resetBrowserWindow();
  window.location = {
    protocol: 'http:',
    host: '127.0.0.1:5500',
    origin: 'http://127.0.0.1:5500'
  };
  window.SariSyncSupabaseConfig = {
    url: 'https://example.supabase.co',
    publishableKey: 'test-publishable-key'
  };

  let createClientCalls = 0;
  let signOutCalls = 0;
  const expectedSession = { user: { id: 'user-1' } };
  window.supabase = {
    createClient() {
      createClientCalls += 1;
      return {
        auth: {
          async getSession() {
            return { data: { session: expectedSession }, error: null };
          },
          async getUser() {
            return { data: { user: expectedSession.user }, error: null };
          },
          async signOut() {
            signOutCalls += 1;
            return { error: null };
          }
        }
      };
    }
  };

  loadFresh('src/js/storage/local-storage.js');
  window.SariSyncLocalStorage.saveJson(
    window.SariSyncLocalStorage.KEYS.SESSION,
    { storeName: 'Test Store' }
  );
  loadFresh('src/js/services/auth-session.js');

  assert.equal(await window.SariSyncAuthSession.getSession(), expectedSession);
  assert.equal(await window.SariSyncAuthSession.getCachedSession(), expectedSession);
  await window.SariSyncAuthSession.signOut();
  assert.equal(createClientCalls, 1);
  assert.equal(signOutCalls, 1);
  assert.equal(
    window.SariSyncLocalStorage.readJson(
      window.SariSyncLocalStorage.KEYS.SESSION,
      null
    ),
    null
  );
});

test('Friendly feedback protects people from technical errors and login crashes', () => {
  resetBrowserWindow();
  global.navigator = { onLine: true };
  loadFresh('src/js/services/feedback-service.js');

  assert.equal(
    window.SariSyncFeedback.messageFor(
      new Error('Invalid login credentials'),
      'Unable to log in.'
    ),
    'Unable to log in. Check your email address and password.'
  );
  assert.match(
    window.SariSyncFeedback.messageFor(
      new Error('permission denied for table store_members'),
      'Could not save.'
    ),
    /do not have permission/i
  );

  const authSource = fs.readFileSync(
    path.join(projectRoot, 'src/js/pages/auth.js'),
    'utf8'
  );
  assert.match(authSource, /const target = form\?\.querySelector/);
  assert.match(authSource, /try \{[\s\S]*signInWithPassword/);
});

test('Authentication screens provide an accessible Show or Hide password control', () => {
  const authSource = fs.readFileSync(
    path.join(projectRoot, 'src/js/pages/auth.js'),
    'utf8'
  );
  const componentSource = fs.readFileSync(
    path.join(projectRoot, 'src/css/components.css'),
    'utf8'
  );

  assert.match(authSource, /function passwordField/);
  assert.match(authSource, /data-password-toggle/);
  assert.match(authSource, /aria-label="Show password"/);
  assert.match(authSource, /'Hide password'/);
  assert.match(componentSource, /\.auth-password-toggle/);
});

test('Home starts behind an authentication gate with a Retry state', () => {
  const homeHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const homeSource = fs.readFileSync(
    path.join(projectRoot, 'src/js/pages/home.js'),
    'utf8'
  );

  assert.match(homeHtml, /id="homeAuthGuard"/);
  assert.match(homeHtml, /id="appShell" class="app-shell" hidden/);
  assert.match(homeHtml, /id="homeAuthRetry"[^>]*hidden/);
  assert.match(homeSource, /SariSyncAuthSession\.getSession\(\)/);
  assert.match(homeSource, /SariSyncProductDataService\.loadCurrentStorePriceBook\(\)/);
  assert.match(homeSource, /showAuthGuardError\(\)/);
});

test('Home keeps product selection separate from price-history loading', () => {
  const homeSource = fs.readFileSync(
    path.join(projectRoot, 'src/js/pages/home.js'),
    'utf8'
  );
  const updatesSource = fs.readFileSync(
    path.join(projectRoot, 'src/js/pages/updates.js'),
    'utf8'
  );

  assert.match(homeSource, /SariSyncUpdatePrice\.render\([\s\S]*products,/);
  assert.match(homeSource, /priceHistoryError/);
  assert.match(updatesSource, /Unable to load saved price updates/);
});

test('Realtime sync has one shared, store-filtered service and stops at sign out', () => {
  const homeHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const realtimeSource = fs.readFileSync(
    path.join(projectRoot, 'src/js/services/realtime-service.js'),
    'utf8'
  );
  const authSource = fs.readFileSync(
    path.join(projectRoot, 'src/js/services/auth-session.js'),
    'utf8'
  );

  assert.match(homeHtml, /services\/realtime-service\.js/);
  assert.match(realtimeSource, /get_my_store_access/);
  assert.match(realtimeSource, /products', 'price_updates', 'categories/);
  assert.match(realtimeSource, /store_id=eq/);
  assert.match(realtimeSource, /removeChannel/);
  assert.match(authSource, /SariSyncRealtime\?\.stop/);
});

test('Family Access reuses the authenticated client and counts active accounts', async () => {
  resetBrowserWindow();
  loadFresh('src/js/constants/app-constants.js');
  loadFresh('src/js/services/utils.js');

  let requestedFunction = '';
  const sharedClient = {
    async rpc(functionName) {
      requestedFunction = functionName;
      return {
        error: null,
        data: [
          {
            store_id: 'store-1',
            store_name: '4YZ Mini Store',
            store_code: '4YZ-A1B2C3D4',
            viewer_role: 'owner',
            member_user_id: 'owner-1',
            member_name: 'Nida Escalante',
            member_email: 'owner@example.com',
            member_role: 'owner',
            member_status: 'active',
            member_joined_at: '2026-08-08T00:00:00Z'
          },
          {
            store_id: 'store-1',
            store_name: '4YZ Mini Store',
            store_code: '4YZ-A1B2C3D4',
            viewer_role: 'owner',
            member_user_id: 'member-1',
            member_name: 'Family Member',
            member_email: 'member@example.com',
            member_role: 'member',
            member_status: 'active',
            member_joined_at: '2026-08-08T01:00:00Z'
          }
        ]
      };
    }
  };

  window.SariSyncAuthSession = { getClient: () => sharedClient };
  loadFresh('src/js/services/family-access-service.js');

  const access = await window.SariSyncFamilyAccessService.getFamilyAccess();

  assert.equal(requestedFunction, 'get_my_family_access');
  assert.equal(access.storeId, 'store-1');
  assert.equal(access.currentRole, 'owner');
  assert.equal(access.activeCount, 2);
  assert.equal(access.maximumAccounts, 5);
  assert.equal(access.availableSpaces, 3);
  assert.equal(access.members[1].role, 'member');
});

test('Store labels preserve short number-led codes in uppercase', () => {
  resetBrowserWindow();
  loadFresh('src/js/services/utils.js');

  assert.equal(window.SariSyncUtils.formatStoreName('4yz mini store'), '4YZ Mini Store');
  assert.equal(window.SariSyncUtils.formatStoreName('aling rosa sari-sari store'), 'Aling Rosa Sari-Sari Store');
});

test('App State can format the active store name without breaking Settings', () => {
  resetBrowserWindow();
  loadFresh('src/js/constants/app-constants.js');
  loadFresh('src/js/services/utils.js');
  loadFresh('src/js/storage/local-storage.js');
  window.SariSyncLocalStorage.saveJson(window.SariSyncLocalStorage.KEYS.SESSION, {
    storeName: '4yz mini store'
  });
  loadFresh('src/js/state/store.js');

  assert.equal(window.SariSyncState.getActiveStoreName(), '4YZ Mini Store');
});

test('Family invitation copies its message when browser sharing is unavailable', async () => {
  resetBrowserWindow();
  loadFresh('src/js/constants/app-constants.js');

  let copiedText = '';
  const originalNavigator = Object.getOwnPropertyDescriptor(global, 'navigator');
  Object.defineProperty(global, 'navigator', {
    configurable: true,
    value: {
    clipboard: {
      async writeText(text) {
        copiedText = text;
      }
    }
    }
  });
  loadFresh('src/js/services/family-access-service.js');

  const result = await window.SariSyncFamilyAccessService.shareInvitation(
    '4YZ Mini Store',
    '4YZ-A1B2C3D4'
  );

  assert.equal(result, 'copied');
  assert.match(copiedText, /4YZ-A1B2C3D4/);
  assert.match(copiedText, /Join a Family Store/);
  if (originalNavigator) Object.defineProperty(global, 'navigator', originalNavigator);
  else delete global.navigator;
});

test('Family Access UI and SQL draft preserve the approved member workflow', () => {
  const settingsSource = fs.readFileSync(
    path.join(projectRoot, 'src/js/pages/settings.js'),
    'utf8'
  );
  const familyPageSource = fs.readFileSync(
    path.join(projectRoot, 'src/js/pages/family-access.js'),
    'utf8'
  );
  const familyServiceSource = fs.readFileSync(
    path.join(projectRoot, 'src/js/services/family-access-service.js'),
    'utf8'
  );
  const authSource = fs.readFileSync(
    path.join(projectRoot, 'src/js/pages/auth.js'),
    'utf8'
  );
  const homeHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  const layoutSource = fs.readFileSync(path.join(projectRoot, 'src/css/layout.css'), 'utf8');
  const sqlDraft = fs.readFileSync(
    path.join(projectRoot, 'docs/phase-8-family-access.sql'),
    'utf8'
  );

  assert.match(settingsSource, />Family Access</);
  assert.doesNotMatch(settingsSource, />Device access</i);
  assert.match(familyPageSource, /Invite a family member/);
  assert.match(familyPageSource, /Current family members/);
  assert.match(familyPageSource, /currentRole === 'owner'/);
  assert.doesNotMatch(familyPageSource, /<input[^>]+type=["']password/i);
  assert.match(familyServiceSource, /navigator\.share/);
  assert.match(familyServiceSource, /navigator\.clipboard/);
  assert.match(authSource, /Join a family store/);
  assert.match(authSource, /MAX_ACTIVE_ACCOUNTS/);
  assert.match(homeHtml, /family-access-service\.js/);
  assert.match(homeHtml, /pages\/family-access\.js/);
  assert.match(layoutSource, /#appHeader\[hidden\][\s\S]*display:\s*none\s*!important/);

  assert.match(sqlDraft, /REVIEW-ONLY DRAFT/i);
  assert.match(sqlDraft, /get_my_family_access/);
  assert.match(sqlDraft, /auth\.uid\(\)/);
  assert.match(sqlDraft, /status = 'active'/);
  assert.match(sqlDraft, /v_active_account_count >= 5/);
  assert.match(sqlDraft, /for update/);
  assert.match(sqlDraft, /values \(v_store_id, v_user_id, 'member', 'active'\)/);
  assert.match(sqlDraft, /from public, anon, authenticated/);
  assert.match(sqlDraft, /to authenticated/);
  assert.doesNotMatch(sqlDraft, /delete from/i);
});

test('App shell owns vertical scrolling while bottom navigation stays fixed', () => {
  const layoutSource = fs.readFileSync(
    path.join(projectRoot, 'src/css/layout.css'),
    'utf8'
  );
  const componentSource = fs.readFileSync(
    path.join(projectRoot, 'src/css/components.css'),
    'utf8'
  );
  const homeSource = fs.readFileSync(
    path.join(projectRoot, 'src/js/pages/home.js'),
    'utf8'
  );

  assert.match(layoutSource, /\.app-shell[\s\S]*height:\s*100dvh[\s\S]*overflow:\s*hidden/);
  assert.match(layoutSource, /\.app\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(layoutSource, /\.app::\-webkit-scrollbar/);
  assert.match(componentSource, /\.bottom-nav\s*\{[\s\S]*position:\s*fixed/);
  assert.match(homeSource, /appScrollArea\.scrollTo/);
});
