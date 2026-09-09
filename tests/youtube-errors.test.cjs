const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const chat=fs.readFileSync(path.join(root,'pilot/chat.js'),'utf8');
const features=fs.readFileSync(path.join(root,'pilot/features.js'),'utf8');

test('panel request preserves a safe backend error code, status and payload',async()=>{
 const src=chat.slice(chat.indexOf('async function panelPost('),chat.indexOf('async function ask(',chat.indexOf('async function panelPost(')));
 const ctx=vm.createContext({
  isDemo:false,AbortController,setTimeout,clearTimeout,CHAT_URL:'chat',BRANCH_URL:'branch',emit(){},
  KEY:'key',sessionPw:'test',rtSession:null,lsDel(){},openGate(){},
  fetch:async()=>({status:502,ok:false,text:async()=>JSON.stringify({ok:false,status:'FAILED',message:'Bezpieczny opis',error:'media_failed'})})
 });
 vm.runInContext(src,ctx);
 await assert.rejects(ctx.panelPost('tools',{}),error=>{
  assert.equal(error.code,'media_failed');
  assert.equal(error.status,502);
  assert.equal(error.payload.status,'FAILED');
  return true;
 });
});

test('YouTube errors are specific and never recommend a blind automatic retry',()=>{
 const src=features.slice(features.indexOf('function youtubeFailureMessage('),features.indexOf('async function analyzeYouTube('));
 const ctx=vm.createContext({TypeError});
 vm.runInContext(src,ctx);
 assert.match(ctx.youtubeFailureMessage({code:'invalid_youtube_url',status:400}),/pełny link/);
 assert.match(ctx.youtubeFailureMessage({name:'AbortError'}),/nadal pracować/);
 assert.match(ctx.youtubeFailureMessage({status:502,payload:{status:'FAILED',message:'Brak transkrypcji'}}),/Brak transkrypcji/);
 assert.match(ctx.youtubeFailureMessage(new TypeError('Failed to fetch')),/nie połączyła/);
 for(const value of [
  ctx.youtubeFailureMessage({code:'invalid_youtube_url',status:400}),
  ctx.youtubeFailureMessage({name:'AbortError'}),
  ctx.youtubeFailureMessage({status:502,payload:{status:'FAILED'}})
 ])assert.doesNotMatch(value,/spróbuj ponownie|uruchamiam ponownie/i);
});
