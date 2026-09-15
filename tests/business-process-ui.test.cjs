const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const M=require('../pilot/business-model.js');
function setup(demo=false){
 const handlers={},calls=[],root={innerHTML:''},dialog={innerHTML:'',setAttribute(){},showModal(){this.open=true;},close(){this.open=false;}};
 let finish;
 const win={DonaBusinessModel:M,DonaCommand:{brand:()=> 'probatum',setSnapshot(){}},DonaModel:{brands:[{id:'probatum',name:'Probatum'}]},addEventListener(){},dispatchEvent(){},Dona:{runBranch:(...args)=>{calls.push(args);return new Promise(r=>finish=r);}}};
 const document={addEventListener:(k,f)=>(handlers[k]??=[]).push(f),getElementById:id=>id==='businessDialog'?dialog:root,querySelectorAll:()=>[]};
 vm.runInNewContext(fs.readFileSync('pilot/business.js','utf8'),{window:win,document,URL,Intl,Date,CustomEvent:function(){}});
 const data={processes:[{id:'p1',brandId:'probatum',title:'Akademia <script>',currentStep:'Przygotuj ofertę',state:{plan:{tasks:[{id:'offer',branch:'sprzedaz',title:'Oferta',status:'READY'},{id:'later',branch:'www',title:'Później',status:'WAITING'},{id:'launch',branch:'marketing',title:'Publikacja',status:'READY'}]}}}]};
 win.DonaBusiness.render('orders',data,demo);
 const click=attrs=>Promise.all(handlers.click.map(f=>f({target:{closest:selector=>Object.keys(attrs).some(k=>selector.includes('data-'+k))?{dataset:attrs,hasAttribute:a=>Object.keys(attrs).some(k=>'data-'+k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())===a)}:null}})));
 // Dataset keys are camelCase; select the new process listener explicitly.
 const step=(id)=>handlers.click[0]({target:{closest:()=>({dataset:{businessStep:id,processId:'p1'},hasAttribute:()=>false,disabled:false})}});
 return {root,dialog,calls,step,finish:()=>finish?.({ok:true,answer:'wynik'}),data,win};
}
test('rendering a process neither executes work nor injects its title',()=>{const s=setup();assert.equal(s.calls.length,0);assert.match(s.root.innerHTML,/Otwórz plan i zadania/);assert.doesNotMatch(s.root.innerHTML,/<script>/);});
test('prepared task routes once to the existing branch; pending/publication tasks do not run',async()=>{const s=setup();await s.step('later');await s.step('launch');assert.equal(s.calls.length,0);const first=s.step('offer');await s.step('offer');assert.equal(s.calls.length,1);assert.equal(s.calls[0][0],'sprzedaz');assert.match(s.calls[0][2],/p1/);s.finish();await first;assert.equal(s.data.processes[0].state.plan.tasks[0].status,'READY');});
test('demo never dispatches a task',async()=>{const s=setup(true);await s.step('offer');assert.equal(s.calls.length,0);});
