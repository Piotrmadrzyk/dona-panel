// POSIX process-group control only. Host isolation must also prevent detached escape.
// Not wired into the production runner or a subscription CLI yet.
import { spawn } from 'node:child_process';
import { isAbsolute } from 'node:path';

export async function runProcess({ executable, args = [], cwd, env, stdin = '',
  timeoutMs = 60000, maxBytes = 1024 * 1024, signal }) {
  if (process.platform === 'win32') throw new Error('POSIX_HOST_REQUIRED');
  if (!isAbsolute(executable || '') || !isAbsolute(cwd || '') || !env
    || !Array.isArray(args) || args.some(a => typeof a !== 'string')
    || typeof stdin !== 'string' || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1
    || !Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('INVALID_PROCESS_SPEC');
  if (signal?.aborted) return { ok: false, code: 'CANCELLED', stdout: '', stderr: '' };
  return new Promise((resolve, reject) => {
    let child, timer, reason, bytes = 0, settled = false;
    const out = [], err = [];
    // SIGKILL is deliberate: no agent grace period after loss of ownership.
    const stop = () => {
      if (!child?.pid) return;
      try { process.kill(-child.pid, 'SIGKILL'); }
      catch (error) { if (error.code !== 'ESRCH') throw error; }
    };
    const cancel = code => {
      reason ||= code;
      try { stop(); } catch (error) { finish(error); }
    };
    const abort = () => cancel('CANCELLED');
    const finish = (error, exitCode = null, exitSignal = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      try { stop(); } catch (stopError) { error = stopError; }
      if (error) return reject(error);
      resolve({ ok: !reason && exitCode === 0, code: reason || (exitCode === 0 ? undefined : 'PROCESS_FAILED'),
        timedOut: reason === 'TIMEOUT', exitCode, exitSignal,
        stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8') });
    };
    child = spawn(executable, args, { cwd, env, shell: false, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const collect = target => data => {
      const remaining = Math.max(0, maxBytes - bytes);
      if (remaining) target.push(data.subarray(0, remaining));
      bytes += data.length;
      if (bytes > maxBytes) cancel('OUTPUT_LIMIT');
    };
    child.stdout.on('data', collect(out));
    child.stderr.on('data', collect(err));
    child.stdin.on('error', error => { if (error.code !== 'EPIPE') cancel('STDIN_FAILED'); });
    child.on('error', error => finish(error));
    // Kill remaining ordinary children as soon as the leader exits, before pipe close.
    child.on('exit', () => { try { stop(); } catch (error) { finish(error); } });
    child.on('close', (code, sig) => finish(null, code, sig));
    timer = setTimeout(() => cancel('TIMEOUT'), timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    child.stdin.end(stdin);
  });
}
