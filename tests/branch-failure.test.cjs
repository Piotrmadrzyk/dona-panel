const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const run=j=>JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+fs.readFileSync('backend/branch-result.js','utf8')+'})()',{$input:{first:()=>({json:j})}})[0].json));
test('provider errors return failure without exposing credentials or claiming success',()=>{const r=run({error:{message:'Bearer private-token',stack:'private stack'}});assert.equal(r.ok,false);assert.equal(r.errorCode,'BRANCH_EXECUTION_FAILED');assert.doesNotMatch(JSON.stringify(r),/private-token|private stack/);});
test('a normal branch answer remains available',()=>{const r=run({output:'Przygotowana oferta'});assert.equal(r.ok,true);assert.equal(r.answer,'Przygotowana oferta');});
