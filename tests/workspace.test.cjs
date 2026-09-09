const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const authSource = fs.readFileSync('backend/workspace-auth.js','utf8');
const snapshotSource = fs.readFileSync('backend/workspace-snapshot.js','utf8');
const row = json => ({json});
function run(source, records, input=[]) {
  const $ = name => ({first:()=>row(records[name][0]),all:()=>records[name].map(row)});
  return JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+source+'})()',{$,$input:{all:()=>input.map(row)},URL,require:name=>{assert.equal(name,'crypto');return crypto;}})[0].json));
}
function auth(body, secrets=[{nazwa:'panel_haslo',wartosc:'test-only-password'}]) {
  return run(authSource,{'Workspace Request':[{body}]},secrets);
}
function fixture(){return {'Validate Access':[{authorized:true,tenantId:'PM'}],'Tenant Configuration':[{id:1,client_id:'PM',nazwa:'Test Company'}],...Object.fromEntries(['Customers','Approvals','Leads','Offers','Meetings','Tasks','Processes','Assets','Campaigns','Customer Memory','Next Actions','Documents','Invoices','Subscriptions','Subscription Usage','Research','Competitor Observations','Playbooks','Events','Brain','Social Profiles','Social Posts','Mail','Mail Sync','Project Memory','Panel Events','Zoho Calendar','Media Registry','Agent Logs'].map(n=>['Read '+n,[{}]]))};}
test('only the correct password can authorize snapshot',()=>{
  for(const body of [undefined,null,[],{}, {operation:'snapshot',haslo:'wrong'}, {operation:'snapshot',haslo:{}}])assert.equal(auth(body).statusCode,401);
  assert.equal(auth({operation:'snapshot',haslo:'test-only-password'}).authorized,true);
  assert.equal(auth({operation:'write',haslo:'test-only-password'}).statusCode,400);
});
test('client identity overrides and duplicate/missing credentials fail closed',()=>{
  for(const key of ['tenantId','tenant_id','role','rola','userId','user_id'])assert.equal(auth({operation:'snapshot',haslo:'test-only-password',[key]:'other'}).statusCode,403);
  assert.equal(auth({operation:'snapshot',haslo:'test-only-password'},[]).authorized,false);
  assert.equal(auth({operation:'snapshot',haslo:'test-only-password'},[{nazwa:'panel_haslo',wartosc:'test-only-password'},{nazwa:'panel_haslo',wartosc:'test-only-password'}]).authorized,false);
});
test('empty tables produce valid empty arrays; missing tenant fails',()=>{
  const f=fixture();const result=run(snapshotSource,f);
  for(const key of ['approvals','leads','offers','clients','meetings','tasks','processes','assets','campaigns','customerMemory','nextActions','files','invoices','subscriptions','subscriptionUsage','researches','competitorObservations','playbooks','mediaAnalyses','activity'])assert.deepEqual(result[key],[]);
  f['Tenant Configuration']=[{}];assert.throws(()=>run(snapshotSource,f),/TENANT_CONFIGURATION_UNAVAILABLE/);
  f['Validate Access']=[{authorized:false,tenantId:'PM'}];assert.throws(()=>run(snapshotSource,f),/ACCESS_DENIED/);
});
test('other tenants and non-allowlisted payload keys never reach the browser',()=>{
  const f=fixture();f['Read Leads']=[{id:1,client_id:'OTHER',lead_id:'foreign',email:'private@example.com'},{id:2,client_id:'PM',lead_id:'own',imie:'Own'}];
  f['Read Approvals']=[{id:1,tenant_id:'PM',approval_id:'a',action_type:'email_send',payload_preview:JSON.stringify({subject:'Hello',body:'Approved preview',apiKey:'do-not-expose',haslo:'secret'})}];
  const r=run(snapshotSource,f);assert.deepEqual(r.leads.map(x=>x.id),['own']);assert.equal(r.approvals[0].type,'Wiadomość do wysłania');assert.match(r.approvals[0].preview,/Hello/);assert.doesNotMatch(JSON.stringify(r),/private@example|do-not-expose|secret/);
});
test('mail rows expose which mailbox they arrived on, not just the sender',()=>{
  const f=fixture();
  f['Read Mail']=[
    {id:1,tenant_id:'PM',mail_id:'m1',subject:'Faktura',sender_email:'ktos@example.com',mailbox_adres:'biuro@probatum.pl',konto:'biuro',mailbox_id:'glowne'},
    {id:2,tenant_id:'PM',mail_id:'m2',subject:'Zapytanie',sender_email:'inny@example.com',konto:'drugie',mailbox_id:'drugie'},
    {id:3,tenant_id:'PM',mail_id:'m3',subject:'Bez konta',sender_email:'trzeci@example.com'}
  ];
  const r=run(snapshotSource,f);
  assert.equal(r.mails.find(m=>m.id==='m1').account,'biuro@probatum.pl');
  assert.equal(r.mails.find(m=>m.id==='m2').account,'drugie');
  assert.equal(r.mails.find(m=>m.id==='m3').account,'');
});
test('unsafe URLs are removed and missing monetary values stay unknown',()=>{
  const f=fixture();f['Read Offers']=[{id:1,client_id:'PM',offer_id:'one',drive_link:'javascript:alert(1)'},{id:2,client_id:'PM',offer_id:'two',total_netto:0,drive_link:'https://example.com/file'}];const r=run(snapshotSource,f);assert.equal(r.offers[0].url,'');assert.equal(r.offers[0].amount,null);assert.equal(r.offers[1].amount,0);assert.equal(r.offers[1].url,'https://example.com/file');
});
test('owner-pilot document table keeps business client IDs separate from ownership',()=>{
  const f=fixture();f['Read Documents']=[
    {id:1,dokument_id:'doc-1',klient_id:'',nazwa_pliku:'Dokument ogólny',drive_link:'https://drive.google.com/file/d/one/view',status:'GOTOWA'},
    {id:2,dokument_id:'doc-2',klient_id:'business-customer-17',nazwa_pliku:'Dokument klienta',drive_link:'https://docs.google.com/document/d/two/edit',status:'GOTOWA',raw_content:'PRIVATE'},
    {id:3,dokument_id:'doc-3',klient_id:'other',nazwa_pliku:'Niebezpieczny link',drive_link:'https://evil.example/file'}
  ];
  const r=run(snapshotSource,f);
  assert.deepEqual(r.files.map(x=>x.id),['doc-1','doc-2','doc-3']);assert.equal(r.files[0].url,'https://drive.google.com/file/d/one/view');assert.equal(r.files[1].url,'https://docs.google.com/document/d/two/edit');assert.equal(r.files[2].url,'');assert.doesNotMatch(JSON.stringify(r),/business-customer-17|PRIVATE|raw_content/);
});
test('business systems expose allowlisted fields and keep raw workflow payloads private',()=>{
 const f=fixture();
 f['Read Customers']=[{id:1,client_id:'PM',customer_id:'customer-1',nazwa:'Klient Jeden',owner:'Piotr',poziom_obslugi:'VIP',drive_folder_id:'folder-1'}];
 f['Read Tasks']=[{id:1,tenant_id:'PM',zadanie_id:'task-1',tytul:'Oddać raport',customer_id:'customer-1',projekt_id:'project-1',explicit_priority:'HIGH',priority_score:88,wlasciciel:'Piotr',provenance:'PRIVATE PROVENANCE'}];
 f['Read Processes']=[{id:1,tenant_id:'OTHER',proces_id:'foreign',opis:'FOREIGN PROCESS'},{id:2,tenant_id:'PM',proces_id:'process-1',opis:'Wdrożenie',stan_json:JSON.stringify({ustalone:['Zakres'],czeka_na_ciebie:['Akceptacja'],zablokowane:['Dostęp'],secret:'PRIVATE STATE'}),apiKey:'PRIVATE KEY'}];
 f['Read Assets']=[{id:1,client_id:'PM',asset_id:'site-1',title:'Landing',asset_type:'LANDING_PAGE',preview_url:'javascript:alert(1)',source_data_location:'https://example.com/source',raw_html:'PRIVATE HTML'}];
 f['Read Campaigns']=[{id:1,campaign_id:'campaign-1',nazwa:'Kampania',budzet_netto:1500,sekret:'PRIVATE CAMPAIGN'}];
 f['Read Customer Memory']=[{id:1,client_id:'PM',memory_id:'memory-1',customer_id:'customer-1',memory_key:'kontakt',wartosc:'Telefon rano',source_excerpt:'potwierdzone',wartosc_norm:'PRIVATE NORMALIZED'}];
 f['Read Next Actions']=[{id:1,client_id:'PM',action_id:'action-1',customer_id:'customer-1',action:'Zadzwonić',due_at:'2026-09-10T08:00:00Z'}];
 f['Read Invoices']=[{id:1,numer_faktury:'FV/1',klient:'Klient Jeden',kwota:1234.5,waluta:'PLN',raw_pdf:'PRIVATE PDF'}];
 f['Read Subscriptions']=[{id:1,service_id:'service-1',nazwa:'OpenAI',cena:99,waluta:'USD',aktywny:true,dashboard_url:'https://example.com/dashboard',credential_ref:'PRIVATE CREDENTIAL'}];
 f['Read Subscription Usage']=[{id:1,odczyt_id:'usage-1',service_id:'service-1',used:25,total:100,raw_field:'PRIVATE RAW'}];
 f['Read Research']=[{id:1,klient_id:'',temat_klucz:'research-1',temat:'Rynek',podsumowanie:'Wynik',wynik_json:'PRIVATE RESEARCH'}];
 f['Read Competitor Observations']=[{id:1,klient_id:'PM',obserwacja_id:'watch-1',konkurent:'Firma X',skrot:'Podsumowanie',migawka:'PRIVATE SNAPSHOT'}];
 f['Read Playbooks']=[{id:1,playbook_id:'pb-1',nazwa:'AI B2B',branza:'b2b',moduly:'leady,oferty',szablony_json:'PRIVATE TEMPLATE'}];
 const r=run(snapshotSource,f),serialized=JSON.stringify(r);
 assert.equal(r.tasks[0].projectId,'project-1');assert.equal(r.tasks[0].priorityScore,88);assert.equal(r.processes.length,1);assert.deepEqual(r.processes[0].state,{settled:['Zakres'],waiting:['Akceptacja'],blocked:['Dostęp']});
 assert.equal(r.assets[0].previewUrl,'');assert.equal(r.assets[0].sourceUrl,'https://example.com/source');assert.equal(r.customerMemory[0].clientName,'Klient Jeden');assert.equal(r.nextActions[0].clientName,'Klient Jeden');
 assert.equal(r.invoices[0].amount,1234.5);assert.equal(r.subscriptions[0].dashboardUrl,'https://example.com/dashboard');assert.equal(r.subscriptionUsage[0].used,25);assert.equal(r.researches[0].topic,'Rynek');assert.equal(r.competitorObservations[0].competitor,'Firma X');assert.deepEqual(r.playbooks[0].modules,['leady','oferty']);
 assert.doesNotMatch(serialized,/FOREIGN PROCESS|PRIVATE PROVENANCE|PRIVATE STATE|PRIVATE KEY|PRIVATE HTML|PRIVATE CAMPAIGN|PRIVATE NORMALIZED|PRIVATE PDF|PRIVATE CREDENTIAL|PRIVATE RAW|PRIVATE RESEARCH|PRIVATE SNAPSHOT|PRIVATE TEMPLATE/);
});
test('large collections honestly signal truncated results',()=>{
  const f=fixture();f['Read Leads']=Array.from({length:251},(_,id)=>({id,client_id:'PM',lead_id:String(id)}));const r=run(snapshotSource,f);assert.equal(r.leads.length,250);assert.deepEqual(r.meta.truncated,['leads']);
});
test('malformed approval payloads cannot break the snapshot',()=>{
  for(const payload_preview of ['null','[]','123','not json',null]){const f=fixture();f['Read Approvals']=[{id:1,tenant_id:'PM',approval_id:'one',payload_preview}];assert.equal(run(snapshotSource,f).approvals.length,1);}
});
test('calendar approvals expose only reviewable fields and safe execution metadata',()=>{
 const f=fixture(),payload={calendarId:'own',eventUid:'event@zoho.com',etag:'1234',title:'Spotkanie',start:'2026-09-10T10:00:00+02:00',end:'2026-09-10T10:30:00+02:00',attendees:['guest@example.com'],notifyAttendees:1,secret:'HIDDEN'};
 f['Read Approvals']=[{id:1,tenant_id:'PM',approval_id:'zoho-1',action_type:'ZOHO_EVENT_UPDATE',payload_preview:JSON.stringify(payload),status:'REQUESTED',execution_status:'PENDING'}];
 const r=run(snapshotSource,f),item=r.approvals[0];
 assert.equal(item.type,'Zmiana spotkania w Zoho');assert.equal(item.canApprove,false);assert.equal(item.actionPayload.eventUid,'event@zoho.com');assert.deepEqual(item.actionPayload.attendees,['guest@example.com']);assert.equal(item.actionPayload.secret,undefined);assert.equal(item.executionStatus,'PENDING');assert.doesNotMatch(JSON.stringify(item),/HIDDEN/);
 delete payload.secret;f['Read Approvals'][0].payload_preview=JSON.stringify(payload);assert.equal(run(snapshotSource,f).approvals[0].canApprove,true);
});
test('calendar snapshot ignores the synthetic test calendar placeholder',()=>{
 const f=fixture();f['Read Zoho Calendar']=[
  {id:1,tenant_id:'PM',provider:'zoho',calendar_id:'own',calendar_name:'Test',status:'READ_OK',checked_at:'2026-09-09T16:21:19Z',events_json:JSON.stringify([{id:'fake',title:'Test'}])},
  {id:2,tenant_id:'PM',provider:'zoho',calendar_id:'e5bf299d9487429baacd94f522d8823f',calendar_name:'kontakt',status:'READ_OK',checked_at:'2026-09-09T17:00:45Z',events_json:'[]'}
 ];
 const r=run(snapshotSource,f);
 assert.deepEqual(r.calendar.calendars.map(x=>x.id),['e5bf299d9487429baacd94f522d8823f']);
 assert.doesNotMatch(JSON.stringify(r),/"id":"fake"/);
});
test('brain and Facebook rows remain owner scoped with no extra raw fields',()=>{
 const f=fixture();f['Read Brain']=[{id:1,tenant_id:'OTHER',tresc:'FOREIGN'},{id:2,tenant_id:'PM',wpis_id:'own',tresc:'Own memory',zrodlo_kanal:'panel',apiKey:'HIDDEN'}];
 f['Read Social Profiles']=[{id:1,profile_key:'edwardjanusz',fb_page_id:'WRONG',brand_name:'FOREIGN'},{id:2,profile_key:'edwardjanusz',fb_page_id:'61594093026807',brand_name:'Janusz',posting_enabled:false,connection_status:'META_NOT_CONNECTED'}];
 f['Read Social Posts']=[{id:1,profile_key:'edwardjanusz',fb_page_id:'61594093026807',post_key:'draft',caption:'Draft',status:'DRAFT',image_url:'javascript:bad',access_token:'HIDDEN'}];
 const r=run(snapshotSource,f);assert.equal(r.memory.length,1);assert.equal(r.socialProfiles.length,1);assert.equal(r.socialPosts[0].image,'');assert.equal(r.connections.find(c=>c.id==='edwardjanusz').status,'NOT_CONNECTED');assert.doesNotMatch(JSON.stringify(r),/FOREIGN|HIDDEN/);
});
test('Buffer channel read is visible without enabling Facebook publishing',()=>{
 const f=fixture();
 f['Read Social Profiles']=[{id:1,profile_key:'silverandglass',fb_page_id:'61593755021660',brand_name:'Silver & Glass',posting_enabled:false,connection_status:'BUFFER_CONNECTED',buffer_channel_id:'buffer-silver',buffer_checked_at:'2026-09-08T23:29:10.782Z'}];
 const r=run(snapshotSource,f),profile=r.socialProfiles[0],connection=r.connections.find(c=>c.id==='silverandglass');
 assert.equal(profile.bufferChannelId,'buffer-silver');
 assert.equal(profile.bufferCheckedAt,'2026-09-08T23:29:10.782Z');
 assert.equal(profile.enabled,false);
 assert.equal(connection.status,'READ_OK');
 assert.match(connection.detail,/Automatyczna publikacja pozostaje wyłączona/);
});
test('media registry is tenant scoped and exposes only safe result metadata',()=>{
 const f=fixture();
 f['Read Media Registry']=[
  {id:1,tenant_id:'OTHER',material_uid:'foreign',tytul:'FOREIGN',pliki_json:'[]'},
  {id:2,tenant_id:'PM',material_uid:'media-1',tytul:'Test analizy',source_url:'https://www.youtube.com/watch?v=Dr3Q-Ju_c3U',status:'PARTIAL',folder_url:'https://drive.google.com/drive/folders/folder-id',przetworzono_at:'2026-09-09T10:00:00Z',znakow_transkrypcji:'14862',tagi:'brand:probatum',pliki_json:JSON.stringify([
   {nazwa:'01_TRANSKRYPCJA.pdf',link:'https://drive.google.com/file/d/transcript/view'},
   {name:'03_MAPA_MYSLI.svg',url:'https://drive.google.com/file/d/map/view'},
   {nazwa:'04_METADATA.json',link:'https://docs.google.com/document/d/meta/edit'},
   {nazwa:'02_PODSUMOWANIE.pdf',link:'https://evil.example/private'}
  ]),transcript:'PRIVATE TRANSCRIPT',apiKey:'PRIVATE KEY',blad:'PRIVATE ERROR'}
 ];
 const r=run(snapshotSource,f),item=r.mediaAnalyses[0],serialized=JSON.stringify(r);
 assert.equal(r.mediaAnalyses.length,1);assert.equal(item.id,'media-1');assert.equal(item.status,'PARTIAL');assert.equal(item.brandId,'probatum');assert.equal(item.transcriptCharacters,14862);
 assert.equal(item.folderUrl,'https://drive.google.com/drive/folders/folder-id');assert.equal(item.sourceUrl,'https://www.youtube.com/watch?v=Dr3Q-Ju_c3U');assert.equal(item.files.length,3);
 assert.deepEqual(item.stages,{transcript:true,summary:false,mindMap:true,metadata:true});
 assert.deepEqual(Object.keys(item).sort(),['brandId','files','folderUrl','id','processedAt','sourceUrl','stages','status','title','transcriptCharacters'].sort());
 assert.doesNotMatch(serialized,/FOREIGN|PRIVATE TRANSCRIPT|PRIVATE KEY|PRIVATE ERROR|pliki_json|apiKey/);
});
test('malformed media rows fail closed and never create misleading successes',()=>{
 const f=fixture(),long='x'.repeat(500);
 f['Read Media Registry']=[
  {id:1,tenant_id:'PM',material_uid:'',tytul:'blank id'},
  {id:2,tenant_id:'PM',material_uid:'same',tytul:long,source_url:'https://phishing.example/watch?v=Dr3Q-Ju_c3U',status:'MYSTERY',folder_url:'javascript:alert(1)',znakow_transkrypcji:-100,pliki_json:'not json'},
  {id:3,tenant_id:'PM',material_uid:'same',tytul:'duplicate',pliki_json:JSON.stringify({not:'a list'})},
  {id:4,tenant_id:'PM',material_uid:'valid',status:'FAILED',folder_url:'http://drive.google.com/unsafe',znakow_transkrypcji:'NaN',pliki_json:JSON.stringify([{nazwa:'bad',link:'data:text/plain,no'},{nazwa:'good',link:'https://drive.google.com/file/d/good/view'}])}
 ];
 const r=run(snapshotSource,f);
 assert.deepEqual(r.mediaAnalyses.map(x=>x.id),['same','valid']);assert.equal(r.mediaAnalyses[0].status,'UNKNOWN');assert.equal(r.mediaAnalyses[0].title.length,240);assert.equal(r.mediaAnalyses[0].sourceUrl,'');assert.equal(r.mediaAnalyses[0].folderUrl,'');assert.equal(r.mediaAnalyses[0].transcriptCharacters,0);assert.deepEqual(r.mediaAnalyses[0].files,[]);
 assert.equal(r.mediaAnalyses[1].status,'FAILED');assert.equal(r.mediaAnalyses[1].folderUrl,'');assert.equal(r.mediaAnalyses[1].transcriptCharacters,0);assert.deepEqual(r.mediaAnalyses[1].files,[{name:'good',url:'https://drive.google.com/file/d/good/view'}]);
});
test('media collection limit is honest and generated workflow remains tenant scoped',()=>{
 const f=fixture();f['Read Media Registry']=Array.from({length:51},(_,id)=>({id,tenant_id:'PM',material_uid:'media-'+id,status:'SUCCESS',pliki_json:'[]'}));
 const r=run(snapshotSource,f),workflow=fs.readFileSync('backend/workspace.workflow.ts','utf8');
 assert.equal(r.mediaAnalyses.length,50);assert.ok(r.meta.truncated.includes('mediaAnalyses'));
 assert.match(workflow,/Read Media Registry/);assert.match(workflow,/mgopWpfCfOrtMNt1/);assert.match(workflow,/tenant_id/);assert.match(workflow,/Validate Access/);assert.match(workflow,/"limit": 51/);assert.match(workflow,/"orderByDirection": "DESC"/);assert.match(workflow,/mediaAnalyses/);
 assert.match(workflow,/Read Documents/);assert.match(workflow,/ESx6r7mHmbKM4rj3/);assert.match(workflow,/readOwnerTable/);
 assert.match(workflow,/Read Processes/);assert.match(workflow,/gofNfnnyfk2JiaIT/);assert.match(workflow,/Read Assets/);assert.match(workflow,/kQ8QuBtVttLgQVOp/);
 assert.match(workflow,/Read Invoices/);assert.match(workflow,/GKRo2xR3NdoT64H1/);assert.match(workflow,/Read Subscriptions/);assert.match(workflow,/jbutUJix5k0Po9aS/);
 assert.match(workflow,/Read Research/);assert.match(workflow,/fUm0Roh35CycVB8Y/);assert.match(workflow,/Read Competitor Observations/);assert.match(workflow,/HVksoxfn9IR8A2sc/);
 assert.match(workflow,/"saveDataErrorExecution": "none"/);assert.match(workflow,/"saveDataSuccessExecution": "none"/);assert.match(workflow,/"saveManualExecutions": false/);
});
