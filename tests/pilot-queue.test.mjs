import test from 'node:test';
import assert from 'node:assert/strict';
import { createQueueAdapter } from '../tools/claude-runner/queue/adapter.mjs';
import { queueQuery } from '../tools/claude-runner/queue/queries.mjs';
import { contextHash } from '../tools/claude-runner/model-router.mjs';
const task = { id: 'pilot_queue_test', project: 'dona-panel', kind: 'code_change', goal: 'Test',
  baseCommit: 'a'.repeat(40), contextVersion: 1, files: ['pilot/chat.js'], acceptance: 'Test' };
const hash = contextHash(task), lease = '11111111-1111-4111-8111-111111111111';
const saved = status => ({ taskId: task.id, contextHash: hash, lease, status });
test('queue adapter rejects foreign scope before sending and carries revision through completion', async () => {
  const calls = []; let revision = 0;
  const adapter = createQueueAdapter({ task, runnerId: 'test-runner', request: async body => {
    calls.push(body);
    if (body.operation === 'acquire') return { ok: true, lease: { lease_id: lease, revision } };
    if (body.operation === 'save') return { ok: true, revision: ++revision };
    return { ok: true };
  } });
  await assert.rejects(adapter.acquire('foreign_task', hash)); assert.equal(calls.length, 0);
  assert.equal(await adapter.acquire(task.id, hash), lease);
  assert.equal(await adapter.owns('foreign'), false);
  await assert.rejects(adapter.release(lease));
  await adapter.save(saved('RUNNING'));
  await adapter.save(saved('VERIFYING'));
  await adapter.save({ ...saved('READY_FOR_REVIEW'), evidence: { passed: true, artifactRef: 'a', testsRef: 'b' } });
  assert.equal(await adapter.owns(lease), false);
  await adapter.release(lease);
  assert.deepEqual(calls.filter(c => c.operation === 'save').map(c => c.revision), [0,1,2]);
});
test('uncertain write never permits terminal release', async () => {
  const adapter = createQueueAdapter({ task, runnerId: 'test-runner', request: async body =>
    body.operation === 'acquire' ? { ok: true, lease: { lease_id: lease, revision: 0 } } : { ok: true, revision: 20 } });
  await adapter.acquire(task.id, hash);
  await assert.rejects(adapter.save(saved('BLOCKED')), /SAVE_NOT_CONFIRMED/);
  await assert.rejects(adapter.release(lease), /RELEASE_NOT_SAFE/);
});
test('ownership renewal propagates cancellation signal and never accepts truthy strings', async () => {
  const controller = new AbortController(); let seen;
  const adapter = createQueueAdapter({ task, runnerId: 'test-runner', request: async (body, options) => {
    if (body.operation === 'acquire') return { ok: true, lease: { lease_id: lease, revision: 0 } };
    seen = options.signal; return { ok: 'true' };
  } });
  await adapter.acquire(task.id, hash);
  assert.equal(await adapter.owns(lease, { signal: controller.signal }), false);
  assert.equal(seen, controller.signal);
});
test('queue input cannot inject SQL, foreign projects or extra task fields', () => {
  const goal = "'; DROP TABLE pm_os.anything; --";
  const spec = queueQuery({ operation: 'enqueue', task: { ...task, goal, secret: 'do-not-store' } });
  assert.ok(!spec.query.includes(goal));
  assert.equal(JSON.parse(spec.params[2]).goal, goal);
  assert.equal(JSON.parse(spec.params[2]).secret, undefined);
  assert.throws(() => queueQuery({ operation: 'enqueue', task: { ...task, project: 'canon' } }));
  assert.throws(() => queueQuery({ operation: 'acquire', taskId: goal, contextHash: hash, runnerId: 'test' }));
});
test('terminal result requires evidence and invalid revisions never reach SQL', () => {
  const input = { operation: 'save', taskId: task.id, contextHash: hash, runnerId: 'test', leaseId: lease,
    revision: 0, eventId: 'event_test_1', record: { status: 'READY_FOR_REVIEW' } };
  assert.throws(() => queueQuery(input), /EVIDENCE_REQUIRED/);
  assert.throws(() => queueQuery({ ...input, revision: NaN, record: { status: 'RUNNING' } }), /INVALID_REVISION/);
});
