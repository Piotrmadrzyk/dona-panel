const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const authSource=fs.readFileSync('backend/tools-auth.js','utf8');
const row=json=>({json});
function run(source,records,input=[]){
  const $=name=>({first:()=>row(records[name][0]),all:()=>(records[name]||[]).map(row)});
  return JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+source+'})()',{$,$input:{all:()=>input.map(row)},require:name=>{assert.equal(name,'crypto');return crypto;}})[0].json));
}
function auth(body,secrets=[{nazwa:'panel_haslo',wartosc:'test-only-password'}],origin='https://dona.probatum.pl'){
  return run(authSource,{'Panel Tools Request':[{body,headers:{origin}}]},secrets);
}

test('only the correct password authorizes drive/youtube operations',()=>{
  for(const body of [undefined,null,[],{},{operation:'drive_search',haslo:'wrong',query:'x'}])assert.equal(auth(body).statusCode,401);
  assert.equal(auth({operation:'drive_search',haslo:'test-only-password',query:'faktura'}).authorized,true);
  assert.equal(auth({operation:'delete_file',haslo:'test-only-password'}).statusCode,400);
});

test('only the exact production origin may authorize any tool call',()=>{
  for(const origin of ['https://piotrmadrzyk.github.io','http://dona.probatum.pl',''])
    assert.equal(auth({operation:'drive_search',haslo:'test-only-password',query:'x'},undefined,origin).statusCode,403);
});

test('client-supplied identity and scope claims are rejected',()=>{
  for(const key of ['tenantId','tenant_id','role','rola','role_id','userId','user_id','folder_id','w_folderze'])
    assert.equal(auth({operation:'drive_search',haslo:'test-only-password',query:'x',[key]:'other'}).statusCode,403);
});

test('drive_search requires a non-empty query',()=>{
  assert.equal(auth({operation:'drive_search',haslo:'test-only-password',query:''}).statusCode,400);
  assert.equal(auth({operation:'drive_search',haslo:'test-only-password',query:'  '}).statusCode,400);
});

test('drive_read requires a well-formed Drive file id',()=>{
  assert.equal(auth({operation:'drive_read',haslo:'test-only-password',fileId:'short'}).statusCode,400);
  assert.equal(auth({operation:'drive_read',haslo:'test-only-password',fileId:'a'.repeat(20)}).authorized,true);
});

test('youtube_analyze only accepts a real, well-formed YouTube URL',()=>{
  for(const url of ['not a url','https://evil.example/watch?v=dQw4w9WgXcQ','javascript:alert(1)',''])
    assert.equal(auth({operation:'youtube_analyze',haslo:'test-only-password',url}).statusCode,400);
  assert.equal(auth({operation:'youtube_analyze',haslo:'test-only-password',url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}).authorized,true);
  assert.equal(auth({operation:'youtube_analyze',haslo:'test-only-password',url:'https://youtu.be/dQw4w9WgXcQ'}).authorized,true);
});
