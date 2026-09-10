(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const iconPaths = {
    headset: '<path d="M4 13a8 8 0 0 1 16 0"/><rect x="2" y="12" width="4" height="7" rx="2"/><rect x="18" y="12" width="4" height="7" rx="2"/><path d="M20 19a3 3 0 0 1-3 3h-3"/>',
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    file: '<path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a5 5 0 0 0-4-5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M12 14h2M7 18h2"/>',
    folder: '<path d="M3 7V5h6l2 2h10v13H3z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    'check-square': '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7 12 3 3 7-7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    history: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6M12 7v5l3 2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m10 3-1 3-3 1-3-1-1 4 3 2v2l-2 2 2 4 3-1 2 1 1 3h4l1-3 2-1 3 1 2-4-2-2v-2l2-2-2-4-3 1-3-1-1-3z"/>',
    logout: '<path d="M10 3H4v18h6M9 12h12m-4-4 4 4-4 4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    refresh: '<path d="M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5M4 17a9 9 0 0 0 15 2l3-3m0 5v-5h-5"/>',
    message: '<path d="M21 15a3 3 0 0 1-3 3H8l-5 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z"/><path d="M7 8h10M7 12h7"/>',
    chevrons: '<path d="m5 7 5 5-5 5m8-10 5 5-5 5"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1"/>',
    paperclip: '<path d="m8 12 7-7a4 4 0 0 1 6 6L10 22a6 6 0 0 1-8-8L13 3m-7 13 9-9a1.5 1.5 0 0 1 2 2l-9 9a1.5 1.5 0 0 1-2-2z"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
    search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18"/>',
    media: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>',
    wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-5 5h2"/>',
    pulse: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 10-8 10S4 17 4 12V6z"/><path d="m8 12 3 3 5-6"/>'
  };
  const icon = (name) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + (iconPaths[name] || iconPaths.file) + '</svg>';
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = (value) => { try { const u = new URL(String(value)); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
  const el = (tag, text, className) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; };
  const labels = {today:'Dzisiaj',mail:'Poczta',approvals:'Do zatwierdzenia',inquiries:'Zapytania',offers:'Oferty',clients:'Klienci',calendar:'Kalendarz',files:'Pliki',marketing:'Marketing i WWW',tools:'Wszystkie narzędzia',history:'Historia rozmowy',settings:'Ustawienia'};
  Object.assign(labels,window.DonaCentre.views,window.DonaCommand.views,window.DonaFeatures?.views||{},window.DonaLiveOps?.views||{},window.DonaSystems?.views||{});
  const descriptions = Object.assign({mail:'Wiadomości zapisane przez system DONY. Poproś ją o aktualny odczyt skrzynki lub przygotowanie odpowiedzi.',approvals:'Przejrzyj przygotowane materiały i zdecyduj o kolejnym kroku.',inquiries:'Zapytania zapisane przez Twoje formularze i procesy sprzedażowe.',offers:'Oferty, kwoty i aktualny etap pracy z klientem.',clients:'Historia kontaktu i następny krok dla każdej relacji.',calendar:'Spotkania z Zoho i wydarzenia zapisane przez Donę. Wybierz źródło oraz widok.',files:'Foldery analiz zapisane przez DONĘ na Google Drive oraz dokumenty zarejestrowane w systemie.',marketing:'Przygotuj treści, materiały i strony z narzędziami, które już masz.',tools:'Wybierz obszar, opisz zadanie i odbierz rezultat w rozmowie.',history:'Twoja dotychczasowa rozmowa z panelu — dostępna także tutaj.',settings:'Twoja przestrzeń, głos i połączenia z obecną DONĄ.'},window.DonaFeatures?.descriptions||{},window.DonaLiveOps?.descriptions||{},window.DonaSystems?.descriptions||{});
  const statusNames = {REQUESTED:'Czeka na decyzję',APPROVED:'Zatwierdzone',REJECTED:'Odrzucone',EXPIRED:'Wygasłe',DRAFT:'Szkic',SENT:'Wysłana',ACCEPTED:'Zaakceptowana',WON:'Wygrana',LOST:'Przegrana',NEW:'Nowe',NOWY:'Nowe',NOWA:'Nowa',QUALIFIED:'Zakwalifikowane',CONFIRMED:'Potwierdzone',CANCELLED:'Odwołane',CANCELED:'Odwołane',DONE:'Zakończone',COMPLETED:'Zakończone',SUCCESS:'Ukończone',PARTIAL:'Częściowe',UNKNOWN:'Do sprawdzenia',ACTIVE:'Aktywny',AKTYWNY:'Aktywny',OPEN:'Otwarte',TODO:'Do wykonania',DO_ZROBIENIA:'Do wykonania',IN_PROGRESS:'W trakcie',W_TRAKCIE:'W trakcie',WYSLANA:'Wysłana',GOTOWA:'Gotowa',ODPOWIEDZIAL:'Odpowiedział',SCHEDULED:'Zaplanowane',PENDING:'Oczekujące',ERROR:'Błąd',FAILED:'Błąd',NURTURING:'Dalszy kontakt'};
  const state = {view:'today',data:null,loading:false,error:'',filter:'',search:'',demo:window.Dona.isDemo,request:0};
  const fieldLabels = {name:'Nazwa',title:'Temat',sender:'Nadawca',account:'Konto pocztowe',snippet:'Podgląd',email:'E-mail',phone:'Telefon',status:'Status',amount:'Kwota netto',currency:'Waluta',createdAt:'Utworzono',date:'Termin',end:'Zakończenie',clientName:'Klient',nextAction:'Następny krok',nextActionAt:'Termin kontaktu',source:'Źródło',expiresAt:'Ważne do',type:'Rodzaj',description:'Opis',id:'Identyfikator',location:'Miejsce'};
  const done = (status) => /^(DONE|COMPLETED|CANCELLED|CANCELED|ZAKONCZONE|ZAKOŃCZONE|ANULOWANE|WYSLANA|SENT|EXECUTED|REJECTED|EXPIRED)$/i.test(status || '');
  const statusText = (s) => statusNames[String(s).toUpperCase()] || String(s || 'Brak statusu').replace(/_/g,' ').toLowerCase();
  const formatDate = (s, full) => { if (!s) return 'Brak terminu'; const d = new Date(s); return Number.isNaN(+d) ? String(s) : d.toLocaleString('pl-PL', {timeZone:'Europe/Warsaw',day:'numeric',month:'short',...(full ? {hour:'2-digit',minute:'2-digit'} : {})}); };
  const time = (s) => new Date(s).toLocaleTimeString('pl-PL', {timeZone:'Europe/Warsaw',hour:'2-digit',minute:'2-digit'});
  const dayKey = (s) => { const d = new Date(s); return Number.isNaN(+d) ? '' : d.toLocaleDateString('sv-SE',{timeZone:'Europe/Warsaw'}); };
  const badge = (s) => '<span class="status-badge '+(/^(REQUESTED|DRAFT|NEW|NOWY|PENDING)$/i.test(s)?'pending':/^(DONE|COMPLETED|APPROVED|ACCEPTED|CONFIRMED|WON)$/i.test(s)?'done':/^(ERROR|FAILED)$/i.test(s)?'problem':'')+'">'+escape(statusText(s))+'</span>';
  const money = (r) => { if(r.amount === null || r.amount === undefined || r.amount === '') return '—'; const n = Number(r.amount); if(!Number.isFinite(n))return '—'; try{return new Intl.NumberFormat('pl-PL',{style:'currency',currency:r.currency||'PLN',maximumFractionDigits:0}).format(n);}catch{return n.toLocaleString('pl-PL');} };
  const rows = (name) => window.DonaModel.rows(state.data,name,window.DonaCommand.brand());
  const pluralRules = new Intl.PluralRules('pl-PL');
  const plural = (n, one, few, many) => ({one, few, many}[pluralRules.select(n)] || many);
  const pending = () => rows('approvals').filter(r => r.status === 'REQUESTED' && (!r.expiresAt || +new Date(r.expiresAt) > Date.now()));
  const pendingTasks = () => rows('tasks').filter(r => !done(r.status)).sort((a,b) => (+new Date(a.date)||Infinity)-(+new Date(b.date)||Infinity));
  const futureMeetings = () => rows('meetings').filter(r => !/CANCEL/i.test(r.status) && +new Date(r.end||r.date) >= Date.now()).sort((a,b)=>+new Date(a.date)-+new Date(b.date));
  const heading = (title, link, count) => '<div class="section-head"><h2>'+escape(title)+(count===undefined?'':'<span class="count-pill">'+count+'</span>')+'</h2>'+(link?'<a class="link-button" href="#'+link+'">Zobacz wszystkie '+icon('arrow')+'</a>':'')+'</div>';
  const empty = (title, copy, name='folder', action) => '<div class="empty-state"><span>'+icon(name)+'</span><h3>'+escape(title)+'</h3><p>'+escape(copy)+'</p>'+(action?'<button class="secondary" data-prompt="'+escape(action)+'">Zapytaj DONĘ '+icon('arrow')+'</button>':'')+'</div>';
  const compact = (r, collection, name='file') => '<button class="compact-row" data-detail="'+collection+'" data-id="'+escape(r.id)+'"><span class="object-icon">'+icon(name)+'</span><span class="row-content"><span class="row-title">'+escape(r.title||r.name||r.id)+'</span><span class="row-subtitle">'+escape(r.clientName||r.description||statusText(r.status))+'</span></span><span class="row-arrow" aria-hidden="true">›</span></button>';
  function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,6500);}
  let chatReturnFocus=null;
  function openChat(){if(!$('app').classList.contains('chat-open'))chatReturnFocus=document.activeElement;$('app').classList.remove('chat-collapsed');$('app').classList.add('chat-open');document.body.classList.toggle('chat-modal-open',innerWidth<=1140);$('chatToggle').setAttribute('aria-expanded','true');}
  function closeChat(){$('assistant').classList.remove('threads-open');$('threadToggle').setAttribute('aria-expanded','false');$('app').classList.remove('chat-open');document.body.classList.remove('chat-modal-open');if(innerWidth>1140)$('app').classList.add('chat-collapsed');$('chatToggle').setAttribute('aria-expanded','false');const target=chatReturnFocus&&chatReturnFocus.isConnected&&chatReturnFocus.offsetParent!==null?chatReturnFocus:$('chatToggle');chatReturnFocus=null;target.focus();}
  function draft(text){openChat();window.Dona.draft(text);}
  function demoData(){
    const now=Date.now();const ago=m=>new Date(now-m*60000).toISOString();const later=m=>new Date(now+m*60000).toISOString();
    return {ok:true,generatedAt:new Date().toISOString(),context:{tenantId:'demo',name:'Przykładowa firma',userName:'Piotr',role:'OWNER'},approvals:[
      {id:'demo-approval-1',title:'Wycena projektu mieszkania',clientName:'Anna Kowalska',type:'Odpowiedź na zapytanie',status:'REQUESTED',description:'Przygotowana odpowiedź i lista informacji potrzebnych do wyceny.',preview:'Dzień dobry, Pani Anno. Dziękujemy za wiadomość. Chętnie przygotujemy ofertę projektu mieszkania. Prosimy o przesłanie rzutu i orientacyjnego terminu realizacji.',createdAt:ago(12),expiresAt:later(1440)},
      {id:'demo-approval-2',title:'Oferta dla Nowak Studio',clientName:'Nowak Studio',type:'Oferta',status:'REQUESTED',description:'Gotowa do sprawdzenia',preview:'Projekt wnętrza biura — zakres i harmonogram do zatwierdzenia.',createdAt:ago(45),expiresAt:later(1440)},
      {id:'demo-approval-3',title:'Przypomnienie o ofercie',clientName:'Pracownia Forma',type:'Dalszy kontakt',status:'REQUESTED',description:'Termin kontaktu: dzisiaj',preview:'Dzień dobry, czy mieli Państwo okazję zapoznać się z przesłaną ofertą?',createdAt:ago(80),expiresAt:later(1440)}
    ],leads:[{id:'demo-lead-1',name:'Anna Kowalska',title:'Projekt mieszkania · 68 m²',email:'anna@example.com',status:'NEW',source:'Formularz na stronie',createdAt:ago(30),description:'Projekt mieszkania, salon z kuchnią i dwie sypialnie.'},{id:'demo-lead-2',name:'Michał Nowak',title:'Aranżacja biura',email:'michal@example.com',status:'QUALIFIED',source:'E-mail',createdAt:ago(120),description:'Zapytanie o projekt biura i harmonogram.'},{id:'demo-lead-3',name:'Joanna Wiśniewska',title:'Konsultacja wnętrzarska',email:'joanna@example.com',status:'NEW',createdAt:ago(180),source:'Formularz na stronie'},{id:'demo-lead-4',name:'Pracownia Forma',title:'Projekt lokalu usługowego',email:'biuro@example.com',status:'NEW',createdAt:ago(230),source:'Polecenie'}],offers:[{id:'demo-offer-1',title:'Projekt biura — Nowak Studio',clientName:'Nowak Studio',amount:8900,currency:'PLN',status:'DRAFT',createdAt:ago(140),description:'Projekt funkcjonalny, wizualizacje i dokumentacja.'},{id:'demo-offer-2',title:'Projekt lokalu — Forma',clientName:'Pracownia Forma',amount:12500,currency:'PLN',status:'SENT',createdAt:ago(2800),description:'Projekt wnętrza lokalu usługowego.'}],clients:[{id:'demo-client-1',name:'Nowak Studio',email:'michal@example.com',status:'ACTIVE',nextAction:'Rozmowa o projekcie',nextActionAt:later(80)},{id:'demo-client-2',name:'Pracownia Forma',email:'biuro@example.com',status:'ACTIVE',nextAction:'Omówić przesłaną ofertę',nextActionAt:later(180)},{id:'demo-client-3',name:'Anna Kowalska',email:'anna@example.com',status:'NEW',nextAction:'Uzupełnić zakres projektu'}],meetings:[{id:'demo-meeting-1',title:'Rozmowa o projekcie',clientName:'Nowak Studio',date:later(80),end:later(110),status:'CONFIRMED',location:'Online'}],tasks:[{id:'demo-task-1',title:'Sprawdzić ofertę dla Nowak Studio',description:'Zakres i harmonogram projektu biura',date:later(60),status:'TODO'},{id:'demo-task-2',title:'Przypomnieć się w sprawie oferty',description:'Pracownia Forma',date:later(180),status:'TODO'}],files:[{id:'demo-file-1',title:'Oferta — projekt biura.pdf',type:'Oferta',status:'GOTOWA',createdAt:ago(140)},{id:'demo-file-2',title:'Brief projektu mieszkania.pdf',type:'Brief',status:'GOTOWA',createdAt:ago(200)}],mediaAnalyses:[{id:'demo-media-1',title:'Jak zamienić nagranie w wiedzę firmy',sourceUrl:'https://www.youtube.com/watch?v=aqz-KE-bpKQ',status:'SUCCESS',folderUrl:'',processedAt:ago(25),transcriptCharacters:18420,files:[],stages:{transcript:true,summary:true,mindMap:true,metadata:true}}],activity:[{id:'demo-event-1',title:'Uporządkowano nowe zapytania',date:ago(15)},{id:'demo-event-2',title:'Uzupełniono historię klienta',date:ago(40)}],meta:{truncated:[]}};
  }
  async function loadData(){
    if(state.loading)return;
    if(state.demo){
      const checkedAt=new Date().toISOString();
      state.data=Object.assign(demoData(),{memory:[{id:'demo-note',text:'Przykładowa zasada: publikujemy wyłącznie po zatwierdzeniu materiału.',type:'zasada',status:'ACTIVE',tags:'publikacja',source:'Dane demonstracyjne',updatedAt:checkedAt}],socialProfiles:[],socialPosts:[],connections:[{id:'demo-buffer',name:'Buffer · dwie strony Facebook',status:'DEMO',detail:'Przykładowy widok połączenia. Tryb demo nie odpytuje prawdziwego konta Buffer.',source:'Dane demonstracyjne'}]});
      state.data.approvals.forEach(a=>{a.canApprove=true;a.actionPayload={do:'klient@example.com',temat:a.title,tresc:a.preview,konto:'glowne'};});
      state.data.calendar={provider:'zoho',status:'CONFIGURED',calendars:[{id:'demo-zoho',name:'Przykładowy kalendarz Zoho',status:'READ_OK',checkedAt,events:state.data.meetings.map(m=>({...m,provider:'zoho',brandId:'probatum'}))}]};
      state.data.mails=[{id:'demo-mail',title:'Materiały do nowej strony',sender:'klient@example.com',account:'kontakt@probatum.pl',snippet:'Przykładowa wiadomość oczekująca na odpowiedź.',status:'NEW',brandId:'probatum',date:checkedAt},{id:'demo-mail-2',title:'Pytanie o wolny termin',sender:'inny.klient@example.com',account:'biuro@probatum.pl',snippet:'Przykładowa wiadomość z drugiej skrzynki.',status:'NEW',brandId:'probatum',date:checkedAt}];
      state.data.memory[0].brandId='probatum';
      state.data.socialProfiles=[
        {id:'silverandglass',name:'Silver & Glass',connection:'BUFFER_CONNECTED',bufferChannelId:'demo-silver',bufferCheckedAt:checkedAt,enabled:false,perDay:1,hour:10},
        {id:'edwardjanusz',name:'Edward Janusz · Dawny Rzeszów',connection:'BUFFER_CONNECTED',bufferChannelId:'demo-edward',bufferCheckedAt:checkedAt,enabled:false,perDay:1,hour:11}
      ];
      state.data.socialPosts=[
        {id:'demo-post-silver',title:'Światło zapisane w szkle',text:'Przykładowy szkic na podstawie materiału marki. Dokładna treść i zdjęcie czekają na Twoją decyzję.',image:new URL('./assets/site-previews/silverandglass.webp',location.href).href,source:'https://www.silverandglass.pl/',profileId:'silverandglass',brandId:'silverandglass',status:'DRAFT'},
        {id:'demo-post-edward',title:'Rzeszów, którego już nie ma',text:'Przykładowy szkic opowieści o dawnym Rzeszowie. Nic nie zostanie opublikowane w trybie demo.',image:new URL('./assets/site-previews/edwardjanusz.webp',location.href).href,source:'https://www.edwardjanusz.pl/',profileId:'edwardjanusz',brandId:'edwardjanusz',status:'DRAFT'}
      ];
      render();return;
    }
    if(!window.Dona.isAuthenticated())return;
    const request=++state.request;state.loading=true;state.error='';$('refreshBtn').disabled=true;render();
    try{const result=await window.Dona.request('dona-workspace',{operation:'snapshot'},45000);if(request!==state.request)return;if(result.ok!==true||!result.context||!Array.isArray(result.approvals))throw new Error('INVALID_RESPONSE');state.data=result;}
    catch(e){if(request!==state.request)return;state.error=e.message==='AUTH'?'Zaloguj się ponownie.':'Nie udało się pobrać danych. Rozmowa z DONĄ nadal korzysta z dotychczasowego połączenia.';}
    finally{if(request===state.request){state.loading=false;$('refreshBtn').disabled=false;render();}}
  }
  function navigate(){const name=location.hash.slice(1)||'dona';state.view=labels[name]?name:'today';state.search='';state.filter='';state.accountFilter='';$('app').classList.remove('nav-open');$('navScrim').hidden=true;$('menuToggle').setAttribute('aria-expanded','false');$('detailDialog').close();render();$('main').scrollTop=0;}
  function render(){
    document.getElementById("app").classList.toggle("in-presence",state.view==='dona');
    window.DonaLiveOps?.setActive?.(state.view==='operations',state.demo);
    const v=state.view;document.title='DONA — '+labels[v];$('breadcrumbTitle').textContent=labels[v];$('pageTitle').textContent=v==='today'?'Dzień dobry, Piotrze.':labels[v];$('pageEyebrow').textContent=v==='today'?new Date().toLocaleDateString('pl-PL',{timeZone:'Europe/Warsaw',weekday:'long',day:'numeric',month:'long'}).toUpperCase():'TWOJA PRZESTRZEŃ';
    $('pageSubtitle').textContent=v==='today'?(state.data?(pending().length?'Sprawdź przygotowane materiały i zaplanuj kolejny krok.':'Zobacz aktualne sprawy i wybierz, czym dziś zajmie się DONA.'):'Twoje sprawy w jednym miejscu.'):descriptions[v]||'Rozmowa, wiedza i potwierdzone wyniki Twojej Dony.';
    document.querySelectorAll('[data-view]').forEach(n=>{if(n.dataset.view===v)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});
    $('companyName').textContent=state.demo?'Podgląd demonstracyjny':window.DonaCommand.brandName();
    $('modeLabel').textContent=window.DonaTrace?.isWebinar?.()?(state.demo?'WEBINAR · DEMO':'WEBINAR · LIVE'):(state.demo?'DANE PRZYKŁADOWE':'PILOTAŻ');
    ['approvalCount','inquiryCount'].forEach((id,i)=>{$(id).hidden=!state.data;$(id).textContent=String(i?rows('leads').length:pending().length+rows('socialPosts').filter(p=>p.status==='DRAFT').length);});
    $('pageAction').innerHTML=v==='mail'?'<button class="primary" data-prompt="Sprawdź aktualną pocztę, wskaż pilne wiadomości i przygotuj odpowiedzi. Niczego nie wysyłaj bez mojego zatwierdzenia.">Sprawdź z DONĄ '+icon('arrow')+'</button>':v==='offers'?'<button class="primary" data-prompt="Pomóż mi przygotować nową ofertę. Najpierw ustal klienta, zakres i cennik. Bez wysyłania.">Nowa oferta '+icon('arrow')+'</button>':v==='clients'?'<button class="secondary" data-add-client>Dodaj klienta</button>':'';
    let banner=state.demo?'<div class="notice demo-bar">To podgląd na przykładowych danych. <a href="./">Zaloguj się do DONY →</a></div>':'';
    if(state.error)banner+='<div class="notice error">'+escape(state.error)+'<button class="link-button" data-refresh>Ponów odczyt</button></div>';
    if(v==='today'&&(state.data?.connections||[]).some(c=>c.status==='NOT_CONNECTED'))banner+='<div class="notice error">Nie wszystkie połączenia są gotowe. <a href="#connections">Sprawdź, co blokuje pracę Dony</a></div>';
    if(state.data?.meta?.truncated?.length)banner+='<div class="notice">Widok obejmuje najnowsze rekordy. Pełnego zakresu poszukaj z DONĄ.</div>';
    $('connectionBanner').innerHTML=banner;
    $('dataStamp').textContent=state.demo?'Dane demonstracyjne':state.data?'Ostatni odczyt: '+formatDate(state.data.generatedAt,true):'Brak potwierdzonego odczytu danych.';
    window.DonaCentre.setSnapshot(state.data);
    if(window.DonaCommand.views[v]){window.DonaCommand.render(v,state.data,state.demo);return;}
    if(window.DonaCentre.views[v]){const centreData=state.demo&&['dona','connections','social'].includes(v)?state.data:window.DonaCommand.scoped(state.data);window.DonaCentre.render(v,centreData,state.demo);return;}
    if(window.DonaLiveOps?.views?.[v]){window.DonaLiveOps.render(state.data,state.demo);return;}
    const independent=['tools','marketing','recipes','youtube','drive','weather','maps','settings','history'].includes(v);
    if(!state.data&&!independent){$('viewContent').innerHTML=state.loading?'<div class="skeleton hero" aria-label="Wczytywanie danych"></div><div class="skeleton"></div><div class="skeleton"></div>':empty('Dane czekają na połączenie','Odśwież widok, aby pobrać informacje z DONY. Możesz też rozpocząć rozmowę.','refresh','Sprawdź moje bieżące sprawy. Tylko odczyt, bez zmian.');return;}
    if(window.DonaSystems?.views?.[v])window.DonaSystems.render(v,state.data,state.demo);else if(window.DonaFeatures?.views?.[v])window.DonaFeatures.render(v,state.data,state.demo);else if(v==='today')renderToday();else if(v==='approvals')renderApprovals();else if(v==='tools')renderTools(v);else if(v==='files')renderFiles();else if(v==='settings')renderSettings();else if(v==='history')renderHistory();else renderList();
  }
  function approvalCard(r){return '<article class="approval-card"><div class="approval-head"><span class="object-icon">'+icon('mail')+'</span><div class="approval-content"><div class="card-meta"><span class="eyebrow">'+escape(r.type||'MATERIAŁ DO SPRAWDZENIA')+'</span><time>'+escape(formatDate(r.createdAt,true))+'</time></div><h3>'+escape(r.title)+'</h3><div class="card-person">'+escape(r.clientName||'Sprawa w systemie DONY')+'</div>'+(r.description?'<p class="card-copy">'+escape(r.description)+'</p>':'')+'<div class="draft-excerpt">'+escape(r.preview||'Otwórz szczegóły, aby zobaczyć przygotowany materiał.')+'</div><div class="card-actions"><button class="primary" data-detail="approvals" data-id="'+escape(r.id)+'">Sprawdź materiał '+icon('arrow')+'</button><button class="secondary" data-discuss="approvals" data-id="'+escape(r.id)+'">Omów z DONĄ</button></div></div></div></article>';}
  function renderToday(){
    const approvals=pending(),tasks=pendingTasks(),meetings=futureMeetings(),todayMeetings=meetings.filter(r=>dayKey(r.date)===dayKey(Date.now()));
    let html='<div class="metrics"><div class="metric">'+icon('mail')+'<span><b>'+rows('leads').length+'</b> '+plural(rows('leads').length,'zapytanie','zapytania','zapytań')+' w widoku</span></div><div class="metric">'+icon('file')+'<span><b>'+rows('offers').length+'</b> '+plural(rows('offers').length,'oferta','oferty','ofert')+' w widoku</span></div><div class="metric">'+icon('calendar')+'<span><b>'+todayMeetings.length+'</b> '+plural(todayMeetings.length,'spotkanie','spotkania','spotkań')+' dzisiaj</span></div></div>';
    html+=heading('Do zatwierdzenia','approvals',approvals.length);
    if(approvals.length){html+=approvalCard(approvals[0]);html+=approvals.slice(1,3).map(r=>compact(r,'approvals')).join('');}else html+=empty('Nic nie czeka na Twoją zgodę','Nowe prośby pojawią się tutaj, gdy DONA przygotuje działanie do zatwierdzenia.','check-square');
    html+='<div class="bottom-grid"><section><h2>Najbliższe sprawy</h2>'+(tasks.length?tasks.slice(0,3).map(r=>'<button class="compact-row" data-detail="tasks" data-id="'+escape(r.id)+'"><span class="row-content"><strong class="row-title">'+escape(r.title)+'</strong><span class="row-subtitle">'+escape(formatDate(r.date,true))+'</span></span><span class="row-arrow">›</span></button>').join(''):'<p class="small-empty">Brak otwartych zadań w odczytanych danych.</p>')+'</section><section><h2>Najbliższe spotkanie</h2>'+(meetings[0]?'<button class="meeting" data-detail="meetings" data-id="'+escape(meetings[0].id)+'"><span class="meeting-time">'+escape(time(meetings[0].date))+'</span><span><strong>'+escape(meetings[0].title)+'</strong><small>'+escape(formatDate(meetings[0].date))+' · '+escape(meetings[0].clientName||meetings[0].location||'Spotkanie')+'</small></span></button>':'<p class="small-empty">Nie ma nadchodzących spotkań zapisanych w tym widoku.</p>')+'<button class="link-button" data-prompt="Sprawdź mój kalendarz na dzisiaj i jutro. Tylko odczyt, bez tworzenia ani zmieniania wydarzeń.">Sprawdź kalendarz z DONĄ '+icon('arrow')+'</button></section></div>';
    if(rows('activity').length)html+=heading('Ostatnia aktywność')+rows('activity').slice(0,3).map(r=>'<div class="activity"><span class="check">'+icon('clock')+'</span><span>'+escape(r.title)+'<small>'+escape(formatDate(r.date,true))+'</small></span></div>').join('');
    $('viewContent').innerHTML=html;
  }
  function renderApprovals(){const list=pending();$('viewContent').innerHTML=list.length?list.map(approvalCard).join(''):empty('Wszystko przejrzane','Nie ma aktualnych próśb oczekujących na decyzję. Wygasłe i zakończone zgody nie są tu wyświetlane.','check-square');}
  function renderFiles(){
    const analyses=Array.isArray(state.data?.mediaAnalyses)?state.data.mediaAnalyses:[],documents=Array.isArray(state.data?.files)?state.data.files:[];
    let html='<div class="file-library-summary"><div><span class="eyebrow">TWOJA BIBLIOTEKA · CAŁA PRZESTRZEŃ</span><h2>Wyniki pracy i dokumenty</h2><p>Foldery analiz są wspólne dla Twojego konta, niezależnie od wybranej marki. „Dysk Google” służy do szukania wszystkich pozostałych plików.</p></div><div class="file-library-counts"><span><b>'+analyses.length+'</b> folderów analiz</span><span><b>'+documents.length+'</b> dokumentów w rejestrze</span></div></div>';
    html+=heading('Foldery analiz YouTube','youtube',analyses.length);
    html+=analyses.length?'<div class="media-history-grid">'+analyses.map(item=>window.DonaFeatures.mediaCard(item)).join('')+'</div>':empty('Nie ma jeszcze folderów analiz','Po analizie filmu DONA zapisze tutaj trwały odnośnik do folderu na Google Drive.','media');
    html+=heading('Dokumenty firmowe','drive',documents.length);
    html+=documents.length?'<div class="file-record-list">'+documents.map(r=>compact(r,'files','file')).join('')+'</div>':empty('Brak dokumentów przypisanych do przestrzeni','DONA może nadal wyszukać plik bezpośrednio na Dysku Google.','folder','Znajdź dokument na moim Dysku Google. Najpierw zapytaj, czego szukam; niczego nie zmieniaj.');
    $('viewContent').innerHTML=html;
  }
  function listConfig(){return {mail:{key:'mails',icon:'mail',empty:'Brak zapisanych wiadomości w tym widoku',prompt:'Sprawdź aktualną pocztę, wskaż pilne wiadomości i przygotuj odpowiedzi. Niczego nie wysyłaj bez mojej zgody.'},inquiries:{key:'leads',icon:'mail',empty:'Nie ma jeszcze zapisanych zapytań',prompt:'Sprawdź nowe zapytania od klientów w poczcie. Tylko odczyt, bez wysyłek ani zmian.'},offers:{key:'offers',icon:'file',empty:'Pierwsza oferta jest przed Tobą',prompt:'Pomóż przygotować ofertę dla klienta. Najpierw ustal zakres i właściwy cennik. Bez wysyłania.'},clients:{key:'clients',icon:'users',empty:'Nie ma klientów w odczytanych danych',prompt:'Sprawdź klientów w moim CRM. Tylko odczyt.'},calendar:{key:'meetings',icon:'calendar',empty:'Brak zapisanych spotkań',prompt:'Sprawdź mój kalendarz na najbliższe siedem dni. Tylko odczyt.'},files:{key:'files',icon:'folder',empty:'Nie ma zarejestrowanych dokumentów',prompt:'Pomóż mi znaleźć dokument na Dysku. Zapytaj, czego szukam; bez zmian w plikach.'}}[state.view];}
  function renderList(){
    const c=listConfig(),all=rows(c.key);if(!all.length){$('viewContent').innerHTML=empty(c.empty,'Jeśli informacje są w poczcie lub na Dysku, DONA może pomóc je odszukać.',c.icon,c.prompt);return;}
    const options=[...new Set(all.map(r=>r.status).filter(Boolean))];
    const accounts=[...new Set(all.map(r=>r.account).filter(Boolean))];
    const accountFilterHtml=accounts.length>1?'<select id="accountFilter" aria-label="Filtr konta"><option value="">Wszystkie konta</option>'+accounts.map(a=>'<option value="'+escape(a)+'"'+(a===state.accountFilter?' selected':'')+'>'+escape(a)+'</option>').join('')+'</select>':'';
    $('viewContent').innerHTML='<div class="toolbar"><label class="search-field">'+icon('search')+'<input id="recordSearch" type="search" placeholder="Szukaj w tym widoku…" aria-label="Szukaj w tym widoku" value="'+escape(state.search)+'"></label><select id="statusFilter" aria-label="Filtr statusu"><option value="">Wszystkie statusy</option>'+options.map(s=>'<option value="'+escape(s)+'"'+(s===state.filter?' selected':'')+'>'+escape(statusText(s))+'</option>').join('')+'</select>'+accountFilterHtml+'</div><div id="recordResults"></div>';
    $('recordSearch').addEventListener('input',e=>{state.search=e.target.value;renderRecords();});$('statusFilter').addEventListener('change',e=>{state.filter=e.target.value;renderRecords();});if($('accountFilter'))$('accountFilter').addEventListener('change',e=>{state.accountFilter=e.target.value;renderRecords();});renderRecords();
  }
  function renderRecords(){const c=listConfig();const q=state.search.toLocaleLowerCase('pl');const list=rows(c.key).filter(r=>(!state.filter||r.status===state.filter)&&(!state.accountFilter||r.account===state.accountFilter)&&(!q||[r.name,r.title,r.email,r.sender,r.account,r.snippet,r.clientName,r.description].filter(Boolean).join(' ').toLocaleLowerCase('pl').includes(q)));
    if(!list.length){$('recordResults').innerHTML=empty('Brak pasujących wyników','Zmień frazę lub wybierz inny status.','search');return;}
    const isOffers=c.key==='offers';$('recordResults').innerHTML='<div class="table-wrap"><table class="list-table"><thead><tr><th>'+(c.key==='clients'?'Klient':c.key==='leads'?'Zapytanie':c.key==='mails'?'Wiadomość':'Nazwa')+'</th><th>'+(isOffers?'Netto':'Status')+'</th><th>'+(isOffers?'Status':'Termin / data')+'</th><th><span class="sr-only">Szczegóły</span></th></tr></thead><tbody>'+list.map(r=>'<tr data-detail="'+c.key+'" data-id="'+escape(r.id)+'" tabindex="0" aria-label="Otwórz: '+escape(r.title||r.name||r.id)+'"><td><strong>'+escape(r.title||r.name||r.id)+'</strong><small>'+escape([r.sender||r.email||r.clientName||r.nextAction||r.type||'',r.account].filter(Boolean).join(' · '))+'</small></td><td>'+(isOffers?'<span class="amount">'+escape(money(r))+'</span>':badge(r.status))+'</td><td>'+(isOffers?badge(r.status):escape(formatDate(r.date||r.nextActionAt||r.createdAt)))+'</td><td class="row-arrow">›</td></tr>').join('')+'</tbody></table></div>';}
  const tools=[
    {id:'mail',name:'Poczta',icon:'mail',copy:'Przeglądaj wiadomości i przygotowuj odpowiedzi.'},
    {id:'sales',name:'Sprzedaż',icon:'chart',copy:'Oferty, szanse sprzedaży i kolejny kontakt.'},
    {id:'clients',name:'Klienci',icon:'users',copy:'Zbierz ustalenia i przygotuj się do spotkania.'},
    {id:'drive',name:'Dysk',icon:'folder',copy:'Szukaj dokumentów i pracuj z plikami.'},
    {id:'marketing',name:'Marketing',icon:'chart',copy:'Przygotowuj treści i plan komunikacji.'},
    {id:'www',name:'WWW',icon:'globe',copy:'Zlecaj strony i pracę nad kampaniami.'},
    {id:'media',name:'Media',icon:'media',copy:'Pracuj z nagraniami, filmami i grafikami.'},
    {id:'research',name:'Research',icon:'search',copy:'Zlecaj wyszukiwanie i analizę informacji.'},
    {id:'money',name:'Pieniądze',icon:'wallet',copy:'Sprawdzaj koszty i sprawy operacyjne.'},
    {id:'system',name:'System',icon:'settings',copy:'Sprawdzaj dostępne funkcje DONY.'},
    {id:'service',name:'Serwis',icon:'shield',copy:'Zlecaj diagnozę problemów technicznych.'}
  ];
  function toolVisual(id){const scenes={
    mail:'<span class="scene-kicker">SKRZYNKA</span><div class="scene-list"><i></i><i></i><i></i></div><b class="scene-badge">PRIORYTETY</b>',
    sales:'<span class="scene-kicker">PIPELINE</span><div class="scene-bars"><i></i><i></i><i></i><i></i><i></i></div><b class="scene-value">ETAPY</b>',
    clients:'<span class="scene-kicker">RELACJE</span><div class="scene-people"><i></i><i></i><i></i><i></i></div><span class="scene-link"></span>',
    drive:'<span class="scene-kicker">PLIKI</span><div class="scene-folder"><i></i><i></i><i></i></div><b class="scene-file">PDF</b>',
    marketing:'<span class="scene-kicker">PLAN TREŚCI</span><div class="scene-post"><i></i><span></span><span></span></div><b class="scene-date">PLAN</b>',
    www:'<span class="scene-kicker">PODGLĄD</span><div class="scene-browser"><i></i><b></b><span></span><span></span></div>',
    media:'<span class="scene-kicker">MEDIA</span><span class="scene-play">▶</span><div class="scene-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>',
    research:'<span class="scene-kicker">ŹRÓDŁA</span><div class="scene-search">⌕ <i></i></div><div class="scene-sources"><b>1</b><b>2</b><b>3</b></div>',
    money:'<span class="scene-kicker">KOSZTY</span><div class="scene-ring"></div><b class="scene-amount">PODGLĄD</b>',
    system:'<span class="scene-kicker">AGENTY</span><div class="scene-nodes"><i></i><i></i><i></i><i></i><span></span></div>',
    service:'<span class="scene-kicker">DIAGNOSTYKA</span><div class="scene-health"><i></i><i></i><i></i></div><b class="scene-ok">STATUS</b>'
  };return '<div class="tool-visual visual-'+id+'" aria-hidden="true">'+scenes[id]+'</div>';}
  function renderTools(v){$('viewContent').innerHTML='<div class="tool-grid">'+tools.filter(t=>v!=='marketing'||['marketing','www','media','research'].includes(t.id)).map(t=>'<article class="tool-card">'+toolVisual(t.id)+'<div class="tool-card-content"><div class="tool-card-title"><span class="object-icon">'+icon(t.icon)+'</span><h3>'+escape(t.name)+'</h3></div><p>'+escape(t.copy)+'</p><button class="secondary" data-tool="'+escape(t.name)+'">Zleć zadanie '+icon('arrow')+'</button></div></article>').join('')+'</div>';}
  function renderSettings(){ $('viewContent').innerHTML='<section class="settings-section"><h2>Twoja przestrzeń</h2><div class="setting-row"><span>Firma<small>'+escape(state.demo?'Przykładowa firma':state.data?.context?.name||'Probatum')+'</small></span><span class="status-badge">Pilotaż właściciela</span></div><div class="setting-row"><span>Dostęp<small>Logowanie jest zapamiętane w tej przeglądarce, jeśli wybrano „Zapamiętaj mnie na tym urządzeniu”. Przycisk Wyloguj usuwa zapis.</small></span><button class="secondary" data-logout>Wyloguj</button></div><div class="setting-row"><span>Dotychczasowy panel<small>Możesz wrócić do wcześniejszego interfejsu.</small></span><a class="secondary" href="../">Otwórz ↗</a></div></section><section class="settings-section"><h2>Rozmowa i głos</h2><div class="setting-row"><span>Odczytywanie odpowiedzi<small>Włącz lub wyłącz głos DONY.</small></span><button class="secondary" id="settingsVoice">'+escape($('voiceBtn').textContent)+'</button></div><div class="setting-row"><span>Tempo głosu<small>Ustawienie używane przez głos przeglądarki.</small></span><button class="secondary" id="settingsRate">'+escape($('rateBtn').textContent)+'</button></div><div class="setting-row"><span>Rozmowa na żywo<small>Korzysta z mikrofonu i dotychczasowej integracji głosowej. Rozliczana według użycia.</small></span><button class="secondary" data-live>Rozmawiaj</button></div></section><section class="settings-section"><h2>Co jest połączone</h2><p>Czat, historia, załączniki, pamięć i głos korzystają z istniejących połączeń DONY. Widoki biznesowe pobierają zapisane dane. Samo otwarcie widoku nie uruchamia agentów ani wysyłek.</p><p>To pilotaż Twojej przestrzeni. Konta kolejnych firm i abonamenty nie są jeszcze uruchomione.</p></section>';
    $('settingsVoice').onclick=()=>{$('voiceBtn').click();renderSettings();};$('settingsRate').onclick=()=>{$('rateBtn').click();renderSettings();};}
  function renderHistory(){const history=window.Dona.history();$('viewContent').innerHTML='<div class="toolbar"><button class="secondary" data-chat>Otwórz rozmowę '+icon('message')+'</button><button class="secondary" data-history-refresh>Wczytaj ponownie</button></div>'+(history.length?'<div class="history-list">'+history.map(r=>'<div class="msg '+(r.role==='user'?'me':'dona')+'"><small>'+(r.role==='user'?'TY':'DONA')+'</small>'+escape(r.text)+'</div>').join('')+'</div>':empty('Historia rozmowy','Po zalogowaniu pojawi się tutaj historia z Twojego obecnego panelu.','history'));}
  function discuss(collection,id){const list=collection==='files'?(state.data?.files||[]):rows(collection),r=list.find(x=>x.id===id);if(!r)return;draft('Sprawdź '+(collection==='approvals'?'prośbę o zatwierdzenie':collection==='offers'?'ofertę':'sprawę')+' o identyfikatorze '+r.id+' ('+(r.title||r.name||'')+'). Podsumuj aktualny stan i zaproponuj kolejny krok. Najpierw tylko odczyt — bez wysyłek i zmian.');}
  // datetime-local inputs read/write in the DEVICE'S local time (no manual timezone math needed - Piotr's phone is already Europe/Warsaw).
  const toLocalInputValue=s=>{const d=new Date(s);if(Number.isNaN(+d))return '';const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());};
  function ensureRescheduleDialog(){let dialog=$('rescheduleDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='rescheduleDialog';dialog.className='system-dialog';document.body.appendChild(dialog);dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});}return dialog;}
  function showReschedule(meeting){
    const dialog=ensureRescheduleDialog(),current=formatDate(meeting.date,true);
    dialog.innerHTML='<form method="dialog" id="rescheduleForm"><div class="system-dialog-head"><div><span>ZMIANA TERMINU</span><h2>'+escape(meeting.title)+'</h2><p>Obecny termin: '+escape(current)+'. DONA sprawdzi wydarzenie w Zoho i przygotuje plan zmiany — nic nie wykona się od razu, zmiana trafi do Skrzynki decyzji.</p></div><button type="button" class="icon-button" data-reschedule-close aria-label="Zamknij">×</button></div><div class="system-form-grid"><label><span>Nowy termin</span><input type="datetime-local" name="newDate" required value="'+escape(toLocalInputValue(meeting.date))+'"></label><label class="is-wide"><span>Powód zmiany (opcjonalnie)</span><textarea name="reason" maxlength="500" placeholder="Np. klient poprosił o przesunięcie"></textarea></label></div><div class="system-dialog-actions"><button type="button" class="secondary" data-reschedule-close>Anuluj</button><button type="submit" class="primary">Zaplanuj zmianę</button></div></form>';
    dialog.querySelectorAll('[data-reschedule-close]').forEach(b=>b.addEventListener('click',()=>dialog.close()));
    dialog.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault();
      const values=Object.fromEntries(new FormData(e.currentTarget).entries());
      const newDate=new Date(values.newDate);
      if(Number.isNaN(+newDate)){e.currentTarget.reportValidity();return;}
      dialog.close();
      const prompt='Zaplanuj zmianę terminu spotkania "'+meeting.title+'" (identyfikator w moim widoku: '+meeting.id+'). Obecny zapisany termin: '+current+'. Nowy termin: '+newDate.toLocaleString('pl-PL',{timeZone:'Europe/Warsaw',dateStyle:'long',timeStyle:'short'})+'.'+(values.reason?' Powód: '+values.reason+'.':'')+' Najpierw odczytaj wydarzenie w Zoho, żeby potwierdzić dokładny event_uid i etag, potem przygotuj plan zmiany terminu (plan_update) — NIE wykonuj zmiany automatycznie, ma trafić do Skrzynki decyzji do mojej zgody.';
      toast('DONA planuje zmianę terminu — wynik zobaczysz w Skrzynce decyzji i w rozmowie.');
      try{const result=await window.Dona.run(prompt);if(!result||result.ok===false)toast('Nie potwierdzono wyniku. Sprawdź rozmowę przed ponowieniem.');else if(state.view==='calendar'||state.view==='today')loadData();}
      catch(err){toast('Nie potwierdzono wyniku. Sprawdź rozmowę przed ponowieniem.');}
    });
    dialog.showModal();
  }
  function ensureMailDialog(){let dialog=$('mailActionDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='mailActionDialog';dialog.className='system-dialog';document.body.appendChild(dialog);dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});}return dialog;}
  function showMailReply(mail){
    const dialog=ensureMailDialog();
    dialog.innerHTML='<form method="dialog" id="mailReplyForm"><div class="system-dialog-head"><div><span>SZKIC ODPOWIEDZI</span><h2>'+escape(mail.title||mail.id)+'</h2><p>Od: '+escape(mail.sender||'nieznany nadawca')+'. DONA przygotuje szkic na podstawie historii wątku — nic nie zostanie wysłane, szkic wróci do zatwierdzenia w Skrzynce decyzji.</p></div><button type="button" class="icon-button" data-mail-dialog-close aria-label="Zamknij">×</button></div><div class="system-form-grid"><label class="is-wide"><span>Co ma się znaleźć w odpowiedzi (opcjonalnie)</span><textarea name="notes" maxlength="1500" placeholder="Np. potwierdź termin, zapytaj o cenę, podziękuj i zamknij temat"></textarea></label></div><div class="system-dialog-actions"><button type="button" class="secondary" data-mail-dialog-close>Anuluj</button><button type="submit" class="primary">Przygotuj szkic</button></div></form>';
    dialog.querySelectorAll('[data-mail-dialog-close]').forEach(b=>b.addEventListener('click',()=>dialog.close()));
    dialog.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault();
      const values=Object.fromEntries(new FormData(e.currentTarget).entries());
      dialog.close();
      const prompt='Przygotuj szkic odpowiedzi na wiadomość o identyfikatorze '+mail.id+' ("'+mail.title+'" od '+(mail.sender||'nieznanego nadawcy')+'), użyj narzędzia poczta z akcją draft.'+(values.notes?' Uwzględnij: '+values.notes+'.':'')+' To ma być tylko szkic do zatwierdzenia w Skrzynce decyzji — nie wysyłaj niczego.';
      toast('DONA przygotowuje szkic — wynik zobaczysz w Skrzynce decyzji i w rozmowie.');
      try{const result=await window.Dona.runBranch('poczta','Poczta',prompt);if(!result||result.ok===false)toast('Nie potwierdzono wyniku. Sprawdź rozmowę przed ponowieniem.');else if(state.view==='mail')loadData();}
      catch(err){toast('Nie potwierdzono wyniku. Sprawdź rozmowę przed ponowieniem.');}
    });
    dialog.showModal();
  }
  // "Zarchiwizuj" (single-message archive) was removed after a live test: the underlying
  // poczta tool's archiwizuj action operates on proposed PACKAGES, not one named message -
  // asking it to archive "exactly this one" instead archived 79 unrelated emails and even
  // missed the intended one. No safe single-message archive tool exists yet - do not re-add
  // this button until one does.
  function ensureClientDialog(){let dialog=$('addClientDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='addClientDialog';dialog.className='system-dialog';document.body.appendChild(dialog);dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});}return dialog;}
  function showAddClient(){
    const dialog=ensureClientDialog();
    dialog.innerHTML='<form method="dialog" id="addClientForm"><div class="system-dialog-head"><div><span>NOWY KLIENT</span><h2>Dodaj klienta do CRM</h2><p>DONA sprawdzi najpierw, czy klient z tym mailem lub telefonem już istnieje — jeśli tak, połączy się z nim zamiast tworzyć duplikat.</p></div><button type="button" class="icon-button" data-client-dialog-close aria-label="Zamknij">×</button></div><div class="system-form-grid"><label class="is-wide"><span>Imię i nazwisko lub nazwa</span><input name="nazwa" required maxlength="180" placeholder="Np. Anna Kowalska"></label><label><span>Typ</span><select name="typ"><option value="PERSON">Osoba prywatna</option><option value="COMPANY">Firma</option></select></label><label><span>Nazwa firmy (jeśli dotyczy)</span><input name="firma_nazwa" maxlength="180"></label><label><span>E-mail</span><input name="email" type="email" maxlength="180"></label><label><span>Telefon</span><input name="telefon" type="tel" maxlength="40"></label></div><p class="detail-note" style="padding:0 27px 10px">Podaj przynajmniej e-mail albo telefon — po tym DONA rozpozna, czy to nowa osoba.</p><div class="system-dialog-actions"><button type="button" class="secondary" data-client-dialog-close>Anuluj</button><button type="submit" class="primary">Dodaj klienta</button></div></form>';
    dialog.querySelectorAll('[data-client-dialog-close]').forEach(b=>b.addEventListener('click',()=>dialog.close()));
    dialog.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault();
      const values=Object.fromEntries(new FormData(e.currentTarget).entries());
      if(!values.email.trim()&&!values.telefon.trim()){toast('Podaj e-mail albo telefon — inaczej DONA nie rozpozna, czy klient już istnieje.');return;}
      dialog.close();
      const prompt='Dodaj nowego klienta do CRM (customer_ops, resolve_identity) — jeśli klient z tym mailem lub telefonem już istnieje, połącz się z nim zamiast zakładać duplikat. Nazwa: '+values.nazwa+'. Typ: '+(values.typ==='COMPANY'?'firma':'osoba prywatna')+'.'+(values.firma_nazwa.trim()?' Nazwa firmy: '+values.firma_nazwa+'.':'')+(values.email.trim()?' E-mail: '+values.email+'.':'')+(values.telefon.trim()?' Telefon: '+values.telefon+'.':'')+' Potwierdź krótko, czy to nowy klient, czy już istniejący.';
      toast('DONA dodaje klienta — potwierdzenie zobaczysz w rozmowie.');
      try{const result=await window.Dona.runBranch('klienci','Klienci',prompt);if(!result||result.ok===false)toast('Nie potwierdzono wyniku. Sprawdź rozmowę przed ponowieniem.');else if(state.view==='clients')loadData();}
      catch(err){toast('Nie potwierdzono wyniku. Sprawdź rozmowę przed ponowieniem.');}
    });
    dialog.showModal();
  }
  function showDetail(collection,id){
    const list=collection==='files'?(state.data?.files||[]):rows(collection),r=list.find(x=>x.id===id);if(!r)return;const dialog=$('detailDialog');dialog.dataset.collection=collection;dialog.dataset.id=id;
    $('detailType').textContent=({approvals:'DO ZATWIERDZENIA',leads:'ZAPYTANIE',offers:'OFERTA',clients:'KLIENT',tasks:'ZADANIE',meetings:'SPOTKANIE',files:'DOKUMENT',mails:'WIADOMOŚĆ'})[collection]||'SZCZEGÓŁY';$('detailTitle').textContent=r.title||r.name||r.id;
    const fields=Object.keys(fieldLabels).filter(k=>r[k]!==undefined&&r[k]!==null&&r[k]!==''&&!['title','name','description','id'].includes(k));
    $('detailBody').innerHTML='<dl class="detail-fields">'+fields.map(k=>'<dt>'+fieldLabels[k]+'</dt><dd>'+escape(k==='status'?statusText(r[k]):k==='amount'?money(r):/At$|^date$|^end$/.test(k)?formatDate(r[k],true):r[k])+'</dd>').join('')+'</dl>'+(r.preview||r.description?'<div class="detail-text">'+escape(r.preview||r.description)+'</div>':'')+(collection==='approvals'?'<p class="detail-note">Otwierasz podgląd prośby. Zatwierdzenie i wykonanie odbywa się przez dotychczasową obsługę zgód DONY.</p>':'');
    $('detailActions').replaceChildren();const link=safeUrl(r.url);if(link){const a=el('a','Otwórz dokument ↗','secondary');a.href=link;a.target='_blank';a.rel='noopener noreferrer';$('detailActions').append(a);}if(collection==='approvals'){const edit=el('button','Edytuj','secondary');edit.onclick=()=>{dialog.close();window.DonaCommand.revise('approval',id);};$('detailActions').append(edit);}if(collection==='meetings'&&r.date&&!/CANCEL/i.test(r.status)){const reschedule=el('button','Zmień termin','secondary');reschedule.onclick=()=>{dialog.close();showReschedule(r);};$('detailActions').append(reschedule);}if(collection==='mails'){const reply=el('button','Przygotuj odpowiedź','secondary');reply.onclick=()=>{dialog.close();showMailReply(r);};$('detailActions').append(reply);}const b=el('button','Omów z DONĄ','primary');b.onclick=()=>{dialog.close();discuss(collection,id);};$('detailActions').append(b);dialog.showModal();
  }
  document.querySelectorAll('[data-icon]').forEach(n=>n.innerHTML=icon(n.dataset.icon));
  $('loginForm').onsubmit=e=>{e.preventDefault();$('pwBtn').click();};
  $('menuToggle').onclick=()=>{const open=$('app').classList.toggle('nav-open');$('navScrim').hidden=!open;$('menuToggle').setAttribute('aria-expanded',String(open));};
  $('navScrim').onclick=()=>{$('app').classList.remove('nav-open');$('navScrim').hidden=true;$('menuToggle').setAttribute('aria-expanded','false');};
  $('chatToggle').onclick=()=>{openChat();$('inp').focus();};$('chatClose').onclick=closeChat;$('refreshBtn').onclick=()=>state.view==='operations'?window.DonaLiveOps.refresh():loadData();$('detailClose').onclick=()=>$('detailDialog').close();
  // A native <dialog> backdrop swallows every click behind it (including sidebar
  // navigation) - without this, the only way out is the close button.
  $('detailDialog').addEventListener('click',e=>{if(e.target===$('detailDialog'))$('detailDialog').close();});
  document.addEventListener('click',async e=>{const n=e.target.closest('[data-prompt],[data-tool],[data-detail],[data-discuss],[data-refresh],[data-chat],[data-live],[data-logout],[data-history-refresh],[data-add-client]');if(!n)return;
    if(n.hasAttribute('data-prompt'))draft(n.dataset.prompt);else if(n.hasAttribute('data-tool')){window.Dona.branch(n.dataset.tool);openChat();}else if(n.hasAttribute('data-detail'))showDetail(n.dataset.detail,n.dataset.id);else if(n.hasAttribute('data-discuss'))discuss(n.dataset.discuss,n.dataset.id);else if(n.hasAttribute('data-refresh'))loadData();else if(n.hasAttribute('data-chat'))openChat();else if(n.hasAttribute('data-live'))$('golive').click();else if(n.hasAttribute('data-logout')){if(state.demo)location.href='./';else window.Dona.logout();}else if(n.hasAttribute('data-history-refresh')){if(state.demo)toast('Historia jest dostępna po zalogowaniu.');else{await window.Dona.refreshHistory();renderHistory();}}else if(n.hasAttribute('data-add-client')){if(state.demo)toast('To podgląd na przykładowych danych. Dodawanie klientów jest dostępne po zalogowaniu.');else showAddClient();}});
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('tr[data-detail]'))e.target.click();if(e.key==='Escape'){if($('assistant').classList.contains('threads-open')){$('assistant').classList.remove('threads-open');$('threadToggle').setAttribute('aria-expanded','false');return;}if(innerWidth<=1140&&$('app').classList.contains('chat-open')){closeChat();return;}$('app').classList.remove('nav-open');$('navScrim').hidden=true;$('menuToggle').setAttribute('aria-expanded','false');}});
  function syncChatButton(){const visible=innerWidth>1140?!$('app').classList.contains('chat-collapsed'):$('app').classList.contains('chat-open');$('chatToggle').setAttribute('aria-expanded',String(visible));document.body.classList.toggle('chat-modal-open',innerWidth<=1140&&$('app').classList.contains('chat-open'));}
  window.addEventListener('resize',syncChatButton);syncChatButton();
  window.addEventListener('hashchange',navigate);
  window.addEventListener('dona:open-chat',openChat);
  window.addEventListener('dona:notice',e=>toast(e.detail));
  window.addEventListener('dona:panel-action',e=>{if(e.detail?.source==='voice'&&labels[e.detail.view])toast('DONA otworzyła: '+labels[e.detail.view]);});
  window.addEventListener('dona:message',()=>{$('assistant').classList.toggle('has-messages',window.Dona.history().length>0);if(state.view==='history')renderHistory();});
  window.addEventListener('dona:phase',e=>{$('assistantStatus').textContent=state.demo?'Podgląd interfejsu':/czekam|zlecenie|prac/i.test(e.detail||'')?'Czekam na wynik z systemu':'Rozmowa z DONĄ';});
  window.addEventListener('dona:refresh',loadData);
  window.addEventListener('dona:rerender',render);
  window.addEventListener('dona:auth',e=>{if(e.detail.authenticated||e.detail.demo)loadData();else{state.request++;state.data=null;state.loading=false;state.error='';$('refreshBtn').disabled=false;$('detailDialog').close();$('assistant').classList.remove('has-messages');render();}});
  const observer=new MutationObserver(()=>{$('assistant').classList.toggle('has-messages',$('log').children.length>0);if(state.view==='history')renderHistory();});observer.observe($('log'),{childList:true});
  navigate();if(state.demo){$('assistantStatus').textContent='Podgląd interfejsu';loadData();}else if(window.Dona.isAuthenticated())loadData();
})();
