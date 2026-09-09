const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function boot() {
  const elements = new Map();
  const listeners = new Map();
  const element = () => ({
    value:'',
    innerHTML:'',
    textContent:'',
    hidden:false,
    className:'',
    dataset:{},
    addEventListener(){},
    focus(){},
    setCustomValidity(){},
    reportValidity(){},
    querySelector(){return element();},
    querySelectorAll(){return [];},
    appendChild(){},
    close(){},
    showModal(){}
  });
  const view = element();
  let html = '';
  Object.defineProperty(view,'innerHTML',{
    get(){return html;},
    set(value){
      html=String(value);
      elements.clear();
      elements.set('viewContent',view);
      for(const match of html.matchAll(/\bid="([^"]+)"/g))elements.set(match[1],element());
    }
  });
  elements.set('viewContent',view);
  const document = {
    body:{appendChild(){}},
    getElementById:id=>elements.get(id)||null,
    createElement:element,
    addEventListener(type,callback){listeners.set(type,callback);}
  };
  const navigation=[];
  const calls=[];
  const window = {
    DonaCommand:{brand:()=> 'all'},
    Dona:{
      navigate:view=>navigation.push(view),
      runBranch:(id,name,prompt)=>{calls.push({kind:'branch',id,name,prompt});return Promise.resolve({ok:true,answer:'ok'});},
      run:prompt=>{calls.push({kind:'main',prompt});return Promise.resolve({ok:true,answer:'ok'});}
    },
    dispatchEvent(){},
    CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}}
  };
  const context=vm.createContext({
    window,document,URL,console,Intl,Date,Map,Number,String,Array,Object,RegExp,
    CustomEvent:window.CustomEvent,
    setTimeout:callback=>{callback();return 1;},
    FormData:class{}
  });
  vm.runInContext(fs.readFileSync('pilot/systems.js','utf8'),context);
  return {api:window.DonaSystems,view,navigation,calls};
}

function fixture() {
  return {
    clients:[{id:'customer-1',name:'Klient <Jeden>',status:'ACTIVE',email:'kontakt@example.com',owner:'Piotr',createdAt:'2026-09-09T08:00:00Z'}],
    tasks:[{id:'task-1',title:'Zadanie',status:'TODO',date:'2026-09-10T08:00:00Z',clientId:'customer-1',clientName:'Klient <Jeden>',priority:'HIGH'}],
    processes:[{id:'process-1',title:'Proces',type:'wdrożenie',status:'W_TOKU',currentStep:'Brief',state:{settled:[],waiting:[],blocked:[]}}],
    assets:[{id:'site-1',title:'Strona',type:'LANDING_PAGE',status:'PUBLISHED',publishStatus:'LIVE',previewUrl:'https://example.com',version:1}],
    campaigns:[{id:'campaign-1',name:'Kampania',status:'ACTIVE'}],
    customerMemory:[{id:'memory-1',customerId:'customer-1',key:'kontakt',value:'Rano',domain:'komunikacja'}],
    nextActions:[{id:'action-1',customerId:'customer-1',title:'Telefon',status:'OPEN'}],
    files:[{id:'file-1',title:'Umowa',type:'PDF',status:'GOTOWA'}],
    invoices:[{id:'FV/1',number:'FV/1',clientName:'Klient',amount:1200,currency:'PLN',status:'UNPAID',dueAt:'2026-09-15'}],
    subscriptions:[{id:'service-1',name:'OpenAI',amount:100,currency:'USD',status:'ACTIVE',active:true}],
    subscriptionUsage:[{id:'usage-1',serviceId:'service-1',used:25,total:100,remainingPercent:75}],
    researches:[{id:'research-1',topic:'Rynek',summary:'Wynik badania',highConfidenceClaims:4}],
    competitorObservations:[{id:'watch-1',competitor:'Firma X',area:'ceny',whatChanged:'Nowy plan',changed:true}],
    playbooks:[{id:'pb-1',name:'AI B2B',sector:'b2b',readiness:80,active:true,modules:['leady','oferty']}],
    offers:[],meetings:[],memory:[],permanentMemory:[],mails:[]
  };
}

test('all eight business systems are registered and render useful live-data views',()=>{
  const panel=boot();
  assert.deepEqual(Object.keys(panel.api.views),['projects','websites','customer','searchall','documents','finance','researchhub','onboarding']);
  const expected={
    projects:/Od procesu do konkretnego zadania/,
    websites:/Strony pod kontrolą/,
    customer:/Jedna karta, cała relacja/,
    searchall:/Znajdź wszystko z jednego miejsca/,
    documents:/Od pliku do użytecznej informacji/,
    finance:/Terminy i koszty/,
    researchhub:/Research, który zostaje/,
    onboarding:/Nowy klient bez ręcznej/
  };
  for(const [view,pattern] of Object.entries(expected)){
    panel.api.render(view,fixture(),false);
    assert.match(panel.view.innerHTML,pattern);
  }
});

test('system views escape business data and only use safe HTTPS links',()=>{
  const panel=boot(),data=fixture();
  data.assets[0].title='<img src=x onerror=alert(1)>';
  data.assets[0].previewUrl='javascript:alert(1)';
  panel.api.render('websites',data,false);
  assert.doesNotMatch(panel.view.innerHTML,/<img src=x/);
  assert.match(panel.view.innerHTML,/&lt;img src=x/);
  assert.doesNotMatch(panel.view.innerHTML,/javascript:/);
});

test('unified search indexes the connected business collections',()=>{
  const panel=boot();
  panel.api.render('searchall',fixture(),false);
  const index=panel.api.buildSearchIndex();
  assert.ok(index.some(item=>item.type==='Klient'&&item.route==='customer'));
  assert.ok(index.some(item=>item.type==='Dokument'&&item.route==='documents'));
  assert.ok(index.some(item=>item.type==='Research'&&item.route==='researchhub'));
  assert.ok(index.some(item=>item.type==='Strona / zasób'&&item.route==='websites'));
});

test('write prompts identify exact records and preserve approval boundaries',()=>{
  const panel=boot(),prompts=panel.api._test;
  const task=prompts.promptFor('task-complete',{id:'task-42',title:'Raport'});
  const website=prompts.promptFor('website-create',{name:'Landing',goal:'Leady',customer:'customer-1',deadline:'2026-09-12'});
  const reminders=prompts.promptFor('reminders-preview',{});
  const onboarding=prompts.promptFor('onboarding-create',{name:'Nowy klient',service:'Obsługa AI',start:'2026-09-10'});
  assert.match(task,/task-42/);assert.match(task,/Nie zmieniaj żadnego innego zadania/);
  assert.match(website,/Nie publikuj bez osobnego zatwierdzenia/);
  assert.match(reminders,/Nie wysyłaj żadnej wiadomości/);
  assert.match(onboarding,/sprawdź duplikat/i);assert.match(onboarding,/Nic[^\n]*nie wysyłaj ani nie publikuj/);
});

test('demo fixtures cover every new backend collection',()=>{
  const panel=boot();
  const data=panel.api._test.withDemo({tasks:[],clients:[]},true);
  for(const key of ['processes','assets','campaigns','customerMemory','nextActions','invoices','subscriptions','subscriptionUsage','researches','competitorObservations','playbooks'])assert.ok(data[key].length,key);
});
