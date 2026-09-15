import test from 'node:test';
import assert from 'node:assert/strict';
import { runProcess } from '../tools/claude-runner/pilot-process.mjs';

const run = (source, options = {}) => runProcess({ executable: process.execPath,
  args: ['-e', source], cwd: '/tmp', env: { PATH: '/usr/bin:/bin' }, ...options });

test('passes input literally over stdin and does not inherit host environment', async () => {
  const r = await run("process.stdin.pipe(process.stdout); process.stderr.write(String(process.env.HOME))", { stdin: '$(echo unsafe) `text`' });
  assert.equal(r.ok, true);
  assert.equal(r.stdout, '$(echo unsafe) `text`');
  assert.equal(r.stderr, 'undefined');
});
test('nonzero exit cannot be successful', async () => {
  const r = await run('process.exit(2)');
  assert.equal(r.ok, false); assert.equal(r.exitCode, 2);
});
test('timeout stops a live process', async () => {
  const r = await run('setInterval(()=>{},1000)', { timeoutMs: 150 });
  assert.equal(r.code, 'TIMEOUT'); assert.equal(r.timedOut, true);
});
test('abort stops an attempt', async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150);
  try {
    const r = await run('setInterval(()=>{},1000)', { signal: controller.signal });
    assert.equal(r.code, 'CANCELLED');
  } finally { clearTimeout(timer); }
});
test('combined output is capped', async () => {
  const r = await run("process.stdout.write('a'.repeat(10000));setInterval(()=>{},1000)", { maxBytes: 100 });
  assert.equal(r.code, 'OUTPUT_LIMIT'); assert.equal(Buffer.byteLength(r.stdout + r.stderr), 100);
});
test('spawn failure rejects', async () => {
  await assert.rejects(run('', { executable: '/nonexistent-dona-pilot-binary' }), { code: 'ENOENT' });
});
test('ordinary child holding stdout cannot keep the attempt alive after leader exits', async () => {
  const r = await run("require('child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:['ignore',1,2]});process.exit(0)", { timeoutMs: 2000 });
  assert.equal(r.ok, true); assert.equal(r.timedOut, false);
});
test('pre-aborted attempts do not launch', async () => {
  const controller = new AbortController(); controller.abort();
  const r = await run('process.exit(99)', { signal: controller.signal });
  assert.equal(r.code, 'CANCELLED'); assert.equal(r.exitCode, undefined);
});
