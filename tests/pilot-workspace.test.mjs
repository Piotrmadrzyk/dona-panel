import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, symlink, link, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareSnapshot, inspectSnapshot } from '../tools/claude-runner/pilot-workspace.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'dona-workspace-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repo = join(root, 'repo'), scratch = join(root, 'scratch');
  await mkdir(join(repo, 'pilot'), { recursive: true }); await mkdir(scratch);
  const git = args => execFileSync('/usr/bin/git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] });
  git(['init']); git(['config','user.name','Test']); git(['config','user.email','test@example.invalid']);
  await writeFile(join(repo,'pilot/chat.js'), 'const original = true;\n');
  await writeFile(join(repo,'private.txt'), 'excluded');
  git(['add','.']); git(['commit','-m','fixture']);
  const task = { id:'pilot_000001',project:'dona-panel',kind:'code_change',goal:'test',baseCommit:git(['rev-parse','HEAD']).trim(),contextVersion:1,files:['pilot/chat.js'],acceptance:'test' };
  return { root,repo,scratch,task };
}
test('snapshot excludes private files and edits never change original checkout', async t => {
  const f = await fixture(t);
  const { workspace } = await prepareSnapshot({ ...f, allowedRoot:f.root,scratchRoot:f.scratch });
  await writeFile(join(workspace,'pilot/chat.js'),'changed');
  assert.match(await readFile(join(f.repo,'pilot/chat.js'),'utf8'), /original/);
  assert.equal((await inspectSnapshot(f.task,workspace)).validated,true);
  await assert.rejects(readFile(join(workspace,'private.txt')));
  await assert.rejects(readFile(join(workspace,'.git/config')));
});
test('rejects repository symlink escaping allowed root', async t => {
  const f = await fixture(t); const allowed = join(f.root,'allowed'); await mkdir(allowed);
  const alias = join(allowed,'repo'); await symlink(f.repo,alias);
  await assert.rejects(prepareSnapshot({task:f.task,repo:alias,allowedRoot:allowed,scratchRoot:f.scratch}),/UNSAFE_WORKSPACE_ROOT/);
});
test('checkpoint rejects symlink planted by agent', async t => {
  const f=await fixture(t); const {workspace}=await prepareSnapshot({...f,allowedRoot:f.root,scratchRoot:f.scratch});
  await rm(join(workspace,'pilot/chat.js')); await symlink(join(f.repo,'private.txt'),join(workspace,'pilot/chat.js'));
  await assert.rejects(inspectSnapshot(f.task,workspace),/WORKSPACE_SYMLINK/);
});
test('checkpoint rejects hardlink and out-of-scope file', async t => {
  const f=await fixture(t); const {workspace}=await prepareSnapshot({...f,allowedRoot:f.root,scratchRoot:f.scratch});
  await writeFile(join(workspace,'pilot/extra.js'),'bad');
  await assert.rejects(inspectSnapshot(f.task,workspace),/UNEXPECTED_FILE/);
  await rm(join(workspace,'pilot/extra.js')); await rm(join(workspace,'pilot/chat.js'));
  await link(join(f.repo,'pilot/chat.js'),join(workspace,'pilot/chat.js'));
  await assert.rejects(inspectSnapshot(f.task,workspace),/UNEXPECTED_FILE/);
});
