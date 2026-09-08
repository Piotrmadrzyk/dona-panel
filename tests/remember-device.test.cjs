const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const KEY='pm_panel_haslo';
const storage=()=>{const data=new Map();return{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}};
for(const file of ['index.html','pilot/chat.js']){
 const src=fs.readFileSync(file,'utf8');
 function boot(local=storage(),session=storage()){
  const ctx=vm.createContext({localStorage:local,sessionStorage:session});
  vm.runInContext(src.slice(src.indexOf('function lsGet(k)'),src.indexOf('function phase(text)')),ctx);
  return ctx;
 }
 test(file+': remembered login survives a new tab and browser session',()=>{
  const local=storage(),first=boot(local);assert.equal(first.lsSet(KEY,'test-only'),true);
  const reopened=boot(local,storage());assert.equal(reopened.lsGet(KEY),'test-only');
 });
 test(file+': migrate tab-only login and clear both stores on logout',()=>{
  const local=storage(),session=storage();session.setItem(KEY,'legacy-test');const ctx=boot(local,session);
  assert.equal(ctx.lsGet(KEY),'legacy-test');assert.equal(session.getItem(KEY),null);
  ctx.lsDel(KEY);assert.equal(boot(local,session).lsGet(KEY),'');
 });
 test(file+': another device does not inherit login',()=>{
  boot().lsSet(KEY,'test-only');assert.equal(boot().lsGet(KEY),'');
 });
 test(file+': unavailable persistent storage does not crash or claim persistence',()=>{
  const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
  const ctx=boot(blocked);assert.equal(ctx.lsSet(KEY,'test-only'),false);assert.equal(ctx.lsGet(KEY),'test-only');ctx.lsDel(KEY);assert.equal(ctx.lsGet(KEY),'');
 });
 test(file+': backend auth rejection clears remembered access; network error retains it',async()=>{
  const ctx=boot();Object.assign(ctx,{KEY,sessionPw:'test-only',rtSession:null,isDemo:false,setTimeout,clearTimeout,AbortController,openGate(){ctx.gateOpened=true}});
  vm.runInContext(src.slice(src.indexOf('async function panelPost('),src.indexOf('async function ask(',src.indexOf('async function panelPost('))),ctx);
  ctx.lsSet(KEY,'test-only');ctx.fetch=async()=>{throw Error('offline')};
  await assert.rejects(ctx.panelPost('test',{}),/offline/);assert.equal(ctx.lsGet(KEY),'test-only');
  ctx.fetch=async()=>({status:401,ok:false,text:async()=>'{}'});
  await assert.rejects(ctx.panelPost('test',{}),/AUTH/);assert.equal(ctx.lsGet(KEY),'');assert.equal(ctx.sessionPw,'');assert.equal(ctx.gateOpened,true);
 });
 test(file+': unchecking remember removes persistence after successful login',async()=>{
  const ctx=boot();Object.assign(ctx,{KEY,sessionPw:'',pw:{value:'test-only'},pwErr:{},remember:{checked:false},ask:async()=>true,closeGate(){},wczytajHist(){},setTimeout(){}});
  ctx.lsSet(KEY,'old-test');vm.runInContext(src.slice(src.indexOf('  function tryLogin(){'),src.indexOf('  document.getElementById("pwBtn").addEventListener')),ctx);
  ctx.tryLogin();await new Promise(resolve=>setImmediate(resolve));assert.equal(ctx.sessionPw,'test-only');assert.equal(ctx.lsGet(KEY),'');
 });
}
