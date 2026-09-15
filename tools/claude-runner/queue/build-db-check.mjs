import { writeFile } from 'node:fs/promises';
import { bootstrapSql, queueQuery } from './queries.mjs';
import { contextHash } from '../model-router.mjs';
import { keySchemaSql, authenticateQuery, authorizedQuery } from './gateway.mjs';

const task = { id: 'pilot_database_check_20260915', project: 'dona-panel', kind: 'code_change',
  goal: 'Test kolejki bez uruchamiania agenta', acceptance: 'Kontrola blokad i zapisu',
  baseCommit: 'a'.repeat(40), contextVersion: 1, files: ['pilot/chat.js'] };
const binding = { taskId: task.id, contextHash: contextHash(task), runnerId: 'pilot-database-check' };
const quote = value => value === null ? 'NULL' : typeof value === 'number' ? String(value)
  : "'" + String(value).replaceAll("'", "''") + "'";
let statements = [];
function check(input, expected, label, capture = false) {
  const spec = queueQuery(input);
  const args = spec.params.map((v, i) => i === 3 && input.operation !== 'acquire' && input.operation !== 'enqueue'
    ? 'owned_lease' : quote(v)).join(', ');
  statements.push(`EXECUTE ${quote(spec.query)} INTO result USING ${args};
    IF result.ok IS DISTINCT FROM ${expected ? 'true' : 'false'} THEN RAISE EXCEPTION '${label}'; END IF;`);
  if (capture) statements.push("owned_lease := result.lease->>'lease_id';");
}
check({ operation: 'enqueue', task }, true, 'ENQUEUE_FAILED');
check({ operation: 'enqueue', task: { ...task, goal: 'Conflicting payload' } }, false, 'HASH_CONFLICT_ACCEPTED');
check({ operation: 'acquire', ...binding }, true, 'ACQUIRE_FAILED', true);
check({ operation: 'acquire', ...binding, runnerId: 'other-runner' }, false, 'DOUBLE_CLAIM');
const leaseBinding = { ...binding, leaseId: '00000000-0000-0000-0000-000000000001' };
check({ operation: 'owns', ...leaseBinding }, true, 'OWNERSHIP_FAILED');
check({ operation: 'renew', ...leaseBinding, runnerId: 'other-runner' }, false, 'FOREIGN_RENEW');
check({ operation: 'save', ...leaseBinding, revision: 0, eventId: 'test_event_start', record: { status: 'RUNNING' } }, true, 'START_FAILED');
check({ operation: 'save', ...leaseBinding, revision: 0, eventId: 'test_event_stale', record: { status: 'VERIFYING' } }, false, 'STALE_REVISION_ACCEPTED');
check({ operation: 'save', ...leaseBinding, revision: 1, eventId: 'test_event_verify', record: { status: 'VERIFYING' } }, true, 'VERIFY_FAILED');
check({ operation: 'save', ...leaseBinding, revision: 2, eventId: 'test_event_done', record: {
  status: 'READY_FOR_REVIEW', evidence: { passed: true, artifactRef: 'qa-only', testsRef: 'qa-only' } } }, true, 'FINISH_FAILED');
check({ operation: 'renew', ...leaseBinding }, false, 'TERMINAL_RENEW_ACCEPTED');
check({ operation: 'release', ...leaseBinding }, true, 'RELEASE_FAILED');
statements.push(`SELECT count(*) INTO event_count FROM pm_os.dona_router_pilot_events_v1 WHERE task_id=${quote(task.id)};
IF event_count <> 3 THEN RAISE EXCEPTION 'AUDIT_COUNT_MISMATCH'; END IF;`);
const authSpec = authenticateQuery({authorization:'Bearer '+ 'c'.repeat(64)});
const digest = authSpec.params[0];
const auth = {authorized:true,scope:{project:'dona-panel',runner_id:binding.runnerId,task_id:task.id,context_hash:binding.contextHash}};
const readSpec = authorizedQuery({operation:'read',...binding},auth,digest);
statements.push(`INSERT INTO pm_os.dona_router_pilot_keys_v1(token_hash,runner_id,task_id,context_hash,expires_at)
VALUES(${quote(digest)},${quote(binding.runnerId)},${quote(task.id)},${quote(binding.contextHash)},now()+interval '5 minutes');`);
function authCheck(spec,field,expected,label) {
  statements.push(`EXECUTE ${quote(spec.query)} INTO result USING ${spec.params.map(quote).join(',')};
IF result.${field} IS DISTINCT FROM ${expected?'true':'false'} THEN RAISE EXCEPTION '${label}'; END IF;`);
}
authCheck(authSpec,'authorized',true,'AUTH_LOOKUP_FAILED');
authCheck(readSpec,'ok',true,'SCOPED_READ_FAILED');
statements.push(`UPDATE pm_os.dona_router_pilot_keys_v1 SET revoked=true WHERE token_hash=${quote(digest)};`);
authCheck(readSpec,'ok',false,'REVOKED_KEY_USED_AFTER_AUTH');
authCheck(authSpec,'authorized',false,'REVOKED_KEY_AUTHENTICATED');
statements.push(`UPDATE pm_os.dona_router_pilot_keys_v1 SET revoked=false,expires_at=now()-interval '1 second' WHERE token_hash=${quote(digest)};`);
authCheck(authSpec,'authorized',false,'EXPIRED_KEY_AUTHENTICATED');
const sql = `BEGIN;\n${bootstrapSql}\n${keySchemaSql}\nDO $pilotcheck$
DECLARE result record; owned_lease text; event_count integer;
BEGIN
${statements.join('\n')}
END $pilotcheck$;
ROLLBACK;
SELECT true AS ok, 18 AS assertions_passed, false AS production_jobs_changed, true AS rolled_back;`;
const code = `import { workflow, node, trigger } from '@n8n/workflow-sdk';
const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Manual QA only' } });
const database = node({ type: 'n8n-nodes-base.postgres', version: 2.7, config: {
  name: 'Verify pilot queue and rollback',
  credentials: { postgres: { id: 'ULc4tEMGTKt9kicK', name: 'PM OS — Postgres/Supabase' } },
  parameters: { operation: 'executeQuery', query: ${JSON.stringify(sql)}, options: { queryBatching: 'single' } }
}, output: [{ json: { ok: true, assertions_passed: 18, production_jobs_changed: false, rolled_back: true } }] });
export default workflow('dona-router-pilot-db-check', 'DONA — Router pilot: database QA (rollback)').add(start).to(database);
`;
await writeFile(new URL('./database-check.workflow.ts', import.meta.url), code);
