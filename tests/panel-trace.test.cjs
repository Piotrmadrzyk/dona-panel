const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function run(json){
  const code='(function(){'+fs.readFileSync('backend/panel-trace.js','utf8')+'\n})()';
  return vm.runInNewContext(code,{$input:{first:()=>({json})}})[0].json;
}

test('trace exposes the selected agent but not mail contents or tool arguments',()=>{
  const secret='Poufna treść wiadomości klienta';
  const result=run({output:'Masz trzy nowe wiadomości.',intermediateSteps:[{action:{tool:'deleguj_do_galezi',toolInput:{galaz:'poczta',polecenie:secret}},observation:secret}]});
  assert.equal(result.answer,'Masz trzy nowe wiadomości.');
  assert.deepEqual(Array.from(result.trace,step=>step.label),['DONA przyjęła polecenie','Agent Poczty','DONA złożyła odpowiedź']);
  assert.doesNotMatch(JSON.stringify(result.trace),new RegExp(secret));
});

test('trace ignores unknown tools and never forwards their inputs',()=>{
  const result=run({output:'OK',intermediateSteps:[{action:{tool:'nieznane_narzedzie',toolInput:{apiKey:'sekret'}}}]});
  assert.deepEqual(Array.from(result.trace,step=>step.label),['DONA przyjęła polecenie','DONA złożyła odpowiedź']);
  assert.doesNotMatch(JSON.stringify(result.trace),/sekret|apiKey/);
});

test('trace is capped and branch values are allowlisted',()=>{
  const steps=Array.from({length:30},(_,i)=>({action:{tool:'deleguj_do_galezi',toolInput:{galaz:i?'poczta':'../../admin'}}}));
  const result=run({output:'OK',intermediateSteps:steps});
  assert.equal(result.trace.length,14);
  assert.equal(result.trace[1].label,'Agent specjalistyczny');
});
