(function(root){
'use strict';

const POLL_MS=15000;
const ACTIVE_MAX_AGE_MS=10*60*1000;
const STATUS={
  working:{label:'PRACUJE',rank:0},
  approval:{label:'CZEKA NA ZGODĘ',rank:1},
  listening:{label:'NASŁUCHUJE',rank:2},
  attention:{label:'WYMAGA UWAGI',rank:3},
  unconfirmed:{label:'BRAK KOŃCOWEGO POTWIERDZENIA',rank:4},
  done:{label:'ZAKOŃCZONE',rank:5}
};
const PROCESS_STATUS={RUNNING:'working',WAITING_APPROVAL:'approval',WAITING_SYSTEM:'listening',COMPLETED:'done',INTERRUPTED:'attention',STALLED:'attention',UNCONFIRMED:'unconfirmed'};
const EVENT_STATUS={DONE:'done',ATTENTION:'attention',UNCONFIRMED:'unconfirmed'};
const state={active:false,demo:false,loading:false,error:'',payload:null,request:0,timer:null,sessionOps:[]};

const text=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=(value,fallback='')=>{
  const safe=String(value??'').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[ukryty adres]').replace(/https?:\/\/\S+/gi,'[ukryty link]').replace(/\s+/g,' ').trim();
  return (safe||fallback).slice(0,180);
};
const fold=value=>String(value??'').toLocaleUpperCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'_');
const number=value=>value===null||value===''||value===undefined||!Number.isFinite(Number(value))?null:Number(value);
const date=value=>{const d=new Date(value);return value&&!Number.isNaN(+d)?d:null;};
const first=(object,keys,fallback)=>{for(const key of keys)if(object&&object[key]!==undefined&&object[key]!==null&&object[key]!=='')return object[key];return fallback;};

function classifyStatus(raw,item={},now=Date.now()){
  const value=fold(raw),last=date(first(item,['lastSeenAt','updatedAt','finishedAt','startedAt','date','occurredAt','createdAt'],''));
  if(number(item.errorCount)>0||number(item.alertCount)>0||/(ERROR|FAILED|FAILURE|CRASH|WYMAGA_UWAGI|INCIDENT)/.test(value))return 'attention';
  if(/(WAITING_APPROVAL|AWAITING_APPROVAL|APPROVAL_REQUIRED|CZEKA_NA_ZGODE|OCZEKUJE_NA_ZGODE|REQUESTED)/.test(value))return 'approval';
  if(/(ROZPOCZETY|STARTED|NO_FINAL|UNCONFIRMED|UNKNOWN|TIMEOUT|PENDING)/.test(value))return 'unconfirmed';
  if(/(LISTEN|NASLUCH|WAITING_SYSTEM|WEBHOOK_WAIT|WATCHING|RECEIVER|IDLE)/.test(value))return 'listening';
  if(/(SUCCESS|SUCCEEDED|DONE|COMPLETED|ZAKONCZONE|FINISHED|EXECUTED|SENT)/.test(value))return 'done';
  if(/(RUNNING|ACTIVE|WORKING|PRACUJE|PROCESSING|IN_PROGRESS|W_TRAKCIE)/.test(value)){
    if(last&&now-last>ACTIVE_MAX_AGE_MS)return 'unconfirmed';
    return 'working';
  }
  return 'unconfirmed';
}

function normalizeAgent(item,index,source='system',now=Date.now()){
  item=item&&typeof item==='object'?item:{};
  const rawStatus=first(item,['status','state','stan','executionStatus'],'UNKNOWN');
  const lastSeenAt=first(item,['lastSeenAt','updatedAt','finishedAt','startedAt','date','occurredAt','createdAt'],'');
  return {
    id:clean(first(item,['id','executionId','runId'],source+'-'+index),source+'-'+index),
    name:clean(first(item,['name','agent','agentName','workflowName'],'Agent Dony'),'Agent Dony'),
    status:classifyStatus(rawStatus,item,now),
    rawStatus:clean(rawStatus,'UNKNOWN'),
    summary:clean(first(item,['summary','detail','description'],'Bezpieczny ślad operacyjny — szczegóły zadania pozostają ukryte.'),'Bezpieczny ślad operacyjny — szczegóły zadania pozostają ukryte.'),
    lastSeenAt,
    source,
    executionId:clean(first(item,['executionId','runId'],'')).slice(0,48)
  };
}

function normalizeProcess(item,index,now=Date.now()){
  item=item&&typeof item==='object'?item:{};
  const rawStatus=first(item,['state','status'],'UNCONFIRMED'),status=PROCESS_STATUS[fold(rawStatus)]||classifyStatus(rawStatus,item,now);
  const lastSeenAt=first(item,['updatedAt','createdAt'],'');
  const currentStep=clean(first(item,['currentStep','description'],''));
  const result=clean(first(item,['result'],''));
  const resultLabel=clean(first(item,['resultLabel'],result?'Wynik częściowy':''));
  return {
    id:clean(first(item,['id'],'process-'+index),'process-'+index),
    name:clean(first(item,['name','type'],'Proces Dony'),'Proces Dony'),status,
    rawStatus:clean(first(item,['stateLabel','status'],rawStatus),'UNCONFIRMED'),
    summary:currentStep||(result?(resultLabel+': '+result):'Proces nie ma jeszcze potwierdzonego kroku.'),
    lastSeenAt,source:'process',executionId:'',result,resultLabel,
  };
}

function normalizeEvent(item,index){
  item=item&&typeof item==='object'?item:{};
  const status=EVENT_STATUS[fold(first(item,['state'],'UNCONFIRMED'))]||classifyStatus(first(item,['status'],'UNCONFIRMED'),item);
  return {
    id:clean(first(item,['id'],'event-'+index),'event-'+index),
    title:clean(first(item,['title','kind'],'Zdarzenie Dony'),'Zdarzenie Dony'),
    status,stateLabel:clean(first(item,['stateLabel'],STATUS[status]?.label||'Stan niepotwierdzony'),'Stan niepotwierdzony'),
    occurredAt:first(item,['occurredAt','createdAt'],''),kind:clean(first(item,['kind'],'')),
  };
}

function normalizePayload(raw,now=Date.now()){
  const body=raw&&typeof raw==='object'&&(raw.data&&typeof raw.data==='object'?raw.data:raw)||{};
  const sourceAgents=Array.isArray(body.agents)?body.agents:Array.isArray(body.agentRuns)?body.agentRuns:Array.isArray(body.runs)?body.runs:Array.isArray(body.items)?body.items:[];
  const agents=sourceAgents.map((item,index)=>normalizeAgent(item,index,'system',now));
  const processes=(Array.isArray(body.processes)?body.processes:[]).slice(0,50).map((item,index)=>normalizeProcess(item,index,now));
  agents.push(...processes);
  const events=(Array.isArray(body.events)?body.events:[]).slice(0,12).map(normalizeEvent);
  const approvals=Array.isArray(body.approvals)?body.approvals:[];
  approvals.filter(item=>/(REQUESTED|WAITING|PENDING|APPROVAL)/.test(fold(first(item,['status','executionStatus'],'')))&&(!item.expiresAt||Date.parse(item.expiresAt)>now)).forEach((item,index)=>{
    agents.push(normalizeAgent({id:'approval-'+first(item,['id'],index),name:'Bramka decyzji',status:'WAITING_APPROVAL',summary:clean(first(item,['type'],'Materiał'))+' czeka na Twoją zgodę.',lastSeenAt:first(item,['createdAt','updatedAt'],'')},index,'approval',now));
  });
  const incidents=Array.isArray(body.incidents)?body.incidents:[];
  incidents.filter(item=>!/(RESOLVED|CLOSED|DONE)/.test(fold(item.status))).forEach((item,index)=>{
    agents.push(normalizeAgent({id:'incident-'+first(item,['id'],index),name:first(item,['agent'],'Agent Dony'),status:'ERROR',summary:'System zarejestrował incydent. Prywatna treść i dane techniczne są ukryte.',lastSeenAt:first(item,['occurredAt','updatedAt'],'')},index,'incident',now));
  });
  const costs=body.costs&&typeof body.costs==='object'?body.costs:{};
  const summary=body.summary&&typeof body.summary==='object'?body.summary:{};
  const models=Array.isArray(body.models)?body.models:[];
  const meta=body.meta&&typeof body.meta==='object'?body.meta:{};
  return {
    ok:body.ok!==false,
    generatedAt:first(body,['generatedAt','updatedAt'],''),
    summary:{
      health:clean(first(summary,['health'],'UNKNOWN'),'UNKNOWN'),
      running:number(summary.running),waitingApproval:number(summary.waitingApproval),waitingSystem:number(summary.waitingSystem),
      failed24h:number(summary.failed24h),succeeded24h:number(summary.succeeded24h),
      costToday:number(first(summary,['costToday'],costs.today)),costMonth:number(first(summary,['costMonth'],costs.month)),
      currency:clean(first(summary,['currency'],costs.currency||'USD'),'USD').slice(0,3).toUpperCase()
    },
    agents,processes,events,
    costs:{today:number(first(costs,['today'],summary.costToday)),month:number(first(costs,['month'],summary.costMonth)),currency:clean(first(costs,['currency'],summary.currency||'USD'),'USD').slice(0,3).toUpperCase(),updatedAt:first(costs,['updatedAt'],first(body,['generatedAt'],'')),source:clean(first(costs,['source'],'Rejestr kosztów Dony'),'Rejestr kosztów Dony')},
    models:models.slice(0,4).map((model,index)=>({name:clean(first(model,['model','name'],'Model '+(index+1)),'Model '+(index+1)),requests:number(model.requests),successRate:number(model.successRate),avgLatencyMs:number(model.avgLatencyMs),updatedAt:first(model,['updatedAt'],'')})),
    meta:{readOnly:meta.readOnly!==false,windowHours:number(meta.windowHours)||24,truncated:!!meta.truncated,sourceFreshness:meta.sourceFreshness}
  };
}

function demoPayload(now=Date.now()){
  const ago=minutes=>new Date(now-minutes*60000).toISOString();
  return normalizePayload({ok:true,generatedAt:new Date(now).toISOString(),summary:{health:'DEMO',running:1,waitingApproval:1,waitingSystem:1,failed24h:0,succeeded24h:4,costToday:null,costMonth:null,currency:'USD'},agents:[
    {id:'demo-live',name:'Agent Poczty',status:'RUNNING',lastSeenAt:ago(0),summary:'Pokaz sposobu prezentacji bieżącej pracy.'},
    {id:'demo-listener',name:'Agent Formularzy',status:'LISTENING',lastSeenAt:ago(1),summary:'Przykład bezpiecznego nasłuchiwania zdarzeń.'},
    {id:'demo-done',name:'Agent Marketingu',status:'COMPLETED',lastSeenAt:ago(7),summary:'Przykład potwierdzonego zakończenia zadania.'},
    {id:'demo-unconfirmed',name:'Agent Systemowy',status:'ROZPOCZETY',lastSeenAt:ago(42),summary:'Stary wpis rozpoczęcia nie jest pokazywany jako aktywna praca.'}
  ],processes:[{id:'demo-process',name:'Proces przygotowania oferty',state:'COMPLETED',stateLabel:'Zakończony',result:'Gotowy materiał',resultLabel:'Wynik potwierdzony',updatedAt:ago(5)}],events:[{id:'demo-event',title:'Zapisano potwierdzony wynik',state:'DONE',stateLabel:'Zapisano',occurredAt:ago(5)}],approvals:[{id:'demo-approval',type:'Przykładowy materiał',status:'REQUESTED',createdAt:ago(2),expiresAt:new Date(now+3600000).toISOString()}],costs:{today:null,month:null,currency:'USD',updatedAt:new Date(now).toISOString(),source:'Dane demonstracyjne'},meta:{windowHours:24,readOnly:true}},now);
}

function when(value){
  const d=date(value);if(!d)return 'brak czasu odczytu';
  const diff=Math.max(0,Date.now()-d);if(diff<45000)return 'teraz';if(diff<3600000)return Math.floor(diff/60000)+' min temu';
  return d.toLocaleString('pl-PL',{timeZone:'Europe/Warsaw',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
}
function exactTime(value){const d=date(value);return d?d.toLocaleString('pl-PL',{timeZone:'Europe/Warsaw',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'brak potwierdzonego czasu';}
function money(value,currency){
  if(value===null)return 'Brak danych';
  try{return new Intl.NumberFormat('pl-PL',{style:'currency',currency:currency||'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);}catch{return String(value)+' '+clean(currency);}
}
function health(payload,agents){
  const raw=fold(payload.summary.health);if(/(OK|HEALTHY|GREEN|STABLE)/.test(raw))return {key:'ok',title:'System pracuje stabilnie',copy:'Stan potwierdzony przez ostatni odczyt.'};
  if(/DEMO/.test(raw))return {key:'demo',title:'Widok demonstracyjny',copy:'To symulacja interfejsu — żaden agent nie został uruchomiony.'};
  if(agents.some(agent=>agent.status==='attention'))return {key:'attention',title:'DONA wymaga uwagi',copy:'Co najmniej jeden potwierdzony ślad zgłasza problem.'};
  if(agents.some(agent=>agent.status==='working'))return {key:'working',title:'DONA pracuje',copy:'Bieżąca operacja ma świeży, aktywny ślad.'};
  return {key:'quiet',title:'DONA jest gotowa',copy:'W tej chwili nie ma potwierdzonej aktywnej pracy.'};
}
function metric(value,fallback){return value===null?fallback:value;}
function modelValue(value,suffix=''){return value===null?'—':new Intl.NumberFormat('pl-PL',{maximumFractionDigits:1}).format(value)+suffix;}

function sessionAgents(now=Date.now()){
  return state.sessionOps.map((item,index)=>normalizeAgent({id:item.id,name:item.label||'DONA · bieżąca rozmowa',status:item.status==='pending'?'RUNNING':item.status==='error'?'ERROR':'COMPLETED',summary:item.status==='pending'?'Bieżące polecenie z rozmowy jest obsługiwane.':item.status==='error'?'Nie otrzymano końcowego potwierdzenia; automatyczne ponowienie jest zablokowane.':'Wynik wrócił do panelu.',lastSeenAt:item.time},index,'session',now));
}
function combinedAgents(payload,now=Date.now()){
  const seen=new Set(),items=[...sessionAgents(now),...payload.agents];
  return items.filter(item=>{const key=item.source+':'+item.id;if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>(STATUS[a.status]?.rank??9)-(STATUS[b.status]?.rank??9)||(Date.parse(b.lastSeenAt)||0)-(Date.parse(a.lastSeenAt)||0)).slice(0,24);
}
function statusCount(agents,status){return agents.filter(agent=>agent.status===status).length;}
function agentCard(agent){
  const status=STATUS[agent.status]||STATUS.unconfirmed;
  return '<article class="liveops-agent is-'+text(agent.status)+'"><span class="liveops-node" aria-hidden="true"><i></i></span><div class="liveops-agent-body"><div class="liveops-agent-head"><div><span class="liveops-source">'+text(agent.source==='session'?'BIEŻĄCA SESJA':agent.source==='approval'?'BRAMKA DECYZJI':agent.source==='incident'?'INCYDENT':agent.source==='process'?'PROCES DONY':'ŚLAD SYSTEMOWY')+'</span><h3>'+text(agent.name)+'</h3></div><span class="liveops-status">'+text(status.label)+'</span></div><p>'+text(agent.summary)+'</p><small>Ostatni ślad: <time datetime="'+text(agent.lastSeenAt)+'">'+text(when(agent.lastSeenAt))+'</time>'+(agent.executionId?' · wykonanie '+text(agent.executionId.slice(-10)):'')+'</small></div></article>';
}
function modelCards(models){
  if(!models.length)return '<div class="liveops-empty-compact">Brak danych o modelach w tym odczycie.</div>';
  return models.map(model=>'<div class="liveops-model"><strong>'+text(model.name)+'</strong><span>'+modelValue(model.successRate,'%')+' powodzenia</span><small>'+modelValue(model.requests)+' wywołań · '+modelValue(model.avgLatencyMs,' ms')+'</small></div>').join('');
}
function eventCards(events){
  if(!events.length)return '<div class="liveops-empty-compact">Brak potwierdzonych zdarzeń w tym odczycie.</div>';
  return events.slice(0,6).map(item=>'<article class="liveops-confirmation is-'+text(item.status)+'"><i></i><div><strong>'+text(item.title)+'</strong><span>'+text(item.stateLabel)+' · '+text(when(item.occurredAt))+'</span></div></article>').join('');
}

function draw(){
  if(!state.active||!root.document)return;
  const target=root.document.getElementById('viewContent');if(!target)return;
  if(state.loading&&!state.payload){target.innerHTML='<div class="liveops-loading" aria-label="Pobieranie stanu agentów"><i></i><strong>Łączę ślady pracy Dony…</strong><span>Odczyt jest bezpieczny i nie uruchamia żadnego zadania.</span></div>';return;}
  if(!state.payload){target.innerHTML='<section class="liveops-unavailable"><span>LIVE OPS</span><h2>Nie mam jeszcze potwierdzonego odczytu.</h2><p>'+text(state.error||'Otwórz widok ponownie lub odśwież dane.')+'</p><button class="secondary" type="button" data-liveops-refresh>Spróbuj ponownie</button></section>';bind(target);return;}
  const payload=state.payload,agents=combinedAgents(payload),system=health(payload,agents),currency=payload.costs.currency||payload.summary.currency;
  const running=Math.max(metric(payload.summary.running,0),statusCount(agents,'working'));
  const approvals=Math.max(metric(payload.summary.waitingApproval,0),statusCount(agents,'approval'));
  const listening=Math.max(metric(payload.summary.waitingSystem,0),statusCount(agents,'listening'));
  const attention=Math.max(metric(payload.summary.failed24h,0),statusCount(agents,'attention'));
  const done24=Math.max(metric(payload.summary.succeeded24h,0),statusCount(agents,'done'));
  const demoBanner=state.demo?'<div class="liveops-demo"><strong>DANE DEMONSTRACYJNE</strong><span>Ten ekran pokazuje wygląd stanów. Nie połączył się z n8n i niczego nie uruchomił.</span></div>':'';
  const staleWarning=state.error?'<div class="liveops-warning"><strong>Ostatnie odświeżenie nie powiodło się.</strong><span>Pokazuję poprzedni potwierdzony odczyt. Nie zgaduję aktualnego stanu.</span></div>':'';
  target.innerHTML=demoBanner+staleWarning+
    '<section class="liveops-stage is-'+text(system.key)+'"><header><div><span class="liveops-kicker"><i></i> DONA LIVE OPS</span><h2>'+text(system.title)+'</h2><p>'+text(system.copy)+'</p></div><div class="liveops-read"><span>'+(payload.meta.readOnly?'TYLKO ODCZYT':'TRYB ODCZYTU')+'</span><time title="'+text(exactTime(payload.generatedAt))+'">'+text(when(payload.generatedAt))+'</time><button class="liveops-refresh" type="button" data-liveops-refresh '+(state.loading?'disabled':'')+' aria-label="Odśwież stan agentów">↻</button></div></header><div class="liveops-stage-grid"><div class="liveops-core" aria-hidden="true"><span class="liveops-orbit orbit-one"><i></i><i></i><i></i></span><span class="liveops-orbit orbit-two"><i></i><i></i><i></i></span><b>D</b><small>LIVE</small></div><div class="liveops-metrics"><article><span>TERAZ</span><strong>'+running+'</strong><small>pracuje</small></article><article><span>KONTROLA</span><strong>'+approvals+'</strong><small>czeka na zgodę</small></article><article><span>CZUWA</span><strong>'+listening+'</strong><small>nasłuchuje</small></article><article class="'+(attention?'has-alert':'')+'"><span>24 GODZ.</span><strong>'+attention+'</strong><small>wymaga uwagi</small></article><article><span>24 GODZ.</span><strong>'+done24+'</strong><small>zakończonych</small></article></div></div><footer><span>Odświeżanie co 15 s tylko podczas oglądania tego ekranu.</span><strong>Żadnych wysyłek · żadnych publikacji · żadnych zmian</strong></footer></section>'+
    '<div class="liveops-layout"><section class="liveops-work"><div class="liveops-section-head"><div><span>OŚ PRACY</span><h2>Co robi Dona</h2></div><small>'+agents.length+' '+(agents.length===1?'widoczny ślad':'widoczne ślady')+'</small></div><div class="liveops-timeline">'+(agents.length?agents.map(agentCard).join(''):'<div class="liveops-empty"><strong>Brak śladów w tym odczycie.</strong><span>Nie oznacza to błędu. Żaden agent ani proces nie jest pokazywany bez potwierdzonego rekordu.</span></div>')+'</div></section><aside class="liveops-side"><section class="liveops-cost"><div class="liveops-card-title"><span>KOSZT MODELI</span><b>↗</b></div><div class="liveops-cost-grid"><div><small>Dzisiaj</small><strong>'+text(money(payload.costs.today,currency))+'</strong></div><div><small>Ten miesiąc</small><strong>'+text(money(payload.costs.month,currency))+'</strong></div></div><p>Źródło: '+text(payload.costs.source)+'.</p><time title="'+text(exactTime(payload.costs.updatedAt))+'">Stan kosztów: '+text(when(payload.costs.updatedAt))+'</time></section><section class="liveops-models"><div class="liveops-card-title"><span>JAKOŚĆ ROUTINGU</span><b>24 h</b></div>'+modelCards(payload.models)+'</section><section class="liveops-confirmations"><div class="liveops-card-title"><span>POTWIERDZONE OSTATNIO</span><b>'+payload.events.length+'</b></div>'+eventCards(payload.events)+'</section><section class="liveops-legend"><div class="liveops-card-title"><span>JAK CZYTAĆ STATUSY</span></div>'+Object.entries(STATUS).map(([key,item])=>'<div><i class="is-'+key+'"></i><span>'+text(item.label)+'</span></div>').join('')+'<p>„Rozpoczęty” bez świeżego śladu nigdy nie jest uznawany za aktywną pracę.</p></section></aside></div>'+
    '<p class="liveops-provenance">Zakres: ostatnie '+text(payload.meta.windowHours)+' h · odczyt '+text(exactTime(payload.generatedAt))+(payload.meta.truncated?' · wynik skrócony przez źródło':' · pełny zwrócony zakres')+'. Prywatne treści, prompty, adresy i surowe dane są ukryte.</p>';
  bind(target);updateNav(agents);
}

function bind(target){const button=target.querySelector('[data-liveops-refresh]');if(button)button.onclick=refresh;}
function updateNav(agents){
  if(!root.document)return;const link=root.document.querySelector('[data-view="operations"]');if(!link)return;
  const working=agents.some(agent=>agent.status==='working');link.classList.toggle('has-live-activity',working);
  const dot=link.querySelector('.nav-live-dot');if(dot)dot.title=working?'DONA ma potwierdzoną aktywną pracę':'Brak potwierdzonej aktywnej pracy';
}
function clearTimer(){if(state.timer){root.clearTimeout(state.timer);state.timer=null;}}
function schedule(){clearTimer();if(state.active&&!state.demo&&root.document.visibilityState!=='hidden')state.timer=root.setTimeout(load,POLL_MS);}
async function load(){
  if(!state.active||state.demo||state.loading||!root.Dona?.isAuthenticated?.())return;
  clearTimer();const request=++state.request;state.loading=true;state.error='';draw();
  try{
    const result=await root.Dona.request('dona-live-ops',{operation:'snapshot'},30000);
    if(request!==state.request||!state.active)return;if(!result||result.ok!==true)throw new Error('INVALID_RESPONSE');
    state.payload=normalizePayload(result);state.error='';
  }catch(error){if(request===state.request&&state.active)state.error=error&&error.message==='AUTH'?'Sesja wygasła. Zaloguj się ponownie.':'Nie udało się potwierdzić bieżącego stanu agentów.';}
  finally{if(request===state.request){state.loading=false;if(state.active){draw();schedule();}}}
}
function refresh(){if(!state.active)return;clearTimer();if(state.demo){state.payload=demoPayload();draw();return;}load();}
function setActive(active,demo){
  const changed=state.active!==!!active||state.demo!==!!demo;state.active=!!active;state.demo=!!demo;
  if(!state.active){clearTimer();return;}
  if(state.demo){state.error='';state.payload=demoPayload();draw();return;}
  if(changed||!state.payload){draw();load();}else{draw();schedule();}
}
function render(_workspaceData,demo){setActive(true,demo);draw();}

const api={views:{operations:'Praca Dony'},descriptions:{operations:'Zobacz na żywo, który agent pracuje, na co czeka i czy zadanie ma końcowe potwierdzenie.'},render,setActive,refresh};
root.DonaLiveOps=api;
if(typeof module!=='undefined')module.exports={STATUS,classifyStatus,normalizeAgent,normalizeProcess,normalizeEvent,normalizePayload,demoPayload,clean};

if(!root.document||!root.addEventListener)return;
root.addEventListener('dona:operation',event=>{
  const detail=event.detail||{},id=clean(detail.id,'session-'+Date.now()),existing=state.sessionOps.find(item=>item.id===id);
  const entry={id,status:detail.status||'pending',label:clean(detail.label,'DONA · bieżąca rozmowa'),time:new Date().toISOString()};
  if(existing)Object.assign(existing,entry);else state.sessionOps.unshift(entry);
  state.sessionOps=state.sessionOps.slice(0,16);if(state.active)draw();
});
root.document.addEventListener('visibilitychange',()=>{if(!state.active)return;if(root.document.visibilityState==='hidden')clearTimer();else refresh();});
root.addEventListener('dona:auth',event=>{if(!event.detail?.authenticated&&!event.detail?.demo){state.request++;state.payload=null;state.error='';clearTimer();}});
})(typeof window!=='undefined'?window:globalThis);
