const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const chat=fs.readFileSync(path.join(root,'pilot/chat.js'),'utf8');
const features=fs.readFileSync(path.join(root,'pilot/features.js'),'utf8');
const toolsResult=fs.readFileSync(path.join(root,'backend/tools-result.js'),'utf8');

function normalizeToolResult(auth,first){
 const ctx=vm.createContext({
  $input:{all:()=>[{json:first}]},
  $(name){assert.equal(name,'Validate Panel Tools Access');return{first:()=>({json:auth})};}
 });
 const output=vm.runInContext('(function(){'+toolsResult+'\n})()',ctx);
 return JSON.parse(JSON.stringify(output[0].json));
}

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
 assert.doesNotMatch(ctx.youtubeFailureMessage({code:'operation_not_allowed',status:400,payload:{error:'operation_not_allowed'}}),/pełny link/);
 assert.match(ctx.youtubeFailureMessage({code:'operation_not_allowed',status:400,payload:{error:'operation_not_allowed'}}),/odrzucił zlecenie/);
 assert.match(ctx.youtubeFailureMessage({name:'AbortError'}),/nadal pracować/);
 assert.match(ctx.youtubeFailureMessage({status:502,payload:{status:'FAILED',message:'Brak transkrypcji'}}),/Brak transkrypcji/);
 assert.match(ctx.youtubeFailureMessage(new TypeError('Failed to fetch')),/nie połączyła/);
 for(const value of [
  ctx.youtubeFailureMessage({code:'invalid_youtube_url',status:400}),
  ctx.youtubeFailureMessage({name:'AbortError'}),
  ctx.youtubeFailureMessage({status:502,payload:{status:'FAILED'}})
 ])assert.doesNotMatch(value,/spróbuj ponownie|uruchamiam ponownie/i);
});

test('YouTube validator accepts supported links without relying on the URL global',()=>{
 const auth=fs.readFileSync(path.join(root,'backend/tools-auth.js'),'utf8');
 const stored='test-secret';
 const webhook={json:{body:{haslo:stored,operation:'youtube_analyze',url:'https://www.youtube.com/watch?v=Dr3Q-Ju_c3U'},headers:{origin:'https://dona.probatum.pl'}}};
 const credential={json:{nazwa:'panel_haslo',wartosc:stored}};
 const ctx=vm.createContext({
  require(name){if(name==='crypto')return require('node:crypto');throw Error('blocked');},
  $input:{all:()=>[credential]},
  $(name){assert.equal(name,'Panel Tools Request');return{first:()=>webhook};}
 });
 const output=vm.runInContext('(function(){'+auth+'})()',ctx);
 assert.equal(output[0].json.authorized,true);
 assert.equal(output[0].json.error,'');
 assert.equal(output[0].json.url,'https://www.youtube.com/watch?v=Dr3Q-Ju_c3U');
});

test('media adapter classifies failures without exposing raw errors or credentials',()=>{
 const secret='sk-this-is-a-private-secret-value-123456789';
 const result=normalizeToolResult(
  {operation:'youtube_analyze',url:'https://www.youtube.com/watch?v=Dr3Q-Ju_c3U'},
  {error:{message:'Payment required; Bearer '+secret},blad:'token='+secret,statusCode:402}
 );
 assert.deepEqual(result,{
  ok:false,
  statusCode:402,
  error:'ai_payment_required',
  message:'Brakuje środków na usługę AI. Uzupełnij saldo, a potem uruchom analizę ręcznie.',
  status:'FAILED',
  mayHavePartialResult:true,
  doNotRetryAutomatically:true
 });
 assert.doesNotMatch(JSON.stringify(result),new RegExp(secret));
 assert.equal(Object.hasOwn(result,'blad'),false);
});

test('media adapter maps rate limits and timeouts to stable safe codes',()=>{
 const rate=normalizeToolResult(
  {operation:'youtube_analyze',url:'https://youtu.be/Dr3Q-Ju_c3U'},
  {error:{cause:{message:'429 RATE_LIMIT_EXCEEDED'}}}
 );
 assert.equal(rate.statusCode,503);
 assert.equal(rate.error,'service_rate_limited');
 assert.equal(rate.doNotRetryAutomatically,true);
 const timeout=normalizeToolResult(
  {operation:'youtube_analyze',url:'https://youtu.be/Dr3Q-Ju_c3U'},
  {status:'FAILED',powod:'Execution timed out after 900 seconds'}
 );
 assert.equal(timeout.statusCode,504);
 assert.equal(timeout.error,'service_timeout');
 assert.doesNotMatch(JSON.stringify(timeout),/900 seconds/);
});

