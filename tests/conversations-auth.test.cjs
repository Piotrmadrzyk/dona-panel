const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const authSource=fs.readFileSync('backend/conversations-auth.js','utf8');
const row=json=>({json});
function run(source,records,input=[]){
  const $=name=>({first:()=>row(records[name][0]),all:()=>(records[name]||[]).map(row)});
  return JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+source+'})()',{$,$input:{all:()=>input.map(row)},require:name=>{assert.equal(name,'crypto');return crypto;}})[0].json));
}
function auth(body,secrets=[{nazwa:'panel_haslo',wartosc:'test-only-password'}],origin='https://dona.probatum.pl'){
  return run(authSource,{'Conversation Request':[{body,headers:{origin}}]},secrets);
}

test('only the correct password authorizes list/load/create/append',()=>{
  for(const body of [undefined,null,[],{},{operation:'list',haslo:'wrong'}])assert.equal(auth(body).statusCode,401);
  assert.equal(auth({operation:'list',haslo:'test-only-password'}).authorized,true);
  assert.equal(auth({operation:'write',haslo:'test-only-password'}).statusCode,400);
});

test('only the exact production origin may authorize any operation',()=>{
  for(const origin of ['https://piotrmadrzyk.github.io','http://dona.probatum.pl',''])
    assert.equal(auth({operation:'list',haslo:'test-only-password'},undefined,origin).statusCode,403);
});

test('client-supplied identity claims are rejected, but a legitimate message role is not',()=>{
  for(const key of ['tenantId','tenant_id','role_id','rola_id','userId','user_id'])
    assert.equal(auth({operation:'list',haslo:'test-only-password',[key]:'other'}).statusCode,403);
  assert.equal(auth({operation:'append',haslo:'test-only-password',threadId:'PM',role:'user',content:'hej'}).authorized,true);
});

test('thread id must be the owner sentinel or a well-formed thread identifier',()=>{
  assert.equal(auth({operation:'load',haslo:'test-only-password',threadId:'PM'}).authorized,true);
  assert.equal(auth({operation:'load',haslo:'test-only-password',threadId:'thread-'+'a'.repeat(24)}).authorized,true);
  for(const threadId of ['','../etc/passwd','thread-short','anything'])
    assert.equal(auth({operation:'load',haslo:'test-only-password',threadId}).statusCode,400);
});

test('append requires a valid role and non-empty, bounded content',()=>{
  const base={operation:'append',haslo:'test-only-password',threadId:'PM'};
  assert.equal(auth({...base,role:'dona',content:'ok'}).authorized,true);
  assert.equal(auth({...base,role:'owner',content:'ok'}).statusCode,400);
  assert.equal(auth({...base,role:'user',content:''}).statusCode,400);
  assert.equal(auth({...base,role:'user',content:'x'.repeat(30001)}).statusCode,400);
});

test('brand id is restricted to the known brand allowlist',()=>{
  assert.equal(auth({operation:'create',haslo:'test-only-password',brandId:'silverandglass'}).brandId,'silverandglass');
  assert.equal(auth({operation:'create',haslo:'test-only-password',brandId:'not-a-brand'}).brandId,'');
});
