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
  assert.match(html,/centre\.js\?v=5\.2\.3/);
  assert.match(html,/systems\.css\?v=6\.0\.3/);
  assert.match(html,/systems\.js\?v=6\.0\.4/);
  assert.match(html,/workspace\.js\?v=6\.0\.11/);
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

test('mail detail offers self-service reply drafting, routed through DONA for the single named message, and now really lands in Skrzynka decyzji',()=>{
  assert.match(workspace,/function showMailReply/);
  assert.match(workspace,/collection==='mails'/);
  assert.match(workspace,/Przygotuj odpowiedź/);
  // 10.09: the "draft" action in Inbox Zero now files a real approval request (Approval
  // Service, same proven path as the Recepcja Poczty pilot) - copy must say so accurately,
  // not the earlier "just chat, nothing lands anywhere" placeholder.
  assert.match(workspace,/wyśle do zatwierdzenia.*Skrzynce decyzji/);
  assert.match(workspace,/Szkic ma trafić do zatwierdzenia w Skrzynce decyzji/);
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
