const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Piotr (10.09): "jak mam zaplanowac trase dla przedstawiciela jak ma 10 spotkan i nie chce
// aby marnowal czas na jezdzenie od wschodu do zachodu i znow na wschod" - the old "Mapy i
// trasy" tab could only look up ONE place at a time. This builds a real Google Maps
// multi-stop directions URL (free, no API key) with optional automatic reordering.
function loadFeatures() {
  const element = () => ({ value: '', textContent: '', innerHTML: '', className: '', dataset: {}, setAttribute() {}, addEventListener() {}, close() {}, showModal() {} });
  const document = { body: { appendChild() {} }, createElement: element, getElementById: () => null, addEventListener() {} };
  const window = { addEventListener() {}, dispatchEvent() {} };
  const context = vm.createContext({
    window, document, URL, URLSearchParams, TypeError, console, setTimeout() {},
    CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../pilot/features.js'), 'utf8'), context);
  return context.window.DonaFeatures;
}

test('multi-stop route builds a real Google Maps directions URL with waypoints, no API key needed', () => {
  const api = loadFeatures();
  const url = api.buildMultiRouteUrl('Rzeszów', ['Pustków', 'Tarnów', 'Kraków'], false);
  assert.match(url, /^https:\/\/www\.google\.com\/maps\/dir\/\?/);
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('origin'), 'Rzeszów');
  assert.equal(parsed.searchParams.get('destination'), 'Kraków');
  assert.equal(parsed.searchParams.get('waypoints'), 'Pustków|Tarnów');
  assert.equal(parsed.searchParams.get('travelmode'), 'driving');
});

test('"optimize" reorders waypoints for the shortest route, matching the sales-rep 10-stop case', () => {
  const api = loadFeatures();
  const url = api.buildMultiRouteUrl('', ['Stop A', 'Stop B', 'Stop C', 'Stop D'], true);
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('waypoints'), 'optimize:true|Stop A|Stop B|Stop C');
  assert.equal(parsed.searchParams.get('destination'), 'Stop D');
  // Empty origin (device location case) must simply be omitted, not sent as an empty param.
  assert.equal(parsed.searchParams.has('origin'), false);
});

test('zero real destinations refuses to build a URL instead of sending a broken request', () => {
  const api = loadFeatures();
  assert.equal(api.buildMultiRouteUrl('Rzeszów', ['   '], true), '');
  assert.equal(api.buildMultiRouteUrl('', [], true), '');
});

test('a two-stop route (origin + one destination) needs no waypoints param at all', () => {
  const api = loadFeatures();
  const url = api.buildMultiRouteUrl('Rzeszów', ['Kraków'], true);
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('destination'), 'Kraków');
  assert.equal(parsed.searchParams.has('waypoints'), false);
});
