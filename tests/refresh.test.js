const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '../src/js/', name), 'utf8');
const tick = () => new Promise(setImmediate);
function harness(load) {
  const events = {}, applied = [], statuses = [], messages = [];
  const navigator = { onLine: true }, document = { hidden: false, addEventListener: (e, fn) => { events[e] = fn; } };
  const window = { addEventListener: (e, fn) => { events[e] = fn; } };
  vm.runInNewContext(read('services/refresh-service.js'), { window, document, navigator, setTimeout, clearTimeout });
  let reconnects = 0;
  window.SariSyncRefresh.configure({ ready: () => true, load, apply: value => applied.push(value), status: value => statuses.push(value), notify: value => messages.push(value), reconnect: () => reconnects++ });
  return { service: window.SariSyncRefresh, applied, statuses, messages, navigator, document, events, reconnects: () => reconnects };
}
test('Refresh waits for real data and duplicate manual clicks share one read', async () => {
  let done, loads = 0;
  const h = harness(() => { loads++; return new Promise(r => { done = r; }); });
  const first = h.service.request(); const second = h.service.request();
  assert.equal(first, second); await tick(); assert.equal(loads, 1); assert.equal(h.messages.length, 0);
  done({ products: ['new'] }); await first;
  assert.equal(h.applied.length, 1); assert.deepEqual(h.statuses, ['loading', 'ready']); assert.equal(h.messages[0], 'Price book updated.');
});
test('Save during a read discards the older response and fetches a fresh snapshot', async () => {
  const resolvers = []; const h = harness(() => new Promise(r => resolvers.push(r)));
  const reading = h.service.request('live'); await tick(); h.service.request('save');
  resolvers.shift()({ old: true }); await tick(); assert.equal(h.applied.length, 0);
  resolvers.shift()({ new: true }); await reading; assert.equal(h.applied[0].new, true);
});
test('Offline and failed requests preserve data and never announce success', async () => {
  const h = harness(async () => { throw new Error('network'); });
  await h.service.request(); assert.equal(h.applied.length, 0); assert.equal(h.statuses.at(-1), 'error');
  h.navigator.onLine = false; await h.service.request(); assert.equal(h.statuses.at(-1), 'offline');
  assert.equal(h.messages.includes('Price book updated.'), false);
});
test('Return refreshes once and sign-out prevents late data application', async () => {
  let done; const h = harness(() => new Promise(r => { done = r; }));
  h.events.visibilitychange(); h.events.pageshow(); await tick(); assert.equal(h.reconnects(), 1);
  h.service.stop(); done({}); await tick(); assert.equal(h.applied.length, 0);
});
test('Partial history failure is not announced as a complete refresh', async () => {
  const h = harness(async () => ({ priceHistoryError: new Error('history') }));
  const result = await h.service.request(); assert.equal(result.partial, true); assert.equal(h.statuses.at(-1), 'partial');
});
test('Live service serializes starts, replaces failed channels, and stops stale starts', async () => {
  const channels = [], removed = [];
  const client = { rpc: async () => ({ data: { store_id: 'store' } }), removeChannel: async ch => removed.push(ch), channel() {
    const ch = { on() { return this; }, subscribe(fn) { this.status = fn; return this; } }; channels.push(ch); return ch;
  } };
  const window = { SariSyncAuthSession: { getClient: () => client }, addEventListener() {}, setTimeout: () => 1, clearTimeout() {} };
  vm.runInNewContext(read('services/realtime-service.js'), { window, document: { hidden: false }, navigator: { onLine: true }, console: { warn() {} } });
  await Promise.all([window.SariSyncRealtime.start(), window.SariSyncRealtime.start()]); assert.equal(channels.length, 1);
  channels[0].status('CHANNEL_ERROR'); await window.SariSyncRealtime.start(); assert.equal(channels.length, 2); assert.equal(removed.length, 1);
  await window.SariSyncRealtime.stop(); const starting = window.SariSyncRealtime.start(); await window.SariSyncRealtime.stop(); await starting;
  assert.equal(channels.length, 2);
});
test('Background refresh guards forms before changing selectors or dispatching reloads', () => {
  const home = read('pages/home.js');
  const body = home.slice(home.indexOf('function refreshVisibleStoreViewAfterRealtime()'), home.indexOf('async function refreshPriceBookFromRealtime'));
  assert.match(body, /querySelector\('form'\)/);
  assert.doesNotMatch(body, /refreshOpenProductCategorySelector\(\)/);
  assert.doesNotMatch(home, /All family devices are up to date/);
});

test('An active Edit form is never rebuilt during background refresh', () => {
  const home = read('pages/home.js');
  const body = home.slice(home.indexOf('function refreshVisibleStoreViewAfterRealtime()'), home.indexOf('async function refreshPriceBookFromRealtime'));
  let homes = 0;
  const field = { value: 'Unfinished price' };
  const screen = { querySelector: selector => { assert.equal(selector, 'form'); return { field }; } };
  const context = { $: id => id === 'secondaryPage' ? screen : { hidden: true },
    renderHome: () => homes++, document: { querySelector() { throw new Error('Should not touch form'); }, dispatchEvent() { throw new Error('Should not reload editor'); } } };
  vm.runInNewContext(body + '\nrefreshVisibleStoreViewAfterRealtime();', context);
  assert.equal(field.value, 'Unfinished price'); assert.equal(homes, 1);
});
test('Accepted product saves preserve the server ID and update without duplicate rows', () => {
  const window = { SariSyncProductModel: {} };
  vm.runInNewContext(read('repositories/product-repository.js'), { window });
  const repo = window.SariSyncProductRepository;
  repo.upsertSavedProduct({ id: 'server-uuid', name: 'CARROTS', retail: 130 });
  repo.upsertSavedProduct({ id: 'server-uuid', name: 'CARROTS', retail: 135 });
  assert.equal(repo.getAllProducts().length, 1); assert.equal(repo.findProductById('server-uuid').retail, 135);
});
