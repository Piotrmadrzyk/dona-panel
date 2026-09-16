const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const js=fs.readFileSync('pilot/trace.js','utf8');
const css=fs.readFileSync('pilot/trace.css','utf8');
const html=fs.readFileSync('pilot/index.html','utf8');
const centre=fs.readFileSync('pilot/centre.js','utf8');
const workspace=fs.readFileSync('pilot/workspace.js','utf8');

test('webinar stage distinguishes simulations from live operations',()=>{
  assert.match(js,/SYMULACJA · DANE PRZYKŁADOWE/);
  assert.match(js,/OPERACJA NA ŻYWO/);
  assert.match(js,/TRYB DEMO · NIC NIE URUCHOMIONO/);
  assert.match(js,/Nie połączyła się z pocztą, kalendarzem ani Facebookiem/);
  assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|Dona\.request\s*\(/);
});

test('webinar mode exposes agents, evidence and approval control in one stage',()=>{
  for(const marker of ['trace-stage','trace-proof','trace-result','trace-progress','Bramka decyzji','Bramka publikacji'])assert.match(js,new RegExp(marker));
  assert.match(js,/Wysyłki i publikacje wymagają osobnej zgody/);
  assert.match(css,/body\.webinar-mode \.app\{grid-template-columns:76px minmax\(0,1fr\) 360px\}/);
  assert.match(css,/body\.webinar-mode \.thread-rail\{display:none\}/);
});

test('webinar assets are cache-busted together',()=>{
  assert.match(html,/trace\.css\?v=5\.2\.2/);
  assert.match(html,/trace\.js\?v=5\.2\.2/);
  assert.match(html,/centre\.css\?v=5\.2\.3/);
  assert.match(html,/centre\.js\?v=7\.0\.0/);
  assert.match(html,/systems\.css\?v=6\.0\.3/);
  assert.match(html,/systems\.js\?v=6\.0\.7/);
  assert.match(html,/workspace\.js\?v=7\.3\.3/);
});

test('demo Buffer state is never labelled as a confirmed external read',()=>{
  assert.match(centre,/DEMO:'Dane demonstracyjne'/);
  assert.match(centre,/demo\?'DEMO':bufferReady\?'READ_OK'/);
  assert.match(centre,/nie wykonuje żadnego odczytu zewnętrznej usługi/);
  assert.match(workspace,/status:'DEMO'/);
});

test('webinar demo keeps both graphical Facebook drafts visible across brand filters',()=>{
  assert.match(workspace,/state\.demo&&\['dona','connections','social'\]\.includes\(v\)\?state\.data/);
  assert.match(workspace,/site-previews\/silverandglass\.webp/);
  assert.match(workspace,/site-previews\/edwardjanusz\.webp/);
});

test('rescheduling a meeting is a real form, not a chat prose request, and never executes directly',()=>{
  assert.match(workspace,/function showReschedule/);
  assert.match(workspace,/type="datetime-local" name="newDate" required/);
  assert.match(workspace,/collection==='meetings'&&r\.date&&!\/CANCEL\/i\.test\(r\.status\)/);
  assert.match(workspace,/Zmień termin/);
  // The prompt must force DONA through read-then-plan (etag) and land in Skrzynka decyzji - never a direct write.
  assert.match(workspace,/potwierdzić dokładny event_uid i etag/);
  assert.match(workspace,/NIE wykonuj zmiany automatycznie, ma trafić do Skrzynki decyzji/);
  assert.match(workspace,/window\.Dona\.run\(prompt\)/);
});

test('mail view shows ten newest messages with direct mobile actions',()=>{
  assert.match(workspace,/function mailCard/);
  assert.match(workspace,/sort\(\(a,b\)=>\(Date\.parse\(b\.date\|\|b\.createdAt\)\|\|0\)-\(Date\.parse\(a\.date\|\|a\.createdAt\)\|\|0\)\)\.slice\(0,10\)/);
  for(const marker of ['data-mail-reply','data-discuss="mails"','data-mail-trash','Otwórz','Odpowiedz','Omów z Doną','Usuń'])assert.match(workspace,new RegExp(marker));
});

test('mail reply accepts exact user text without forcing a chat conversation and still requires approval',()=>{
  assert.match(workspace,/function showMailReply/);
  assert.match(workspace,/collection==='mails'/);
  assert.match(workspace,/name="reply" required maxlength="12000"/);
  assert.match(workspace,/Treść odpowiedzi Piotra:/);
  assert.match(workspace,/manual_reply_text:reply/);
  assert.match(workspace,/action="draft", parametr=/);
  assert.match(workspace,/dane='\+JSON\.stringify\(daneJson\)/);
  assert.match(workspace,/Pole manual_reply_text ma pozostać bez przeredagowania/);
  assert.match(workspace,/nie zostanie wysłana przed zatwierdzeniem/);
  assert.match(workspace,/Szkic ma trafić do Skrzynki decyzji/);
  assert.match(workspace,/window\.Dona\.runBranch\('poczta','Poczta',prompt\)/);
});

test('single-message mail archiving uses a dedicated per-message tool, never the package-based action that once bulk-archived 79 unrelated emails',()=>{
  assert.match(workspace,/function confirmMailArchive/);
  assert.match(workspace,/data-mail-archive-confirm/);
  assert.match(workspace,/el\('button','Zarchiwizuj'/);
  // Must require the real Gmail message_id captured on the mail row, not the internal mail_id.
  assert.match(workspace,/if\(!mail\.messageId\)/);
  assert.match(workspace,/message_id="'\+mail\.messageId\+'"/);
  // Must route through the dedicated single-message tool, and explicitly forbid the package action.
  assert.match(workspace,/narzędzia archiwizuj_wiadomosc w trybie apply/);
  assert.match(workspace,/NIE używaj akcji archiwizuj w narzędziu poczta/);
  assert.match(workspace,/window\.Dona\.runBranch\('poczta','Poczta',prompt\)/);
});

test('single-message mail deletion moves to Gmail Trash via its own dedicated tool, distinct from archive',()=>{
  assert.match(workspace,/function confirmMailTrash/);
  assert.match(workspace,/data-mail-trash-confirm/);
  assert.match(workspace,/el\('button','Usuń'/);
  assert.match(workspace,/trafi do Kosza Gmaila i zniknie stamtąd po ok\. 30 dni/);
  // Must require the real Gmail message_id, same guard as archive.
  assert.match(workspace,/if\(!mail\.messageId\)\{toast\('Ta wiadomość nie ma jeszcze zapisanego identyfikatora Gmaila/);
  // Must route through the dedicated trash tool, never the package-based poczta action.
  assert.match(workspace,/narzędzia usun_wiadomosc w trybie apply/);
  assert.match(workspace,/NIE używaj akcji archiwizuj ani żadnej innej akcji pakietowej w narzędziu poczta/);
});

test('adding a client is a real CRM form, not the chat-prose button it used to be',()=>{
  assert.match(workspace,/function showAddClient/);
  assert.doesNotMatch(workspace,/data-prompt="Chcę dodać klienta/);
  assert.match(workspace,/data-add-client/);
  assert.match(workspace,/name="nazwa" required/);
  // Must dedupe against existing customers via resolve_identity, not blindly insert.
  assert.match(workspace,/customer_ops, resolve_identity/);
  assert.match(workspace,/połącz się z nim zamiast/);
  assert.match(workspace,/window\.Dona\.runBranch\('klienci','Klienci',prompt\)/);
});
