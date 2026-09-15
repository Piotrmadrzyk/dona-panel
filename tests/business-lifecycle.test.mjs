import test from 'node:test';
import assert from 'node:assert/strict';
import {plan, processInput, playbooks} from '../tools/business-ops/lifecycle.mjs';
const now = Date.parse('2026-09-15T12:00:00Z');
const proof = () => ({status:'verified',version:1,reference:'test-result:123',checkedAt:'2026-09-15T11:00:00Z',expiresAt:'2026-09-16T11:00:00Z'});
const base = {kind:'academy',projectId:'academy-launch',version:1,now};
test('payment blocker does not stop research or offer work', () => {
  const p=plan(base); assert.deepEqual(p.next.map(t=>t.id),['offer','audience']); assert.equal(p.complete,false);
});
test('materials can proceed while checkout is unavailable', () => {
  const p=plan({...base,completed:{offer:proof(),audience:proof()}});
  assert.ok(p.next.some(t=>t.id==='materials')); assert.ok(!p.next.some(t=>t.id==='checkout'));
});
test('success prose, stale, future and previous-version claims do not complete work', () => {
  for(const bad of [{status:'done'}, {...proof(),expiresAt:'2026-09-14'}, {...proof(),checkedAt:'2026-09-17'}, {...proof(),version:2}, {...proof(),reference:''}])
    assert.equal(plan({...base,completed:{offer:bad}}).tasks[0].status,'READY');
});
test('launch needs actual predecessors and all current authorizations', () => {
  const completed=Object.fromEntries(playbooks.academy.map(([id])=>[id,proof()]));
  const evidence=Object.fromEntries(['payment_ready','publication_authorized','channel_ready','budget_ready','analytics_ready'].map(k=>[k,proof()]));
  assert.equal(plan({...base,completed,evidence}).complete,true);
  delete evidence.payment_ready;
  assert.equal(plan({...base,completed,evidence}).complete,false);
  assert.equal(plan({...base,completed,evidence}).tasks.find(t=>t.id==='launch').status,'WAITING');
});
test('public prospect research never authorizes sending', () => {
  const p=plan({...base,kind:'prospecting',completed:Object.fromEntries(['segment','research','qualify','draft'].map(k=>[k,proof()]))});
  assert.deepEqual(p.tasks.find(t=>t.id==='contact').missing,['evidence:contact_allowed','evidence:send_authorized']);
});
test('process adapter records a plan without claiming execution', () => {
  const a=processInput(plan(base)); const s=JSON.parse(a.stan_json);
  assert.equal(s.businessPlan.executionStarted,false); assert.equal(a.tenant_id,'PM');
});
test('unknown playbook and invalid identifiers fail explicitly', () => {
  for (const patch of [{kind:'toString'},{projectId:'../elsewhere'},{version:0},{now:NaN}]) assert.throws(()=>plan({...base,...patch}));
});
