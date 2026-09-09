(function (root) {
  'use strict';

  const views = {
    projects: 'Projekty i zadania',
    websites: 'Strony WWW',
    customer: 'Karta klienta',
    searchall: 'Szukaj wszędzie',
    documents: 'Centrum dokumentów',
    finance: 'Finanse i abonamenty',
    researchhub: 'Research i konkurencja',
    onboarding: 'Nowy klient'
  };

  const descriptions = {
    projects: 'Procesy, zadania, terminy i blokady w jednym widoku.',
    websites: 'Wszystkie strony, kampanie i wersje z bezpiecznym zlecaniem zmian.',
    customer: 'Pełny obraz relacji: ustalenia, dokumenty, spotkania i następne kroki.',
    searchall: 'Jedna wyszukiwarka klientów, dokumentów, wiedzy, projektów i researchu.',
    documents: 'Dokumenty, OCR, tabele, porównania wersji i generowanie nowych materiałów.',
    finance: 'Faktury, terminy płatności, abonamenty i wykorzystanie limitów.',
    researchhub: 'Zapisane analizy oraz obserwacje konkurencji z możliwością uruchomienia nowego badania.',
    onboarding: 'Wdrożenie klienta według gotowego planu, od briefu do pomiaru.'
  };

  const state = {
    view: '',
    data: null,
    demo: false,
    selectedCustomer: '',
    search: '',
    searchCategory: '',
    action: null
  };

  const byId = id => document.getElementById(id);
  const list = key => Array.isArray(state.data && state.data[key]) ? state.data[key] : [];
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeUrl = value => {
    try {
      const parsed = new URL(String(value || ''));
      return parsed.protocol === 'https:' ? parsed.href : '';
    } catch (error) {
      return '';
    }
  };
  const date = (value, full) => {
    if (!value) return 'Brak terminu';
    const parsed = new Date(value);
    if (Number.isNaN(+parsed)) return String(value);
    return parsed.toLocaleString('pl-PL', {
      timeZone: 'Europe/Warsaw',
      day: 'numeric',
      month: 'short',
      year: parsed.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: full ? '2-digit' : undefined,
      minute: full ? '2-digit' : undefined
    });
  };
  const done = value => /^(DONE|COMPLETED|CANCELLED|CANCELED|ANULOWANE|ZAKONCZONE|ZAKOŃCZONE|SENT|PAID|OPLACONA|OPŁACONA)$/i.test(value || '');
  const statusLabel = value => {
    const key = String(value || '').toUpperCase();
    return ({
      W_TOKU:'W toku', IN_PROGRESS:'W trakcie', W_TRAKCIE:'W trakcie', TODO:'Do wykonania',
      OVERDUE:'Po terminie', DONE:'Zakończone', COMPLETED:'Zakończone', ANULOWANE:'Anulowane',
      PRZERWANY:'Przerwany', ACTIVE:'Aktywny', AKTYWNA:'Aktywna', PUBLISHED:'Opublikowana',
      LIVE:'Online', DRAFT:'Szkic', REQUESTED:'Czeka na zgodę', APPROVED:'Zatwierdzone',
      PAID:'Opłacona', OPLACONA:'Opłacona', OPŁACONA:'Opłacona', UNPAID:'Nieopłacona',
      OPEN:'Otwarte', NEW:'Nowe', SUCCESS:'Gotowe', PARTIAL:'Częściowe', ERROR:'Błąd',
      FAILED:'Błąd', UNKNOWN:'Do sprawdzenia', CONFIGURED:'Skonfigurowane', ONBOARDING:'Wdrożenie'
    })[key] || String(value || 'Brak statusu').replace(/_/g, ' ').toLocaleLowerCase('pl');
  };
  const statusClass = value => {
    const key = String(value || '').toUpperCase();
    if (/ERROR|FAILED|OVERDUE|PRZERWANY/.test(key)) return 'is-danger';
    if (/DONE|COMPLETED|SUCCESS|PAID|OPLACONA|OPŁACONA|LIVE|PUBLISHED|APPROVED/.test(key)) return 'is-good';
    if (/REQUESTED|PENDING|DRAFT|NEW|TODO/.test(key)) return 'is-waiting';
    return '';
  };
  const badge = value => '<span class="system-badge ' + statusClass(value) + '">' + escape(statusLabel(value)) + '</span>';
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const money = (value, currency) => {
    if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return '—';
    try {
      return new Intl.NumberFormat('pl-PL', {style:'currency', currency:currency || 'PLN', maximumFractionDigits:2}).format(Number(value));
    } catch (error) {
      return String(value) + ' ' + (currency || '');
    }
  };
  const textMatch = (query, values) => values.filter(Boolean).join(' ').toLocaleLowerCase('pl').includes(query.toLocaleLowerCase('pl'));
  const short = (value, max) => {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    return normalized.length > max ? normalized.slice(0, max - 1) + '…' : normalized;
  };
  const brandRows = key => {
    const selected = root.DonaCommand && root.DonaCommand.brand ? root.DonaCommand.brand() : 'all';
    return list(key).filter(row => selected === 'all' || !row.brandId || row.brandId === selected);
  };
  const icon = name => {
    const paths = {
      plus:'<path d="M12 5v14M5 12h14"/>',
      arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
      check:'<path d="m5 12 4 4L19 6"/>',
      search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
      folder:'<path d="M3 7V5h6l2 2h10v12H3z"/>',
      globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-4 5-4 13 0 18 4-5 4-13 0-18"/>',
      user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      file:'<path d="M14 3H5v18h14V8zM14 3v5h5M8 13h8M8 17h5"/>',
      wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-5 5h2"/>',
      spark:'<path d="M12 3c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"/>',
      layers:'<path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
      external:'<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v7H4V6h7"/>',
      clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || paths.spark) + '</svg>';
  };
  const actionStatus = () => state.action && state.action.view === state.view ? '<div id="systemActionStatus" class="system-action-status ' + escape(state.action.kind) + '" role="status">' + escape(state.action.text) + '</div>' : '<div id="systemActionStatus" class="system-action-status" role="status" hidden></div>';
  const setActionStatus = (kind, text) => {
    state.action = {kind:kind, text:text, view:state.view};
    const node = byId('systemActionStatus');
    if (node) {
      node.hidden = false;
      node.className = 'system-action-status ' + kind;
      node.textContent = text;
    }
  };
  const primary = (label, action, extra) => '<button class="primary" data-system-action="' + escape(action) + '"' + (extra || '') + '>' + escape(label) + ' ' + icon('arrow') + '</button>';
  const secondary = (label, action, extra) => '<button class="secondary" data-system-action="' + escape(action) + '"' + (extra || '') + '>' + escape(label) + '</button>';
  const empty = (title, copy) => '<div class="system-empty"><span>' + icon('spark') + '</span><h3>' + escape(title) + '</h3><p>' + escape(copy) + '</p></div>';
  const stat = (label, value, detail, tone) => '<article class="system-stat ' + (tone || '') + '"><span>' + escape(label) + '</span><strong>' + escape(value) + '</strong><small>' + escape(detail || '') + '</small></article>';
  const hero = (kind, kicker, title, copy, actions, visual) => '<section class="system-hero system-hero--' + kind + '"><div class="system-hero-copy"><span class="system-kicker">' + escape(kicker) + '</span><h2>' + escape(title) + '</h2><p>' + escape(copy) + '</p><div class="system-hero-actions">' + (actions || '') + '</div></div><div class="system-hero-visual" aria-hidden="true">' + (visual || '<i></i><i></i><i></i><b>D</b>') + '</div></section>';

  function withDemo(data, demo) {
    if (!demo) return data || {};
    const now = Date.now();
    const later = days => new Date(now + days * 86400000).toISOString();
    const base = Object.assign({}, data || {});
    const defaults = {
      processes: [
        {id:'demo-process-1',title:'Nowa strona dla Nowak Studio',type:'strona-www',status:'W_TOKU',currentStep:'Makieta i treści do sprawdzenia',state:{settled:['Zakres i styl zaakceptowane'],waiting:['Akceptacja makiety'],blocked:[]},updatedAt:new Date().toISOString()},
        {id:'demo-process-2',title:'Kampania jesienna',type:'kampania',status:'W_TOKU',currentStep:'Przygotowanie mediaplanu',state:{settled:['Budżet ustalony'],waiting:[],blocked:['Brak finalnych zdjęć']},updatedAt:new Date(now-86400000).toISOString()}
      ],
      assets: [
        {id:'demo-site-1',title:'Nowak Studio — strona główna',type:'LANDING_PAGE',status:'PUBLISHED',publishStatus:'LIVE',approvalStatus:'APPROVED',previewUrl:'https://example.com',provider:'GITHUB_PAGES',version:3,createdAt:new Date().toISOString()},
        {id:'demo-site-2',title:'Kampania konsultacji',type:'LANDING_PAGE',status:'DRAFT',publishStatus:'DRAFT',approvalStatus:'REQUESTED',previewUrl:'https://example.com',provider:'GITHUB_PAGES',version:1,createdAt:new Date(now-86400000).toISOString()}
      ],
      campaigns: [{id:'demo-campaign-1',name:'Konsultacje jesienne',clientName:'Nowak Studio',type:'lead generation',status:'AKTYWNA',stage:'landing',nextAction:'Sprawdzić formularz',budget:2500,createdAt:new Date().toISOString()}],
      customerMemory: [{id:'demo-memory-1',customerId:'demo-client-1',clientName:'Nowak Studio',key:'preferowany_kontakt',value:'Krótkie podsumowanie e-mailem po każdym spotkaniu.',domain:'komunikacja',status:'ACTIVE',confidence:'HIGH',updatedAt:new Date().toISOString()}],
      nextActions: [{id:'demo-next-1',customerId:'demo-client-1',clientName:'Nowak Studio',title:'Omówić makietę strony',reason:'Klient czeka na wariant mobilny',status:'OPEN',date:later(2)}],
      invoices: [{id:'FV/09/2026/01',number:'FV/09/2026/01',clientName:'Nowak Studio',amount:4900,currency:'PLN',status:'UNPAID',dueAt:later(5),reminderCount:0}],
      subscriptions: [{id:'openai',name:'OpenAI',category:'AI',plan:'Team',amount:120,currency:'USD',billingPeriod:'miesięcznie',status:'ACTIVE',active:true,autoRenew:true,renewalDate:later(14)}],
      subscriptionUsage: [{id:'usage-openai',serviceId:'openai',metric:'Budżet miesięczny',used:42,total:100,remaining:58,remainingPercent:58,unit:'%',status:'OK',collectedAt:new Date().toISOString()}],
      researches: [{id:'demo-research-1',topic:'Rynek asystentów AI dla MŚP',summary:'Firmy szukają jednego miejsca do zadań, wiedzy i zatwierdzania działań agentów.',mode:'szybki',highConfidenceClaims:7,createdAt:new Date().toISOString()}],
      competitorObservations: [{id:'demo-watch-1',competitor:'Przykładowy konkurent',area:'oferta i ceny',summary:'Dodano nowy pakiet wdrożeniowy.',whatChanged:'Pojawił się abonament dla małych firm.',changed:true,weight:'ważna',date:new Date().toISOString()}],
      playbooks: [{id:'pb-demo',name:'AI Sales Office',sector:'b2b',readiness:86,active:true,tone:'Rzeczowy i konkretny.',defaultCta:'Umów 20 minut rozmowy',modules:['leady','oferty','dokumenty','faktury']}]
    };
    Object.keys(defaults).forEach(key => {
      if (!Array.isArray(base[key]) || !base[key].length) base[key] = defaults[key];
    });
    if (Array.isArray(base.tasks)) {
      base.tasks = base.tasks.map((task, index) => Object.assign({priority:index ? 'MEDIUM' : 'HIGH', owner:'Piotr', projectId:index ? '' : 'demo-process-1', clientId:index ? '' : 'demo-client-1', clientName:index ? '' : 'Nowak Studio'}, task));
    }
    return base;
  }

  function renderProjects() {
    const processes = brandRows('processes');
    const tasks = brandRows('tasks');
    const openTasks = tasks.filter(task => !done(task.status));
    const overdue = openTasks.filter(task => task.date && +new Date(task.date) < Date.now());
    const blocked = processes.filter(process => process.state && process.state.blocked && process.state.blocked.length);
    let html = hero('projects', 'SYSTEM 01 · DOWOŻENIE', 'Od procesu do konkretnego zadania', 'Widzisz, co jest w toku, na czym stoi praca i co wymaga Twojej decyzji.', primary('Dodaj zadanie', 'task-create') + secondary('Zapytaj o priorytety', 'project-priorities'),
      '<div class="hero-flow"><span>PROCES</span><i></i><span>ZADANIA</span><i></i><span>WYNIK</span></div>');
    html += actionStatus();
    html += '<div class="system-stats">' +
      stat('Procesy w toku', String(processes.filter(item => !done(item.status)).length), processes.length + ' wszystkich') +
      stat('Otwarte zadania', String(openTasks.length), overdue.length + ' po terminie', overdue.length ? 'warn' : '') +
      stat('Blokady', String(blocked.length), blocked.length ? 'wymagają uwagi' : 'brak zapisanych blokad', blocked.length ? 'danger' : 'good') +
      stat('Zakończone', String(tasks.filter(task => done(task.status)).length), 'zadania w odczycie') + '</div>';
    html += '<div class="system-layout system-layout--wide"><section class="system-panel"><div class="system-section-head"><div><span>AKTYWNE PROCESY</span><h3>Przebieg pracy</h3></div><b>' + processes.length + '</b></div>';
    html += processes.length ? '<div class="process-list">' + processes.map(process => {
      const waiting = process.state && process.state.waiting ? process.state.waiting : [];
      const processBlocked = process.state && process.state.blocked ? process.state.blocked : [];
      return '<article class="process-card"><div class="process-card-top"><div><small>' + escape(process.type || 'proces') + '</small><h4>' + escape(process.title) + '</h4></div>' + badge(process.status) + '</div><div class="process-step"><span>TERAZ</span><p>' + escape(process.currentStep || 'Brak zapisanego bieżącego kroku.') + '</p></div><div class="process-signals"><span class="' + (waiting.length ? 'waiting' : '') + '">' + waiting.length + ' oczekuje</span><span class="' + (processBlocked.length ? 'blocked' : '') + '">' + processBlocked.length + ' blokad</span><time>' + escape(date(process.updatedAt, true)) + '</time></div><button class="link-button" data-system-action="process-check" data-id="' + escape(process.id) + '">Sprawdź proces ' + icon('arrow') + '</button></article>';
    }).join('') + '</div>' : empty('Brak zapisanych procesów', 'Nowy proces pojawi się po uruchomieniu wieloetapowej pracy DONY.');
    html += '</section><section class="system-panel"><div class="system-section-head"><div><span>ZADANIA</span><h3>Najbliższe działania</h3></div><b>' + openTasks.length + '</b></div>';
    html += openTasks.length ? '<div class="task-list">' + openTasks.slice().sort((a,b) => (+new Date(a.date) || Infinity) - (+new Date(b.date) || Infinity)).map(task => {
      const isLate = task.date && +new Date(task.date) < Date.now();
      return '<article class="task-card ' + (isLate ? 'is-late' : '') + '"><div class="task-check">' + icon('check') + '</div><div><div class="task-meta"><span>' + escape(task.priority || 'bez priorytetu') + '</span><time>' + escape(date(task.date, true)) + '</time></div><h4>' + escape(task.title) + '</h4><p>' + escape(short(task.description, 180) || task.clientName || 'Bez dodatkowego opisu.') + '</p><small>' + escape([task.clientName, task.owner].filter(Boolean).join(' · ')) + '</small></div><button class="task-done" data-system-action="task-complete" data-id="' + escape(task.id) + '" data-title="' + escape(task.title) + '">Zamknij</button></article>';
    }).join('') + '</div>' : empty('Wszystko wykonane', 'Nie ma otwartych zadań w aktualnym odczycie.');
    html += '</section></div>';
    byId('viewContent').innerHTML = html;
  }

  function renderWebsites() {
    const sites = brandRows('assets').filter(asset => /PAGE|WEBSITE|LANDING|SITE/i.test(asset.type || ''));
    const campaigns = brandRows('campaigns');
    const live = sites.filter(site => /LIVE|PUBLISHED/i.test((site.publishStatus || '') + ' ' + (site.status || '')));
    const waiting = sites.filter(site => /REQUESTED|PENDING|DRAFT/i.test((site.approvalStatus || '') + ' ' + (site.publishStatus || '') + ' ' + (site.status || '')));
    let html = hero('websites', 'SYSTEM 02 · WWW', 'Strony pod kontrolą', 'Podglądaj każdą wersję, zlecaj poprawki i przygotowuj nowe strony. Publikacja nadal wymaga decyzji.', primary('Nowa strona', 'website-create') + secondary('Audyt strony', 'website-audit'),
      '<div class="hero-browser"><span></span><i></i><i></i><i></i><b>LIVE</b></div>');
    html += actionStatus();
    html += '<div class="system-stats">' + stat('Strony', String(sites.length), 'w rejestrze') + stat('Online', String(live.length), 'potwierdzony status', 'good') + stat('Do sprawdzenia', String(waiting.length), 'szkice i zgody', waiting.length ? 'warn' : '') + stat('Kampanie', String(campaigns.length), 'powiązane rekordy') + '</div>';
    html += '<div class="system-layout system-layout--sites"><section><div class="system-section-head"><div><span>KATALOG WWW</span><h3>Strony i landing pages</h3></div><b>' + sites.length + '</b></div>';
    html += sites.length ? '<div class="site-grid">' + sites.map(site => {
      const preview = safeUrl(site.previewUrl || site.sourceUrl);
      return '<article class="site-card"><div class="site-preview"><div class="site-browser-bar"><i></i><i></i><i></i><span>' + escape(site.provider || 'WWW') + '</span></div><div class="site-preview-body"><b>' + escape(short(site.title, 52)) + '</b><i></i><i></i><i></i></div></div><div class="site-card-body"><div class="site-card-meta">' + badge(site.publishStatus || site.status) + '<span>v' + escape(site.version || 1) + '</span></div><h4>' + escape(site.title) + '</h4><small>' + escape(site.campaignId || site.type || 'Strona WWW') + '</small><div class="site-actions">' + (preview ? '<a class="secondary" href="' + escape(preview) + '" target="_blank" rel="noopener noreferrer">Podgląd ' + icon('external') + '</a>' : '') + secondary('Zleć zmianę', 'website-change', ' data-id="' + escape(site.id) + '" data-title="' + escape(site.title) + '"') + '</div></div></article>';
    }).join('') + '</div>' : empty('Brak stron w rejestrze', 'Możesz zlecić pierwszą stronę z tego widoku.');
    html += '</section><aside class="system-panel campaign-panel"><div class="system-section-head"><div><span>KAMPANIE</span><h3>Powiązany ruch</h3></div></div>';
    html += campaigns.length ? campaigns.slice(0, 12).map(campaign => '<article class="campaign-row"><div><small>' + escape(campaign.type || 'kampania') + '</small><strong>' + escape(campaign.name) + '</strong><span>' + escape(campaign.clientName || campaign.nextAction || 'Bez przypisanego klienta') + '</span></div>' + badge(campaign.status || campaign.stage) + '</article>').join('') : '<p class="system-small-empty">Brak kampanii w odczycie.</p>';
    html += '</aside></div>';
    byId('viewContent').innerHTML = html;
  }

  function customerRelations(client) {
    const name = String(client && client.name || '').toLocaleLowerCase('pl');
    const id = client && client.id;
    return {
      memory: list('customerMemory').filter(item => item.customerId === id),
      actions: list('nextActions').filter(item => item.customerId === id),
      tasks: list('tasks').filter(item => item.clientId === id || (name && String(item.clientName || '').toLocaleLowerCase('pl') === name)),
      offers: list('offers').filter(item => name && String(item.clientName || '').toLocaleLowerCase('pl') === name),
      meetings: list('meetings').filter(item => name && String(item.clientName || '').toLocaleLowerCase('pl') === name),
      files: list('files').filter(item => name && String(item.clientName || '').toLocaleLowerCase('pl') === name)
    };
  }

  function renderCustomer() {
    const clients = brandRows('clients');
    if (!state.selectedCustomer || !clients.some(item => item.id === state.selectedCustomer)) state.selectedCustomer = clients[0] && clients[0].id || '';
    const client = clients.find(item => item.id === state.selectedCustomer);
    let html = hero('customer', 'SYSTEM 03 · CRM', 'Jedna karta, cała relacja', 'Ustalenia, kontakt, dokumenty i następny krok są zebrane wokół właściwego klienta.', primary('Brief przed rozmową', 'customer-brief') + secondary('Dodaj następny krok', 'customer-next'),
      '<div class="hero-person"><i></i><span></span><span></span><span></span><b>360°</b></div>');
    html += actionStatus();
    if (!client) {
      html += empty('Brak klientów', 'Dodaj pierwszego klienta przez moduł wdrożenia.');
      byId('viewContent').innerHTML = html;
      return;
    }
    const rel = customerRelations(client);
    const openActions = rel.actions.filter(item => !done(item.status));
    const options = clients.map(item => '<option value="' + escape(item.id) + '"' + (item.id === client.id ? ' selected' : '') + '>' + escape(item.name) + '</option>').join('');
    html += '<div class="customer-picker"><label for="systemCustomerSelect">Klient</label><select id="systemCustomerSelect">' + options + '</select><span>' + clients.length + ' w bazie</span></div>';
    html += '<section class="customer-head-card"><div class="customer-monogram">' + escape((client.name || '?').split(/\s+/).slice(0,2).map(word => word[0]).join('').toUpperCase()) + '</div><div class="customer-identity"><span>KARTA KLIENTA</span><h3>' + escape(client.name) + '</h3><p>' + escape([client.email, client.phone].filter(Boolean).join(' · ') || 'Brak zapisanych danych kontaktowych') + '</p></div><div class="customer-status">' + badge(client.status || client.lifecycle) + '<small>Opiekun: ' + escape(client.owner || 'nieprzypisany') + '</small></div></section>';
    html += '<div class="customer-next-strip"><div><span>NASTĘPNY KROK</span><strong>' + escape(client.nextAction || (openActions[0] && openActions[0].title) || 'Nie zapisano następnego kroku') + '</strong></div><time>' + escape(date(client.nextActionAt || (openActions[0] && openActions[0].date), true)) + '</time></div>';
    html += '<div class="system-stats">' + stat('Ustalenia', String(rel.memory.length), 'aktywnych wpisów') + stat('Otwarte działania', String(openActions.length), 'dla tego klienta') + stat('Oferty', String(rel.offers.length), 'w historii') + stat('Dokumenty', String(rel.files.length), 'powiązane') + '</div>';
    html += '<div class="customer-grid"><section class="system-panel"><div class="system-section-head"><div><span>PAMIĘĆ RELACJI</span><h3>Co DONA wie</h3></div></div>' + (rel.memory.length ? rel.memory.slice(0, 12).map(item => '<article class="memory-row"><span>' + escape(item.domain || item.kind || 'ustalenie') + '</span><strong>' + escape(item.key || 'Informacja') + '</strong><p>' + escape(item.value) + '</p><small>' + escape(item.confidence ? 'Pewność: ' + item.confidence : date(item.updatedAt, true)) + '</small></article>').join('') : '<p class="system-small-empty">Nie ma jeszcze zapisanych ustaleń dla tego klienta.</p>') + '</section>';
    html += '<section class="system-panel"><div class="system-section-head"><div><span>AKTYWNOŚĆ</span><h3>Sprawy klienta</h3></div></div><div class="relation-tabs">' +
      relationGroup('Działania', rel.actions, item => item.title, item => date(item.date, true), item => item.status) +
      relationGroup('Zadania', rel.tasks, item => item.title, item => date(item.date, true), item => item.status) +
      relationGroup('Oferty', rel.offers, item => item.title, item => money(item.amount, item.currency), item => item.status) +
      relationGroup('Spotkania', rel.meetings, item => item.title, item => date(item.date, true), item => item.status) +
      '</div></section></div>';
    byId('viewContent').innerHTML = html;
    byId('systemCustomerSelect').addEventListener('change', event => {
      state.selectedCustomer = event.target.value;
      renderCustomer();
    });
  }

  function relationGroup(label, rows, title, detail, status) {
    return '<details class="relation-group"' + (label === 'Działania' ? ' open' : '') + '><summary><span>' + escape(label) + '</span><b>' + rows.length + '</b></summary><div>' + (rows.length ? rows.slice(0,8).map(item => '<article><div><strong>' + escape(title(item)) + '</strong><small>' + escape(detail(item)) + '</small></div>' + badge(status(item)) + '</article>').join('') : '<p>Brak zapisanych pozycji.</p>') + '</div></details>';
  }

  const searchSources = [
    ['clients','Klient','customer', item => item.name, item => [item.email,item.phone,item.nextAction,item.status]],
    ['tasks','Zadanie','projects', item => item.title, item => [item.description,item.clientName,item.owner,item.status]],
    ['processes','Proces','projects', item => item.title, item => [item.currentStep,item.type,item.status]],
    ['files','Dokument','documents', item => item.title, item => [item.type,item.clientName,item.projectId,item.status]],
    ['memory','Wiedza','knowledge', item => short(item.text,100), item => [item.tags,item.type,item.source]],
    ['permanentMemory','Pamięć projektu','knowledge', item => short(item.text,100), item => [item.tags,item.type,item.source]],
    ['offers','Oferta','customer', item => item.title, item => [item.clientName,item.description,item.status]],
    ['meetings','Spotkanie','customer', item => item.title, item => [item.clientName,item.location,item.status]],
    ['mails','Wiadomość','mail', item => item.title, item => [item.sender,item.account,item.snippet,item.status]],
    ['socialPosts','Post na Facebooku','social', item => item.title, item => [item.text,item.status]],
    ['assets','Strona / zasób','websites', item => item.title, item => [item.campaignId,item.provider,item.status]],
    ['campaigns','Kampania','websites', item => item.name, item => [item.clientName,item.nextAction,item.status]],
    ['researches','Research','researchhub', item => item.topic, item => [item.summary,item.mode]],
    ['competitorObservations','Konkurencja','researchhub', item => item.competitor, item => [item.area,item.summary,item.whatChanged]]
  ];

  const searchCategoryGroups = {
    'Klienci': ['Klient'],
    'Zadania': ['Zadanie', 'Proces'],
    'Dokumenty': ['Dokument'],
    'Wiedza': ['Wiedza', 'Pamięć projektu'],
    'Research': ['Research', 'Konkurencja'],
    'WWW': ['Strona / zasób', 'Kampania']
  };

  function buildSearchIndex() {
    const rows = [];
    searchSources.forEach(source => {
      const key = source[0], label = source[1], route = source[2], getTitle = source[3], getValues = source[4];
      brandRows(key).forEach(item => {
        const values = getValues(item).filter(Boolean);
        rows.push({id:item.id || key + '-' + rows.length, type:label, route:route, title:getTitle(item) || item.id, detail:values[0] || '', haystack:[getTitle(item)].concat(values).join(' ')});
      });
    });
    return rows;
  }

  function renderSearch() {
    const index = buildSearchIndex();
    let html = hero('search', 'SYSTEM 04 · WIEDZA', 'Znajdź wszystko z jednego miejsca', 'Przeszukuj dane panelu od razu. Gdy potrzeba pełnego kontekstu z Dysku i poczty, uruchom głębokie szukanie DONY.', '',
      '<div class="hero-search"><span>' + icon('search') + '</span><i></i><i></i><i></i><b>' + index.length + '</b></div>');
    html += actionStatus();
    html += '<section class="global-search"><div class="global-search-box">' + icon('search') + '<input id="globalSearchInput" type="search" autocomplete="off" placeholder="Klient, dokument, projekt, temat researchu…" aria-label="Szukaj we wszystkich danych" value="' + escape(state.search) + '"><button class="primary" data-system-action="search-deep">Szukaj głębiej z DONĄ</button></div><div class="search-source-chips">' + Object.keys(searchCategoryGroups).map(label => '<button type="button" data-search-category="' + escape(label) + '" aria-pressed="' + (state.searchCategory === label) + '">' + escape(label) + '</button>').join('') + '</div><div id="globalSearchResults"></div></section>';
    byId('viewContent').innerHTML = html;
    const input = byId('globalSearchInput');
    input.addEventListener('input', event => {
      state.search = event.target.value;
      renderSearchResults(index);
    });
    renderSearchResults(index);
    setTimeout(() => { if (state.search && byId('globalSearchInput')) byId('globalSearchInput').focus(); }, 0);
  }

  function renderSearchResults(index) {
    const container = byId('globalSearchResults');
    if (!container) return;
    const query = state.search.trim();
    const categoryTypes = state.searchCategory ? (searchCategoryGroups[state.searchCategory] || []) : null;
    if (!query && !categoryTypes) {
      const counts = searchSources.map(source => ({label:source[1], count:brandRows(source[0]).length})).filter(item => item.count);
      container.innerHTML = '<div class="search-overview"><div><span>GOTOWE DO PRZESZUKANIA</span><strong>' + index.length + '</strong><p>bez uruchamiania agenta</p></div><div>' + counts.map(item => '<span><b>' + item.count + '</b>' + escape(item.label) + '</span>').join('') + '</div></div>';
      return;
    }
    const scoped = categoryTypes ? index.filter(item => categoryTypes.includes(item.type)) : index;
    const results = scoped.filter(item => !query || textMatch(query, [item.haystack])).slice(0,50);
    const label = query ? 'dla „' + escape(query) + '”' : 'w kategorii „' + escape(state.searchCategory) + '”';
    container.innerHTML = '<div class="search-results-head"><strong>' + results.length + ' wyników</strong><span>' + label + '</span></div>' + (results.length ? '<div class="search-results">' + results.map(item => '<article><span class="search-type">' + escape(item.type) + '</span><div><h3>' + escape(item.title) + '</h3><p>' + escape(short(item.detail,180)) + '</p></div><button class="secondary" data-system-route="' + escape(item.route) + '">Otwórz</button></article>').join('') + '</div>' : empty('Brak wyniku w snapshotcie', 'Uruchom głębokie szukanie, aby sprawdzić także Dysk Google, pocztę i powiązania.'));
  }

  function renderDocuments() {
    const files = list('files');
    const byType = {};
    files.forEach(file => { const type = file.type || 'Inne'; byType[type] = (byType[type] || 0) + 1; });
    let html = hero('documents', 'SYSTEM 05 · DOKUMENTY', 'Od pliku do użytecznej informacji', 'Otwieraj rejestr, rozpoznawaj skany, wyciągaj tabele, porównuj wersje i twórz nowe dokumenty.', primary('Nowy dokument', 'document-create') + secondary('Uruchom OCR', 'document-ocr'),
      '<div class="hero-docs"><i>PDF</i><i>DOC</i><i>XLS</i><span></span></div>');
    html += actionStatus();
    html += '<div class="document-tools">' +
      toolTile('Rozpoznaj skan', 'OCR dokumentu i wskazane pola', 'document-ocr', 'file') +
      toolTile('Wyciągnij tabelę', 'Dane z PDF lub obrazu do struktury', 'document-table', 'layers') +
      toolTile('Porównaj wersje', 'Różnice między dwoma dokumentami', 'document-compare', 'search') +
      toolTile('Wygeneruj dokument', 'Oferta, raport, brief lub pismo', 'document-create', 'spark') + '</div>';
    html += '<section class="system-panel"><div class="system-section-head"><div><span>REJESTR DOKUMENTÓW</span><h3>Pliki firmowe</h3></div><b>' + files.length + '</b></div>';
    html += Object.keys(byType).length ? '<div class="document-type-bar">' + Object.entries(byType).slice(0,10).map(entry => '<span>' + escape(entry[0]) + '<b>' + entry[1] + '</b></span>').join('') + '</div>' : '';
    html += files.length ? '<div class="document-list">' + files.map(file => {
      const href = safeUrl(file.url);
      return '<article><div class="document-icon">' + escape(String(file.type || 'PLIK').slice(0,3).toUpperCase()) + '</div><div><span>' + escape(file.type || 'Dokument') + '</span><h4>' + escape(file.title) + '</h4><small>' + escape([file.clientName,file.source,date(file.createdAt)].filter(Boolean).join(' · ')) + '</small></div>' + badge(file.status) + (href ? '<a class="icon-link" href="' + escape(href) + '" target="_blank" rel="noopener noreferrer" aria-label="Otwórz dokument">' + icon('external') + '</a>' : '') + '</article>';
    }).join('') + '</div>' : empty('Brak dokumentów', 'Wygeneruj dokument lub zarejestruj wynik analizy.');
    html += '</section>';
    byId('viewContent').innerHTML = html;
  }

  function toolTile(title, copy, action, glyph) {
    return '<button class="document-tool" data-system-action="' + escape(action) + '"><span>' + icon(glyph) + '</span><strong>' + escape(title) + '</strong><small>' + escape(copy) + '</small><i>' + icon('arrow') + '</i></button>';
  }

  function latestUsage() {
    const result = new Map();
    list('subscriptionUsage').slice().sort((a,b) => (+new Date(b.collectedAt) || 0) - (+new Date(a.collectedAt) || 0)).forEach(item => {
      if (!result.has(item.serviceId)) result.set(item.serviceId, item);
    });
    return result;
  }

  function renderFinance() {
    const invoices = list('invoices');
    const subscriptions = list('subscriptions');
    const usage = latestUsage();
    const unpaid = invoices.filter(invoice => !/PAID|OPLACONA|OPŁACONA|ZAPLACONA|ZAPŁACONA/i.test(invoice.status || ''));
    const overdue = unpaid.filter(invoice => invoice.dueAt && +new Date(invoice.dueAt) < Date.now());
    const plnDue = unpaid.filter(invoice => !invoice.currency || invoice.currency === 'PLN').reduce((sum, invoice) => sum + number(invoice.amount), 0);
    const activeSubs = subscriptions.filter(item => item.active || /ACTIVE|AKTYW/i.test(item.status || ''));
    let html = hero('finance', 'SYSTEM 06 · PIENIĄDZE', 'Terminy i koszty bez szukania po tabelach', 'Kontroluj faktury, odnowienia i limity usług. Przypomnienia są przygotowywane do zatwierdzenia przed wysyłką.', primary('Dodaj fakturę', 'invoice-create') + secondary('Sprawdź abonamenty', 'subscriptions-check'),
      '<div class="hero-finance"><span>PLN</span><i></i><i></i><i></i><b>↑</b></div>');
    html += actionStatus();
    html += '<div class="system-stats">' + stat('Do zapłaty', money(plnDue,'PLN'), unpaid.length + ' faktur') + stat('Po terminie', String(overdue.length), overdue.length ? 'wymagają decyzji' : 'brak zaległości', overdue.length ? 'danger' : 'good') + stat('Aktywne usługi', String(activeSubs.length), 'abonamenty') + stat('Odnowienia', String(activeSubs.filter(item => item.renewalDate && +new Date(item.renewalDate) < Date.now()+30*86400000).length), 'w ciągu 30 dni') + '</div>';
    html += '<div class="finance-grid"><section class="system-panel"><div class="system-section-head"><div><span>FAKTURY</span><h3>Płatności klientów</h3></div><button class="link-button" data-system-action="reminders-preview">Przygotuj przypomnienia</button></div>';
    html += invoices.length ? '<div class="invoice-list">' + invoices.map(invoice => '<article class="' + (overdue.includes(invoice) ? 'is-overdue' : '') + '"><div><span>' + escape(invoice.number || invoice.id) + '</span><strong>' + escape(invoice.clientName || 'Klient') + '</strong><small>Termin: ' + escape(date(invoice.dueAt)) + (invoice.reminderCount ? ' · przypomnienia: ' + invoice.reminderCount : '') + '</small></div><b>' + escape(money(invoice.amount,invoice.currency)) + '</b>' + badge(invoice.status) + '</article>').join('') + '</div>' : '<p class="system-small-empty">Brak faktur w rejestrze.</p>';
    html += '</section><section class="system-panel"><div class="system-section-head"><div><span>ABONAMENTY</span><h3>Usługi i limity</h3></div><b>' + subscriptions.length + '</b></div>';
    html += subscriptions.length ? '<div class="subscription-list">' + subscriptions.map(subscription => {
      const reading = usage.get(subscription.id);
      const hasRemaining = reading && reading.remainingPercent !== null && reading.remainingPercent !== undefined && reading.remainingPercent !== '' && Number.isFinite(Number(reading.remainingPercent));
      const percent = reading && number(reading.total) > 0 ? Math.max(0, Math.min(100, number(reading.used) / number(reading.total) * 100)) : hasRemaining ? Math.max(0, Math.min(100, 100 - number(reading.remainingPercent))) : null;
      return '<article><div class="subscription-top"><div><span>' + escape(subscription.category || 'usługa') + '</span><strong>' + escape(subscription.name) + '</strong><small>' + escape([subscription.plan,subscription.billingPeriod].filter(Boolean).join(' · ')) + '</small></div><b>' + escape(money(subscription.amount,subscription.currency)) + '</b></div>' + (percent !== null ? '<div class="usage-bar"><i style="width:' + Math.round(percent) + '%"></i></div><div class="usage-copy"><span>' + escape(reading.metric || 'Wykorzystanie') + '</span><b>' + Math.round(percent) + '%</b></div>' : '<p class="usage-empty">Brak odczytu limitu.</p>') + '<footer><span>Odnowienie: ' + escape(date(subscription.renewalDate)) + '</span>' + badge(subscription.status || (subscription.active ? 'ACTIVE' : '')) + '</footer></article>';
    }).join('') + '</div>' : '<p class="system-small-empty">Brak abonamentów w rejestrze.</p>';
    html += '</section></div>';
    byId('viewContent').innerHTML = html;
  }

  function renderResearch() {
    const research = list('researches');
    const observations = list('competitorObservations');
    const changes = observations.filter(item => item.changed);
    let html = hero('research', 'SYSTEM 07 · INTELIGENCJA RYNKOWA', 'Research, który zostaje w firmie', 'Każda analiza trafia do pamięci. Monitoring konkurencji pokazuje, co zmieniło się od poprzedniego odczytu.', primary('Nowy research', 'research-create') + secondary('Dodaj konkurenta', 'competitor-create'),
      '<div class="hero-radar"><i></i><i></i><i></i><span></span><b></b></div>');
    html += actionStatus();
    html += '<div class="system-stats">' + stat('Analizy', String(research.length), 'w pamięci') + stat('Obserwacje', String(observations.length), 'konkurencji') + stat('Nowe zmiany', String(changes.length), changes.length ? 'wykryte sygnały' : 'brak zmian', changes.length ? 'warn' : 'good') + stat('Mocne twierdzenia', String(research.reduce((sum,item) => sum + number(item.highConfidenceClaims),0)), 'z wysoką pewnością') + '</div>';
    html += '<div class="research-grid"><section><div class="system-section-head"><div><span>BIBLIOTEKA RESEARCHU</span><h3>Ostatnie analizy</h3></div><b>' + research.length + '</b></div>';
    html += research.length ? '<div class="research-list">' + research.map(item => '<article><div class="research-card-top"><span>' + escape(item.mode || 'research') + '</span><time>' + escape(date(item.updatedAt || item.createdAt)) + '</time></div><h4>' + escape(item.topic) + '</h4><p>' + escape(short(item.summary,420)) + '</p><footer><span>' + number(item.highConfidenceClaims) + ' twierdzeń o wysokiej pewności</span><button class="link-button" data-system-action="research-continue" data-id="' + escape(item.id) + '" data-title="' + escape(item.topic) + '">Kontynuuj ' + icon('arrow') + '</button></footer></article>').join('') + '</div>' : empty('Brak zapisanych analiz', 'Uruchom pierwszy research i zachowaj jego wynik w pamięci.');
    html += '</section><aside class="system-panel watch-panel"><div class="system-section-head"><div><span>RADAR KONKURENCJI</span><h3>Ostatnie sygnały</h3></div></div>';
    html += observations.length ? observations.map(item => '<article class="watch-row ' + (item.changed ? 'has-change' : '') + '"><div class="watch-dot"></div><div><div><strong>' + escape(item.competitor) + '</strong>' + (item.changed ? '<span>ZMIANA</span>' : '') + '</div><small>' + escape(item.area || 'obserwacja') + ' · ' + escape(date(item.date)) + '</small><p>' + escape(short(item.whatChanged || item.summary,260)) + '</p></div></article>').join('') : '<p class="system-small-empty">Nie ma jeszcze obserwowanych konkurentów.</p>';
    html += '</aside></div>';
    byId('viewContent').innerHTML = html;
  }

  function renderOnboarding() {
    const playbooks = list('playbooks').filter(item => item.active !== false);
    const clients = list('clients');
    const recent = clients.slice().sort((a,b) => (+new Date(b.createdAt)||0)-(+new Date(a.createdAt)||0)).slice(0,6);
    const steps = [
      ['Dzień 1','Brief i cele','Zakres, kontakt, oczekiwany rezultat'],
      ['Dzień 2','Dostępy i materiały','Dysk, skrzynki, marka, pliki'],
      ['Dzień 3','Oferta i zasady','Usługi, ceny, granice autonomii'],
      ['Dzień 4','Strategia','Kanały, komunikacja, priorytety'],
      ['Dzień 5','Pierwsze treści','Materiały robocze do sprawdzenia'],
      ['Dzień 7','Pomiar','Wskaźniki i rytm raportowania']
    ];
    let html = hero('onboarding', 'SYSTEM 08 · WDROŻENIE', 'Nowy klient bez ręcznej listy kontrolnej', 'Wybierz pakiet i uruchom sprawdzony plan. DONA utworzy klienta oraz sześć zadań wdrożeniowych.', primary('Rozpocznij wdrożenie', 'onboarding-create'),
      '<div class="hero-onboarding"><span>1</span><i></i><span>3</span><i></i><span>6</span><b>' + icon('check') + '</b></div>');
    html += actionStatus();
    html += '<section class="onboarding-path"><div class="system-section-head"><div><span>PLAN 7 DNI</span><h3>Od briefu do pomiaru</h3></div><b>6 kroków</b></div><div class="onboarding-steps">' + steps.map((step,index) => '<article><span>' + (index+1) + '</span><small>' + escape(step[0]) + '</small><strong>' + escape(step[1]) + '</strong><p>' + escape(step[2]) + '</p></article>').join('') + '</div></section>';
    html += '<div class="onboarding-grid"><section><div class="system-section-head"><div><span>GOTOWE PAKIETY</span><h3>Playbooki branżowe</h3></div><b>' + playbooks.length + '</b></div>';
    html += playbooks.length ? '<div class="playbook-grid">' + playbooks.map(item => '<article><div class="readiness"><span style="--readiness:' + Math.max(0,Math.min(100,number(item.readiness))) + '%"><b>' + number(item.readiness) + '%</b></span></div><div><small>' + escape(item.sector || 'pakiet') + '</small><h4>' + escape(item.name) + '</h4><p>' + escape(short(item.tone,180)) + '</p><div class="module-chips">' + (item.modules || []).slice(0,6).map(module => '<span>' + escape(module) + '</span>').join('') + '</div><button class="secondary" data-system-action="onboarding-from-playbook" data-id="' + escape(item.id) + '">Użyj pakietu</button></div></article>').join('') + '</div>' : empty('Brak aktywnych playbooków', 'Wdrożenie nadal można uruchomić z pustego formularza.');
    html += '</section><aside class="system-panel recent-clients"><div class="system-section-head"><div><span>OSTATNIO DODANI</span><h3>Klienci</h3></div></div>' + (recent.length ? recent.map(client => '<article><span>' + escape((client.name || '?').slice(0,1).toUpperCase()) + '</span><div><strong>' + escape(client.name) + '</strong><small>' + escape(date(client.createdAt)) + '</small></div>' + badge(client.status || client.lifecycle) + '</article>').join('') : '<p class="system-small-empty">Brak klientów w odczycie.</p>') + '</aside></div>';
    byId('viewContent').innerHTML = html;
  }

  const field = spec => {
    const common = ' name="' + escape(spec.name) + '"' + (spec.required ? ' required' : '') + (spec.maxlength ? ' maxlength="' + spec.maxlength + '"' : '') + (spec.step ? ' step="' + escape(spec.step) + '"' : '');
    if (spec.type === 'textarea') return '<label class="' + (spec.wide ? 'is-wide' : '') + '"><span>' + escape(spec.label) + '</span><textarea' + common + ' placeholder="' + escape(spec.placeholder || '') + '">' + escape(spec.value || '') + '</textarea></label>';
    if (spec.type === 'select') return '<label class="' + (spec.wide ? 'is-wide' : '') + '"><span>' + escape(spec.label) + '</span><select' + common + '>' + spec.options.map(option => '<option value="' + escape(option.value) + '"' + (option.value === spec.value ? ' selected' : '') + '>' + escape(option.label) + '</option>').join('') + '</select></label>';
    return '<label class="' + (spec.wide ? 'is-wide' : '') + '"><span>' + escape(spec.label) + '</span><input type="' + escape(spec.type || 'text') + '"' + common + ' placeholder="' + escape(spec.placeholder || '') + '" value="' + escape(spec.value || '') + '"></label>';
  };
  const customerOptions = () => [{value:'',label:'Bez przypisania'}].concat(list('clients').map(item => ({value:item.id,label:item.name})));
  const playbookOptions = () => [{value:'',label:'Bez pakietu'}].concat(list('playbooks').filter(item => item.active !== false).map(item => ({value:item.id,label:item.name + (item.sector ? ' · ' + item.sector : '')})));

  function formDefinition(action, preset) {
    const today = new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Warsaw'});
    const definitions = {
      'task-create': {
        title:'Nowe zadanie', copy:'DONA zapisze zadanie w systemie projektowym.', submit:'Utwórz zadanie',
        fields:[
          {name:'title',label:'Tytuł',required:true,maxlength:180,wide:true,placeholder:'Co dokładnie trzeba zrobić?'},
          {name:'description',label:'Opis i kryterium wyniku',type:'textarea',maxlength:2000,wide:true,placeholder:'Jaki rezultat ma oznaczać wykonanie?'},
          {name:'due',label:'Termin',type:'datetime-local'},
          {name:'priority',label:'Priorytet',type:'select',options:[{value:'HIGH',label:'Wysoki'},{value:'MEDIUM',label:'Średni'},{value:'LOW',label:'Niski'}],value:'MEDIUM'},
          {name:'customer',label:'Klient',type:'select',options:customerOptions()}
        ]
      },
      'website-create': {
        title:'Nowa strona', copy:'Najpierw powstanie wersja robocza i podgląd. Publikacja wymaga osobnej decyzji.', submit:'Zleć wersję roboczą',
        fields:[
          {name:'name',label:'Nazwa projektu',required:true,maxlength:180,wide:true,placeholder:'Np. landing kampanii jesiennej'},
          {name:'goal',label:'Cel strony',required:true,type:'textarea',maxlength:2500,wide:true,placeholder:'Odbiorca, oferta i oczekiwane działanie'},
          {name:'customer',label:'Klient',type:'select',options:customerOptions()},
          {name:'deadline',label:'Termin',type:'date',value:today}
        ]
      },
      'website-change': {
        title:'Zmiana na stronie', copy:'DONA przygotuje nową wersję do podglądu. Nie opublikuje jej bez zatwierdzenia.', submit:'Zleć zmianę',
        fields:[
          {name:'assetId',label:'Identyfikator strony',value:preset.id || '',required:true},
          {name:'title',label:'Strona',value:preset.title || '',required:true},
          {name:'change',label:'Co zmienić',required:true,type:'textarea',maxlength:3000,wide:true,placeholder:'Opisz konkretny rezultat'}
        ]
      },
      'website-audit': {
        title:'Audyt strony', copy:'Odczyt i raport. Bez zmian oraz publikacji.', submit:'Uruchom audyt',
        fields:[
          {name:'url',label:'Adres HTTPS',required:true,type:'url',wide:true,placeholder:'https://…'},
          {name:'scope',label:'Zakres',type:'select',options:[{value:'pełny',label:'Pełny audyt'},{value:'SEO i treść',label:'SEO i treść'},{value:'formularze i konwersja',label:'Formularze i konwersja'},{value:'techniczny',label:'Techniczny'}]}
        ]
      },
      'customer-next': {
        title:'Następny krok', copy:'DONA zapisze działanie przy właściwym kliencie.', submit:'Zapisz działanie',
        fields:[
          {name:'customer',label:'Klient',required:true,type:'select',options:customerOptions(),value:state.selectedCustomer},
          {name:'action',label:'Działanie',required:true,maxlength:300,wide:true,placeholder:'Np. omówić makietę na spotkaniu'},
          {name:'due',label:'Termin',required:true,type:'datetime-local'},
          {name:'reason',label:'Powód lub kontekst',type:'textarea',maxlength:1500,wide:true}
        ]
      },
      'document-create': {
        title:'Nowy dokument', copy:'Dokument zostanie przygotowany w istniejącym systemie plików.', submit:'Wygeneruj dokument',
        fields:[
          {name:'title',label:'Tytuł',required:true,maxlength:180,wide:true},
          {name:'type',label:'Rodzaj',type:'select',options:[{value:'oferta',label:'Oferta'},{value:'raport',label:'Raport'},{value:'brief',label:'Brief'},{value:'pismo',label:'Pismo'},{value:'notatka',label:'Notatka'}]},
          {name:'customer',label:'Klient',type:'select',options:customerOptions()},
          {name:'content',label:'Zakres i treść źródłowa',required:true,type:'textarea',maxlength:6000,wide:true,placeholder:'Co ma znaleźć się w dokumencie?'}
        ]
      },
      'document-ocr': {
        title:'OCR dokumentu', copy:'Podaj identyfikator lub link do pliku na Dysku Google.', submit:'Rozpoznaj dokument',
        fields:[
          {name:'file',label:'Plik na Dysku',required:true,wide:true,placeholder:'Identyfikator pliku lub link Google Drive'},
          {name:'documentType',label:'Typ dokumentu',maxlength:120,placeholder:'Np. faktura, umowa'},
          {name:'fields',label:'Pola do odczytu',type:'textarea',maxlength:1500,wide:true,placeholder:'Np. numer, data, kwota, kontrahent'}
        ]
      },
      'document-table': {
        title:'Wyciągnij tabelę', copy:'DONA odczyta strukturę tabeli z dokumentu.', submit:'Wyciągnij dane',
        fields:[
          {name:'file',label:'Plik na Dysku',required:true,wide:true,placeholder:'Identyfikator pliku lub link Google Drive'},
          {name:'tableType',label:'Rodzaj danych',maxlength:180,wide:true,placeholder:'Np. pozycje faktury, cennik, harmonogram'}
        ]
      },
      'document-compare': {
        title:'Porównaj wersje', copy:'Porównanie jest tylko odczytem i nie zmienia dokumentów.', submit:'Porównaj dokumenty',
        fields:[
          {name:'first',label:'Wersja 1',required:true,wide:true,placeholder:'Identyfikator lub link'},
          {name:'second',label:'Wersja 2',required:true,wide:true,placeholder:'Identyfikator lub link'},
          {name:'focus',label:'Na czym się skupić',type:'textarea',maxlength:1500,wide:true,placeholder:'Opcjonalnie: ceny, zakres, zapisy prawne…'}
        ]
      },
      'invoice-create': {
        title:'Dodaj fakturę', copy:'DONA zapisze fakturę w rejestrze. Nic nie zostanie wysłane.', submit:'Zapisz fakturę',
        fields:[
          {name:'number',label:'Numer faktury',required:true,maxlength:100},
          {name:'client',label:'Klient',required:true,maxlength:180},
          {name:'email',label:'E-mail klienta',type:'email',maxlength:240},
          {name:'amount',label:'Kwota',required:true,type:'number',step:'0.01'},
          {name:'currency',label:'Waluta',type:'select',options:[{value:'PLN',label:'PLN'},{value:'EUR',label:'EUR'},{value:'USD',label:'USD'}]},
          {name:'due',label:'Termin płatności',required:true,type:'date'},
          {name:'description',label:'Opis',type:'textarea',maxlength:1500,wide:true}
        ]
      },
      'research-create': {
        title:'Nowy research', copy:'Wynik zostanie zapisany w pamięci researchu. Tryb pogłębiony może potrwać dłużej.', submit:'Uruchom research',
        fields:[
          {name:'topic',label:'Temat lub pytanie',required:true,type:'textarea',maxlength:3000,wide:true,placeholder:'Co dokładnie mamy ustalić?'},
          {name:'mode',label:'Tryb',type:'select',options:[{value:'szybki',label:'Szybki'},{value:'pogłębiony',label:'Pogłębiony'}]},
          {name:'customer',label:'Klient',type:'select',options:customerOptions()},
          {name:'criteria',label:'Kryteria i rynek',type:'textarea',maxlength:2000,wide:true,placeholder:'Kraj, okres, typ źródeł, porównanie…'}
        ]
      },
      'competitor-create': {
        title:'Monitoring konkurenta', copy:'DONA utworzy nową obserwację i porówna ją z poprzednim zapisem.', submit:'Uruchom obserwację',
        fields:[
          {name:'competitor',label:'Konkurent',required:true,maxlength:200},
          {name:'area',label:'Obszar',required:true,maxlength:300,placeholder:'Np. oferta i ceny'},
          {name:'url',label:'Główne źródło',type:'url',wide:true,placeholder:'https://…'},
          {name:'customer',label:'Klient',type:'select',options:customerOptions()}
        ]
      },
      'onboarding-create': {
        title:'Wdrożenie nowego klienta', copy:'Po uruchomieniu DONA utworzy kartę klienta i sześć zadań na siedem dni.', submit:'Uruchom wdrożenie',
        fields:[
          {name:'name',label:'Nazwa klienta',required:true,maxlength:200,wide:true},
          {name:'email',label:'E-mail',type:'email',maxlength:240},
          {name:'phone',label:'Telefon',maxlength:80},
          {name:'sector',label:'Branża',maxlength:160},
          {name:'service',label:'Zakres współpracy',required:true,type:'textarea',maxlength:2500,wide:true},
          {name:'playbook',label:'Pakiet',type:'select',options:playbookOptions(),value:preset.playbook || ''},
          {name:'owner',label:'Opiekun',maxlength:160,value:'Piotr'},
          {name:'start',label:'Start',required:true,type:'date',value:today},
          {name:'notes',label:'Dodatkowe ustalenia',type:'textarea',maxlength:2500,wide:true}
        ]
      }
    };
    return definitions[action];
  }

  function openForm(action, preset) {
    const definition = formDefinition(action, preset || {});
    if (!definition) return;
    let dialog = byId('systemDialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'systemDialog';
      dialog.className = 'system-dialog';
      document.body.appendChild(dialog);
    }
    dialog.innerHTML = '<form method="dialog" id="systemForm"><div class="system-dialog-head"><div><span>AKCJA W DONIE</span><h2>' + escape(definition.title) + '</h2><p>' + escape(definition.copy) + '</p></div><button type="button" class="icon-button" data-system-dialog-close aria-label="Zamknij">×</button></div><div class="system-form-grid">' + definition.fields.map(field).join('') + '</div><div class="system-dialog-actions"><button type="button" class="secondary" data-system-dialog-close>Anuluj</button><button type="submit" class="primary">' + escape(definition.submit) + ' ' + icon('arrow') + '</button></div></form>';
    dialog.querySelectorAll('[data-system-dialog-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      if (!event.currentTarget.reportValidity()) return;
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      dialog.close();
      runAction(action, values);
    });
    dialog.showModal();
    const first = dialog.querySelector('input,textarea,select');
    if (first) first.focus();
  }

  const quoted = value => String(value || '').trim() || 'brak';
  function promptFor(action, values) {
    const prompts = {
      'task-create': () => 'Utwórz w Agent Project Management nowe zadanie. Tytuł: ' + quoted(values.title) + '. Opis i kryterium wyniku: ' + quoted(values.description) + '. Termin: ' + quoted(values.due) + '. Priorytet: ' + quoted(values.priority) + '. Customer ID: ' + quoted(values.customer) + '. Po wykonaniu podaj identyfikator i potwierdzony status zapisu.',
      'task-complete': () => 'Oznacz zadanie o identyfikatorze ' + quoted(values.id) + ' jako zakończone. Tytuł kontrolny: ' + quoted(values.title) + '. Nie zmieniaj żadnego innego zadania. Podaj potwierdzony wynik.',
      'project-priorities': () => 'Sprawdź moje projekty i zadania. Tylko odczyt. Wskaż pięć najważniejszych działań, powody priorytetu, blokady i najbliższy konkretny krok. Niczego nie zmieniaj.',
      'process-check': () => 'Sprawdź proces o identyfikatorze ' + quoted(values.id) + '. Tylko odczyt. Podaj aktualny krok, ustalenia, elementy oczekujące, blokady i rekomendowany następny krok.',
      'website-create': () => 'Przygotuj nową wersję roboczą strony WWW. Nazwa projektu: ' + quoted(values.name) + '. Cel i zakres: ' + quoted(values.goal) + '. Customer ID: ' + quoted(values.customer) + '. Termin: ' + quoted(values.deadline) + '. Utwórz podgląd i wpis w rejestrze. Nie publikuj bez osobnego zatwierdzenia.',
      'website-change': () => 'Przygotuj zmianę strony jako nową wersję roboczą. Asset ID: ' + quoted(values.assetId) + '. Strona: ' + quoted(values.title) + '. Oczekiwana zmiana: ' + quoted(values.change) + '. Zachowaj obecną wersję. Nie publikuj bez osobnego zatwierdzenia.',
      'website-audit': () => 'Wykonaj audyt strony ' + quoted(values.url) + '. Zakres: ' + quoted(values.scope) + '. Tylko odczyt. Podaj problemy, ich wagę i konkretne poprawki. Niczego nie zmieniaj ani nie publikuj.',
      'customer-brief': () => 'Przygotuj pełny briefing klienta o identyfikatorze ' + quoted(values.customer) + '. Tylko odczyt. Zbierz ostatni kontakt, ustalenia, otwarte zadania, szanse, dokumenty, ryzyka i rekomendowany następny krok.',
      'customer-next': () => 'Zapisz następne działanie klienta. Customer ID: ' + quoted(values.customer) + '. Działanie: ' + quoted(values.action) + '. Termin: ' + quoted(values.due) + '. Powód: ' + quoted(values.reason) + '. Po zapisie podaj identyfikator i status.',
      'search-deep': () => 'Znajdź wszystko o frazie: ' + quoted(values.query) + '. Przeszukaj powiązania klientów, projektów, dokumentów, spotkań, poczty i pamięci. Tylko odczyt, bez zmian. Rozdziel fakty od przypuszczeń i wskaż źródła.',
      'document-create': () => 'Wygeneruj dokument. Tytuł: ' + quoted(values.title) + '. Typ: ' + quoted(values.type) + '. Customer ID: ' + quoted(values.customer) + '. Zakres i treść: ' + quoted(values.content) + '. Zapisz wynik w rejestrze dokumentów i podaj link do potwierdzonego pliku.',
      'document-ocr': () => 'Uruchom OCR dokumentu. Plik: ' + quoted(values.file) + '. Typ dokumentu: ' + quoted(values.documentType) + '. Odczytaj pola: ' + quoted(values.fields) + '. Podaj wynik i status jakości.',
      'document-table': () => 'Wyciągnij tabelę z dokumentu. Plik: ' + quoted(values.file) + '. Rodzaj danych: ' + quoted(values.tableType) + '. Nie zmieniaj pliku źródłowego. Zwróć uporządkowaną strukturę i wskaż niepewne komórki.',
      'document-compare': () => 'Porównaj dwie wersje dokumentu. Wersja 1: ' + quoted(values.first) + '. Wersja 2: ' + quoted(values.second) + '. Zakres uwagi: ' + quoted(values.focus) + '. Tylko odczyt. Wypisz różnice i ich znaczenie.',
      'invoice-create': () => 'Dodaj fakturę do rejestru. Numer: ' + quoted(values.number) + '. Klient: ' + quoted(values.client) + '. E-mail: ' + quoted(values.email) + '. Kwota: ' + quoted(values.amount) + ' ' + quoted(values.currency) + '. Termin: ' + quoted(values.due) + '. Opis: ' + quoted(values.description) + '. Nie wysyłaj wiadomości.',
      'subscriptions-check': () => 'Sprawdź aktualny raport abonamentów, limity, koszty i najbliższe odnowienia. Tylko odczyt. Nie kupuj, nie anuluj i nie zmieniaj planów.',
      'reminders-preview': () => 'Sprawdź nieopłacone faktury i przygotuj podglądy należnych przypomnień. Nie wysyłaj żadnej wiadomości. Każda wysyłka ma trafić do skrzynki decyzji.',
      'research-create': () => 'Uruchom research. Temat: ' + quoted(values.topic) + '. Tryb: ' + quoted(values.mode) + '. Customer ID: ' + quoted(values.customer) + '. Kryteria: ' + quoted(values.criteria) + '. Zapisz wynik w pamięci researchu, podaj źródła i poziom pewności.',
      'research-continue': () => 'Kontynuuj zapisany research o kluczu ' + quoted(values.id) + ' i temacie ' + quoted(values.title) + '. Najpierw odczytaj poprzedni wynik, potem sprawdź, co zmieniło się do dziś. Zapisz nową wersję z datą i źródłami.',
      'competitor-create': () => 'Uruchom istniejący Agent monitoringu konkurencji. Konkurent: ' + quoted(values.competitor) + '. Obszar: ' + quoted(values.area) + '. Główne źródło: ' + quoted(values.url) + '. Customer ID: ' + quoted(values.customer) + '. Porównaj z poprzednim zapisem i zapisz obserwację. Bez kontaktowania kogokolwiek i bez publikacji.',
      'onboarding-create': () => 'Uruchom istniejący workflow Agency Onboarding dla nowego klienta. Nazwa: ' + quoted(values.name) + '. E-mail: ' + quoted(values.email) + '. Telefon: ' + quoted(values.phone) + '. Branża: ' + quoted(values.sector) + '. Zakres współpracy: ' + quoted(values.service) + '. Playbook ID: ' + quoted(values.playbook) + '. Opiekun: ' + quoted(values.owner) + '. Start: ' + quoted(values.start) + '. Ustalenia: ' + quoted(values.notes) + '. Najpierw sprawdź duplikat. Następnie utwórz kartę klienta i sześć zadań wdrożeniowych. Niczego nie wysyłaj ani nie publikuj.',
      'onboarding-from-playbook': () => ''
    };
    return prompts[action] ? prompts[action]() : '';
  }

  const actionConfig = {
    'task-create':{branch:'klienci',name:'Klienci',form:true,refresh:true},
    'task-complete':{branch:'klienci',name:'Klienci',refresh:true},
    'project-priorities':{branch:'klienci',name:'Klienci'},
    'process-check':{branch:'system',name:'System'},
    'website-create':{branch:'www',name:'WWW',form:true,refresh:true},
    'website-change':{branch:'www',name:'WWW',form:true,refresh:true},
    'website-audit':{branch:'www',name:'WWW',form:true},
    'customer-brief':{branch:'klienci',name:'Klienci'},
    'customer-next':{branch:'klienci',name:'Klienci',form:true,refresh:true},
    'search-deep':{branch:'dysk',name:'Dysk'},
    'document-create':{branch:'dysk',name:'Dysk',form:true,refresh:true},
    'document-ocr':{branch:'dysk',name:'Dysk',form:true,refresh:true},
    'document-table':{branch:'dysk',name:'Dysk',form:true,refresh:true},
    'document-compare':{branch:'dysk',name:'Dysk',form:true},
    'invoice-create':{branch:'pieniadze',name:'Pieniądze',form:true,refresh:true},
    'subscriptions-check':{branch:'pieniadze',name:'Pieniądze'},
    'reminders-preview':{branch:'pieniadze',name:'Pieniądze'},
    'research-create':{branch:'research',name:'Research',form:true,refresh:true},
    'research-continue':{branch:'research',name:'Research',refresh:true},
    'competitor-create':{main:true,form:true,refresh:true},
    'onboarding-create':{main:true,form:true,refresh:true}
  };

  async function runAction(action, values) {
    const config = actionConfig[action];
    if (!config) return;
    if (state.demo) {
      setActionStatus('info', 'To podgląd na danych przykładowych. Zaloguj się, aby uruchomić tę akcję.');
      return;
    }
    const prompt = promptFor(action, values || {});
    if (!prompt) return;
    setActionStatus('working', 'DONA przekazała zadanie do właściwego systemu. Wynik pojawi się także w rozmowie.');
    try {
      if (config.main) root.dispatchEvent(new CustomEvent('dona:open-chat'));
      const result = config.main ? await root.Dona.run(prompt) : await root.Dona.runBranch(config.branch, config.name, prompt);
      if (!result || result.ok === false) {
        setActionStatus('error', 'Nie potwierdzono wyniku. Sprawdź rozmowę i stan systemu przed ponowieniem.');
        return;
      }
      setActionStatus('success', 'Wynik został potwierdzony i zapisany w rozmowie z DONĄ.');
      if (config.refresh) root.dispatchEvent(new CustomEvent('dona:refresh'));
    } catch (error) {
      setActionStatus('error', 'Nie potwierdzono wyniku. Sprawdź rozmowę i stan systemu przed ponowieniem.');
    }
  }

  function handleAction(button) {
    let action = button.dataset.systemAction;
    const preset = {id:button.dataset.id || '', title:button.dataset.title || ''};
    if (action === 'customer-brief') {
      runAction(action, {customer:state.selectedCustomer});
      return;
    }
    if (action === 'search-deep') {
      const input = byId('globalSearchInput');
      const query = input ? input.value.trim() : state.search.trim();
      if (!query) {
        if (input) {
          input.focus();
          input.setCustomValidity('Wpisz, czego szukasz.');
          input.reportValidity();
          input.addEventListener('input', () => input.setCustomValidity(''), {once:true});
        }
        return;
      }
      runAction(action, {query:query});
      return;
    }
    if (action === 'onboarding-from-playbook') {
      action = 'onboarding-create';
      openForm(action, {playbook:preset.id});
      return;
    }
    const config = actionConfig[action];
    if (config && config.form) openForm(action, preset);
    else runAction(action, preset);
  }

  function render(view, data, demo) {
    state.view = view;
    state.demo = !!demo;
    state.data = withDemo(data, demo);
    if (view === 'projects') renderProjects();
    else if (view === 'websites') renderWebsites();
    else if (view === 'customer') renderCustomer();
    else if (view === 'searchall') renderSearch();
    else if (view === 'documents') renderDocuments();
    else if (view === 'finance') renderFinance();
    else if (view === 'researchhub') renderResearch();
    else if (view === 'onboarding') renderOnboarding();
  }

  document.addEventListener('click', event => {
    const route = event.target.closest('[data-system-route]');
    if (route) {
      root.Dona.navigate(route.dataset.systemRoute);
      return;
    }
    const categoryChip = event.target.closest('[data-search-category]');
    if (categoryChip) {
      const label = categoryChip.dataset.searchCategory;
      state.searchCategory = state.searchCategory === label ? '' : label;
      if (byId('globalSearchInput')) {
        document.querySelectorAll('[data-search-category]').forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.searchCategory === state.searchCategory)));
        renderSearchResults(buildSearchIndex());
      }
      return;
    }
    const button = event.target.closest('[data-system-action]');
    if (button) handleAction(button);
  });

  root.DonaSystems = {views:views, descriptions:descriptions, render:render, buildSearchIndex:buildSearchIndex, _test:{withDemo:withDemo,promptFor:promptFor,statusLabel:statusLabel}};
})(window);
