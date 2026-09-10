const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const chat = fs.readFileSync(path.join(root, 'pilot/chat.js'), 'utf8');

test('Dona\'s answer is no longer saved client-side after a fetch succeeds - the server now owns that write',()=>{
  // A slow turn (research) can finish in n8n well after the browser's fetch already gave up
  // (observed live: 5m27s backend success vs. the browser abandoning around 150s on some
  // infrastructure ceiling outside any of our own timeouts). Client-side zapiszHist('dona',...)
  // only ever ran on the success path, so a turn that outlasted the fetch was never saved
  // anywhere - Piotr saw "nie potwierdzono wyniku" and the real answer was lost to the chat.
  // Scoped to the two fixed call sites (main chat + branch dispatch) - voice/Realtime mode and
  // system-action results are separate flows, untouched by this fix.
  assert.doesNotMatch(chat,/add\('dona',ans\);zapiszHist\('dona',ans\)/);
  assert.doesNotMatch(chat,/zapiszHist\('dona','\['\+selected\.name/);
  assert.match(chat,/Panel Dona Apex now saves Dona's answer to history/);
});

test('branch dispatch (executeBranch) now threads conversation_id through, so the server can save into the right thread',()=>{
  assert.match(chat,/panelPost\(BRANCH_URL,\{haslo:sessionPw,galaz:selected\.id,polecenie:withBrand\(text\),tryb:selected\.id==='research'\?'szybka':'',conversation_id:panelConversationId\}\)/);
});

test('the connection-drop message tells the truth about the new guarantee instead of implying the answer is gone',()=>{
  assert.match(chat,/jej odpowiedź pojawi się w tej rozmowie po odświeżeniu/);
  assert.doesNotMatch(chat,/nie ponawiaj go w ciemno/);
});
