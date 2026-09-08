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
  return JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+source+'})()',{$,$input:{all:()=>input.map(row)},require:name=>{assert.equal(name,'crypto');return crypto;}})[0].json));
}
function auth(body, secrets=[{nazwa:'panel_haslo',wartosc:'test-only-password'}]) {
  return run(authSource,{'Workspace Request':[{body}]},secrets);
}
function fixture(){return {'Validate Access':[{authorized:true,tenantId:'PM'}],'Tenant Configuration':[{id:1,client_id:'PM',nazwa:'Test Company'}],...Object.fromEntries(['Customers','Approvals','Leads','Offers','Meetings','Tasks','Documents','Events','Brain','Social Profiles','Social Posts','Mail','Mail Sync','Project Memory','Panel Events','Zoho Calendar','Agent Logs'].map(n=>['Read '+n,[{}]]))};}
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
  for(const key of ['approvals','leads','offers','clients','meetings','tasks','files','activity'])assert.deepEqual(result[key],[]);
  f['Tenant Configuration']=[{}];assert.throws(()=>run(snapshotSource,f),/TENANT_CONFIGURATION_UNAVAILABLE/);
  f['Validate Access']=[{authorized:false,tenantId:'PM'}];assert.throws(()=>run(snapshotSource,f),/ACCESS_DENIED/);
});
test('other tenants and non-allowlisted payload keys never reach the browser',()=>{
  const f=fixture();f['Read Leads']=[{id:1,client_id:'OTHER',lead_id:'foreign',email:'private@example.com'},{id:2,client_id:'PM',lead_id:'own',imie:'Own'}];
  f['Read Approvals']=[{id:1,tenant_id:'PM',approval_id:'a',action_type:'email_send',payload_preview:JSON.stringify({subject:'Hello',body:'Approved preview',apiKey:'do-not-expose',haslo:'secret'})}];
  const r=run(snapshotSource,f);assert.deepEqual(r.leads.map(x=>x.id),['own']);assert.equal(r.approvals[0].type,'Wiadomość do wysłania');assert.match(r.approvals[0].preview,/Hello/);assert.doesNotMatch(JSON.stringify(r),/private@example|do-not-expose|secret/);
});
test('unsafe URLs are removed and missing monetary values stay unknown',()=>{
  const f=fixture();f['Read Offers']=[{id:1,client_id:'PM',offer_id:'one',drive_link:'javascript:alert(1)'},{id:2,client_id:'PM',offer_id:'two',total_netto:0,drive_link:'https://example.com/file'}];const r=run(snapshotSource,f);assert.equal(r.offers[0].url,'');assert.equal(r.offers[0].amount,null);assert.equal(r.offers[1].amount,0);assert.equal(r.offers[1].url,'https://example.com/file');
});
test('large collections honestly signal truncated results',()=>{
  const f=fixture();f['Read Leads']=Array.from({length:251},(_,id)=>({id,client_id:'PM',lead_id:String(id)}));const r=run(snapshotSource,f);assert.equal(r.leads.length,250);assert.deepEqual(r.meta.truncated,['leads']);
});
test('malformed approval payloads cannot break the snapshot',()=>{
  for(const payload_preview of ['null','[]','123','not json',null]){const f=fixture();f['Read Approvals']=[{id:1,tenant_id:'PM',approval_id:'one',payload_preview}];assert.equal(run(snapshotSource,f).approvals.length,1);}
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
