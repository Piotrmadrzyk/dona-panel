(function(){
'use strict';
const root=document.getElementById('agentTrace'),button=document.getElementById('webinarBtn');if(!root)return;
const E=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const branchNames={poczta:'Agent Poczty',dysk:'Agent Dysku',sprzedaz:'Agent Sprzedaży',klienci:'Agent Klientów',marketing:'Agent Marketingu',www:'Agent WWW',media:'Agent Mediów',pieniadze:'Agent Finansów',system:'Agent Systemowy',serwis:'Agent Serwisowy',research:'Agent Research'};
let webinar=false,current=null,timers=[],hideTimer=null;
function plain(value){return String(value||'').toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function branchHint(detail){
 const label=String(detail.label||'');if(label.startsWith('Gałąź:'))return branchNames[label.slice(7).trim()]||'Agent specjalistyczny';
 const text=plain(detail.question),tests=[['marketing',/\b(facebook|fb|messenger|post|kampani)\w*\b/],['poczta',/\b(poczt|mail|wiadomosc)\w*\b/],['dysk',/\b(dysk|drive|plik|dokument)\w*\b/],['sprzedaz',/\b(sprzedaz|ofert|lead)\w*\b/],['klienci',/\b(klient|crm)\w*\b/],['marketing',/\bmarketing\w*\b/],['www',/\b(stron|www|serwis)\w*\b/],['media',/\b(youtube|film|transkrypcj|grafik)\w*\b/],['pieniadze',/\b(koszt|pieniadz|faktur|budzet)\w*\b/],['serwis',/\b(blad|usterk|napraw)\w*\b/],['research',/\b(research|sprawdz w internecie|poszukaj informacji)\b/]];
 for(const [key,test] of tests)if(test.test(text))return branchNames[key];return '';
}
function clearTimers(){timers.forEach(clearTimeout);timers=[];clearTimeout(hideTimer);}
function statusText(status){return status==='done'?'Gotowe':status==='active'?'Pracuje':status==='error'?'Problem':'Czeka';}
function render(){
 if(!current){if(webinar)renderIdle();else root.hidden=true;return;}
 root.hidden=false;const elapsed=current.finishedAt?((current.finishedAt-current.startedAt)/1000).toFixed(1)+' s':'na żywo';
 root.innerHTML='<header class="trace-head"><div><span class="trace-kicker"><i></i> '+(current.status==='done'?'POTWIERDZONY PRZEBIEG':'PRZEBIEG OPERACJI')+'</span><h2>DONA pracuje przez agentów</h2></div><div class="trace-meta"><span>'+E(elapsed)+'</span><button class="trace-close" type="button" aria-label="Ukryj przebieg">×</button></div></header><div class="trace-track">'+current.steps.map((step,index)=>'<article class="trace-step '+E(step.status)+'"><div class="trace-node"><span>'+E(String(index+1).padStart(2,'0'))+'</span><i></i></div><div class="trace-copy"><strong>'+E(step.label)+'</strong><small>'+E(step.detail||statusText(step.status))+'</small></div><em>'+E(statusText(step.status))+'</em></article>').join('')+'</div><footer class="trace-foot"><span>'+E(current.note||'Panel pokazuje statusy operacyjne, bez treści prywatnych i bez ukrytego rozumowania modelu.')+'</span><b>'+E(current.status==='error'?'NIEPOTWIERDZONY':current.status==='done'?'WYNIK POTWIERDZONY':'W TOKU')+'</b></footer>';
 root.querySelector('.trace-close').onclick=()=>{current=null;render();};
}
function renderIdle(){
 root.hidden=false;root.innerHTML='<header class="trace-head"><div><span class="trace-kicker"><i></i> TRYB WEBINAROWY</span><h2>Powiedz DONIE, co ma zrobić.</h2></div><div class="trace-meta"><span>gotowa</span><button class="trace-close" type="button" aria-label="Wyłącz tryb webinarowy">×</button></div></header><div class="trace-idle"><div class="trace-orb" aria-hidden="true"><i></i><i></i><i></i><b>D</b></div><div><strong>Najlepsza komenda na start</strong><p>„Dona, sprawdź pocztę i pokaż, co wymaga mojej decyzji.”</p><small>Gdy wydasz polecenie, tutaj zobaczysz potwierdzoną drogę przez system.</small></div></div><div class="webinar-scenarios"><button type="button" data-webinar-prompt="Dona, sprawdź najnowszą pocztę, pokaż co jest pilne i przygotuj odpowiedzi. Niczego nie wysyłaj bez mojej zgody.">Poczta i decyzje</button><button type="button" data-webinar-prompt="Dona, przygotuj mnie do najbliższego spotkania: sprawdź kalendarz, korespondencję, klienta i dokumenty. Jeśli miejsce jest znane, pokaż też pogodę i dojazd. Niczego nie zmieniaj ani nie wysyłaj.">Spotkanie 360°</button><button type="button" data-webinar-prompt="Dona, pokaż posty Facebook do decyzji i wskaż najważniejszy. Jeśli widzisz problem, zaproponuj edycję. Niczego nie publikuj.">Facebook z kontrolą</button></div>';
 root.querySelector('.trace-close').onclick=()=>setWebinar(false);
 root.querySelectorAll('[data-webinar-prompt]').forEach(item=>item.onclick=()=>{if(window.Dona){window.Dona.draft(item.dataset.webinarPrompt);item.textContent='Polecenie gotowe w czacie';}});
}
function start(detail){
 clearTimers();const hinted=branchHint(detail),steps=[{label:'Polecenie odebrane',detail:'Panel DONY',status:'done'},{label:'DONA analizuje zadanie',detail:'Orkiestrator',status:'active'}];
 if(hinted)steps.push({label:'Dyspozytor agentów',detail:'Dobiera właściwą gałąź',status:'waiting'},{label:hinted,detail:'Oczekiwanie na potwierdzenie',status:'waiting'});
 steps.push({label:'Wynik w panelu',detail:'Oczekuje',status:'waiting'});current={id:detail.id,startedAt:Date.now(),status:'running',steps};render();
 timers.push(setTimeout(()=>{if(!current||current.id!==detail.id)return;const active=current.steps.findIndex(s=>s.status==='active');if(active>=0)current.steps[active].status='done';const next=current.steps.findIndex(s=>s.status==='waiting');if(next>=0)current.steps[next].status='active';render();},650));
 timers.push(setTimeout(()=>{if(!current||current.id!==detail.id)return;const active=current.steps.findIndex(s=>s.status==='active');if(active>=0)current.steps[active].status='done';const next=current.steps.findIndex(s=>s.status==='waiting');if(next>=0)current.steps[next].status='active';render();},1450));
}
function finish(detail){
 if(!current||current.id!==detail.id)return;clearTimers();const safe=Array.isArray(detail.trace)?detail.trace.filter(step=>step&&typeof step.label==='string').slice(0,12).map(step=>({label:step.label.slice(0,80),detail:String(step.detail||'Potwierdzone wywołanie').slice(0,100),status:'done'})):[];
 if(safe.length)current.steps=safe;else if(String(detail.label||'').startsWith('Gałąź:'))current.steps.forEach(step=>{step.status='done';if(step.detail==='Oczekiwanie na potwierdzenie')step.detail='Wywołanie bezpośrednie';});else current.steps=[{label:'Polecenie odebrane',detail:'Panel DONY',status:'done'},{label:'DONA odpowiedziała',detail:'Brak szczegółowego śladu narzędzi',status:'done'},{label:'Wynik w panelu',detail:'Otrzymany',status:'done'}];
 current.finishedAt=Date.now();current.status=detail.status==='error'?'error':'done';if(current.status==='error'){const active=current.steps.findIndex(s=>s.status==='active');const failed=active>=0?active:current.steps.length-1;if(failed>=0)current.steps[failed].status='error';current.note='Nie potwierdzono końcowego wyniku. Panel nie ponawia zadania automatycznie.';}render();
 if(!webinar)hideTimer=setTimeout(()=>{current=null;render();},14000);
}
window.addEventListener('dona:operation',event=>{const detail=event.detail||{};if(detail.status==='pending')start(detail);else finish(detail);});
function setWebinar(enabled){webinar=!!enabled;document.body.classList.toggle('webinar-mode',webinar);if(button){button.setAttribute('aria-pressed',String(webinar));button.classList.toggle('is-on',webinar);button.querySelector('span:last-child').textContent=webinar?'Webinar: włączony':'Tryb webinarowy';}try{localStorage.setItem('dona_webinar',webinar?'on':'off');}catch{}render();}
if(button)button.onclick=()=>setWebinar(!webinar);
try{webinar=localStorage.getItem('dona_webinar')==='on';}catch{}setWebinar(webinar);
window.DonaTrace={setWebinar,isWebinar:()=>webinar};
})();
