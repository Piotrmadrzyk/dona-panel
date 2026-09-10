const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Piotr (10.09): "Dona miala miec cala wiedze z tego kompa... jak dla mnie ta lista jest
// glupia - po co mi ta zakladka". Root cause: "Co Dona wie" only ever read memory/
// permanentMemory (small, manually/agent-written notes) - the real, actively-growing
// knowledge base fed by Drive/mail/calendar/Claude Code session summaries (PM_wiedza_
// fragmenty, wired into the snapshot as `knowledgeFragments` the same night) never reached
// this page at all.
function loadCommand() {
  const nodes = new Map();
  const element = () => ({ value: '', textContent: '', innerHTML: '', hidden: false, className: '', dataset: {}, setAttribute() {}, addEventListener() {}, appendChild() {}, close() {}, showModal() {} });
  const viewContent = element();
  nodes.set('viewContent', viewContent);
  nodes.set('toast', element());
  const document = {
    body: { appendChild() {} },
    createElement: element,
    getElementById: id => nodes.get(id) || null,
    addEventListener() {},
  };
  const window = { dispatchEvent() {}, addEventListener() {}, CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } } };
  const context = vm.createContext({ window, document, URL, console, setTimeout() {}, clearTimeout() {} });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../pilot/command-model.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../pilot/command.js'), 'utf8'), context);
  return { api: window.DonaCommand, viewContent };
}

const baseSnapshot = { memory: [], permanentMemory: [], generatedAt: '2026-09-11T00:00:00Z', connections: [], calendar: { calendars: [] } };

test('"Co Dona wie" surfaces the real knowledge base (Drive/mail/Claude Code sessions), not just manual notes', () => {
  const { api, viewContent } = loadCommand();
  const data = { ...baseSnapshot, knowledgeFragments: [
    { id: 'k1', title: 'Podsumowanie sesji Claude Code 2026-09-10T20:11:45Z', text: 'Sesja dotyczyla katalogowania aparatow SA.', source: 'claude_code', createdAt: '2026-09-10T20:15:00Z' },
    { id: 'k2', title: 'newagelewandowska.pl - rejestracja domeny', text: 'Potwierdzenie rejestracji domeny.', source: 'poczta', createdAt: '2026-09-05T10:00:00Z' },
  ] };
  api.render('knowledge', data, false);
  assert.match(viewContent.innerHTML, /Sesja Claude Code/);
  assert.match(viewContent.innerHTML, /Podsumowanie sesji Claude Code/);
  assert.match(viewContent.innerHTML, /newagelewandowska/);
  assert.match(viewContent.innerHTML, /Poczta/);
});

test('knowledge fragments are gated to "Wszystkie sprawy" - they have no single brand to attach to', () => {
  const source = fs.readFileSync(path.join(__dirname, '../pilot/command.js'), 'utf8');
  assert.match(source, /brand==='all'\?\(data\?\.knowledgeFragments\|\|\[\]\)/);
});

test('the intro copy no longer implies this is only manual notes', () => {
  const { api, viewContent } = loadCommand();
  api.render('knowledge', { ...baseSnapshot, knowledgeFragments: [] }, false);
  assert.match(viewContent.innerHTML, /baza wiedzy z Dysku, poczty i sesji Claude Code/);
});
