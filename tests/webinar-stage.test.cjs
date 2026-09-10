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
  assert.match(html,/workspace\.js\?v=6\.0\.6/);
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

test('mail detail offers self-service reply drafting and archiving, both routed through DONA for a single named message',()=>{
  assert.match(workspace,/function showMailReply/);
  assert.match(workspace,/function confirmMailArchive/);
  assert.match(workspace,/collection==='mails'/);
  assert.match(workspace,/Przygotuj odpowiedź/);
  assert.match(workspace,/Zarchiwizuj/);
  // Reply must stay a draft into Skrzynka decyzji - never a direct send.
  assert.match(workspace,/To ma być tylko szkic do zatwierdzenia w Skrzynce decyzji — nie wysyłaj niczego/);
  // Archive must target exactly the one message shown, not a bulk sweep.
  assert.match(workspace,/dokładnie tę jedną wiadomość/);
  assert.match(workspace,/nie proponuj ani nie wykonuj archiwizacji żadnych innych maili/);
  assert.match(workspace,/window\.Dona\.runBranch\('poczta','Poczta',prompt\)/);
});
