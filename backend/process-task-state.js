const wej = $('Normalizuj wejscie').first().json || {};
const row = $input.first() ? $input.first().json : {};
const clean = (value, max = 4000) => String(value === undefined || value === null ? '' : value).trim().slice(0, max);
const allowedBranches = ['sprzedaz','research','marketing','system','klienci','www','poczta'];
const fail = (code, message) => [{json:{
  ok:false, changed:false, processSaved:false, errorCode:code, komunikat:message,
  operacja:wej.operacja, proces_id:wej.proces_id, zadanie_id:wej.zadanie_id
}}];

try {
  if (!row.id || row.tenant_id !== wej.tenant_id || row.proces_id !== wej.proces_id) return fail('PROCESS_NOT_FOUND','Nie znaleziono właściwego procesu.');
  let state;
  try { state = JSON.parse(row.stan_json || '{}'); } catch (error) { return fail('INVALID_STATE','Zapisany stan procesu jest uszkodzony.'); }
  if (!state || typeof state !== 'object' || Array.isArray(state)) return fail('INVALID_STATE','Zapisany stan procesu jest nieprawidłowy.');
  const plan = state.businessPlan;
  if (!plan || plan.schemaVersion !== 1 || !Array.isArray(plan.tasks)) return fail('PLAN_NOT_FOUND','Ten proces nie ma obsługiwanego planu zadań.');
  if (plan.projectId !== wej.proces_id) return fail('PROCESS_MISMATCH','Plan jest przypisany do innego procesu.');
  if (!Number.isInteger(wej.plan_version) || plan.version !== wej.plan_version) return fail('PLAN_VERSION_MISMATCH','Plan zmienił się. Odśwież panel przed kolejną próbą.');
  const task = plan.tasks.find(item => item && item.id === wej.zadanie_id);
  if (!task) return fail('TASK_NOT_FOUND','Nie znaleziono zadania w tym planie.');
  if (!allowedBranches.includes(wej.galaz) || task.branch !== wej.galaz) return fail('BRANCH_MISMATCH','Zadanie nie należy do wskazanej gałęzi.');

  const now = Date.parse(wej.czas);
  const evidence = plan.evidence && typeof plan.evidence === 'object' ? plan.evidence : {};
  const validEvidence = key => {
    const item = evidence[key];
    if (!item || item.status !== 'verified' || item.version !== plan.version || !clean(item.reference,2000)) return false;
    const checked = Date.parse(item.checkedAt), expires = Date.parse(item.expiresAt);
    return Number.isFinite(checked) && Number.isFinite(expires) && checked <= now && now < expires;
  };
  const refreshPlan = () => {
    const verified = new Set(plan.tasks.filter(item => item && item.status === 'VERIFIED').map(item => item.id));
    for (const item of plan.tasks) {
      if (!item || !['WAITING','READY'].includes(item.status)) continue;
      const dependencies = Array.isArray(item.dependencies) ? item.dependencies : [];
      const requirements = Array.isArray(item.requirements) ? item.requirements : [];
      const missing = dependencies.filter(id => !verified.has(id)).map(id => 'task:' + id)
        .concat(requirements.filter(key => !validEvidence(key)).map(key => 'evidence:' + key));
      item.missing = missing;
      item.status = missing.length ? 'WAITING' : 'READY';
    }
    plan.next = plan.tasks.filter(item => item && item.status === 'READY').map(item => JSON.parse(JSON.stringify(item)));
    plan.complete = plan.tasks.length > 0 && plan.tasks.every(item => item && item.status === 'VERIFIED');
  };
  refreshPlan();

  let changed = false;
  let idempotent = false;
  if (wej.operacja === 'zapisz_wynik_zadania') {
    if (!['READY','RESULT_READY'].includes(task.status)) return fail('TASK_NOT_EXECUTABLE','Ten etap nie jest gotowy do wykonania.');
    if (!wej.attempt_id || !wej.result_reference || !wej.result_summary) return fail('INCOMPLETE_RESULT','Brakuje potwierdzonego wyniku, jego opisu albo identyfikatora próby.');
    if (task.lastAttempt && task.lastAttempt.id === wej.attempt_id) {
      idempotent = true;
    } else {
      task.lastAttempt = {id:wej.attempt_id, at:wej.czas, status:wej.result_ok === true ? 'SUCCESS' : 'FAILED'};
      if (wej.result_ok === true) {
        task.status = 'RESULT_READY';
        task.missing = [];
        task.resultReference = wej.result_reference;
        task.resultSummary = wej.result_summary;
        task.resultAt = wej.czas;
      }
      changed = true;
    }
  } else if (wej.operacja === 'zweryfikuj_wynik_zadania') {
    if (task.status === 'VERIFIED') {
      idempotent = true;
    } else {
      if (task.status !== 'RESULT_READY' || !clean(task.resultReference, 2000)) return fail('RESULT_NOT_READY','Najpierw zadanie musi mieć zapisany wynik do sprawdzenia.');
      const verified = new Set(plan.tasks.filter(item => item && item.status === 'VERIFIED').map(item => item.id));
      const dependencies = Array.isArray(task.dependencies) ? task.dependencies : [];
      const requirements = Array.isArray(task.requirements) ? task.requirements : [];
      if (!dependencies.every(id => verified.has(id)) || !requirements.every(validEvidence)) return fail('TASK_REQUIREMENTS_NOT_MET','Warunki tego etapu nie są już potwierdzone. Odśwież dowody przed zatwierdzeniem.');
      task.status = 'VERIFIED';
      task.missing = [];
      task.verifiedAt = wej.czas;
      task.verifiedBy = 'OWNER';
      changed = true;
    }
  } else {
    return fail('INVALID_OPERATION','Nieobsługiwana operacja zadania.');
  }

  refreshPlan();
  const ready = plan.tasks.filter(item => item && item.status === 'READY');
  const review = plan.tasks.filter(item => item && item.status === 'RESULT_READY');
  const krok = ready.length ? ready.map(item => item.title).join('; ').slice(0,4000)
    : review.length ? ('Sprawdź i potwierdź: ' + review.map(item => item.title).join('; ')).slice(0,4000)
    : plan.complete ? 'Proces zakończony i potwierdzony.' : 'Czeka na zależność albo potwierdzony warunek.';
  const status = plan.complete ? 'ZAKONCZONY' : review.length ? 'CZEKA_NA_ZGODE' : 'W_TOKU';
  const mutation_id = changed ? ['process-task',$execution.id,wej.zadanie_id,wej.operacja].join(':') : '';
  if (changed) plan.lastMutationId = mutation_id;
  const wynik = wej.operacja === 'zapisz_wynik_zadania'
    ? (wej.result_ok ? wej.result_summary : 'Próba zadania nie zakończyła się potwierdzonym wynikiem.')
    : ('Właściciel potwierdził wynik etapu: ' + clean(task.title,500));
  return [{json:{
    ok:true, changed, idempotent, processSaved:true, operacja:wej.operacja,
    proces_id:wej.proces_id, zadanie_id:wej.zadanie_id, task_status:task.status,
    plan_complete:plan.complete, row_id:row.id, tenant_id:wej.tenant_id,
    expected_ostatnia_aktywnosc:row.ostatnia_aktywnosc, mutation_id,
    stan_json:JSON.stringify(state), krok_obecny:krok, status, wynik, czas:wej.czas
  }}];
} catch (error) {
  return fail('TASK_STATE_ERROR','Nie udało się bezpiecznie zmienić stanu zadania.');
}
