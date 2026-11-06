import test from 'node:test';
import assert from 'node:assert/strict';
import { createExecutor } from '../tools/claude-runner/pilot-executor.mjs';
const success = JSON.stringify({type:'result',subtype:'success',is_error:false,result:'Sprawdź zmianę.'});
const spec = (code = `process.stdout.write(${JSON.stringify(success)})`) => ({ engine:'claude',lease:'lease-one',workspace:'/tmp',invocation:{args:['-e',code],stdin:''} });
const executor = (owns,extra={}) => createExecutor({executables:{claude:process.execPath}, environment:{home:'/tmp',path:'/usr/bin:/bin'},owns,pollMs:30,ownershipTimeoutMs:100,timeoutMs:3000,...extra});
test('real local subprocess passes through ownership and protocol parser',async()=>{
  const e=executor(async()=>true); assert.deepEqual(await e.execute(spec()),{ok:true,answer:'Sprawdź zmianę.'}); await e.stop('lease-one');
});
test('no ownership means no process starts',async()=>{
  const e=executor(async()=>false); const r=await e.execute(spec('throw Error("must not run")'));
  assert.equal(r.code,'LEASE_LOST'); await e.stop('lease-one');
});
test('lost ownership kills a running subprocess',async()=>{
  let calls=0;const e=executor(async()=>++calls===1);
  const r=await e.execute(spec('setInterval(()=>{},1000)'));assert.equal(r.code,'LEASE_LOST');await e.stop('lease-one');
});
test('unresponsive queue ownership check terminates the subprocess',async()=>{
  let calls=0;const e=executor(()=>++calls===1?true:new Promise(()=>{}));
  const r=await e.execute(spec('setInterval(()=>{},1000)'));assert.equal(r.code,'LEASE_LOST');await e.stop('lease-one');
});
test('concurrent attempt is rejected and only matching lease can cancel',async()=>{
  const e=executor(async()=>true);const pending=e.execute(spec('setInterval(()=>{},1000)'));
  await assert.rejects(e.execute(spec()),/EXECUTOR_BUSY/);
  await assert.rejects(e.stop('another-lease'),/LEASE_MISMATCH/);
  await e.stop('lease-one');assert.equal((await pending).code,'CANCELLED');
});
test('plain text success cannot escape the parser',async()=>{
  const e=executor(async()=>true);const r=await e.execute(spec('process.stdout.write("Gotowe")'));
  assert.equal(r.ok,false);await e.stop('lease-one');
});
