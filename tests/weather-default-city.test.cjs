const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Piotr (10.09): "dlaczego caly czas nie pokazuje mi pogody z rzeszowa gdzie mieszkam i
// pracuje jako domyslnej dopoki nie zmienie tego?" - the weather tab used to start from a
// blank form every single visit, with no notion of "my city". Fix: default to Rzeszów,
// auto-load its forecast on first open, and remember whatever city Piotr actually searches
// for as the new default going forward.
function localStorageStub() {
  const store = new Map();
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: key => { store.delete(key); },
  };
}

function panel({ snapshot = {}, localStorage: ls = localStorageStub(), fetchImpl } = {}) {
  const nodes = new Map();
  const element = () => ({ value: '', textContent: '', innerHTML: '', className: '', disabled: false, dataset: {}, setAttribute() {}, close() { this.open = false; }, showModal() { this.open = true; } });
  const root = element();
  let html = '';
  Object.defineProperty(root, 'innerHTML', { set(value) { html = value; }, get() { return html; } });
  nodes.set('viewContent', root);
  nodes.set('weatherStatus', element());
  nodes.set('weatherResults', element());
  const window = { addEventListener() {}, dispatchEvent() {}, Dona: { request() { return new Promise(() => {}); } } };
  const document = { body: { appendChild() {} }, createElement: element, getElementById: id => nodes.get(id) || null, addEventListener() {} };
  const context = vm.createContext({
    window, document, URL, TypeError, console,
    localStorage: ls,
    fetch: fetchImpl || (async () => { throw new Error('no fetch mock provided'); }),
    AbortController, setTimeout, clearTimeout,
    CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../pilot/features.js'), 'utf8'), context);
  window.DonaFeatures.render('weather', snapshot, false);
  return { html: () => html, DonaFeatures: window.DonaFeatures };
}

test('weather tab defaults to Rzeszów (no localStorage yet) instead of an empty form', () => {
  const { html } = panel();
  assert.match(html(), /id="weatherPlace"[^>]*value="Rzeszów"/);
  assert.match(html(), /Domyślnie: Rzeszów/);
});

test('a previously remembered city becomes the new default, not always Rzeszów', () => {
  const ls = localStorageStub();
  ls.setItem('dona_weather_place', 'Kraków');
  const { html } = panel({ localStorage: ls });
  assert.match(html(), /id="weatherPlace"[^>]*value="Kraków"/);
  assert.doesNotMatch(html(), /value="Rzeszów"/);
});

test('searching a real place saves it as the new default for next time', async () => {
  const ls = localStorageStub();
  const fetchImpl = async url => {
    if (String(url).includes('geocoding-api.open-meteo.com')) {
      return { ok: true, json: async () => ({ results: [{ latitude: 50.06, longitude: 19.94, name: 'Kraków', admin1: 'Małopolskie', country: 'Polska' }] }) };
    }
    return { ok: true, json: async () => ({
      current: { temperature_2m: 20, apparent_temperature: 19, weather_code: 1, wind_speed_10m: 10 },
      current_units: { wind_speed_10m: 'km/h' },
      daily: { time: ['2026-09-11'], weather_code: [1], temperature_2m_max: [22], temperature_2m_min: [12], precipitation_probability_max: [10] },
    }) };
  };
  const { DonaFeatures } = panel({ localStorage: ls, fetchImpl });
  await DonaFeatures.weatherForPlace('Kraków');
  assert.equal(ls.getItem('dona_weather_place'), 'Kraków');
});

test('opening the tab auto-loads a forecast instead of waiting for a click, and never crashes without a network mock', () => {
  // No fetch mock provided on purpose: the auto-load call must fail closed (caught inside
  // weatherForPlace's own try/catch, plus render()'s .catch(()=>{})), never throw out of render().
  assert.doesNotThrow(() => panel());
});
