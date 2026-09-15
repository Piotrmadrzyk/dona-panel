import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTask, contextHash, selectExecutors, classifyFailure, childEnvironment, invocation, runPilot } from '../tools/claude-runner/model-router.mjs';

const task = { id: 'pilot_000001', project: 'dona-panel', kind: 'code_change', goal: 'Popraw mobilny przycisk',
  baseCommit: 'a'.repeat(40), contextVersion: 1, files: ['pilot/chat.js'], acceptance: 'Przycisk jest dostępny na telefonie.' };
const registry = ['claude', 'codex'].map(engine => ({ engine, model: 'test-model', billing: 'subscription', auth: 'ready',
  health: 'ready', projects: ['dona-panel'], capabilities: ['code_change'], observedAt: 1000, quota: 'unknown' }));
function fixture(results) {
  const events = []; let owned = true;
  return { events, loseLease() { owned = false; },
    async preflight() { return { isolated: true, subscriptionOnly: true, noProductionCredentials: true, trustedVerifier: true }; },
    async acquire() { return 'lease-1'; }, async owns() { return owned; },
    async workspace(input) { events.push(['workspace', input]); return '/isolated'; },
    async save(record) { events.push(['save', record]); },
    async execute(input) { events.push(['execute', input]); return results.shift(); },
    async checkpoint() { return { validated: true, contextHash: contextHash(task), ref: 'checkpoint-1' }; },
    async verify() { return { passed: true, artifactRef: 'diff-1', testsRef: 'tests-1' }; },
    async stop() { events.push(['stop']); }, async release() { events.push(['release']); } };
}
const options = host => ({ task, registry, host, enabled: true, now: () => 1000 });

test('pilot rejects foreign projects, traversal, settings and invalid context', () => {
  for (const change of [{ project: 'nikon' }, { files: ['pilot/../secret.js'] }, { files: ['.claude/settings.json'] },
    { contextVersion: NaN }, { baseCommit: 'main' }, { files: ['pilot/chat.js', 'pilot/chat.js'] }]) {
    assert.throws(() => validateTask({ ...task, ...change }));
  }
});
test('context hash binds goal, commit and acceptance', () => {
  for (const change of [{ goal: 'Inny cel' }, { acceptance: 'Inny test' }, { baseCommit: 'b'.repeat(40) }])
    assert.notEqual(contextHash(task), contextHash({ ...task, ...change }));
});
test('rejects paid, stale, future, low quota and wrong capabilities', () => {
  for (const change of [{ billing: 'api' }, { observedAt: -200000 }, { observedAt: 1001 },
    { quota: 'known', remainingPercent: 29 }, { capabilities: [] }, { auth: 'unknown' }, { quota: 'known', remainingPercent: NaN }])
    assert.equal(selectExecutors([{ ...registry[0], ...change }], 1000).length, 0);
});
test('no environment secrets or runtime injection inherited', () => {
  const env = childEnvironment({ home: '/safe', path: '/usr/bin', ANTHROPIC_API_KEY: 'secret', NODE_OPTIONS: '--require evil' });
  assert.equal(env.ANTHROPIC_API_KEY, undefined); assert.equal(env.NODE_OPTIONS, undefined);
  assert.throws(() => childEnvironment({ home: '/safe', path: '/usr/bin:.' }));
});
test('CLI invocations retain sandbox and avoid arbitrary shell prompt interpolation', () => {
  const prompt = '$(touch /tmp/evil)';
  for (const engine of ['claude', 'codex']) {
    const spec = invocation(engine, 'test-model', prompt);
    assert.equal(spec.stdin, prompt); assert.ok(!spec.args.includes(prompt));
    assert.ok(!spec.args.includes('--dangerously-skip-permissions'));
  }
  assert.ok(invocation('claude', 'test-model', '').args.includes('--restricted'));
});
test('permission and unknown failures do not route around safety', () => {
  assert.equal(classifyFailure({ code: 'forbidden' }), 'PERMISSION');
  assert.equal(classifyFailure({ message: 'The document discusses a usage limit' }), 'UNKNOWN');
});
test('disabled pilot does not touch host or queue', async () => {
  assert.deepEqual(await runPilot({ enabled: false }), { status: 'DISABLED' });
});
test('host not verified prevents claim and execution', async () => {
  const host = fixture([]); host.preflight = async () => ({ isolated: false });
  assert.equal((await runPilot(options(host))).reason, 'HOST_NOT_VERIFIED'); assert.equal(host.events.length, 0);
});
test('limit hands validated checkpoint to Codex; result verified before ready', async () => {
  const host = fixture([{ ok: false, code: 'usage_limit_reached' }, { ok: true }]);
  const result = await runPilot(options(host));
  assert.equal(result.engine, 'codex'); assert.equal(result.status, 'READY_FOR_REVIEW');
  const runs = host.events.filter(e => e[0] === 'execute'); assert.equal(runs.length, 2);
  assert.match(runs[1][1].invocation.stdin, /checkpoint-1/);
  assert.deepEqual(host.events.slice(-2).map(e => e[0]), ['stop', 'release']);
});
test('unsafe checkpoint stops fallback', async () => {
  const host = fixture([{ ok: false, code: 'usage_limit_reached' }]);
  host.checkpoint = async () => ({ validated: false });
  await assert.rejects(runPilot(options(host)), /INVALID_CHECKPOINT/);
  assert.equal(host.events.filter(e => e[0] === 'execute').length, 1);
});
test('permission failure stops after one attempt', async () => {
  const host = fixture([{ ok: false, code: 'forbidden' }]);
  assert.equal((await runPilot(options(host))).reason, 'PERMISSION');
  assert.equal(host.events.filter(e => e[0] === 'execute').length, 1);
});
test('failed verification never produces completed claim', async () => {
  const host = fixture([{ ok: true }]); host.verify = async () => ({ passed: false });
  assert.equal((await runPilot(options(host))).status, 'FAILED_QA');
  assert.ok(!host.events.some(e => e[1]?.status === 'READY_FOR_REVIEW'));
});
test('lost lease rejects stale success and does not launch fallback', async () => {
  const host = fixture([]); host.execute = async () => { host.loseLease(); return { ok: true }; };
  await assert.rejects(runPilot(options(host)), /LEASE_LOST/);
  assert.ok(!host.events.some(e => e[1]?.status === 'READY_FOR_REVIEW'));
});
test('failed cancellation never releases lease', async () => {
  const host = fixture([{ ok: true }]); host.stop = async () => { throw new Error('STOP_FAILED'); };
  await assert.rejects(runPilot(options(host)), /STOP_FAILED/);
  assert.ok(!host.events.some(e => e[0] === 'release'));
});
