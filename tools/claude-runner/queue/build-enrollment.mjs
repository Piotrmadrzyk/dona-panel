import { writeFile } from 'node:fs/promises';
import { bootstrapSql, queueQuery } from './queries.mjs';
import { keySchemaSql } from './gateway.mjs';
import { contextHash } from '../model-router.mjs';

const task = {id:'pilot_mac_connection_20260915',project:'dona-panel',kind:'code_change',
  goal:'Techniczne zadanie kontroli połączenia Mac–n8n. Nie uruchamiaj agentów ani edycji plików.',
  acceptance:'Status autoryzacji i odczyt dokładnie tego zadania potwierdzone. Żadnych modeli ani publikacji.',
  baseCommit:'038779e66b4a21515f16ec04b13090dddfc6791a',contextVersion:1,files:['pilot/chat.js']};
const binding={runnerId:'mac-dona-pilot',taskId:task.id,contextHash:contextHash(task)};
const digest='a70d530e0b27d10bb197d4e362a7b53c5993fa50318b1ce97d8020ce9b06e8f6';
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
const enqueue=queueQuery({operation:'enqueue',task});
const sql=`BEGIN;
${bootstrapSql}
${keySchemaSql}
DO $enroll$
DECLARE result record;
BEGIN
EXECUTE ${quote(enqueue.query)} INTO result USING ${enqueue.params.map(quote).join(',')};
IF result.ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'TASK_CONFLICT'; END IF;
INSERT INTO pm_os.dona_router_pilot_keys_v1(token_hash,runner_id,task_id,context_hash,expires_at)
VALUES(${quote(digest)},${quote(binding.runnerId)},${quote(task.id)},${quote(binding.contextHash)},now()+interval '24 hours')
ON CONFLICT(token_hash) DO NOTHING;
IF NOT EXISTS(SELECT 1 FROM pm_os.dona_router_pilot_keys_v1 WHERE token_hash=${quote(digest)}
  AND runner_id=${quote(binding.runnerId)} AND task_id=${quote(task.id)} AND context_hash=${quote(binding.contextHash)}
  AND NOT revoked AND expires_at>now()) THEN RAISE EXCEPTION 'KEY_SCOPE_CONFLICT_OR_EXPIRED'; END IF;
END $enroll$;
COMMIT;
SELECT true AS ok, runner_id,task_id,expires_at FROM pm_os.dona_router_pilot_keys_v1 WHERE token_hash=${quote(digest)};`;
const code=`import {workflow,node,trigger} from '@n8n/workflow-sdk';
const start=trigger({type:'n8n-nodes-base.manualTrigger',version:1,config:{name:'Enroll approved Mac key hash'}});
const database=node({type:'n8n-nodes-base.postgres',version:2.7,config:{name:'Create pilot scope only',credentials:{postgres:{id:'ULc4tEMGTKt9kicK',name:'PM OS — Postgres/Supabase'}},parameters:{operation:'executeQuery',query:${JSON.stringify(sql)},options:{queryBatching:'single'}}}});
export default workflow('dona-pilot-enroll-mac','DONA — Router pilot: enroll Mac key hash').add(start).to(database);`;
await writeFile(new URL('./enrollment.workflow.ts',import.meta.url),code);
await writeFile(new URL('./connection-binding.json',import.meta.url),JSON.stringify(binding,null,2)+'\n');
