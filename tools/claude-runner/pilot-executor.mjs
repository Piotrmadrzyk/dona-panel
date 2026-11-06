// Execution portion of the host adapter. Queue persistence, auth and OS isolation
// remain separate prerequisites enforced by runPilot.preflight.
import { runProcess } from './pilot-process.mjs';
import { parseResult } from './pilot-result.mjs';
import { childEnvironment } from './model-router.mjs';
import { isAbsolute } from 'node:path';

export function createExecutor({ executables, environment, owns, pollMs = 5000,
  ownershipTimeoutMs = 3000, timeoutMs = 15 * 60 * 1000 }) {
  if (typeof owns !== 'function' || ![pollMs,ownershipTimeoutMs,timeoutMs].every(n => Number.isSafeInteger(n) && n > 0))
    throw new Error('INVALID_EXECUTOR_CONFIG');
  const env = childEnvironment(environment);
  // Copy trusted host configuration; no executable path from the job payload.
  const bins = Object.freeze({ claude: executables?.claude, codex: executables?.codex });
  let current = null;

  function checkOwnership(lease, signal) {
    return new Promise(resolve => {
      let finished = false;
      const done = result => {
        if (finished) return;
        finished = true; clearTimeout(timer); signal.removeEventListener('abort', abort);
        resolve(result === true);
      };
      const abort = () => done(false);
      const timer = setTimeout(() => done(false), ownershipTimeoutMs);
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) return done(false);
      Promise.resolve().then(() => owns(lease, { signal })).then(done, () => done(false));
    });
  }

  return {
    execute(spec) {
      if (current) return Promise.reject(new Error('EXECUTOR_BUSY'));
      if (!['claude','codex'].includes(spec.engine) || !isAbsolute(bins[spec.engine] || '') || !spec.lease)
        return Promise.reject(new Error('INVALID_EXECUTOR_SPEC'));
      const record = { lease: spec.lease, controller: new AbortController(), done: null };
      current = record;
      record.done = Promise.resolve().then(async () => {
        let timer, ended = false, leaseLost = false;
        const lose = () => { leaseLost = true; record.controller.abort(); };
        const check = async () => {
          const valid = await checkOwnership(record.lease, record.controller.signal);
          if (ended || record.controller.signal.aborted) return;
          if (!valid) lose(); else timer = setTimeout(check, pollMs);
        };
        try {
          const valid = await checkOwnership(record.lease, record.controller.signal);
          if (record.controller.signal.aborted) return { ok: false, code: 'CANCELLED' };
          if (!valid) return { ok: false, code: 'LEASE_LOST', leaseLost: true };
          timer = setTimeout(check, pollMs);
          const result = await runProcess({ executable: bins[spec.engine],
            args: spec.invocation.args, stdin: spec.invocation.stdin,
            cwd: spec.workspace, env, timeoutMs, signal: record.controller.signal });
          ended = true; clearTimeout(timer);
          if (leaseLost) return { ok: false, code: 'LEASE_LOST', leaseLost: true };
          if (record.controller.signal.aborted) return { ok: false, code: 'CANCELLED' };
          // Never accept a late success after ownership has changed.
          if (!(await checkOwnership(record.lease, record.controller.signal)))
            return { ok: false, code: 'LEASE_LOST', leaseLost: true };
          return parseResult(spec.engine, result);
        } finally { ended = true; clearTimeout(timer); }
      });
      return record.done;
    },
    async stop(lease) {
      if (!current) return;
      if (lease !== current.lease) throw new Error('LEASE_MISMATCH');
      const record = current;
      record.controller.abort();
      // Failed process termination must not release this execution slot.
      await record.done;
      if (current === record) current = null;
    },
  };
}
