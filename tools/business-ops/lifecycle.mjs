// Pure planning module. No credentials, network, mail, spending or scheduling.
// Integration adapter must verify evidence independently before passing it here.
export const playbooks = {
  academy: [
    ['offer', 'sprzedaz', 'Potwierdź produkt, cenę i zakres z aktualnego katalogu', [], []],
    ['audience', 'research', 'Opisz odbiorcę, problem i dowody potrzeby', [], []],
    ['materials', 'marketing', 'Przygotuj reklamę, stronę zapisu, wiadomości i FAQ', ['offer', 'audience'], []],
    ['checkout', 'system', 'Sprawdź zakup, dostęp i wiadomość po zakupie', ['offer'], ['payment_ready']],
    ['support', 'klienci', 'Przygotuj pierwsze kroki kursanta i obsługę problemów', ['offer'], []],
    ['launch', 'marketing', 'Uruchom zatwierdzony pakiet kampanii', ['materials', 'checkout', 'support'], ['publication_authorized', 'channel_ready', 'budget_ready']],
    ['review', 'sprzedaz', 'Porównaj zapis, zakup, zwroty i koszt pozyskania', ['launch'], ['analytics_ready']]
  ],
  prospecting: [
    ['segment', 'sprzedaz', 'Wybierz segment i konkretną usługę', [], []],
    ['research', 'research', 'Znajdź firmy i udokumentuj publiczne źródła oraz potrzeby', ['segment'], []],
    ['qualify', 'sprzedaz', 'Usuń duplikaty i oceń dopasowanie na podstawie dowodów', ['research'], []],
    ['draft', 'sprzedaz', 'Przygotuj indywidualną propozycję i następny krok', ['qualify'], []],
    ['contact', 'poczta', 'Wykonaj zatwierdzony kontakt do uprawnionego odbiorcy', ['draft'], ['contact_allowed', 'send_authorized']],
    ['followup', 'sprzedaz', 'Sprawdź odpowiedź i zapisz termin dalszego kontaktu', ['contact'], []]
  ],
  delivery: [
    ['brief', 'www', 'Zbierz cel, materiały, zakres i kryteria odbioru', [], []],
    ['proposal', 'sprzedaz', 'Przygotuj ofertę na podstawie katalogu i zakresu', ['brief'], ['catalog_ready']],
    ['build', 'www', 'Zbuduj podgląd w istniejącym repozytorium', ['proposal'], ['scope_accepted']],
    ['qa', 'www', 'Sprawdź telefon, formularze, treść, SEO i dostępność', ['build'], []],
    ['publish', 'www', 'Opublikuj zaakceptowaną wersję i sprawdź adres', ['qa'], ['publication_authorized']],
    ['care', 'klienci', 'Przekaż instrukcję, zapisz opiekę i termin przeglądu', ['publish'], []]
  ]
};

function evidenceValid(e, now, version) {
  if (!e || e.status !== 'verified' || e.version !== version || typeof e.reference !== 'string' || !e.reference.trim()) return false;
  const at = Date.parse(e.checkedAt), expiry = Date.parse(e.expiresAt);
  return Number.isFinite(at) && Number.isFinite(expiry) && at <= now && now < expiry;
}

export function plan({kind, projectId, version, evidence = {}, completed = {}, now = Date.now()}) {
  if (!Object.hasOwn(playbooks, kind)) throw new Error('UNKNOWN_PLAYBOOK');
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(projectId || '')) throw new Error('INVALID_PROJECT');
  if (!Number.isInteger(version) || version < 1 || !Number.isFinite(now)) throw new Error('INVALID_VERSION_OR_TIME');
  const verified = new Set();
  const tasks = playbooks[kind].map(([id, branch, title, dependencies, requirements]) => {
    const missing = [...dependencies.filter(d => !verified.has(d)).map(d => 'task:' + d),
      ...requirements.filter(k => !evidenceValid(evidence[k], now, version)).map(k => 'evidence:' + k)];
    const done = missing.length === 0 && evidenceValid(completed[id], now, version);
    if (done) verified.add(id);
    return {id, branch, title, dependencies, requirements, status: done ? 'VERIFIED' : missing.length ? 'WAITING' : 'READY', missing,
      resultReference: done ? completed[id].reference : null};
  });
  return {schemaVersion: 1, projectId, version, kind, tasks,
    next: tasks.filter(t => t.status === 'READY'),
    complete: tasks.every(t => t.status === 'VERIFIED'),
    executionStarted: false};
}

export function processInput(p) {
  // Compatible with the existing Zarzadzanie Procesami workflow input.
  return {operacja: 'rozpocznij', proces_id: p.projectId, tenant_id: 'PM', requested_by: 'Piotr',
    typ: 'business-' + p.kind, opis: 'Proces biznesowy: ' + p.kind,
    krok_obecny: p.next.map(t => t.title).join('; ') || 'Sprawdź brakujące dowody',
    status: 'W_TOKU',
    stan_json: JSON.stringify({ustalone: ['Plan v' + p.version + '; zapis planu nie oznacza wykonania.'],
      czeka_na_ciebie: [], zablokowane: p.tasks.flatMap(t => t.missing.map(m => t.id + ': ' + m)), businessPlan: p})};
}
