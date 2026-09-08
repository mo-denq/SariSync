// Small browser simulations exercise behavior without touching family data.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
function guideHarness(saved = new Map()) {
  let current, busy = false, queue = [], account = 'a';
  const elements = { homeAuthGuard: { hidden: true }, appShell: { hidden: false }, scannerPanel: { hidden: true }, homePage: { hidden: false } };
  const document = { activeElement: null, getElementById: id => elements[id], querySelector: () => busy,
    body: { appendChild() {} }, createElement() {
      const buttons = ['skip', 'done'].map(kind => ({ kind, addEventListener(event, fn) { this.click = fn; }, focus() {} }));
      current = { buttons, setAttribute() {}, querySelectorAll: () => buttons, querySelector: () => buttons[1],
        addEventListener(event, fn) { this[event] = fn; }, showModal() { this.open = true; }, close() { this.open = false; }, remove() {} };
      return current;
    } };
  const window = { SariSyncLocalStorage: { read: key => saved.get(key), save: (key, value) => { saved.set(key, value); return true; } },
    SariSyncState: { getSession: () => ({ storeCode: 'store' }) }, SariSyncOfflineEditQueue: { readQueue: () => queue },
    SariSyncToast: { show() {} }, SariSyncAuthSession: { getCachedSession: async () => ({ user: { id: account } }) },
    SariSyncNavigation: { getActivePage: () => 'Settings' } };
  vm.runInNewContext(source('src/js/components/quick-guide.js'), { document, window });
  return { guide: window.SariSyncQuickGuide, elements, dialog: () => current, busy: value => { busy = value; }, queue: value => { queue = value; }, account: value => { account = value; } };
}
test('Guide Skip and Got it persist by account/version and Settings can reopen', async () => {
  const saved = new Map(); const h = guideHarness(saved);
  assert.equal(h.guide.showAfterLoad('a'), true);
  h.dialog().buttons[0].click();
  assert.equal(saved.get('sarisync:quick-guide:v1:a'), 'dismissed');
  assert.equal(guideHarness(saved).guide.showAfterLoad('a'), false);
  assert.equal(h.guide.showAfterLoad('b'), true); h.dialog().buttons[1].click();
  assert.equal(saved.get('sarisync:quick-guide:v1:b'), 'dismissed');
  await h.guide.openFromSettings(); assert.equal(h.dialog().open, true);
});
test('Guide does not interrupt scanner, form, errors, or queued recovery', () => {
  const h = guideHarness();
  h.elements.scannerPanel.hidden = false; assert.equal(h.guide.showAfterLoad('a'), false);
  h.elements.scannerPanel.hidden = true; h.busy(true); assert.equal(h.guide.showAfterLoad('a'), false);
  h.busy(false); h.queue([{}]); assert.equal(h.guide.showAfterLoad('a'), false);
  h.queue([]); h.elements.homeAuthGuard.hidden = false; assert.equal(h.guide.showAfterLoad('a'), false);
  h.elements.homeAuthGuard.hidden = true; h.elements.homePage.hidden = true; assert.equal(h.guide.showAfterLoad('a'), false);
});
test('Search and Browse preserve full names/category without invented or repeated units', () => {
  const window = {}; vm.runInNewContext(source('src/js/components/product-card.js'), { window });
  const product = { id: '1', name: 'VINEGAR 100ML', category: 'PANTRY & CONDIMENTS', retail: 9 };
  for (const method of ['searchRows', 'browseRows']) {
    const html = window.SariSyncProductCard[method]([product], { peso: value => `PHP ${value}` });
    assert.equal(html.match(/100ML/g).length, 1); assert.match(html, /PANTRY &amp; CONDIMENTS/); assert.match(html, /PHP 9/);
    assert.doesNotMatch(html, /undefined|null/);
  }
  assert.match(window.SariSyncProductCard.label({ name: '<item>', category: '' }), /&lt;item&gt;/);
});
test('Barcode recovery is scan-only and returns to search without writing products', () => {
  const clicks = {}; let markup = '', query = 'scanned', focus = false; const calls = [];
  const screen = { insertAdjacentHTML: (_, html) => { markup += html; }, querySelector: id => ({ addEventListener: (_, fn) => { clicks[id] = fn; } }) };
  const search = { value: '123', scrollIntoView() {}, focus() { focus = true; } };
  const window = { SariSyncState: { getSelectedProduct: () => ({ name: 'ITEM', retail: 1 }), getActiveDeviceName: () => 'Device' },
    SariSyncPageHeader: { mount() {} }, SariSyncNavigation: { goTo: page => calls.push(page) },
    SariSync: { searchProducts: value => { query = value; } }, SariSyncToast: { show: text => calls.push(text) } };
  vm.runInNewContext(source('src/js/pages/product-details.js'), { window, document: { getElementById: () => search } });
  const context = { screen, homePage: {}, peso: String, setHomeHeader() {} };
  window.SariSyncProductDetails.render(context); assert.doesNotMatch(markup, /Wrong item/);
  window.SariSyncProductDetails.render({ ...context, fromBarcode: true }); assert.match(markup, /Wrong item/);
  clicks['#barcodeMismatch'](); assert.equal(search.value, ''); assert.equal(query, ''); assert.equal(focus, true);
  assert.deepEqual(calls, ['Home', 'Search for the correct product by name.']);
});

test('Settings explains member restrictions and keeps owner controls available', () => {
  for (const isOwner of [false, true]) {
    let markup = '';
    const window = { SariSyncPageHeader: { mount() {} }, SariSyncConstants: { MAX_ACTIVE_ACCOUNTS: 5 } };
    vm.runInNewContext(source('src/js/pages/settings.js'), { window, document: { getElementById: () => null } });
    window.SariSyncSettings.render({ screen: { insertAdjacentHTML: (_, html) => { markup += html; } }, isOwner, categoryCount: 3, csvService: {} });
    if (isOwner) assert.doesNotMatch(markup, /id="openCategoryManagement"[^>]+disabled/);
    else { assert.match(markup, /Only the store owner can manage categories/); assert.match(markup, /id="secondaryImportButton"[^>]+disabled/); }
    assert.match(markup, /Quick app guide/);
  }
});
test('Direct member access to owner pages shows an explanation without a database call', async () => {
  for (const [file, module] of [['category-management', 'SariSyncCategoryManagement'], ['archived-products', 'SariSyncArchivedProducts']]) {
    let markup = '';
    const window = { addEventListener() {}, SariSyncState: { getSession: () => ({ role: 'member' }) }, SariSyncPageHeader: { mount() {} } };
    vm.runInNewContext(source(`src/js/pages/${file}.js`), { window, document: { addEventListener() {} } });
    await window[module].render({ screen: { insertAdjacentHTML: (_, html) => { markup += html; } }, homePage: {}, setHomeHeader() {} });
    assert.match(markup, /Only the store owner/);
  }
});
