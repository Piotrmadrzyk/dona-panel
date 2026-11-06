import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticateQuery,authorizedQuery } from '../tools/claude-runner/queue/gateway.mjs';
const digest=authenticateQuery({authorization:'Bearer '+'a'.repeat(64)}).params[0];
const auth={authorized:true,scope:{project:'dona-panel',runner_id:'test-runner',task_id:'pilot_task_001',context_hash:'b'.repeat(64)}};
const body={operation:'status',runnerId:'test-runner',taskId:'pilot_task_001',contextHash:'b'.repeat(64)};
test('gateway only sends token hash to database',()=>{
  const spec=authenticateQuery({authorization:'Bearer '+'a'.repeat(64)});
  assert.equal(spec.params[0],digest); assert.ok(!JSON.stringify(spec).includes('a'.repeat(64)));
  assert.equal(authenticateQuery({authorization:'Bearer api-key'}),null);
});
test('gateway rejects admin actions and scope substitution',()=>{
  for(const change of [{operation:'enqueue'},{operation:'bootstrap'},{runnerId:'foreign'},{taskId:'foreign_task'},{contextHash:'c'.repeat(64)}])
    assert.throws(()=>authorizedQuery({...body,...change},auth,digest));
  assert.throws(()=>authorizedQuery(body,{...auth,authorized:'true'},digest));
});
test('every supported job query rechecks revocation in SQL',()=>{
  for(const operation of ['read','acquire','owns','renew','save','release']){
    const spec=authorizedQuery({...body,operation,leaseId:'11111111-1111-4111-8111-111111111111',
      revision:0,eventId:'test_event_001',record:{status:'RUNNING'}},auth,digest);
    assert.ok(spec.query.includes('NOT k.revoked AND k.expires_at>now()'));
    assert.equal(spec.params.at(-2),digest); assert.equal(spec.params.at(-1),'test-runner');
  }
});
