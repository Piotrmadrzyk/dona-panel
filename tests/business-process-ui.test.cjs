const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const M=require('../pilot/business-model.js');
function setup(demo=false){
 const handlers={},calls=[],root={innerHTML:''},dialog={innerHTML:'',setAttribute(){},showModal(){this.open=true;},close(){this.open=false;}};
 let finish;
 const verifications=[];
 const win={DonaBusinessModel:M,DonaCommand:{brand:()=> 'probatum',setSnapshot(){}},DonaModel:{brands:[{id:'probatum',name:'Probatum'}]},addEventListener(){},dispatchEvent(){},Dona:{runBranch:(...args)=>{calls.push(args);return new Promise(r=>finish=r);},verifyBusinessTask:async meta=>{verifications.push(meta);return {ok:true};}}};
 const document={addEventListener:(k,f)=>(handlers[k]??=[]).push(f),getElementById:id=>id==='businessDialog'?dialog:root,querySelectorAll:()=>[]};
 vm.runInNewContext(fs.readFileSync('pilot/business.js','utf8'),{window:win,document,URL,Intl,Date,CustomEvent:function(){}});
 const data={processes:[{id:'p1',brandId:'probatum',title:'Akademia <script>',currentStep:'Przygotuj ofertę',state:{plan:{version:3,tasks:[{id:'offer',branch:'sprzedaz',title:'Oferta',status:'READY'},{id:'later',branch:'www',title:'Później',status:'WAITING'},{id:'launch',branch:'marketing',title:'Publikacja',status:'READY'}]}}}]};
 win.DonaBusiness.render('orders',data,demo);
 const click=attrs=>Promise.all(handlers.click.map(f=>f({target:{closest:selector=>Object.keys(attrs).some(k=>selector.includes('data-'+k))?{dataset:attrs,hasAttribute:a=>Object.keys(attrs).some(k=>'data-'+k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())===a)}:null}})));
 // Dataset keys are camelCase; select the new process listener explicitly.
 const action=(kind,id)=>handlers.click[0]({target:{closest:()=>({dataset:{[kind]:id,processId:'p1'},hasAttribute:a=>a==='data-'+kind.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()),disabled:false})}});
 const step=id=>action('businessStep',id),verify=id=>action('businessVerify',id),open=id=>action('businessProcess',id);
 return {root,dialog,calls,step,verify,open,verifications,finish:()=>finish?.({ok:true,answer:'wynik',processSaved:true}),data,win};
}
test('rendering a process neither executes work nor injects its title',()=>{const s=setup();assert.equal(s.calls.length,0);assert.match(s.root.innerHTML,/Otwórz plan i zadania/);assert.doesNotMatch(s.root.innerHTML,/<script>/);});
test('prepared task routes once with bound process context; pending/publication tasks do not run',async()=>{const s=setup();await s.step('later');await s.step('launch');assert.equal(s.calls.length,0);const first=s.step('offer');await s.step('offer');assert.equal(s.calls.length,1);assert.equal(s.calls[0][0],'sprzedaz');assert.match(s.calls[0][2],/p1/);assert.equal(JSON.stringify(s.calls[0][3]),JSON.stringify({processId:'p1',taskId:'offer',planVersion:3}));s.finish();await first;assert.equal(s.data.processes[0].state.plan.tasks[0].status,'READY');});
test('reviewable result is shown and explicit owner confirmation is sent with exact identity',async()=>{const s=setup();s.data.processes[0].state.plan.tasks[0]={id:'offer',branch:'sprzedaz',title:'Oferta',status:'RESULT_READY',resultSummary:'Gotowa oferta <bezpieczna>',resultAt:'2026-09-16T08:00:00Z'};s.win.DonaBusiness.render('orders',s.data,false);await s.open('p1');assert.match(s.dialog.innerHTML,/Wynik do sprawdzenia/);assert.match(s.dialog.innerHTML,/Gotowa oferta &lt;bezpieczna&gt;/);await s.verify('offer');assert.equal(JSON.stringify(s.verifications[0]),JSON.stringify({processId:'p1',taskId:'offer',planVersion:3,branch:'sprzedaz'}));});
test('demo never dispatches a task',async()=>{const s=setup(true);await s.step('offer');assert.equal(s.calls.length,0);});
