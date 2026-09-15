const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('pilot/workspace.js','utf8');
const loadSource=source.slice(source.indexOf('  async function loadData(){'),source.indexOf('  function navigate(){'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('refresh requested during an older snapshot fetches a fresh snapshot afterwards',async()=>{
  const pending=[];const state={loading:false,request:0,refreshQueued:false};
  const context=vm.createContext({state,$:()=>({disabled:false}),render(){},window:{Dona:{isAuthenticated:()=>true,request:()=>new Promise(resolve=>pending.push(resolve))}}});
  vm.runInContext(loadSource,context);
  const first=context.loadData();
  await context.loadData();await context.loadData();
  assert.equal(pending.length,1);
  pending[0]({ok:true,context:{},approvals:[],mails:['old']});await first;await tick();
  assert.equal(pending.length,2);
  pending[1]({ok:true,context:{},approvals:[],mails:['new']});await tick();
  assert.equal(state.data.mails[0],'new');assert.equal(state.loading,false);assert.equal(state.refreshQueued,false);
});
test('invalidated snapshot never repopulates data after logout',async()=>{
  let finish;const state={loading:false,request:0,refreshQueued:false,data:null};
  const context=vm.createContext({state,$:()=>({disabled:false}),render(){},window:{Dona:{isAuthenticated:()=>true,request:()=>new Promise(resolve=>finish=resolve)}}});
  vm.runInContext(loadSource,context);const request=context.loadData();
  state.request++;state.loading=false;state.refreshQueued=false;
  finish({ok:true,context:{},approvals:[],mails:['private']});await request;
  assert.equal(state.data,null);
});
test('failed mail request retains the form and prevents a second submission',async()=>{
  let handler,closed=0,calls=0,feedback;
  const submit={disabled:false,textContent:''};
  const form={querySelector:s=>s==='[type="submit"]'?submit:feedback,appendChild:n=>feedback=n,addEventListener:(name,fn)=>{if(name==='submit')handler=fn;}};
  const dialog={querySelector:()=>form,querySelectorAll:()=>[],showModal(){},close(){closed++;}};
  const context=vm.createContext({ensureMailDialog:()=>dialog,escape:String,document:{createElement:()=>({dataset:{},setAttribute(){}})},
    FormData:class{entries(){return [['reply','Moja ręczna odpowiedź']][Symbol.iterator]();}},state:{view:'mail'},loadData(){},
    window:{Dona:{runBranch:async()=>{calls++;throw new Error('timeout');}}}});
  const fn=source.slice(source.indexOf('  function showMailReply(mail){'),source.indexOf('  // "Zarchiwizuj"'));
  vm.runInContext(fn,context);context.showMailReply({id:'test',messageId:'123',title:'Test',sender:'example@example.com'});
  await handler({preventDefault(){},currentTarget:form});
  assert.equal(closed,0);assert.equal(submit.disabled,true);assert.match(feedback.textContent,/Nie potwierdzono/);
  await handler({preventDefault(){},currentTarget:form});assert.equal(calls,1);
});
