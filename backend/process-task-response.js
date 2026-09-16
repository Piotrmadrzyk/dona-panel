const calc = $('Scal wynik zadania').first().json || {};
let persisted = true;
if (calc.ok && calc.changed) {
  const row = $input.first() ? $input.first().json : {};
  let state = {};
  try { state = JSON.parse(row.stan_json || '{}'); } catch (error) {}
  persisted = !!row.id && row.tenant_id === calc.tenant_id && row.proces_id === calc.proces_id &&
    state.businessPlan && state.businessPlan.lastMutationId === calc.mutation_id;
}
if (!calc.ok || !persisted) {
  return [{json:{
    ok:false, processSaved:false, verified:false, changed:false,
    operacja:calc.operacja, proces_id:calc.proces_id, zadanie_id:calc.zadanie_id,
    errorCode:calc.errorCode || 'WRITE_NOT_CONFIRMED',
    komunikat:calc.komunikat || 'Nie potwierdzono zapisu zmiany. Odśwież panel przed ponowieniem.'
  }}];
}
return [{json:{
  ok:true, processSaved:true,
  verified:calc.operacja === 'zweryfikuj_wynik_zadania' && calc.task_status === 'VERIFIED',
  changed:calc.changed, idempotent:calc.idempotent,
  operacja:calc.operacja, proces_id:calc.proces_id, zadanie_id:calc.zadanie_id,
  taskStatus:calc.task_status, planComplete:calc.plan_complete,
  krok_obecny:calc.krok_obecny,
  komunikat:calc.operacja === 'zweryfikuj_wynik_zadania'
    ? 'Wynik etapu został potwierdzony.'
    : (calc.task_status === 'RESULT_READY' ? 'Wynik zapisano do sprawdzenia.' : 'Zapisano nieudaną próbę bez zamykania etapu.')
}}];
