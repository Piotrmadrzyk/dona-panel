// Read-only pilot check: no acquire/save/renew, CLI models or background runner.
import { constants } from 'node:fs';
import { readFile, realpath, lstat, open } from 'node:fs/promises';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';
import { createQueueTransport } from './queue/transport.mjs';

const report={agentStarted:false,jobClaimed:false,checks:[]};
try {
  const home=await realpath(homedir()), directory=join(home,'.dona-router-pilot');
  const dir=await lstat(directory);
  if(!dir.isDirectory() || dir.isSymbolicLink() || dir.uid!==userInfo().uid || (dir.mode & 0o077)!==0
    || await realpath(directory)!==directory) throw new Error('UNSAFE_DIRECTORY');
  const file=await open(join(directory,'worker.key'),constants.O_RDONLY|constants.O_NOFOLLOW);
  let token;
  try {
    const stat=await file.stat();
    if(!stat.isFile() || stat.uid!==userInfo().uid || stat.nlink!==1 || stat.size!==64 || (stat.mode & 0o077)!==0)
      throw new Error('UNSAFE_KEY_FILE');
    token=await file.readFile('utf8');
  } finally {await file.close();}
  const binding=JSON.parse(await readFile(new URL('./queue/connection-binding.json',import.meta.url),'utf8'));
  const request=createQueueTransport({endpoint:'https://pmresearch.app.n8n.cloud/webhook/dona-router-pilot',token,timeoutMs:30000});
  console.error('Sprawdzam autoryzację w n8n (maksymalnie 30 sekund)…');
  const start=Date.now();
  const status=await request({...binding,operation:'status'});
  report.checks.push({name:'authentication',passed:status.ok===true,durationMs:Date.now()-start});
  if(status.ok!==true) throw new Error('QUEUE_AUTH_FAILED');
  console.error('Autoryzacja potwierdzona. Odczytuję zadanie (maksymalnie 30 sekund)…');
  const readStart=Date.now();
  const response=await request({...binding,operation:'read'});
  const matched=response.ok===true && response.job?.task_id===binding.taskId
    && response.job?.context_hash===binding.contextHash && response.job?.task?.project==='dona-panel';
  report.checks.push({name:'scoped_task_read',passed:matched,durationMs:Date.now()-readStart});
  report.passed=matched;
} catch(error) {
  report.passed=false;
  const allowed=['QUEUE_AUTH_FAILED','QUEUE_TIMEOUT','QUEUE_NETWORK_FAILED','QUEUE_HTTP_FAILED',
    'QUEUE_INVALID_RESPONSE','QUEUE_RESPONSE_TOO_LARGE','UNSAFE_DIRECTORY','UNSAFE_KEY_FILE'];
  report.error=allowed.includes(error.message)?error.message:'LOCAL_SETUP_FAILED';
  if (error.phase) report.connectionPhase=error.phase;
  if (error.timings) report.connectionTimingsMs=error.timings;
}
console.log(JSON.stringify(report,null,2));
if(!report.passed) process.exitCode=1;
