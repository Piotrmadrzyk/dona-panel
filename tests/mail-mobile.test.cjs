const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const css=fs.readFileSync('pilot/workspace.css','utf8');
const html=fs.readFileSync('pilot/index.html','utf8');

test('mail actions remain thumb-friendly on narrow mobile screens',()=>{
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css,/\.mail-actions\{display:grid;grid-template-columns:1fr 1fr/);
  assert.match(css,/\.mail-actions \.secondary,\.mail-actions \.text-button\{width:100%\}/);
  assert.match(html,/workspace\.css\?v=7\.2\.0/);
  assert.match(html,/workspace\.js\?v=7\.3\.3/);
});
