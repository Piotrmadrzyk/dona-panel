const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const authSource=fs.readFileSync('backend/liveops-auth.js','utf8');
const snapshotSource=fs.readFileSync('backend/liveops-snapshot.js','utf8');
const row=json=>({json});
function run(source,records,input=[]){
  const $=name=>({first:()=>row(records[name][0]),all:()=>(records[name]||[]).map(row)});
  return JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+source+'})()',{$,$input:{all:()=>input.map(row)},require:name=>{assert.equal(name,'crypto');return crypto;}})[0].json));
}
function auth(body,secrets=[{nazwa:'panel_haslo',wartosc:'test-only-password'}]){return run(authSource,{'Live Ops Request':[{body}]},secrets);}
function fixture(){return {'Validate Live Ops Access':[{authorized:true,tenantId:'PM'}],'Read Agent Logs':[{}],'Read Incidents':[{}],'Read Cost Audits':[{}],'Read LLM Observability':[{}],'Read Approvals':[{}]};}

test('backend auth is fail-closed and allows read-only operations only',()=>{
  assert.equal(auth({operation:'liveops',haslo:'test-only-password'}).authorized,true);
  assert.equal(auth({operation:'snapshot',haslo:'test-only-password'}).authorized,true);
  assert.equal(auth({operation:'write',haslo:'test-only-password'}).statusCode,400);
  assert.equal(auth({operation:'liveops',haslo:'wrong'}).statusCode,401);
  assert.equal(auth({operation:'liveops',haslo:'test-only-password',tenant_id:'OTHER'}).statusCode,403);
  assert.equal(auth({operation:'liveops',haslo:'test-only-password'},[]).authorized,false);
});

test('empty sources return an honest read-only response',()=>{
  const r=run(snapshotSource,fixture());
  assert.equal(r.readOnly,true);assert.equal(r.meta.readOnly,true);assert.equal(r.summary.health,'unknown');
  for(const key of ['agents','approvals','incidents','models'])assert.deepEqual(r[key],[]);
  assert.equal(r.costs.today,0);assert.equal(r.costs.month,0);
});

test('agent state and metrics are allowlisted and classified',()=>{
  const f=fixture(),now=new Date().toISOString();
  f['Read Agent Logs']=[
    {id:1,agent:'Poczta',przebieg_id:'r1',start:now,status:'RUNNING',liczba_pobranych:4,liczba_bledow:0,raw_payload:'PRIVATE'},
    {id:2,agent:'Zgody',przebieg_id:'r2',start:now,status:'WAITING_FOR_APPROVAL',liczba_bledow:0,prompt:'PRIVATE'},
    {id:3,agent:'Listener',przebieg_id:'r3',start:now,status:'LISTENING',liczba_bledow:0,token:'sk-secret-1234567890'},
    {id:4,agent:'Raport',przebieg_id:'r4',start:now,status:'SUCCESS',liczba_bledow:0},
    {id:5,agent:'Awaria',przebieg_id:'r5',start:now,status:'SUCCESS',liczba_bledow:2},
  ];
  const r=run(snapshotSource,f);
  assert.deepEqual(r.agents.map(x=>x.state),['working','waiting','listening','done','attention']);
  assert.deepEqual(r.agents.map(x=>x.status),['RUNNING','WAITING_APPROVAL','WAITING_SYSTEM','COMPLETED','FAILED']);
  assert.equal(r.summary.running,1);assert.equal(r.summary.waitingApproval,1);assert.equal(r.summary.waitingSystem,1);
  assert.doesNotMatch(JSON.stringify(r),/PRIVATE|sk-secret/);
});

test('tenant isolation and redaction cover audits, models, approvals and cost monitor',()=>{
  const f=fixture(),now=new Date().toISOString();
  f['Read Incidents']=[{id:1,klient_id:'OTHER',audyt_id:'foreign',blad:'PRIVATE',czas:now},{id:2,klient_id:'PM',audyt_id:'own',agent:'System',blad:'Payment required: sk-secret-1234567890',czas:now,wynik:'PRIVATE'}];
  f['Read LLM Observability']=[{id:1,tenant_id:'OTHER',model:'foreign',success:false,started_at:now},{id:2,tenant_id:'PM',log_id:'own',workflow:'DONA',operation:'chat',model:'gpt-safe',success:true,started_at:now,correlation_id:'PRIVATE'}];
  f['Read Approvals']=[{id:1,tenant_id:'PM',approval_id:'a',action_type:'SEND_EMAIL',status:'REQUESTED',created_at:now,expires_at:'2099-01-01T00:00:00Z',requested_by:'PRIVATE',payload_preview:'PRIVATE'}];
  f['Read Cost Audits']=[
    {id:1,klient_id:'OTHER',agent:'PM Agent OS — OpenAI Cost Monitor',narzedzia:'openai-costs-api',czas:now,wynik:JSON.stringify({okres:'miesiac',total_cost:777,currency:'usd',zrodlo:'openai_costs_api'})},
    {id:2,klient_id:'PM',agent:'PM Agent OS — OpenAI Cost Monitor',narzedzia:'openai-costs-api',czas:now,wynik:JSON.stringify({okres:'miesiac',total_cost:21.781857,currency:'usd',zrodlo:'openai_costs_api',generated_at:now,raw:'PRIVATE'})},
    {id:3,klient_id:'PM',agent:'PM Agent OS — OpenAI Cost Monitor',narzedzia:'openai-costs-api',czas:now,wynik:JSON.stringify({okres:'dzis',total_cost:0,currency:'usd',zrodlo:'openai_costs_api',generated_at:now})},
  ];
  const r=run(snapshotSource,f);
  assert.equal(r.incidents[0].code,'payment_required');assert.deepEqual(r.models.map(x=>x.model),['gpt-safe']);
  assert.equal(r.costs.today,0);assert.equal(r.costs.month,21.781857);assert.equal(r.costs.source,'OpenAI Costs API');
  assert.doesNotMatch(JSON.stringify(r),/PRIVATE|foreign|777|sk-secret/);
});

test('a newer LLM success resolves an older failure while usage remains aggregated',()=>{
  const f=fixture(),now=new Date().toISOString(),old=new Date(Date.now()-60000).toISOString();
  f['Read LLM Observability']=[{id:1,tenant_id:'PM',log_id:'new',workflow:'DONA',operation:'chat',model:'gpt-5',success:true,started_at:now,latency_ms:100},{id:2,tenant_id:'PM',log_id:'old',workflow:'DONA',operation:'chat',model:'gpt-5',success:false,rate_limited:true,started_at:old,latency_ms:300}];
  const r=run(snapshotSource,f);assert.equal(r.models[0].requests,2);assert.equal(r.models[0].averageLatencyMs,200);assert.deepEqual(r.incidents,[]);
  assert.equal(r.models[0].avgLatencyMs,200);assert.equal(r.models[0].successRate,50);assert.equal(r.costs.updatedAt,r.costs.measuredAt);
});

test('generated workflow is scoped and contains no Data Table writes',()=>{
  const s=fs.readFileSync('backend/liveops.workflow.ts','utf8');
  for(const id of ['WjTziChiMmtxWWlZ','ejPSDcWeyryp3deZ','T8LCNWvmIZH9vjZJ','KGyAqpVVwhv7G0Ra'])assert.match(s,new RegExp(id));
  assert.match(s,/PM Agent OS — OpenAI Cost Monitor/);assert.match(s,/"saveDataSuccessExecution": "none"/);
  assert.doesNotMatch(s,/"operation": "(?:insert|update|upsert|delete)"/);
});
