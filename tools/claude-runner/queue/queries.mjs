// Internal-only database contract. Authentication belongs to a separate gateway.
// Never expose bootstrap/enqueue as worker operations.
import { validateTask, contextHash } from '../model-router.mjs';

export const bootstrapSql = `
CREATE TABLE IF NOT EXISTS pm_os.dona_router_pilot_jobs_v1 (
 task_id text PRIMARY KEY,
 context_hash text NOT NULL CHECK (context_hash ~ '^[a-f0-9]{64}$'),
 task jsonb NOT NULL CHECK (task->>'project' = 'dona-panel'),
 status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN
 ('QUEUED','PROCESSING','RUNNING','ATTEMPT_FAILED','VERIFYING','READY_FOR_REVIEW','FAILED_QA','BLOCKED')),
 runner_id text, lease_id uuid, lease_expires_at timestamptz,
 revision bigint NOT NULL DEFAULT 0, result jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pm_os.dona_router_pilot_events_v1 (
 event_id text PRIMARY KEY, task_id text NOT NULL REFERENCES pm_os.dona_router_pilot_jobs_v1(task_id),
 lease_id uuid NOT NULL, revision bigint NOT NULL, record jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(task_id, revision)
);
ALTER TABLE pm_os.dona_router_pilot_jobs_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_os.dona_router_pilot_events_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pm_os.dona_router_pilot_jobs_v1, pm_os.dona_router_pilot_events_v1 FROM PUBLIC, anon, authenticated;
SELECT true AS ok, 'pilot_schema_ready' AS status;`;

