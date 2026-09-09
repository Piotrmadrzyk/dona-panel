const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');

const plan=fs.readFileSync('backend/zoho-action-plan.js','utf8');
const execute=fs.readFileSync('backend/zoho-action-execute.js','utf8');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function run(source,$json){return JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+source+'})()',{$json,$execution:{id:'test-123'},require:name=>{assert.equal(name,'crypto');return crypto;},Date,URL}).json));}

test('calendar planner creates a canonical single-use approval with notifications off by default',()=>{
 const result=run(plan,{operation:'plan_create',tenant_id:'PM',calendar_id:'own',title:'Spotkanie',start:'2026-09-10T10:00:00+02:00',end:'2026-09-10T10:30:00+02:00'}),payload=JSON.parse(result.payloadPreview);
 assert.equal(result.ok,true);assert.equal(result.actionType,'ZOHO_EVENT_CREATE');assert.equal(result.payloadHash,sha(result.payloadPreview));assert.equal(payload.notifyAttendees,0);assert.equal(payload.timezone,'Europe/Warsaw');assert.match(result.approvalId,/^zoho-test-123-create$/);
});

test('calendar planner rejects unsafe tenants, invalid attendees and incomplete mutations',()=>{
 const base={operation:'plan_update',tenant_id:'PM',calendar_id:'own',event_uid:'event@zoho.com',etag:'123',title:'Nowy tytuł'};
 assert.equal(run(plan,base).ok,true);
 assert.equal(run(plan,{...base,tenant_id:'OTHER'}).error,'TENANT_NOT_ALLOWED');
 assert.equal(run(plan,{...base,attendees_json:'["not-an-email"]'}).error,'INVALID_ATTENDEES');
 assert.equal(run(plan,{...base,event_uid:''}).error,'MISSING_UPDATE_FIELDS');
 assert.equal(run(plan,{operation:'plan_delete',tenant_id:'PM',calendar_id:'own',event_uid:'event@zoho.com'}).error,'MISSING_DELETE_FIELDS');
});

test('executor accepts only the exact owner-approved payload and builds Zoho request data',()=>{
 const payload=JSON.stringify({calendarId:'own',eventUid:'event@zoho.com',etag:'1234',title:'Przełożone',start:'2026-09-10T10:00:00+02:00',end:'2026-09-10T10:30:00+02:00',attendees:['guest@example.com'],notifyAttendees:1,timezone:'Europe/Warsaw'});
 const row={id:4,tenant_id:'PM',approval_id:'zoho-a',status:'APPROVED',approved_by:'panel:piotr',decision_source:'dona_panel',execution_status:'READY',single_use:true,expires_at:'2099-01-01',payload_preview:payload,payload_hash:sha(payload),action_type:'ZOHO_EVENT_UPDATE'};
 const result=run(execute,row),eventData=JSON.parse(result.eventData);
 assert.equal(result.ok,true);assert.equal(result.method,'PATCH');assert.equal(result.expectedEtag,'1234');assert.equal(eventData.etag,'1234');assert.equal(eventData.notify_attendee,1);assert.deepEqual(eventData.attendees,[{email:'guest@example.com',status:'NEEDS-ACTION'}]);assert.equal(eventData.dateandtime.start,'20260910T080000Z');
 assert.equal(run(execute,{...row,payload_hash:'0'.repeat(64)}).error,'APPROVAL_CONTENT_CHANGED');
 assert.equal(run(execute,{...row,approved_by:'DONA'}).error,'APPROVAL_NOT_EXECUTABLE');
});

test('generated action workflow is inactive-by-default capable and enforces etag plus claim before writes',()=>{
 const source=fs.readFileSync('backend/zoho-actions.workflow.ts','utf8');
 assert.match(source,/Zoho Calendar OAuth2/);assert.match(source,/Claim Approved Calendar Action/);assert.match(source,/Verify Current Event Version/);assert.match(source,/STALE_EVENT/);assert.match(source,/single_use/);assert.match(source,/ZOHO_EVENT_DELETE/);assert.match(source,/"availableInMCP": true/);
});
