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
