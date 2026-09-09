const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const authSource=fs.readFileSync('backend/action-auth.js','utf8');
const row=json=>({json});
function run(source,records,input=[]){
  const $=name=>({first:()=>row(records[name][0]),all:()=>(records[name]||[]).map(row)});
  return JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+source+'})()',{$,$input:{all:()=>input.map(row)},require:name=>{assert.equal(name,'crypto');return crypto;}})[0].json));
}
function auth(body,secrets=[{nazwa:'panel_haslo',wartosc:'test-only-password'}],origin='https://dona.probatum.pl'){
  return run(authSource,{'Workspace Request':[{body,headers:{origin}}]},secrets);
}

test('only the correct password authorizes decision/save_memory operations',()=>{
  for(const body of [undefined,null,[],{},{operation:'decision',haslo:'wrong'},{operation:'decision',haslo:{}}])
    assert.equal(auth(body).statusCode,401);
  assert.equal(auth({operation:'decision',haslo:'test-only-password'}).authorized,true);
  assert.equal(auth({operation:'save_memory',haslo:'test-only-password'}).authorized,true);
  assert.equal(auth({operation:'snapshot',haslo:'test-only-password'}).statusCode,400);
  assert.equal(auth({operation:'decision',haslo:'test-only-password'},[]).authorized,false);
  assert.equal(auth({operation:'decision',haslo:'test-only-password'},[{nazwa:'panel_haslo',wartosc:'a'},{nazwa:'panel_haslo',wartosc:'a'}]).authorized,false);
});

test('client-supplied identity claims are rejected regardless of value',()=>{
  for(const key of ['tenantId','tenant_id','role','rola','userId','user_id'])
    assert.equal(auth({operation:'decision',haslo:'test-only-password',[key]:'anything'}).statusCode,403);
});

test('only the exact production origin may authorize a decision',()=>{
  for(const origin of ['https://piotrmadrzyk.github.io','http://dona.probatum.pl',''])
    assert.equal(auth({operation:'decision',haslo:'test-only-password'},undefined,origin).statusCode,403);
  assert.equal(run(authSource,{'Workspace Request':[{body:{operation:'decision',haslo:'test-only-password'}}]},[{nazwa:'panel_haslo',wartosc:'test-only-password'}]).statusCode,403);
});

test('the authorized response never echoes a client-controlled tenant id',()=>{
  assert.equal(auth({operation:'decision',haslo:'test-only-password'}).tenantId,'PM');
});