test('successful media output keeps only bounded safe fields and trusted links',()=>{
 const files=[
  {nazwa:'Transcript',link:'https://drive.google.com/file/d/valid000001/view'},
  {nazwa:'Duplicate',link:'https://drive.google.com/file/d/valid000001/view'},
  {nazwa:'Phishing',link:'https://drive.google.com.evil.test/file/d/secret/view'},
  ...Array.from({length:25},(_,index)=>({
   nazwa:'x'.repeat(300),
   typ:'application/pdf'.repeat(20),
   link:'https://docs.google.com/document/d/safe-'+String(index).padStart(3,'0')+'/edit'
  }))
 ];
 const result=normalizeToolResult(
  {operation:'youtube_analyze',url:'https://www.youtube.com/watch?v=Dr3Q-Ju_c3U'},
  {
   status:'SUCCESS',tytul:'T'.repeat(300),zrodlo:'https://youtube.com.evil.test/watch?v=Dr3Q-Ju_c3U',
   folder_url:'https://drive.google.com.evil.test/drive/folders/private',pliki:files,
   etapy:{transkrypcja:'OK',analiza:'ERROR',podsumowanie:'???',mapa_mysli:true,metadane:false,zapis_drive:'DONE',evil:'SECRET'},
   znakow_transkrypcji:-25,pokrycie_procent:150,
   komunikat:'Gotowe. API key=sk-this-is-a-private-secret-value-123456789'
  }
 );
 assert.equal(result.ok,true);
 assert.equal(result.statusCode,200);
 assert.equal(result.status,'SUCCESS');
 assert.equal(result.title.length,240);
 assert.equal(result.source,'https://www.youtube.com/watch?v=Dr3Q-Ju_c3U');
 assert.equal(result.folderUrl,'');
 assert.equal(result.files.length,20);
 assert.equal(new Set(result.files.map(file=>file.url)).size,20);
 assert.ok(result.files.every(file=>/^https:\/\/(?:drive|docs)\.google\.com\//.test(file.url)));
 assert.ok(result.files.every(file=>file.name.length<=240&&file.type.length<=120));
 assert.deepEqual(result.stages,{transcript:true,analysis:false,summary:'PENDING',mindMap:true,metadata:false,drive:true});
 assert.equal(result.transcriptCharacters,0);
 assert.equal(result.coverage,100);
 assert.match(result.message,/\[ukryto\]/);
 assert.doesNotMatch(JSON.stringify(result),/private-secret/);
 assert.equal(result.doNotRetryAutomatically,true);
});

test('Drive search output is deduplicated, bounded and restricted to Google links',()=>{
 const wyniki=[
  {id:'valid_file_000001',nazwa:'A'.repeat(300),typ:'pdf',link:'https://drive.google.com/file/d/valid_file_000001/view'},
  {id:'valid_file_000001',nazwa:'duplicate',link:'https://drive.google.com/file/d/valid_file_000001/view'},
  {id:'short',nazwa:'invalid id',link:'https://drive.google.com/file/d/short/view'},
  {id:'valid_file_000002',nazwa:'unsafe link',link:'https://drive.google.com.evil.test/file/d/valid_file_000002/view'},
  ...Array.from({length:30},(_,index)=>({id:'valid_file_'+String(index+10).padStart(6,'0'),nazwa:'safe',link:'https://docs.google.com/document/d/'+index+'/edit'}))
 ];
 const result=normalizeToolResult({operation:'drive_search',query:'umowa'}, {status:'ok',wyniki});
 assert.equal(result.ok,true);
 assert.equal(result.results.length,20);
 assert.equal(new Set(result.results.map(row=>row.id)).size,20);
 assert.equal(result.results[0].name.length,240);
 assert.equal(result.results.find(row=>row.id==='valid_file_000002').url,'');
 assert.ok(result.results.filter(row=>row.url).every(row=>/^https:\/\/(?:drive|docs)\.google\.com\//.test(row.url)));
});

test('Drive failures return stable errors and never relay upstream text',()=>{
 const secret='Bearer internal-token-value-123456789';
 const result=normalizeToolResult({operation:'drive_read',fileId:'valid_file_000001'}, {status:'blad',blad:'403 Forbidden '+secret});
 assert.equal(result.ok,false);
 assert.equal(result.statusCode,502);
 assert.equal(result.error,'service_access_failed');
 assert.equal(result.doNotRetryAutomatically,true);
 assert.doesNotMatch(JSON.stringify(result),/internal-token|Forbidden/);
});

test('tools workflow builder disables execution retention and does not retry Media Intelligence',()=>{
 const builder=fs.readFileSync(path.join(root,'scripts/build-tools.py'),'utf8');
 assert.match(builder,/onError='continueRegularOutput'/);
 assert.match(builder,/'saveDataErrorExecution':'none'/);
 assert.match(builder,/'saveDataSuccessExecution':'none'/);
 assert.doesNotMatch(builder,/retryOnFail/);
});
