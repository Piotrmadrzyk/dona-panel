import test from 'node:test';
import assert from 'node:assert/strict';
import {recordTaskResult, verifyTaskResult, currentStep} from '../tools/business-ops/process-state.mjs';

const initial=()=>({businessPlan:{schemaVersion:1,projectId:'p1',version:1,tasks:[
  {id:'offer',branch:'sprzedaz',title:'Oferta',status:'READY',dependencies:[],requirements:[]},
  {id:'materials',branch:'marketing',title:'Materiały',status:'WAITING',dependencies:['offer'],requirements:[]},
  {id:'launch',branch:'marketing',title:'Publikacja',status:'WAITING',dependencies:['materials'],requirements:['channel_ready']}
]}});
const input={processId:'p1',taskId:'offer',branch:'sprzedaz',planVersion:1,attemptId:'a1',resultReference:'conversation:t#m',resultSummary:'Sprawdzono katalog.',ok:true,at:'2026-09-16T08:00:00Z'};

test('successful result becomes reviewable but does not unlock dependent work',()=>{const r=recordTaskResult(initial(),input);assert.equal(r.task.status,'RESULT_READY');assert.equal(r.state.businessPlan.tasks[1].status,'WAITING');assert.deepEqual(r.state.businessPlan.next,[]);});
test('explicit owner verification unlocks the next dependency only',()=>{const recorded=recordTaskResult(initial(),input).state;const r=verifyTaskResult(recorded,{...input,at:'2026-09-16T08:01:00Z'});assert.equal(r.task.status,'VERIFIED');assert.equal(r.state.businessPlan.tasks[1].status,'READY');assert.equal(r.state.businessPlan.tasks[2].status,'WAITING');assert.equal(currentStep(r.state),'Materiały');});
test('failed and duplicate attempts never claim completion',()=>{let r=recordTaskResult(initial(),{...input,ok:false});assert.equal(r.task.status,'READY');r=recordTaskResult(r.state,{...input,ok:false});assert.equal(r.changed,false);});
test('foreign process, stale version, wrong branch and unfinished results fail closed',()=>{for(const patch of [{processId:'other'},{planVersion:2},{branch:'www'}])assert.throws(()=>recordTaskResult(initial(),{...input,...patch}));assert.throws(()=>verifyTaskResult(initial(),input));});
test('verification is idempotent and requirements remain closed without evidence',()=>{let s=recordTaskResult(initial(),input).state;s=verifyTaskResult(s,{...input,at:'2026-09-16T08:01:00Z'}).state;s=recordTaskResult(s,{...input,taskId:'materials',branch:'marketing',attemptId:'a2',resultReference:'conversation:t#m2',resultSummary:'Gotowe materiały.',at:'2026-09-16T08:02:00Z'}).state;s=verifyTaskResult(s,{...input,taskId:'materials',branch:'marketing',at:'2026-09-16T08:03:00Z'}).state;assert.equal(s.businessPlan.tasks[2].status,'WAITING');const again=verifyTaskResult(s,{...input,taskId:'materials',branch:'marketing',at:'2026-09-16T08:04:00Z'});assert.equal(again.changed,false);});
