const req = ($('POST galaz').first().json || {}).body || {};
const result = $('Formatuj wynik galaz').first().json || {};
const history = $('Przygotuj zapis historii galaz').first().json || {};
const processId = String(req.process_id || '').trim();
const taskId = String(req.task_id || '').trim();
const branch = String(req.galaz || '').trim().toLowerCase();
const planVersion = Number(req.plan_version);
const hasTaskContext = /^[A-Za-z0-9_-]{1,80}$/.test(processId) &&
  /^[A-Za-z0-9_-]{1,80}$/.test(taskId) && /^[a-z]{2,40}$/.test(branch) &&
  Number.isInteger(planVersion) && planVersion > 0;
return [{json:{
  hasTaskContext,
  operacja:'zapisz_wynik_zadania', proces_id:processId, zadanie_id:taskId,
  plan_version:hasTaskContext ? planVersion : 0, galaz:branch,
  result_reference:'conversation:' + String(history.threadId || 'PM') + '#' + String(history.messageId || ''),
  result_summary:String(result.answer || '').slice(0,5000), result_ok:result.ok === true,
  attempt_id:'panel-branch-' + $execution.id, tenant_id:'PM', requested_by:'panel-owner'
}}];
