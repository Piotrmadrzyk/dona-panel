const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const liveops=require('../pilot/liveops.js');

test('Live Ops classifies every public state without treating old started records as active',()=>{
  const now=Date.parse('2026-09-09T09:00:00Z');
  assert.equal(liveops.classifyStatus('RUNNING',{lastSeenAt:'2026-09-09T08:59:30Z'},now),'working');
  assert.equal(liveops.classifyStatus('WAITING_APPROVAL',{},now),'approval');
  assert.equal(liveops.classifyStatus('WAITING_SYSTEM',{},now),'listening');
  assert.equal(liveops.classifyStatus('COMPLETED',{},now),'done');
  assert.equal(liveops.classifyStatus('FAILED',{},now),'attention');
  assert.equal(liveops.classifyStatus('rozpoczety',{lastSeenAt:'2026-09-09T08:59:59Z'},now),'unconfirmed');
  assert.equal(liveops.classifyStatus('RUNNING',{lastSeenAt:'2026-09-09T06:00:00Z'},now),'unconfirmed');
});

test('Live Ops normalizes the backend contract defensively and redacts contact data',()=>{
  const value=liveops.normalizePayload({ok:true,generatedAt:'2026-09-09T09:00:00Z',summary:{running:1,costToday:2.4,currency:'USD'},agents:[{id:'a',name:'Agent Poczty',status:'RUNNING',summary:'Kontakt klient@example.com przez https://example.com/private',lastSeenAt:'2026-09-09T08:59:59Z'}],processes:[{id:'p',name:'Oferta',state:'WAITING_APPROVAL',currentStep:'Sprawdź klient@example.com',updatedAt:'2026-09-09T08:59:58Z'}],events:[{id:'e',title:'Zapis dla klient@example.com',state:'DONE',stateLabel:'Zapisano',occurredAt:'2026-09-09T08:59:57Z'}],costs:{month:14,updatedAt:'2026-09-09T09:00:00Z'},meta:{readOnly:true,windowHours:24}},Date.parse('2026-09-09T09:00:00Z'));
  assert.equal(value.summary.running,1);
  assert.equal(value.costs.today,2.4);
  assert.equal(value.costs.month,14);
  assert.equal(value.agents[0].status,'working');
  assert.equal(value.agents[1].source,'process');
  assert.equal(value.agents[1].status,'approval');
  assert.equal(value.events[0].status,'done');
  assert.doesNotMatch(value.agents[0].summary,/klient@example\.com|example\.com\/private/);
  assert.match(value.agents[0].summary,/\[ukryty adres\].*\[ukryty link\]/);
  assert.doesNotMatch(JSON.stringify({processes:value.processes,events:value.events}),/klient@example\.com/);
});

test('Live Ops frontend is wired to a read-only endpoint and polls only in its active view',()=>{
  const html=fs.readFileSync('pilot/index.html','utf8');
  const workspace=fs.readFileSync('pilot/workspace.js','utf8');
  const js=fs.readFileSync('pilot/liveops.js','utf8');
  assert.match(html,/href="#operations" data-view="operations"/);
  assert.match(html,/liveops\.css\?v=1\.1\.0/);
  assert.match(html,/liveops\.js\?v=1\.1\.0/);
  assert.match(html,/panel-actions\.js\?v=5\.2\.0/);
  assert.match(html,/systems\.js\?v=6\.0\.4/);
  assert.match(html,/workspace\.js\?v=6\.0\.10/);
  assert.match(workspace,/setActive\?\.\(state\.view==='operations',state\.demo\)/);
  assert.match(workspace,/state\.view==='operations'\?window\.DonaLiveOps\.refresh\(\):loadData\(\)/);
  assert.match(js,/Dona\.request\('dona-live-ops',\{operation:'snapshot'\}/);
  assert.match(js,/state\.active&&!state\.demo/);
  assert.match(js,/Żadnych wysyłek · żadnych publikacji · żadnych zmian/);
  assert.match(js,/POTWIERDZONE OSTATNIO/);
  assert.doesNotMatch(js,/operation:'(?:publish|send|execute|delete|update)'/);
});

test('voice and chat navigation can open the agent operations screen',()=>{
  const actions=fs.readFileSync('pilot/panel-actions.js','utf8');
  assert.match(actions,/view:'operations'/);
  assert.match(actions,/live ops\|liveops/);
});
