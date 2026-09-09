const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('brand and portfolio cards use real local website previews', () => {
  const command = read('pilot/command.js');
  const features = read('pilot/features.js');
  const previews = [
    'silverandglass.webp', 'edwardjanusz.webp', 'probatum.webp', 'dona.webp',
    'receptury.webp', 'zielona-pergola.webp', 'kancelaria-zawadzcy.webp',
    'alto-rooftop.webp', 'dom-i-wnetrze.webp', 'serwis-podkarpacki.webp',
    'studio-lawenda.webp', 'zamek-rzeszow.webp'
  ];

  assert.match(command, /space-site-preview/);
  assert.doesNotMatch(command, /space-orbit/);
  assert.doesNotMatch(command, /\['P','S','E'\]/);
  assert.match(features, /class="site-shot"/);
  assert.doesNotMatch(features, /site-monogram/);
  assert.doesNotMatch(features, /piotrmadrzyk\.github\.io/);

  for (const name of previews) {
    const file = path.join(root, 'pilot/assets/site-previews', name);
    assert.equal(fs.existsSync(file), true, `missing preview: ${name}`);
    assert.ok(fs.statSync(file).size > 2500, `preview is unexpectedly small: ${name}`);
  }
});

test('every tool card has a meaningful visual scene', () => {
  const workspace = read('pilot/workspace.js');
  const ids = ['mail','sales','clients','drive','marketing','www','media','research','money','system','service'];
  assert.match(workspace, /class="tool-visual visual-/);
  assert.match(workspace, /class="tool-card-content"/);
  for (const id of ids) assert.match(workspace, new RegExp(`\\{id:'${id}'`));
});

test('YouTube results and Files use a persistent visual folder history', () => {
  const features = read('pilot/features.js');
  const workspace = read('pilot/workspace.js');
  const css = read('pilot/features.css');
  for (const selector of ['.media-history-grid','.media-result-head','.media-file-links','.media-stages .missing','.file-library-summary','.file-library-counts']) assert.match(css,new RegExp(selector.replace('.','\\.')));
  assert.match(features,/ZAPISANE WYNIKI · CAŁA PRZESTRZEŃ/);
  assert.match(features,/DonaFeatures=.*mediaCard/);
  assert.match(features,/\(drive\|docs\)\\\.google\\\.com/);
  assert.match(features,/youtube\\\.com/);
  assert.match(workspace,/function renderFiles\(\)/);
  assert.match(workspace,/Foldery analiz YouTube/);
  assert.match(workspace,/mediaAnalyses/);
  assert.match(workspace,/v==='files'\)renderFiles\(\)/);
});

test('mobile chat stays in the viewport and always exposes a return action', () => {
  const html = read('pilot/index.html');
  const workspace = read('pilot/workspace.js');
  const css = read('pilot/workspace.css');

  assert.match(html, /id="chatClose"[^>]+aria-label="Wróć do panelu"/);
  assert.match(html, /class="chat-back-label"[^>]*>.*Wróć/);
  assert.match(css, /@media\(max-width:1140px\)\{body\.chat-modal-open\{overflow:hidden\}\.assistant\{position:fixed;inset:0 0 0 auto;height:100dvh/);
  assert.match(css, /\.assistant-chat\{height:100%;overflow:hidden\}/);
  assert.match(css, /\.chat-back-label\{display:flex!important/);
  assert.match(workspace, /document\.body\.classList\.toggle\('chat-modal-open',innerWidth<=1140\)/);
  assert.match(workspace, /document\.body\.classList\.remove\('chat-modal-open'\)/);
  assert.match(workspace, /if\(innerWidth<=1140&&\$\('app'\)\.classList\.contains\('chat-open'\)\)\{closeChat\(\)/);
});