const jobTable = 'pm_os.dona_router_pilot_jobs_v1';
const eventTable = 'pm_os.dona_router_pilot_events_v1';
const live = "status IN ('PROCESSING','RUNNING','ATTEMPT_FAILED','VERIFYING')";
const terminal = ['READY_FOR_REVIEW','FAILED_QA','BLOCKED'];
const requireMatch = (value, pattern) => {
  if (typeof value !== 'string' || !pattern.test(value)) throw new Error('INVALID_QUEUE_INPUT');
  return value;
};
export function queueQuery(input) {
  if (!input || typeof input !== 'object') throw new Error('INVALID_QUEUE_INPUT');
  if (input.operation === 'enqueue') {
    const task = validateTask(input.task), hash = contextHash(task);
    // Persist only the canonical task fields; discard unrelated caller properties.
    const canonical = Object.fromEntries(['id','project','kind','goal','baseCommit','contextVersion','files','acceptance']
      .map(key => [key, task[key]]));
    canonical.executorPreference = task.executorPreference ?? 'auto';
    return { query: `WITH inserted AS (
      INSERT INTO ${jobTable}(task_id,context_hash,task) VALUES($1,$2,$3::jsonb)
      ON CONFLICT(task_id) DO NOTHING RETURNING task_id
    ) SELECT EXISTS(SELECT 1 FROM inserted) AS inserted,
      (EXISTS(SELECT 1 FROM inserted) OR EXISTS(SELECT 1 FROM ${jobTable} WHERE task_id=$1 AND context_hash=$2)) AS ok;`,
      params: [task.id, hash, JSON.stringify(canonical)] };
  }
  const id = requireMatch(input.taskId, /^[a-zA-Z0-9_-]{8,100}$/);
  const hash = requireMatch(input.contextHash, /^[a-f0-9]{64}$/);
  if (input.operation === 'read') return {
    query: `SELECT EXISTS(SELECT 1 FROM ${jobTable} WHERE task_id=$1 AND context_hash=$2) AS ok,
      (SELECT row_to_json(j) FROM (SELECT task_id,context_hash,task,status,revision,result FROM ${jobTable}
        WHERE task_id=$1 AND context_hash=$2) j) AS job;`, params: [id,hash] };
  const runner = requireMatch(input.runnerId, /^[a-zA-Z0-9._-]{2,80}$/);
  if (input.operation === 'acquire') return {
    query: `WITH claimed AS (UPDATE ${jobTable} SET status='PROCESSING',runner_id=$3,
      lease_id=gen_random_uuid(),lease_expires_at=now()+interval '120 seconds',updated_at=now()
      WHERE task_id=$1 AND context_hash=$2 AND status='QUEUED'
      RETURNING lease_id::text,lease_expires_at,revision)
      SELECT EXISTS(SELECT 1 FROM claimed) AS ok, (SELECT row_to_json(claimed) FROM claimed) AS lease;`,
    params: [id,hash,runner] };
  const lease = requireMatch(input.leaseId, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
  const owned = `task_id=$1 AND context_hash=$2 AND runner_id=$3 AND lease_id=$4::uuid`;
  const params = [id,hash,runner,lease];
  if (input.operation === 'owns') return { query: `SELECT EXISTS(SELECT 1 FROM ${jobTable}
    WHERE ${owned} AND ${live} AND lease_expires_at>now()) AS ok;`, params };
  if (input.operation === 'renew') return { query: `WITH touched AS (UPDATE ${jobTable}
    SET lease_expires_at=now()+interval '120 seconds',updated_at=now()
    WHERE ${owned} AND ${live} AND lease_expires_at>now() RETURNING task_id)
    SELECT EXISTS(SELECT 1 FROM touched) AS ok;`, params };
  if (input.operation === 'release') return { query: `WITH touched AS (UPDATE ${jobTable}
    SET runner_id=NULL,lease_id=NULL,lease_expires_at=NULL,updated_at=now()
    WHERE ${owned} AND status IN ('READY_FOR_REVIEW','FAILED_QA','BLOCKED') RETURNING task_id)
    SELECT EXISTS(SELECT 1 FROM touched) AS ok;`, params };
  if (input.operation !== 'save') throw new Error('OPERATION_NOT_ALLOWED');
  const record = input.record;
  if (!record || !['RUNNING','ATTEMPT_FAILED','VERIFYING',...terminal].includes(record.status))
    throw new Error('INVALID_QUEUE_RECORD');
  if (record.status === 'READY_FOR_REVIEW' && (record.evidence?.passed !== true
    || typeof record.evidence.artifactRef !== 'string' || !record.evidence.artifactRef
    || typeof record.evidence.testsRef !== 'string' || !record.evidence.testsRef))
    throw new Error('EVIDENCE_REQUIRED');
  const encoded = JSON.stringify(record);
  if (Buffer.byteLength(encoded) > 64000) throw new Error('RECORD_TOO_LARGE');
  const eventId = requireMatch(input.eventId, /^[a-zA-Z0-9_-]{8,100}$/);
  if (!Number.isSafeInteger(input.revision) || input.revision < 0) throw new Error('INVALID_REVISION');
  // A single SQL statement makes status change and audit insertion atomic.
  // Expected revision also fences concurrent writes by the same lease owner.
  return { query: `WITH changed AS (UPDATE ${jobTable}
    SET status=$5,result=$6::jsonb,revision=revision+1,updated_at=now()
    WHERE ${owned} AND ${live} AND lease_expires_at>now() AND revision=$8::bigint
      AND (($5='RUNNING' AND status IN ('PROCESSING','ATTEMPT_FAILED'))
        OR ($5 IN ('ATTEMPT_FAILED','VERIFYING') AND status='RUNNING')
        OR ($5 IN ('READY_FOR_REVIEW','FAILED_QA') AND status='VERIFYING')
        OR ($5='BLOCKED'))
    RETURNING task_id,lease_id,revision), logged AS (
    INSERT INTO ${eventTable}(event_id,task_id,lease_id,revision,record)
    SELECT $7,task_id,lease_id,revision,$6::jsonb FROM changed RETURNING revision)
    SELECT EXISTS(SELECT 1 FROM logged) AS ok,(SELECT revision FROM logged) AS revision;`,
    params: [...params,record.status,encoded,eventId,input.revision] };
}
