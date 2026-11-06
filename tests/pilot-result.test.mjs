import test from 'node:test';
import assert from 'node:assert/strict';
import { parseResult } from '../tools/claude-runner/pilot-result.mjs';
const proc = stdout => ({ ok: true, exitCode: 0, stdout });
const claude = { type: 'result', subtype: 'success', is_error: false, result: 'Zmieniono plik.' };
const codex = [{type:'thread.started',thread_id:'test'}, {type:'turn.started'},
  {type:'item.completed',item:{type:'agent_message',text:'Zmieniono plik.'}}, {type:'turn.completed'}];
const jsonl = events => events.map(e => JSON.stringify(e)).join('\n');
test('accepts complete provider envelopes, never returns bill estimates', () => {
  assert.deepEqual(parseResult('claude',proc(JSON.stringify({...claude,total_cost_usd:12}))),{ok:true,answer:'Zmieniono plik.'});
  assert.deepEqual(parseResult('codex',proc(jsonl(codex))),{ok:true,answer:'Zmieniono plik.'});
});
test('exit zero and prose alone cannot establish success', () => {
  for (const engine of ['claude','codex']) for (const text of ['', 'Gotowe', '{}', 'null', '[]'])
    assert.equal(parseResult(engine,proc(text)).ok,false);
});
test('nonzero, timeout and cancellation override valid-looking success', () => {
  for (const [engine,text] of [['claude',JSON.stringify(claude)],['codex',jsonl(codex)]]) {
    for (const state of [{ok:false,exitCode:1},{timedOut:true},{leaseLost:true},{code:'CANCELLED'},{code:'OUTPUT_LIMIT'}])
      assert.equal(parseResult(engine,{...proc(text),...state}).ok,false);
  }
});
test('provider failure on stdout is detected even with exit zero', () => {
  assert.equal(parseResult('claude',proc(JSON.stringify({type:'result',is_error:true,error:{type:'authentication_error'}}))).code,'authentication_error');
  assert.equal(parseResult('codex',proc(jsonl([{type:'turn.failed',error:{code:'usage_limit_reached'}}]))).code,'usage_limit_reached');
});
test('unknown error prose cannot spoof fallback or leak secrets', () => {
  const result=parseResult('codex',proc(jsonl([{type:'error',message:'usage_limit_reached token=private'}])));
  assert.deepEqual(result,{ok:false,code:'PROVIDER_FAILED'});
});
test('truncated, duplicate or out-of-order Codex completion is rejected', () => {
  for(const events of [codex.slice(0,-1),[codex[3]], [...codex,codex[3]], [codex[2],codex[1],codex[3]]])
    assert.equal(parseResult('codex',proc(jsonl(events))).ok,false);
});
test('error after a completed event cannot be a success', () => {
  assert.equal(parseResult('codex',proc(jsonl([...codex,{type:'error',code:'forbidden'}]))).ok,false);
});
test('Claude requires explicit complete success fields', () => {
  for (const change of [{is_error:undefined},{subtype:'error_max_turns'},{result:''}])
    assert.equal(parseResult('claude',proc(JSON.stringify({...claude,...change}))).ok,false);
});
