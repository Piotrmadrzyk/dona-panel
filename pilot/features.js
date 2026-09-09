(function(){
'use strict';
const E=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const U=value=>{try{const u=new URL(String(value));return u.protocol==='https:'?u.href:'';}catch{return '';}};
const D=value=>{const url=U(value);try{return /^(drive|docs)\.google\.com$/i.test(new URL(url).hostname)?url:'';}catch{return '';}};
const Y=value=>{const url=U(value);try{return /^(?:www\.|m\.)?youtube\.com$|^youtu\.be$/i.test(new URL(url).hostname)?url:'';}catch{return '';}};
const PREVIEW_ROOT='assets/site-previews/';
const owned=[
 {id:'silverandglass',name:'Silver & Glass',url:'https://www.silverandglass.pl/',kind:'Strona marki',status:'Aktywna',preview:PREVIEW_ROOT+'silverandglass.webp',previewAlt:'Aktualny widok strony głównej Silver & Glass',copy:'Marka szkła i srebra; źródło materiałów do komunikacji Facebook.'},
 {id:'edwardjanusz',name:'Edward Janusz',url:'https://www.edwardjanusz.pl/',kind:'Strona marki',status:'Aktywna',preview:PREVIEW_ROOT+'edwardjanusz.webp',previewAlt:'Aktualny widok strony głównej Edward Janusz',copy:'Serwis poświęcony fotografowi Edwardowi Januszowi i zbiorom archiwalnym.'},
 {id:'probatum',name:'Probatum',url:'https://probatum.pl/',kind:'Serwis firmowy',status:'Aktywny',preview:PREVIEW_ROOT+'probatum.webp',previewAlt:'Aktualny widok strony głównej Probatum',copy:'Główna strona Probatum: marki, strony internetowe, marketing i automatyzacje.'},
 {id:'dona',name:'Panel DONA',url:'https://dona.probatum.pl/pilot/',kind:'System własny',status:'Aktywny',preview:PREVIEW_ROOT+'dona.webp',previewAlt:'Widok demonstracyjny Panelu DONA',copy:'Centrum dowodzenia, rozmów, decyzji i pracy agentów.'},
 {id:'receptury',name:'Receptury',url:'https://receptury-jade.vercel.app/',kind:'System własny',status:'Aktywny',preview:PREVIEW_ROOT+'receptury-biblioteka.webp',previewAlt:'Widok biblioteki systemu Receptury',copy:'Istniejący system receptur otwierany z poziomu panelu DONY.'}
];
const realizations=[
 {id:'zielona-pergola',name:'Zielona Pergola',url:'https://pergola-demo.probatum.pl/',kind:'Realizacja demonstracyjna',status:'Aktywna',preview:PREVIEW_ROOT+'zielona-pergola.webp',previewAlt:'Widok strony Zielona Pergola',copy:'Strona restauracji z ofertą, wydarzeniami i ścieżką zamówienia.'},
 {id:'kancelaria-zawadzcy',name:'Kancelaria Zawadzcy',url:'https://kancelaria-demo.probatum.pl/',kind:'Realizacja demonstracyjna',status:'Aktywna',preview:PREVIEW_ROOT+'kancelaria-zawadzcy.webp',previewAlt:'Widok strony Kancelaria Zawadzcy',copy:'Serwis kancelarii z obszarami praktyki, procesem i formularzem kontaktowym.'},
 {id:'alto-rooftop',name:'ALTO Rooftop',url:'https://probatum.pl/p/demo-alto-rooftop/',kind:'Realizacja demonstracyjna',status:'Aktywna',preview:PREVIEW_ROOT+'alto-rooftop.webp',previewAlt:'Widok strony ALTO Rooftop',copy:'Wizualny serwis restauracji i baru z rezerwacją oraz prezentacją oferty.'},
 {id:'dom-i-wnetrze',name:'Dom i Wnętrze',url:'https://remonty-demo.probatum.pl/',kind:'Realizacja demonstracyjna',status:'Aktywna',preview:PREVIEW_ROOT+'dom-i-wnetrze.webp',previewAlt:'Widok strony Dom i Wnętrze',copy:'Strona firmy remontowej z zakresem usług, realizacjami i bezpłatnym obmiarem.'},
 {id:'serwis-podkarpacki',name:'Serwis Podkarpacki',url:'https://warsztat-demo.probatum.pl/',kind:'Realizacja demonstracyjna',status:'Aktywna',preview:PREVIEW_ROOT+'serwis-podkarpacki.webp',previewAlt:'Widok strony Serwis Podkarpacki',copy:'Serwis warsztatu samochodowego z usługami, wyceną i rezerwacją wizyty.'},
 {id:'studio-lawenda',name:'Studio Lawenda',url:'https://lawenda-demo.probatum.pl/',kind:'Realizacja demonstracyjna',status:'Aktywna',preview:PREVIEW_ROOT+'studio-lawenda.webp',previewAlt:'Widok strony Studio Lawenda',copy:'Strona salonu urody z zabiegami, zespołem i wygodnym umawianiem wizyt.'},
 {id:'zamek-rzeszow',name:'Zamek w Rzeszowie',url:'https://probatum.pl/p/zamek-rzeszow-spacer-historyczny/wersje/w2/',kind:'Realizacja / podgląd',status:'Wersja robocza',preview:PREVIEW_ROOT+'zamek-rzeszow.webp',previewAlt:'Widok prezentacji Zamek w Rzeszowie',copy:'Rozbudowana prezentacja spaceru historycznego z materiałami terenowymi.'}
];
let snapshot=null,demo=false,busy=false,lastWeather='',lastMap='';
let featureSession=0,driveReading=false;
const youtubeState={url:'',phase:'idle',message:'',result:null};
const driveState={query:'',mode:'name',phase:'idle',message:'',results:[]};
function statusClass(phase){return 'feature-status'+(phase==='working'?' is-working':phase==='error'?' is-error':'');}
function paintYouTube(){
 const status=document.getElementById('youtubeStatus'),results=document.getElementById('youtubeResults'),form=document.getElementById('youtubeForm');
 if(!status||!results||!form)return;
 status.className=statusClass(youtubeState.phase);status.textContent=youtubeState.message;
 const input=document.getElementById('youtubeUrl');input.value=youtubeState.url;input.readOnly=youtubeState.phase==='working';
 const button=form.querySelector('button[type="submit"]');button.disabled=youtubeState.phase==='working';button.textContent=button.disabled?'Analiza trwa…':'Analizuj film';
 form.setAttribute('aria-busy',String(button.disabled));
 results.innerHTML=youtubeState.result?mediaCard(youtubeState.result):'';
}
function driveResultCard(file){const url=D(file.url),folder=file.type==='application/vnd.google-apps.folder';return '<article class="drive-result"><div><strong>'+E(file.name||file.id)+'</strong><small>'+E(folder?'Folder':file.type||'Plik Google Drive')+'</small></div><div class="command-actions">'+(url?'<a class="secondary" href="'+E(url)+'" target="_blank" rel="noopener noreferrer">Otwórz ↗</a>':'')+(!folder?'<button class="primary" data-drive-read="'+E(file.id)+'" data-drive-name="'+E(file.name||'Plik')+'">Podgląd tekstu</button>':'')+'</div></article>';}
function paintDrive(){
 const status=document.getElementById('driveStatus'),results=document.getElementById('driveResults'),form=document.getElementById('driveForm');
 if(!status||!results||!form)return;
 status.className=statusClass(driveState.phase);status.textContent=driveState.message;
 document.getElementById('driveQuery').value=driveState.query;document.getElementById('driveMode').value=driveState.mode;
 const button=form.querySelector('button[type="submit"]');button.disabled=driveState.phase==='working';button.textContent=button.disabled?'Szukam…':'Szukaj';
 form.setAttribute('aria-busy',String(button.disabled));results.innerHTML=driveState.results.map(driveResultCard).join('');
}
function refreshAfterWork(session){setTimeout(()=>{if(session===featureSession)window.dispatchEvent(new CustomEvent('dona:refresh'));},2500);}
function toolNotice(message){window.dispatchEvent(new CustomEvent('dona:notice',{detail:message}));}

const weatherCodes={0:'bezchmurnie',1:'przeważnie pogodnie',2:'częściowe zachmurzenie',3:'pochmurno',45:'mgła',48:'mgła osadzająca szadź',51:'lekka mżawka',53:'mżawka',55:'silna mżawka',56:'lekka marznąca mżawka',57:'silna marznąca mżawka',61:'lekki deszcz',63:'deszcz',65:'silny deszcz',66:'lekki marznący deszcz',67:'silny marznący deszcz',71:'lekki śnieg',73:'śnieg',75:'silny śnieg',77:'ziarna śnieżne',80:'lekkie przelotne opady',81:'przelotne opady',82:'gwałtowne opady',85:'lekkie przelotne opady śniegu',86:'silne przelotne opady śniegu',95:'burza',96:'burza z lekkim gradem',99:'burza z silnym gradem'};
const dialog=document.createElement('dialog');dialog.className='revision-dialog';dialog.setAttribute('aria-labelledby','revisionTitle');document.body.appendChild(dialog);
function siteCard(site){return '<article class="site-card"><div class="site-preview"><div class="browser-bar"><i></i><i></i><i></i><span>'+E(new URL(site.url).hostname)+'</span></div><img class="site-shot" src="'+E(site.preview)+'" alt="'+E(site.previewAlt)+'" loading="lazy" decoding="async"><span class="site-preview-kind">'+E(site.kind)+'</span></div><div class="site-body"><div class="site-meta"><span>'+E(site.kind)+'</span><span>'+E(site.status)+'</span></div><h3>'+E(site.name)+'</h3><p>'+E(site.copy)+'</p><div class="command-actions"><a class="secondary" href="'+E(site.url)+'" target="_blank" rel="noopener noreferrer">Otwórz ↗</a><button class="primary" data-site-edit="'+E(site.id)+'">Edytuj</button></div></div></article>';}
function mediaDate(value){if(!value)return 'Brak daty';const date=new Date(value);return Number.isNaN(+date)?'Brak daty':date.toLocaleString('pl-PL',{timeZone:'Europe/Warsaw',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function mediaStageLabel(key){return ({transcript:'Transkrypcja',transkrypcja:'Transkrypcja',summary:'Podsumowanie',podsumowanie:'Podsumowanie',mindMap:'Mapa myśli',mapa_mysli:'Mapa myśli',metadata:'Metadane',metadane:'Metadane',analysis:'Analiza',analiza:'Analiza',synthesis:'Synteza',synteza:'Synteza',drive:'Zapis na Dysku',zapis_drive:'Zapis na Dysku'})[key]||String(key).replaceAll('_',' ');}
function mediaStageState(value){if(value===true||/^(OK|SUCCESS|DONE|EXISTS|ISTNIEJE)$/i.test(String(value)))return 'ok';if(value===false||/^(FAILED|ERROR|BLAD|BŁĄD|BRAK)$/i.test(String(value)))return 'missing';if(/^(PARTIAL|CZESCIOWO|CZĘŚCIOWO)$/.test(String(value)))return 'partial';if(/^(SKIPPED|POMINIETO|NIE_URUCHOMIONO)$/.test(String(value)))return 'skipped';return 'pending';}
function mediaCard(record){
 const status=String(record&&record.status||'UNKNOWN').toUpperCase(),statusLabel=status==='SUCCESS'?'Kompletna':status==='FAILED'?'Nieudana':status==='PARTIAL'?'Częściowa':'Do sprawdzenia';
 const files=Array.isArray(record&&record.files)?record.files:[],folder=D(record&&record.folderUrl),source=Y(record&&record.sourceUrl||record&&record.source);
 const stages=Object.entries(record&&record.stages||{}),chars=Number(record&&record.transcriptCharacters)||0,coverage=Number(record&&record.coverage)||0;
 return '<article class="media-result media-result-'+E(status.toLowerCase())+'"><div class="media-result-head"><span class="media-folder-icon" aria-hidden="true">▰</span><div><span class="eyebrow">FOLDER ANALIZY · '+E(mediaDate(record&&record.processedAt))+'</span><h3>'+E(record&&record.title||'Analiza filmu')+'</h3></div><span class="media-result-status">'+E(statusLabel)+'</span></div>'+
  ((chars||coverage)?'<p class="media-result-meta">'+(coverage?'Pokrycie analizy: '+E(coverage)+'%':'')+(coverage&&chars?' · ':'')+(chars?'Transkrypcja: '+E(chars.toLocaleString('pl-PL'))+' znaków':'')+'</p>':'')+
  (stages.length?'<div class="media-stages">'+stages.map(([key,value])=>'<span title="'+E(({ok:'Potwierdzono',missing:'Brak lub błąd',partial:'Wynik częściowy',skipped:'Nie uruchamiano',pending:'Brak potwierdzenia'})[mediaStageState(value)])+'" class="'+mediaStageState(value)+'"><i aria-hidden="true">'+(mediaStageState(value)==='ok'?'✓':mediaStageState(value)==='missing'?'!':'…')+'</i>'+E(mediaStageLabel(key))+'</span>').join('')+'</div>':'')+
  '<div class="media-file-links">'+(folder?'<a class="primary" href="'+E(folder)+'" target="_blank" rel="noopener noreferrer">Otwórz folder w Google Drive ↗</a>':'')+files.map(file=>{const link=D(file&&file.url);return link?'<a class="secondary" href="'+E(link)+'" target="_blank" rel="noopener noreferrer">'+E(file.name||'Plik')+' ↗</a>':'';}).join('')+(source?'<a class="text-link" href="'+E(source)+'" target="_blank" rel="noopener noreferrer">Film źródłowy ↗</a>':'')+'</div></article>';
}
function mediaHistory(){
 const list=Array.isArray(snapshot&&snapshot.mediaAnalyses)?snapshot.mediaAnalyses.slice().sort((a,b)=>(+new Date(b.processedAt)||0)-(+new Date(a.processedAt)||0)):[];
 return '<section class="media-history"><div class="media-history-head"><div><span class="eyebrow">ZAPISANE WYNIKI · CAŁA PRZESTRZEŃ</span><h2>Foldery analiz</h2><p>Każda ukończona praca zostaje tutaj i na Twoim Google Drive — niezależnie od wybranej marki.</p></div><span class="media-history-count">'+list.length+'</span></div>'+(list.length?'<div class="media-history-grid">'+list.map(mediaCard).join('')+'</div>':'<div class="media-history-empty"><strong>Nie ma jeszcze potwierdzonego folderu.</strong><span>'+(snapshot?'Po pierwszej analizie pojawią się tu transkrypcja, podsumowanie, mapa myśli i metadane.':'Zaloguj się lub odśwież dane, aby wczytać historię analiz.')+'</span></div>')+'</section>';
}
function renderMarketing(){return '<div class="feature-hero"><span class="eyebrow">PORTFOLIO I ZARZĄDZANIE WWW</span><h2>Strony w jednym, wizualnym katalogu.</h2><p>Każda karta pokazuje prawdziwy widok strony — bez sztucznych makiet. „Edytuj” przekazuje uwagi agentowi WWW; agent przygotowuje poprawkę, ale nie publikuje jej bez osobnej zgody.</p></div><h2 class="site-section-title">Twoje strony i systemy</h2><div class="site-grid">'+owned.map(siteCard).join('')+'</div><h2 class="site-section-title">Realizacje i wersje robocze</h2><div class="site-grid">'+realizations.map(siteCard).join('')+'</div><div class="catalog-add"><div><strong>Brakuje strony albo realizacji?</strong><p>Przekaż adres DONIE. Najpierw zweryfikuje własność i status, a dopiero potem doda kartę do katalogu.</p></div><button class="secondary" data-catalog-add>Dodaj brakującą stronę</button></div>';}
function renderRecipes(){return '<div class="feature-hero"><span class="eyebrow">SYSTEM RECEPTURY</span><h2>Twój istniejący system — dostępny bezpośrednio z DONY.</h2><p>Nie budujemy Receptur drugi raz. Panel daje szybkie wejście do działającej aplikacji i pozwala omówić recepturę z DONĄ w osobnym wątku.</p><div class="command-actions"><a class="primary" href="https://receptury-jade.vercel.app/" target="_blank" rel="noopener noreferrer">Otwórz Receptury ↗</a><button class="secondary" data-recipe-chat>Omów z DONĄ</button></div></div><div class="feature-panel"><h2>Jak to działa</h2><p>Receptury pozostają niezależnym, zabezpieczonym systemem. Dzięki temu nie naruszamy jego logiki ani danych, a DONA może prowadzić osobną rozmowę dotyczącą receptur.</p></div>';}
function renderYouTube(){return '<div class="feature-hero"><span class="eyebrow">MEDIA INTELLIGENCE</span><h2>Wklej film. Odbierz transkrypcję, podsumowanie i mapę myśli.</h2><p>DONA korzysta z Twojej istniejącej „maszynki”. Wyniki zapisują się w Google Drive. Jedno kliknięcie uruchamia jedną analizę — panel nie ponawia jej automatycznie.</p></div><section class="feature-panel"><h2>Nowa analiza YouTube</h2><p>Wklej pełny adres filmu z YouTube.</p><form class="feature-form" id="youtubeForm"><input id="youtubeUrl" aria-label="Adres filmu YouTube" type="url" inputmode="url" required placeholder="https://www.youtube.com/watch?v=…"><button class="primary" type="submit">Analizuj film</button></form><div class="feature-status" id="youtubeStatus" role="status"></div><div class="feature-results" id="youtubeResults"></div><a class="text-link" href="#files">Sprawdź wszystkie zapisane foldery ↗</a></section>'+mediaHistory();}
function renderDrive(){return '<div class="feature-hero"><span class="eyebrow">TWÓJ GOOGLE DRIVE</span><h2>Znajdź dokument bez wychodzenia z panelu.</h2><p>Wyszukiwanie i podgląd tekstu są tylko do odczytu. Panel nie może usuwać, przenosić ani nadpisywać plików.</p></div><section class="feature-panel"><h2>Szukaj na Dysku</h2><form class="feature-form drive-form" id="driveForm"><input id="driveQuery" aria-label="Szukaj na Dysku" type="search" required maxlength="500" placeholder="np. umowa Probatum"><select id="driveMode" aria-label="Sposób wyszukiwania"><option value="name">Po nazwie</option><option value="content">W treści plików</option></select><button class="primary" type="submit">Szukaj</button></form><div class="feature-status" id="driveStatus" role="status"></div><div class="feature-results" id="driveResults"></div></section>';}
function renderWeather(){return '<div class="feature-hero weather-hero"><span class="eyebrow">POGODA Z LOKALIZACJĄ URZĄDZENIA</span><h2>Zapytaj DONĘ, zanim wyjdziesz.</h2><p>„Jaka pogoda?” może użyć bieżącej lokalizacji dopiero po Twojej zgodzie. Współrzędne nie są zapisywane; do prognozy wysyłana jest tylko przybliżona lokalizacja.</p><div class="command-actions"><button class="primary" type="button" data-weather-current>Sprawdź pogodę u mnie</button></div></div><section class="feature-panel"><h2>Prognoza dla miejscowości</h2><form class="feature-form" id="weatherForm"><input id="weatherPlace" type="search" required maxlength="120" autocomplete="address-level2" placeholder="np. Rzeszów"><button class="primary" type="submit">Sprawdź</button></form><div class="feature-status" id="weatherStatus" role="status"></div><div class="feature-results weather-results" id="weatherResults">'+lastWeather+'</div><p class="provider-note">Dane pogodowe: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>. Bezpłatne źródło użyte w pilotażu; przed komercyjnym SaaS-em wymaga właściwej licencji lub zamiany dostawcy.</p></section>';}
function renderMaps(){return '<div class="feature-hero maps-hero"><span class="eyebrow">MAPY I TRASY</span><h2>Pokaż miejsce. Wyznacz drogę.</h2><p>DONA może otworzyć ten widok na polecenie głosowe. Mapa w panelu korzysta z OpenStreetMap, a przycisk trasy otwiera Mapy Google bez płatnego API.</p><div class="command-actions"><button class="primary" type="button" data-map-current>Pokaż, gdzie jestem</button></div></div><section class="feature-panel"><h2>Znajdź miejsce lub cel trasy</h2><form class="feature-form" id="mapForm"><input id="mapQuery" type="search" required maxlength="180" placeholder="np. Zamek Lubomirskich w Rzeszowie"><button class="primary" type="submit">Pokaż na mapie</button></form><div class="feature-status" id="mapStatus" role="status"></div><div class="map-results" id="mapResults">'+lastMap+'</div><p class="provider-note">Mapa i geokodowanie: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>. Trasa otwiera się w Mapach Google.</p></section>';}
function render(view,data,isDemo){snapshot=data;demo=isDemo;const root=document.getElementById('viewContent');if(view==='marketing')root.innerHTML=renderMarketing();else if(view==='recipes')root.innerHTML=renderRecipes();else if(view==='youtube'){root.innerHTML=renderYouTube();paintYouTube();}else if(view==='drive'){root.innerHTML=renderDrive();paintDrive();}else if(view==='weather')root.innerHTML=renderWeather();else if(view==='maps')root.innerHTML=renderMaps();}
function openRevision(options){
 if(dialog.open)dialog.close();
 dialog.dataset.branchId=options.branchId||'system';dialog.dataset.branchName=options.branchName||'System';dialog.dataset.subject=options.subject||'materiał';
 if(options.dispatched){dialog.innerHTML='<div class="detail-top"><span class="eyebrow">DONA · KOREKTA W TOKU</span><button class="icon-button" data-revision-close aria-label="Zamknij">×</button></div><h2 id="revisionTitle">Poprawiam: '+E(options.subject||'materiał')+'</h2><p>Polecenie zostało już przekazane właściwemu agentowi. Poprawiona wersja wróci do skrzynki decyzji — bez automatycznej publikacji.</p><div class="revision-context">'+E(options.context||'')+'\n\nTwoje polecenie:\n'+E(options.prefill||'')+'</div><div class="actions"><button class="primary" type="button" data-revision-close>Zamknij i obserwuj wynik</button></div>';dialog.showModal();return;}
 dialog.innerHTML='<div class="detail-top"><span class="eyebrow">POPROŚ O ZMIANĘ</span><button class="icon-button" data-revision-close aria-label="Zamknij">×</button></div><h2 id="revisionTitle">Co mam poprawić?</h2><p>Twoja instrukcja trafi do właściwego agenta. Poprawiona wersja wróci do ponownego zatwierdzenia.</p><div class="revision-context">'+E(options.context||options.subject||'')+'</div><form id="revisionForm"><label>Opisz prostymi słowami, co zmienić<textarea id="revisionText" required maxlength="6000" placeholder="Np. skróć początek, zmień zdjęcie i dodaj informację o…">'+E(options.prefill||'')+'</textarea></label><p class="safety-note">Samo zlecenie poprawki nie publikuje, nie wysyła i nie zatwierdza materiału.</p><div class="actions"><button class="secondary" type="button" data-revision-close>Anuluj</button><button class="primary" type="submit">Przekaż do poprawy</button></div></form>';
 dialog.showModal();dialog.querySelector('textarea').focus();
}
async function submitRevision(form){
 if(busy)return;const note=dialog.querySelector('#revisionText').value.trim();if(!note)return;busy=true;const id=dialog.dataset.branchId,name=dialog.dataset.branchName,subject=dialog.dataset.subject,context=dialog.querySelector('.revision-context').textContent;
 dialog.close();
 const prompt='Zlecenie KOREKTY do materiału: '+subject+'\n\nObecny materiał / kontekst:\n'+context+'\n\nUwagi Piotra:\n'+note+'\n\nPrzygotuj poprawioną wersję i zwróć ją do skrzynki decyzji. Nie zatwierdzaj, nie publikuj, nie wysyłaj i nie wdrażaj bez osobnej zgody Piotra. Pokaż dokładnie, co zmieniono.';
 try{await window.Dona.runBranch(id,name,prompt);}finally{busy=false;}
}
function youtubeFailureMessage(error){
 const payload=error&&error.payload&&typeof error.payload==='object'?error.payload:{};
 const code=String((error&&error.code)||'');
 const message=String((error&&error.message)||'');
 const status=String(payload.status||'').toUpperCase();
 const safeDetail=String(payload.message||'').trim().slice(0,300);
 const safeCode=/^[a-z0-9_-]{1,64}$/i.test(String(payload.error||code))?String(payload.error||code):'';
 if(code==='auth'||message==='AUTH')return 'Sesja wygasła. Zaloguj się ponownie — analiza nie została uruchomiona drugi raz.';
 if(code==='invalid_youtube_url')return 'Nie rozpoznaję tego adresu YouTube. Wklej pełny link zaczynający się od https:// — niczego nie uruchomiłam ponownie.';
 if(Number(error&&error.status)===400)return safeDetail?'Panel odrzucił zlecenie: '+safeDetail+'. Analiza nie została ponowiona automatycznie.':safeCode?'Panel odrzucił zlecenie ('+safeCode+'). Analiza nie została ponowiona automatycznie.':'Panel odrzucił zlecenie z powodu błędu danych. Analiza nie została ponowiona automatycznie.';
 if(error&&error.name==='AbortError')return 'Analiza nie potwierdziła wyniku w wyznaczonym czasie. Mogła nadal pracować w n8n; sprawdź zapisane foldery przed ponowieniem.';
 if(code==='ai_payment_required')return 'Usługa AI zgłosiła brak środków. Sprawdź saldo oraz zapisane wyniki przed ponowieniem.';
 if(status==='FAILED'||Number(error&&error.status)>=500)return safeDetail?'Media Intelligence przerwało analizę: '+safeDetail+' Nie ponawiam jej automatycznie.':'Media Intelligence przerwało zadanie przed potwierdzeniem wyniku. Sprawdź zapisane foldery przed ponowieniem.';
 if(message==='INVALID_RESPONSE')return 'Nie otrzymałam poprawnej odpowiedzi z serwera. Sprawdź zapisane foldery przed ponowieniem.';
 if(error instanceof TypeError||/failed to fetch|networkerror|load failed/i.test(message))return 'Przeglądarka nie połączyła się z Media Intelligence. Analiza nie została potwierdzona ani ponowiona automatycznie.';
 return 'Nie potwierdzono wyniku analizy. Sprawdź zapisane foldery. Analiza nie została ponowiona automatycznie.';
}
async function analyzeYouTube(){
 const input=document.getElementById('youtubeUrl'),value=input?.value.trim();
 if(!value||youtubeState.phase==='working')return;
 youtubeState.url=value;
 if(demo){youtubeState.phase='error';youtubeState.message='Analiza działa po zalogowaniu.';paintYouTube();return;}
 const session=featureSession;
 Object.assign(youtubeState,{phase:'working',message:'Zlecenie wysłane. Czekam na wynik analizy. Możesz korzystać z innych zakładek panelu.',result:null});
 paintYouTube();
 try{
  const r=await window.Dona.request('dona-panel-tools',{operation:'youtube_analyze',url:value},900000);
  if(session!==featureSession)return;
  if(r.status==='PYTANIE'){youtubeState.phase='question';youtubeState.message=r.message||'Odpowiedz na pytanie w rozmowie z DONĄ.';return;}
  if(!r.ok&&r.status!=='PARTIAL'){const failure=Error(r.message||'ANALYSIS');failure.code=String(r.error||'ANALYSIS');failure.payload=r;throw failure;}
  const processedAt=r.processedAt||(r.reused?'':new Date().toISOString());
  youtubeState.result={...r,sourceUrl:r.source||value,processedAt};
  youtubeState.phase='done';youtubeState.message=r.message||'Analiza zakończona. Wyniki są dostępne w folderze.';
  if(!document.getElementById('youtubeForm'))toolNotice('Wynik analizy jest gotowy. Otwórz YouTube → wiedza lub Pliki.');
 }catch(error){
  if(session!==featureSession)return;
  youtubeState.phase='error';youtubeState.message=youtubeFailureMessage(error);
 }finally{
  if(session===featureSession){paintYouTube();refreshAfterWork(session);}
 }
}
function driveFailureMessage(error,action){
 if(error?.message==='AUTH')return 'Zaloguj się ponownie, aby korzystać z Dysku.';
 const code=error?.code||error?.payload?.error;
 if(code==='service_rate_limited')return 'Google Drive osiągnął chwilowy limit. Odczekaj chwilę i ponów odczyt.';
 if(code==='service_access_failed')return 'Połączenie z Google Drive wymaga sprawdzenia. Otwórz Połączenia.';
 if(code==='service_timeout'||error?.name==='AbortError')return 'Odczyt z Google Drive trwał zbyt długo. Możesz ponowić odczyt.';
 return action==='read'?'Nie udało się odczytać tekstu. Możesz otworzyć plik bezpośrednio na Dysku.':'Nie udało się pobrać wyników wyszukiwania. Sprawdź połączenie i ponów odczyt.';
}
async function searchDrive(){
 const query=document.getElementById('driveQuery')?.value.trim(),mode=document.getElementById('driveMode')?.value;
 if(!query||driveState.phase==='working')return;
 Object.assign(driveState,{query,mode,results:[]});
 if(demo){driveState.phase='error';driveState.message='Wyszukiwanie działa po zalogowaniu.';paintDrive();return;}
 const session=featureSession;
 driveState.phase='working';driveState.message='Szukam na Twoim Dysku…';paintDrive();
 try{
  const r=await window.Dona.request('dona-panel-tools',{operation:'drive_search',query,searchMode:mode},60000);
  if(session!==featureSession)return;
  if(!r.ok)throw Object.assign(Error('SEARCH'),{code:r.error});
  driveState.results=Array.isArray(r.results)?r.results:[];driveState.phase='done';
  driveState.message=driveState.results.length?'Znaleziono: '+driveState.results.length:'Nie znaleziono pasujących plików.';
 }catch(error){if(session!==featureSession)return;driveState.phase='error';driveState.message=driveFailureMessage(error,'search');}
 finally{if(session===featureSession)paintDrive();}
}
async function readDrive(button){
 if(driveReading||demo)return;
 const session=featureSession;driveReading=true;button.disabled=true;
 try{
  const r=await window.Dona.request('dona-panel-tools',{operation:'drive_read',fileId:button.dataset.driveRead},60000);
  if(session!==featureSession)return;
  if(!r.ok)throw Object.assign(Error('READ'),{code:r.error});
  if(!document.getElementById('driveForm'))return;
  if(dialog.open)dialog.close();
  dialog.innerHTML='<div class="detail-top"><span class="eyebrow">PODGLĄD Z DYSKU</span><button class="icon-button" data-revision-close aria-label="Zamknij">×</button></div><h2 id="revisionTitle">'+E(button.dataset.driveName)+'</h2><div class="drive-preview">'+E(r.text||'Ten plik nie zawiera tekstu dostępnego w podglądzie.')+'</div>';dialog.showModal();
 }catch(error){if(session!==featureSession)return;driveState.phase='error';driveState.message=driveFailureMessage(error,'read');paintDrive();}
 finally{if(session===featureSession){driveReading=false;button.disabled=false;}}
}
async function fetchJson(url,timeout){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout||16000);try{const response=await fetch(url,{signal:ctrl.signal,cache:'no-store',headers:{Accept:'application/json'}});if(!response.ok)throw Error('HTTP_'+response.status);return await response.json();}finally{clearTimeout(timer);}}
function currentPosition(){return new Promise((resolve,reject)=>{if(!window.isSecureContext||!navigator.geolocation){reject(Error('GEO_UNAVAILABLE'));return;}navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude}),e=>reject(Error(e.code===1?'GEO_DENIED':'GEO_FAILED')),{enableHighAccuracy:false,timeout:12000,maximumAge:300000});});}
function roundedPosition(position){return {latitude:Math.round(position.latitude*100)/100,longitude:Math.round(position.longitude*100)/100};}
async function reversePlace(position){try{const data=await fetchJson('https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=pl&zoom=10&lat='+encodeURIComponent(position.latitude)+'&lon='+encodeURIComponent(position.longitude),12000);const a=data.address||{};return a.city||a.town||a.village||a.municipality||a.county||'Twoja lokalizacja';}catch{return 'Twoja lokalizacja';}}
async function geocode(place){const open=await fetchJson('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(place)+'&count=1&language=pl&format=json',14000);const hit=open.results&&open.results[0];if(hit)return {latitude:Number(hit.latitude),longitude:Number(hit.longitude),label:[hit.name,hit.admin1,hit.country].filter(Boolean).join(', ')};const osm=await fetchJson('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=pl&q='+encodeURIComponent(place),14000);if(!osm[0])throw Error('PLACE_NOT_FOUND');return {latitude:Number(osm[0].lat),longitude:Number(osm[0].lon),label:osm[0].display_name||place};}
function weatherDescription(code){return weatherCodes[Number(code)]||'zmienne warunki';}
function weatherIcon(code){code=Number(code);if(code===0)return '☀️';if(code<=3)return '⛅';if(code===45||code===48)return '🌫️';if(code>=95)return '⛈️';if((code>=71&&code<=77)||code>=85)return '🌨️';return '🌧️';}
function plDate(value){return new Date(value+'T12:00:00').toLocaleDateString('pl-PL',{weekday:'short',day:'numeric',month:'short'});}
function buildWeather(data,label,period){
 const c=data.current||{},d=data.daily||{},units=data.current_units||{};let days=(d.time||[]).map((date,i)=>({date,code:d.weather_code&&d.weather_code[i],max:d.temperature_2m_max&&d.temperature_2m_max[i],min:d.temperature_2m_min&&d.temperature_2m_min[i],rain:d.precipitation_probability_max&&d.precipitation_probability_max[i]}));
 if(period==='weekend'){const saturday=days.findIndex(day=>new Date(day.date+'T12:00:00').getDay()===6);days=saturday>=0?days.slice(saturday,saturday+2):days.slice(0,2);}else days=days.slice(0,5);
 const current='Teraz w '+label+': '+Math.round(Number(c.temperature_2m))+'°C, odczuwalna '+Math.round(Number(c.apparent_temperature))+'°C, '+weatherDescription(c.weather_code)+', wiatr '+Math.round(Number(c.wind_speed_10m))+' '+(units.wind_speed_10m||'km/h')+'.';
 const forecast=days.map(day=>plDate(day.date)+': '+Math.round(Number(day.min))+'–'+Math.round(Number(day.max))+'°C, '+weatherDescription(day.code)+', ryzyko opadów '+Math.round(Number(day.rain)||0)+'%.').join(' ');
 const summary=period==='weekend'?'Prognoza na weekend — '+label+'. '+forecast:current+' Najbliższe dni: '+forecast;
 const html='<article class="weather-current"><div class="weather-symbol" aria-hidden="true">'+weatherIcon(c.weather_code)+'</div><div><span>'+E(label)+'</span><strong>'+Math.round(Number(c.temperature_2m))+'°</strong><p>Odczuwalna '+Math.round(Number(c.apparent_temperature))+'° · '+E(weatherDescription(c.weather_code))+' · wiatr '+Math.round(Number(c.wind_speed_10m))+' '+E(units.wind_speed_10m||'km/h')+'</p></div></article><div class="weather-days">'+days.map(day=>'<article><span>'+E(plDate(day.date))+'</span><b>'+weatherIcon(day.code)+' '+Math.round(Number(day.max))+'°</b><small>'+Math.round(Number(day.min))+'° · opady '+Math.round(Number(day.rain)||0)+'%</small></article>').join('')+'</div>';
 return {summary,html,label,period};
}
async function forecast(position,label,period){const p=roundedPosition(position);const url='https://api.open-meteo.com/v1/forecast?latitude='+encodeURIComponent(p.latitude)+'&longitude='+encodeURIComponent(p.longitude)+'&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=10';const data=await fetchJson(url,18000);return buildWeather(data,label,period);}
function weatherStatus(message,error){const node=document.getElementById('weatherStatus');if(node){node.className='feature-status'+(error?' is-error':'');node.textContent=message||'';}}
function showWeather(result){lastWeather=result.html;const root=document.getElementById('weatherResults');if(root)root.innerHTML=result.html;weatherStatus('Prognoza odświeżona. Lokalizacja nie została zapisana.');return result.summary;}
function geoMessage(error){return error&&error.message==='GEO_DENIED'?'Nie mam zgody na lokalizację. Zezwól stronie na dostęp albo wpisz miejscowość.':'Nie udało się pobrać lokalizacji urządzenia. Wpisz miejscowość ręcznie.';}
async function weatherForCurrentLocation(period){weatherStatus('Czekam na zgodę urządzenia i pobieram prognozę…');try{const exact=await currentPosition(),position=roundedPosition(exact),label=await reversePlace(position),result=await forecast(position,label,period||'current');return showWeather(result);}catch(error){weatherStatus(geoMessage(error),true);throw error;}}
async function weatherForPlace(place,period){place=String(place||'').trim();if(!place)throw Error('PLACE_REQUIRED');weatherStatus('Szukam miejscowości i pobieram prognozę…');try{const position=await geocode(place),result=await forecast(position,position.label,period||'current');return showWeather(result);}catch(error){weatherStatus(error.message==='PLACE_NOT_FOUND'?'Nie znalazłam tej miejscowości. Dopisz kraj lub województwo.':'Nie udało się teraz potwierdzić prognozy.',true);throw error;}}
function mapHtml(position,label,query){const p=roundedPosition(position),x=p.longitude,y=p.latitude,bbox=[x-.035,y-.022,x+.035,y+.022].join(','),googleSearch='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query||label||y+','+x),googleDirections='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(query||label||y+','+x);return '<article class="map-card"><iframe title="Mapa: '+E(label)+'" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" src="https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent(bbox)+'&layer=mapnik&marker='+encodeURIComponent(y+','+x)+'"></iframe><div class="map-card-foot"><div><span>Wybrane miejsce</span><strong>'+E(label)+'</strong></div><div class="command-actions"><a class="secondary" href="'+E(googleSearch)+'" target="_blank" rel="noopener noreferrer">Otwórz w Google Maps ↗</a><a class="primary" href="'+E(googleDirections)+'" target="_blank" rel="noopener noreferrer">Wyznacz trasę ↗</a></div></div></article>';}
function mapStatus(message,error){const node=document.getElementById('mapStatus');if(node){node.className='feature-status'+(error?' is-error':'');node.textContent=message||'';}}
function showMapResult(position,label,query){lastMap=mapHtml(position,label,query);const root=document.getElementById('mapResults');if(root)root.innerHTML=lastMap;mapStatus('Miejsce pokazane na mapie.');return 'Mapa pokazuje: '+label+'.';}
async function showMap(query){query=String(query||'').trim();if(!query)return '';mapStatus('Szukam miejsca…');try{const position=await geocode(query);return showMapResult(position,position.label,query);}catch(error){mapStatus('Nie znalazłam tego miejsca. Dopisz miejscowość lub kraj.',true);throw error;}}
async function mapCurrentLocation(){mapStatus('Czekam na zgodę urządzenia…');try{const exact=await currentPosition(),position=roundedPosition(exact),label=await reversePlace(position);return showMapResult(position,label);}catch(error){mapStatus(geoMessage(error),true);throw error;}}
document.addEventListener('input',event=>{if(event.target.id==='youtubeUrl'&&youtubeState.phase!=='working')youtubeState.url=event.target.value;if(event.target.id==='driveQuery')driveState.query=event.target.value;});
document.addEventListener('change',event=>{if(event.target.id==='driveMode')driveState.mode=event.target.value;});
window.addEventListener('dona:auth',event=>{
 if(event.detail?.authenticated||event.detail?.demo)return;
 featureSession++;snapshot=null;busy=false;driveReading=false;
 Object.assign(youtubeState,{url:'',phase:'idle',message:'',result:null});
 Object.assign(driveState,{query:'',mode:'name',phase:'idle',message:'',results:[]});
 if(dialog.open)dialog.close();dialog.innerHTML='';paintYouTube();paintDrive();
});
document.addEventListener('submit',e=>{if(e.target.id==='youtubeForm'){e.preventDefault();analyzeYouTube();}else if(e.target.id==='driveForm'){e.preventDefault();searchDrive();}else if(e.target.id==='weatherForm'){e.preventDefault();weatherForPlace(document.getElementById('weatherPlace').value,'current').catch(()=>{});}else if(e.target.id==='mapForm'){e.preventDefault();showMap(document.getElementById('mapQuery').value).catch(()=>{});}else if(e.target.id==='revisionForm'){e.preventDefault();submitRevision(e.target);}});
document.addEventListener('click',async e=>{const edit=e.target.closest('[data-site-edit]'),close=e.target.closest('[data-revision-close]'),read=e.target.closest('[data-drive-read]');if(close&&!busy)dialog.close();if(read)readDrive(read);if(edit){const site=[...owned,...realizations].find(x=>x.id===edit.dataset.siteEdit);if(site)openRevision({branchId:'www',branchName:'WWW',subject:site.name+' ('+site.url+')',context:site.copy+'\nStatus: '+site.status});}if(e.target.closest('[data-weather-current]'))weatherForCurrentLocation('current').catch(()=>{});if(e.target.closest('[data-map-current]'))mapCurrentLocation().catch(()=>{});if(e.target.closest('[data-catalog-add]'))window.Dona.draft('Chcę dodać brakującą stronę lub realizację do katalogu. Najpierw poproś mnie o adres, zweryfikuj własność i status; niczego nie publikuj ani nie wdrażaj.');if(e.target.closest('[data-recipe-chat]')){await window.Dona.newThread();window.Dona.draft('Chcę porozmawiać o systemie Receptury. Najpierw ustal, której receptury lub funkcji dotyczy temat; bez zmieniania danych.');}});
window.DonaFeatures={views:{recipes:'Receptury',youtube:'YouTube → wiedza',drive:'Dysk Google',weather:'Pogoda',maps:'Mapy i trasy',marketing:'Strony i realizacje'},descriptions:{recipes:'Twój istniejący system receptur.',youtube:'Transkrypcja, podsumowanie i mapa myśli z filmu.',drive:'Bezpieczne wyszukiwanie i odczyt plików z Google Drive.',weather:'Prognoza dla bieżącej lokalizacji lub wskazanej miejscowości.',maps:'Wyszukiwanie miejsc i uruchamianie tras bez płatnego API.',marketing:'Wizualny katalog wszystkich stron, systemów i realizacji.'},render,openRevision,weatherForCurrentLocation,weatherForPlace,showMap,mapCurrentLocation,mediaCard,sites:()=>[...owned,...realizations]};
})();
