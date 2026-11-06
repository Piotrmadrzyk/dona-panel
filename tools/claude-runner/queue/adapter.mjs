// Trusted transport is supplied by the authenticated gateway, never by task data.
import { randomUUID } from 'node:crypto';
import { contextHash } from '../model-router.mjs';

export function createQueueAdapter({ task, runnerId, request }) {
  const hash = contextHash(task);
  if (typeof request !== 'function' || !/^[a-zA-Z0-9._-]{2,80}$/.test(runnerId || ''))
    throw new Error('INVALID_QUEUE_ADAPTER');
  const binding = Object.freeze({ taskId: task.id, contextHash: hash, runnerId });
  let current = null, revision = null, saving = false, acquiring = false;
  const terminal = new Set(['READY_FOR_REVIEW','FAILED_QA','BLOCKED']);
  let final = false;
  const ownsBinding = lease => typeof lease === 'string' && current !== null && lease === current;
  return {
    async acquire(taskId, expectedHash) {
      if (acquiring || current !== null || taskId !== binding.taskId || expectedHash !== hash)
        throw new Error('ACQUIRE_SCOPE_MISMATCH');
      acquiring = true;
      try {
        const response = await request({ operation: 'acquire', ...binding });
        if (response?.ok === false) return null;
        const value = response?.lease;
        if (response?.ok !== true || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value?.lease_id || '')
          || !Number.isSafeInteger(value?.revision) || value.revision < 0)
          throw new Error('INVALID_ACQUIRE_RESPONSE');
        current = value.lease_id; revision = value.revision; final = false;
        return current;
      } finally { acquiring = false; }
    },
    async owns(lease, { signal } = {}) {
      if (!ownsBinding(lease) || final || signal?.aborted) return false;
      // Renew performs the same DB ownership/expiry check and only then extends TTL.
      const result = await request({ operation: 'renew', ...binding, leaseId: lease }, { signal });
      return !signal?.aborted && result?.ok === true;
    },
    async save(record) {
      if (!ownsBinding(record?.lease) || final || saving || record.taskId !== binding.taskId || record.contextHash !== hash)
        throw new Error('SAVE_SCOPE_MISMATCH');
      saving = true;
      try {
        const clean = Object.fromEntries(['status','engine','attempt','reason','evidence']
          .filter(key => record[key] !== undefined).map(key => [key, record[key]]));
        const response = await request({ operation: 'save', ...binding, leaseId: current,
          revision, eventId: randomUUID(), record: clean });
        if (response?.ok !== true || response.revision !== revision + 1)
          throw new Error('SAVE_NOT_CONFIRMED');
        revision = response.revision;
        final = terminal.has(record.status);
      } finally { saving = false; }
    },
    async release(lease) {
      if (!ownsBinding(lease) || !final || saving) throw new Error('RELEASE_NOT_SAFE');
      const result = await request({ operation: 'release', ...binding, leaseId: lease });
      if (result?.ok !== true) throw new Error('RELEASE_NOT_CONFIRMED');
      current = null; revision = null; final = false;
    },
  };
}
