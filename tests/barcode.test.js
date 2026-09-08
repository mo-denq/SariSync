// Run scanner behavior without opening a real camera or changing store data.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/js/services/barcode.js'), 'utf8');
function setup(options = {}) {
  const elements = {}, timers = new Map(), calls = [];
  let seq = 0, stopped = 0;
  const document = { activeElement: null, body: { insertAdjacentHTML() {} }, addEventListener() {},
    createElement() { return { focus() { document.activeElement = this; } }; },
    getElementById(id) {
      return elements[id] ||= { hidden: false, readyState: 4, videoWidth: 640, value: '',
        events: {}, addEventListener(name, fn) { this.events[name] = fn; },
        focus() { document.activeElement = this; }, setAttribute() {}, async play() {},
        replaceChildren(child) { this.child = child; this.textContent = child.textContent; } };
    }
  };
  const stream = { getTracks: () => [{ stop: () => stopped++ }] };
  const window = { addEventListener() {},
    BarcodeDetector: class { async detect() { return [{ format: 'ean_13', rawValue: '0480166860225' }]; } },
    SariSyncSearchService: { findByBarcode: () => options.missing ? null : { id: 'product-1' } },
    SariSyncProductRepository: { getAllProducts: () => [] },
    SariSyncNavigation: { goTo: value => calls.push(['page', value]) },
    SariSync: { showProduct: id => calls.push(['product', id]), searchProducts() {} },
    SariSyncToast: { show: text => calls.push(['toast', text]) }
  };
  if (options.fallback) {
    delete window.BarcodeDetector;
    window.ZXingBrowser = { BarcodeFormat: { EAN_13: 7 }, BrowserMultiFormatOneDReader: class {
      constructor(hints) { assert.equal(typeof hints.set, 'function'); }
      decode() {
        if (options.noRead) throw { name: 'e', getKind: () => 'NotFoundException' };
        return { getBarcodeFormat: () => 7, getText: () => '0480166860225' };
      }
    } };
  }
  vm.runInNewContext(source, { window, document,
    navigator: { mediaDevices: { getUserMedia: options.acquire || (async () => stream) } },
    setTimeout: fn => { timers.set(++seq, fn); return seq; }, clearTimeout: id => timers.delete(id)
  });
  return { window, document, elements, calls, stream, stopped: () => stopped,
    tick: async () => { await new Promise(setImmediate); const fns = [...timers.values()]; timers.clear(); for (const fn of fns) await fn(); }, timers };
}
test('Home click event scans and opens Price Lookup instead of being called as a function', async () => {
  const s = setup();
  await s.elements.scanButton.events.click({ type: 'click' });
  await s.tick();
  assert.ok(s.calls.some(([type, id]) => type === 'product' && id === 'product-1'));
  assert.equal(s.elements.scannerPanel.hidden, true);
  assert.equal(s.stopped(), 1);
});
test('Form scanning preserves leading zeros and does not navigate away', async () => {
  const s = setup(); let value;
  await s.window.SariSyncBarcode.open(code => { value = code; }); await s.tick();
  assert.equal(value, '0480166860225'); assert.equal(s.calls.length, 0);
});
test('Unmatched barcode focuses readable guidance without opening the keyboard', async () => {
  const s = setup({ missing: true }); await s.window.SariSyncBarcode.open(); await s.tick();
  assert.match(s.elements.searchResults.textContent, /Search by name/);
  assert.equal(s.elements.searchResults.child.className, 'search-feedback');
  assert.equal(s.document.activeElement, s.elements.searchResults.child);
  assert.ok(s.calls.some(([type, message]) => type === 'toast' && message === 'No barcode match. Search by product name.'));
  assert.equal(s.calls.some(([type]) => type === 'product'), false);
});

test('Long toast messages get more reading time and replace the old timer', () => {
  let delay, cleared, callback;
  const toast = { classList: { add() {}, remove() {} } };
  const context = { window: { SariSyncConstants: { TOAST_DURATION_MS: 2600 } },
    document: { getElementById: () => toast },
    setTimeout(fn, ms) { callback = fn; delay = ms; return 7; },
    clearTimeout(id) { cleared = id; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/js/components/toast.js'), 'utf8'), context);
  context.window.SariSyncToast.show('Saved.'); assert.equal(delay, 2600);
  context.window.SariSyncToast.show('A'.repeat(200));
  assert.equal(delay, 8000); assert.equal(cleared, 7); assert.equal(toast.textContent.length, 200);
  callback();
});
test('Fallback works without native BarcodeDetector', async () => {
  const s = setup({ fallback: true }); await s.window.SariSyncBarcode.open(); await s.tick();
  assert.ok(s.calls.some(([type]) => type === 'product'));
});
test('Minified ZXing no-read exception keeps scanning instead of showing failure', async () => {
  const s = setup({ fallback: true, noRead: true }); await s.window.SariSyncBarcode.open(); await s.tick();
  assert.equal(s.elements.retryScanner.hidden, true); assert.equal(s.timers.size, 1);
});
test('Closing while camera permission is pending stops a late stream', async () => {
  let resolve; const s = setup({ acquire: () => new Promise(r => { resolve = r; }) });
  const opening = s.window.SariSyncBarcode.open(); s.window.SariSyncBarcode.close(); resolve(s.stream); await opening;
  assert.equal(s.stopped(), 1); assert.equal(s.elements.scannerPanel.hidden, true);
});
test('Denied camera permission shows a readable retry message', async () => {
  const s = setup({ acquire: async () => { throw { name: 'NotAllowedError' }; } });
  await s.window.SariSyncBarcode.open();
  assert.match(s.elements.scannerStatus.textContent, /Camera access was denied/);
  assert.equal(s.elements.retryScanner.hidden, false);
});
