(function(){
'use strict';
const root=document.getElementById('agentTrace'),button=document.getElementById('webinarBtn'),modeLabel=document.getElementById('modeLabel');if(!root)return;
const E=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const branchNames={poczta:'Agent Poczty',dysk:'Agent Dysku',sprzedaz:'Agent Sprzedaży',klienci:'Agent Klientów',marketing:'Agent Marketingu',www:'Agent WWW',media:'Agent Mediów',pieniadze:'Agent Finansów',system:'Agent Systemowy',serwis:'Agent Serwisowy',research:'Agent Research'};
const demos={
 mail:{title:'Poczta i decyzje',command:'Dona, sprawdź pocztę i pokaż, co wymaga mojej decyzji.',prompt:'Dona, sprawdź najnowszą pocztę, pokaż co jest pilne i przygotuj odpowiedzi. Niczego nie wysyłaj bez mojej zgody.',result:'3 wiadomości przejrzane · 2 wymagają decyzji',steps:[['DONA','Rozpoznaje intencję'],['Agent Poczty','Odczyt wiadomości'],['Agent Priorytetów','Porządkuje sprawy'],['Bramka decyzji','Blokuje wysyłkę'],['Panel','Pokazuje wynik']]},
 meeting:{title:'Spotkanie 360°',command:'Dona, przygotuj mnie do najbliższego spotkania.',prompt:'Dona, przygotuj mnie do najbliższego spotkania: sprawdź kalendarz, korespondencję, klienta i dokumenty. Jeśli miejsce jest znane, pokaż też pogodę i dojazd. Niczego nie zmieniaj ani nie wysyłaj.',result:'Brief spotkania zebrany z 4 źródeł',steps:[['DONA','Rozdziela zadanie'],['Zoho Calendar','Termin i uczestnicy'],['Agent Klientów','Historia relacji'],['Agent Dysku','Dokumenty i ustalenia'],['Panel','Składa brief']]},
 social:{title:'Facebook z kontrolą',command:'Dona, pokaż posty Facebook do decyzji.',prompt:'Dona, pokaż posty Facebook do decyzji i wskaż najważniejszy. Jeśli widzisz problem, zaproponuj edycję. Niczego nie publikuj.',result:'2 szkice gotowe do sprawdzenia · publikacja zablokowana',steps:[['DONA','Wybiera markę'],['Agent Marketingu','Sprawdza treść'],['Buffer','Przygotowuje kolejkę'],['Bramka publikacji','Czeka na zgodę'],['Panel','Pokazuje szkice']]}
};
let webinar=false,current=null,timers=[],hideTimer=null;
function isDemo(){return !!(window.Dona&&window.Dona.isDemo);}
function plain(value){return String(value||'').toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function branchHint(detail){
 const label=String(detail.label||'');if(label.startsWith('Gałąź:'))return branchNames[label.slice(7).trim()]||'Agent specjalistyczny';
 const text=plain(detail.question),tests=[['marketing',/\b(facebook|fb|messenger|post|kampani)\w*\b/],['poczta',/\b(poczt|mail|wiadomosc)\w*\b/],['dysk',/\b(dysk|drive|plik|dokument)\w*\b/],['sprzedaz',/\b(sprzedaz|ofert|lead)\w*\b/],['klienci',/\b(klient|crm)\w*\b/],['www',/\b(stron|www|serwis)\w*\b/],['media',/\b(youtube|film|transkrypcj|grafik)\w*\b/],['pieniadze',/\b(koszt|pieniadz|faktur|budzet)\w*\b/],['serwis',/\b(blad|usterk|napraw)\w*\b/],['research',/\b(research|sprawdz w internecie|poszukaj informacji)\b/]];
 for(const [key,test] of tests)if(test.test(text))return branchNames[key];return '';
}
function clearTimers(){timers.forEach(clearTimeout);timers=[];clearTimeout(hideTimer);}
function statusText(status){return status==='done'?'Gotowe':status==='active'?'Pracuje':status==='error'?'Wymaga uwagi':'Czeka';}
function progress(){if(!current||!current.steps.length)return 0;const done=current.steps.filter(step=>step.status==='done').length,active=current.steps.some(step=>step.status==='active')?0.55:0;return Math.min(100,Math.round((done+active)/current.steps.length*100));}
function sourceBadge(){if(current&&current.source==='demo')return '<span class="trace-source demo">SYMULACJA · DANE PRZYKŁADOWE</span>';if(current)return '<span class="trace-source live">OPERACJA NA ŻYWO</span>';return isDemo()?'<span class="trace-source demo">TRYB DEMO · NIC NIE URUCHOMIONO</span>':'<span class="trace-source ready">GOTOWA · NIC NIE URUCHOMIONO</span>';}
function proofCards(){
 const source=current?.source==='demo'?'Dane przykładowe':current?.status==='done'?'Ślad z n8n':'Bieżąca operacja';
 const control=current?.control||'Wysyłki i publikacje wymagają osobnej zgody.';
 const result=current?.result||(current?.status==='error'?'Nie potwierdzono wyniku':current?.status==='done'?'Wynik wrócił do rozmowy':'Czekam na potwierdzenie systemu');
 return '<aside class="trace-proof" aria-label="Dowody i zabezpieczenia"><div><span>ŹRÓDŁO</span><strong>'+E(source)+'</strong></div><div><span>KONTROLA</span><strong>'+E(control)+'</strong></div><div class="trace-result"><span>WYNIK</span><strong>'+E(result)+'</strong></div></aside>';
}
function stepsHtml(){return '<div><div class="trace-progress" aria-hidden="true"><i style="width:'+progress()+'%"></i></div><div class="trace-track">'+current.steps.map((step,index)=>'<article class="trace-step '+E(step.status)+'"><div class="trace-node"><span>'+E(String(index+1).padStart(2,'0'))+'</span><i></i></div><div class="trace-copy"><strong>'+E(step.label)+'</strong><small>'+E(step.detail||statusText(step.status))+'</small></div><em>'+E(statusText(step.status))+'</em></article>').join('')+'</div></div>';}
function render(){
 if(!current){if(webinar)renderIdle();else root.hidden=true;return;}
 root.hidden=false;const elapsed=current.finishedAt?((current.finishedAt-current.startedAt)/1000).toFixed(1)+' s':'na żywo',headline=current.status==='done'?'DONA ma potwierdzony wynik.':current.status==='error'?'DONA zatrzymała operację.':'DONA uruchomiła właściwy zespół.';
 root.innerHTML='<header class="trace-head"><div><span class="trace-kicker"><i></i> PRZEBIEG PRACY DONY</span><h2>'+E(headline)+'</h2></div><div class="trace-meta">'+sourceBadge()+'<span>'+E(elapsed)+'</span><button class="trace-close" type="button" aria-label="Ukryj przebieg">×</button></div></header><div class="trace-command"><div class="trace-orb" aria-hidden="true"><i></i><i></i><i></i><b>D</b></div><div><span>POLECENIE</span><p>'+E(current.command||'Polecenie z rozmowy')+'</p><small>'+E(current.title||'DONA koordynuje zadanie i pokazuje tylko bezpieczny ślad operacyjny.')+'</small></div><strong class="trace-percent">'+progress()+'%</strong></div><div class="trace-stage">'+stepsHtml()+proofCards()+'</div><footer class="trace-foot"><span>'+E(current.note||'To ślad operacyjny: pokazuje wywołane moduły i potwierdzenia, nie ukryte rozumowanie modelu ani prywatną treść.')+'</span><b>'+E(current.status==='error'?'ZATRZYMANO':current.status==='done'?'POTWIERDZONE':'W TOKU')+'</b></footer>';
 root.querySelector('.trace-close').onclick=()=>{current=null;render();};
}
function renderIdle(){
 root.hidden=false;root.innerHTML='<header class="trace-head"><div><span class="trace-kicker"><i></i> SCENA WEBINAROWA</span><h2>DONA czeka na Twoje polecenie.</h2></div><div class="trace-meta">'+sourceBadge()+'<button class="trace-close" type="button" aria-label="Wyłącz tryb webinarowy">×</button></div></header><div class="trace-idle"><div class="trace-orb trace-orb-large" aria-hidden="true"><i></i><i></i><i></i><b>D</b></div><div class="trace-idle-copy"><span>POWIEDZ LUB WPISZ</span><p>„Dona, sprawdź pocztę i pokaż, co wymaga mojej decyzji.”</p><small>Po wysłaniu zobaczysz agentów, źródła, zabezpieczenia i potwierdzony wynik — bez pokazywania prywatnej treści.</small></div><button class="trace-live-button" type="button" data-trace-live>Rozmawiaj na żywo <b>→</b></button></div><div class="webinar-scenarios">'+Object.entries(demos).map(([key,item])=>'<button type="button" data-webinar-scenario="'+key+'"><span>'+E(item.title)+'</span><small>'+E(item.result)+'</small><b>Uruchom podgląd →</b></button>').join('')+'</div>';
 root.querySelector('.trace-close').onclick=()=>setWebinar(false);
 root.querySelector('[data-trace-live]').onclick=()=>document.getElementById('liveTopBtn')?.click();
 root.querySelectorAll('[data-webinar-scenario]').forEach(item=>item.onclick=()=>selectScenario(item.dataset.webinarScenario));
}
function selectScenario(key){
 const scenario=demos[key];if(!scenario)return;
 if(window.Dona){window.Dona.draft(scenario.prompt);window.dispatchEvent(new CustomEvent('dona:open-chat'));}
 if(isDemo())runDemo(scenario);else{document.getElementById('inp')?.focus();const original=button.querySelector('span:last-child').textContent;button.querySelector('span:last-child').textContent='Polecenie czeka w czacie';timers.push(setTimeout(()=>{if(webinar)button.querySelector('span:last-child').textContent='Webinar: włączony';else button.querySelector('span:last-child').textContent=original;},2200));}
}
function runDemo(scenario){
 clearTimers();current={id:'demo-'+Date.now(),source:'demo',title:scenario.title,command:scenario.command,result:'Trwa symulacja…',control:'Żadna zewnętrzna operacja nie została wykonana.',startedAt:Date.now(),status:'running',steps:scenario.steps.map((step,index)=>({label:step[0],detail:step[1],status:index===0?'active':'waiting'}))};render();
 current.steps.forEach((step,index)=>{timers.push(setTimeout(()=>{if(!current||current.source!=='demo')return;current.steps.forEach((item,i)=>item.status=i<index?'done':i===index?'active':'waiting');render();},350+index*620));});
 timers.push(setTimeout(()=>{if(!current||current.source!=='demo')return;current.steps.forEach(step=>step.status='done');current.status='done';current.result=scenario.result;current.finishedAt=Date.now();current.note='Symulacja prezentuje sposób pracy interfejsu na danych przykładowych. Nie połączyła się z pocztą, kalendarzem ani Facebookiem.';render();},650+scenario.steps.length*620));
}
function start(detail){
 clearTimers();const hinted=branchHint(detail),steps=[{label:'DONA',detail:'Rozpoznaje intencję',status:'done'},{label:'Dyspozytor',detail:'Dobiera właściwe narzędzia',status:'active'}];
 if(hinted)steps.push({label:hinted,detail:'Oczekiwanie na potwierdzenie',status:'waiting'});steps.push({label:'Kontrola wyniku',detail:'Sprawdza status operacji',status:'waiting'},{label:'Panel',detail:'Oczekuje na wynik',status:'waiting'});
 current={id:detail.id,source:'live',title:hinted?hinted+' został uruchomiony':'Orkiestrator dobiera ścieżkę',command:String(detail.question||'Polecenie z rozmowy').slice(0,220),control:'Operacje zewnętrzne pozostają za bramką zgody.',startedAt:Date.now(),status:'running',steps};render();
 [720,1600,2600].forEach(delay=>timers.push(setTimeout(()=>{if(!current||current.id!==detail.id)return;const active=current.steps.findIndex(step=>step.status==='active');if(active>=0)current.steps[active].status='done';const next=current.steps.findIndex(step=>step.status==='waiting');if(next>=0)current.steps[next].status='active';render();},delay)));
}
function finish(detail){
 if(!current||current.id!==detail.id)return;clearTimers();const safe=Array.isArray(detail.trace)?detail.trace.filter(step=>step&&typeof step.label==='string').slice(0,10).map(step=>({label:step.label.slice(0,80),detail:String(step.detail||'Potwierdzone wywołanie').slice(0,100),status:'done'})):[];
 if(safe.length)current.steps=safe;else if(String(detail.label||'').startsWith('Gałąź:'))current.steps.forEach(step=>{step.status='done';if(step.detail==='Oczekiwanie na potwierdzenie')step.detail='Wywołanie bezpośrednie';});else current.steps=[{label:'Polecenie odebrane',detail:'Panel DONY',status:'done'},{label:'DONA odpowiedziała',detail:'Brak szczegółowego śladu narzędzi',status:'done'},{label:'Wynik w panelu',detail:'Otrzymany',status:'done'}];
 current.finishedAt=Date.now();current.status=detail.status==='error'?'error':'done';current.result=current.status==='error'?'Nie potwierdzono końcowego wyniku':'Odpowiedź i ślad wróciły do panelu';if(current.status==='error'){const active=current.steps.findIndex(step=>step.status==='active'),failed=active>=0?active:current.steps.length-1;if(failed>=0)current.steps[failed].status='error';current.note='DONA nie ponowiła operacji automatycznie. Najpierw trzeba sprawdzić stan, aby uniknąć podwójnego działania.';}render();
 if(!webinar)hideTimer=setTimeout(()=>{current=null;render();},14000);
}
window.addEventListener('dona:operation',event=>{const detail=event.detail||{};if(detail.status==='pending')start(detail);else finish(detail);});
function setWebinar(enabled){
 webinar=!!enabled;document.body.classList.toggle('webinar-mode',webinar);
 if(button){button.setAttribute('aria-pressed',String(webinar));button.classList.toggle('is-on',webinar);button.querySelector('span:last-child').textContent=webinar?'Webinar: włączony':'Tryb webinarowy';}
 if(modeLabel)modeLabel.textContent=webinar?(isDemo()?'WEBINAR · DEMO':'WEBINAR · LIVE'):(isDemo()?'DANE PRZYKŁADOWE':'PILOTAŻ');
 try{localStorage.setItem('dona_webinar',webinar?'on':'off');}catch{}render();
}
if(button)button.onclick=()=>setWebinar(!webinar);
try{webinar=localStorage.getItem('dona_webinar')==='on'||new URLSearchParams(location.search).get('webinar')==='1';}catch{}setWebinar(webinar);
window.DonaTrace={setWebinar,isWebinar:()=>webinar,runDemo:key=>{if(demos[key]){setWebinar(true);runDemo(demos[key]);}}};
})();
