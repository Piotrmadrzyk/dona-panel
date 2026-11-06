import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, realpath, mkdir, writeFile, lstat, readdir, readFile } from 'node:fs/promises';
import { join, dirname, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { validateTask, contextHash } from './model-router.mjs';

const exec = promisify(execFile);
function inside(root, file) {
  const rel = relative(root, file);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}
// File snapshots, deliberately not a git worktree: no shared .git directory,
// repo config, hooks, remotes, node_modules or credentials enter the sandbox.
export async function prepareSnapshot({ task, repo, allowedRoot, scratchRoot }) {
  validateTask(task);
  const [root, source, scratch] = await Promise.all([realpath(allowedRoot), realpath(repo), realpath(scratchRoot)]);
  if (!inside(root, source) || inside(source, scratch)) throw new Error('UNSAFE_WORKSPACE_ROOT');
  const env = { PATH: '/usr/bin:/bin', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' };
  const git = args => exec('/usr/bin/git', ['-c', 'core.fsmonitor=false', '-C', source, ...args],
    { env, encoding: 'utf8', maxBuffer: 2_000_000, timeout: 15000 });
  const top = (await git(['rev-parse', '--show-toplevel'])).stdout.trim();
  if (await realpath(top) !== source) throw new Error('REPO_ROOT_REQUIRED');
  await git(['cat-file', '-e', task.baseCommit + '^{commit}']);
  const contents = [];
  for (const file of task.files) {
    const entry = (await git(['ls-tree', task.baseCommit, '--', file])).stdout;
    if (!/^100644 blob [a-f0-9]+\t/.test(entry)) throw new Error('SOURCE_NOT_REGULAR_FILE');
    const content = (await git(['show', task.baseCommit + ':' + file])).stdout;
    contents.push([file, content]);
  }
  const workspace = await mkdtemp(join(scratch, 'dona-pilot-'));
  for (const [file, content] of contents) {
    await mkdir(dirname(join(workspace, file)), { recursive: true, mode: 0o700 });
    await writeFile(join(workspace, file), content, { mode: 0o600, flag: 'wx' });
  }
  return { workspace, contextHash: contextHash(task), baseCommit: task.baseCommit };
}

export async function inspectSnapshot(task, workspace) {
  validateTask(task);
  const root = await realpath(workspace);
  if ((await lstat(workspace)).isSymbolicLink()) throw new Error('WORKSPACE_SYMLINK');
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      const stat = await lstat(path);
      if (stat.isSymbolicLink()) throw new Error('WORKSPACE_SYMLINK');
      if (stat.isDirectory()) {
        if (relative(root, path) !== 'pilot') throw new Error('UNEXPECTED_DIRECTORY');
        await walk(path); continue;
      }
      const name = relative(root, path);
      if (!stat.isFile() || stat.nlink !== 1 || stat.size > 1_000_000 || !task.files.includes(name)) throw new Error('UNEXPECTED_FILE');
      const bytes = await readFile(path);
      files.push({ path: name, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
  await walk(root);
  if (files.length !== task.files.length) throw new Error('MISSING_FILE');
  return { validated: true, contextHash: contextHash(task), files: files.sort((a,b) => a.path.localeCompare(b.path)) };
}
