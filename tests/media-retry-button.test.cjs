const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Piotr (10.09), pointing at a "Nieudana" YouTube analysis card sitting in the history with
// nothing to do about it: "skoro nieudana to albo daj mi przycisk ponow albo usun". This adds
// retry; delete is a separate, not-yet-built backend action (no false claim either way here).
function panel() {
  const nodes = new Map(), listeners = new Map(), requests = [];
  const element = () => ({ value: '', textContent: '', innerHTML: '', disabled: false, dataset: {}, setAttribute() {}, close() { this.open = false; }, showModal() { this.open = true; } });
  const root = element();
  Object.defineProperty(root, 'innerHTML', { set(html) {
    nodes.clear(); nodes.set('viewContent', root);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    for (const id of ids) nodes.set(id, element());
    for (const id of ['youtubeForm', 'driveForm']) if (nodes.has(id)) { const button = element(); nodes.get(id).querySelector = () => button; }
  } });
  nodes.set('viewContent', root);
  const on = (type, callback) => { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(callback); };
  const window = { addEventListener: on, dispatchEvent() {}, Dona: { request(endpoint, body) { return new Promise((resolve, reject) => requests.push({ endpoint, body, resolve, reject })); } } };
  const document = { body: { appendChild() {} }, createElement: element, getElementById: id => nodes.get(id) || null, addEventListener: on };
  const context = vm.createContext({ window, document, URL, TypeError, console, setTimeout() {}, CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../pilot/features.js'), 'utf8'), context);
  const render = snapshot => window.DonaFeatures.render('youtube', snapshot, false);
  const clickRetry = async sourceUrl => {
    const target = { closest: sel => (sel === '[data-media-retry]' ? { dataset: { mediaRetry: sourceUrl } } : null) };
    for (const callback of listeners.get('click') || []) await callback({ target });
  };
  return { nodes, requests, render, clickRetry };
}

const failedRecord = { id: 'm1', status: 'FAILED', title: 'Wpływ AI na produkty cyfrowe', sourceUrl: 'https://www.youtube.com/watch?v=abc123', processedAt: '2026-09-09T15:51:00Z', files: [], stages: {} };

test('clicking retry on a failed card re-runs the analysis for that exact video', async () => {
  const { requests, render, clickRetry } = panel();
  render({ mediaAnalyses: [failedRecord] });
  await clickRetry(failedRecord.sourceUrl);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].endpoint, 'dona-panel-tools');
  assert.equal(requests[0].body.operation, 'youtube_analyze');
  assert.equal(requests[0].body.url, failedRecord.sourceUrl);
});

test('a successful (non-FAILED) card never shows a retry button', () => {
  // Rendered HTML is only reachable through viewContent.innerHTML in this harness;
  // reuse render() and inspect via a fresh panel to keep the FAILED-only assertion isolated.
  const nodes = new Map();
  const element = () => ({ value: '', textContent: '', innerHTML: '', disabled: false, dataset: {}, setAttribute() {} });
  const root = element();
  let html = '';
  Object.defineProperty(root, 'innerHTML', { set(v) { html = v; }, get() { return html; } });
  nodes.set('viewContent', root);
  const window = { addEventListener() {}, dispatchEvent() {}, Dona: { request() { return new Promise(() => {}); } } };
  const document = { body: { appendChild() {} }, createElement: element, getElementById: id => nodes.get(id) || null, addEventListener() {} };
  const context = vm.createContext({ window, document, URL, TypeError, console, setTimeout() {}, CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../pilot/features.js'), 'utf8'), context);
  window.DonaFeatures.render('youtube', { mediaAnalyses: [{ ...failedRecord, status: 'SUCCESS' }] }, false);
  assert.doesNotMatch(html, /data-media-retry/);
});
