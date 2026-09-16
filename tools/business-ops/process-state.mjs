const allowedBranches = new Set(['sprzedaz','research','marketing','system','klienci','www','poczta']);

const clean = (value, max = 4000) => String(value ?? '').trim().slice(0, max);
const clone = value => JSON.parse(JSON.stringify(value));

function parseState(raw) {
  const state = typeof raw === 'string' ? JSON.parse(raw || '{}') : clone(raw || {});
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('INVALID_STATE');
  const plan = state.businessPlan;
  if (!plan || plan.schemaVersion !== 1 || !Array.isArray(plan.tasks)) throw new Error('PLAN_NOT_FOUND');
  return {state, plan};
}

function validateContext(plan, input) {
  const projectId = clean(input.processId, 80);
  const taskId = clean(input.taskId, 80);
  const branch = clean(input.branch, 40);
  if (!projectId || projectId !== plan.projectId) throw new Error('PROCESS_MISMATCH');
  if (!Number.isInteger(input.planVersion) || input.planVersion !== plan.version) throw new Error('PLAN_VERSION_MISMATCH');
  const task = plan.tasks.find(item => item && item.id === taskId);
  if (!task) throw new Error('TASK_NOT_FOUND');
  if (!allowedBranches.has(branch) || task.branch !== branch) throw new Error('BRANCH_MISMATCH');
  return task;
}

function evidenceValid(evidence, version, now) {
  if (!evidence || evidence.status !== 'verified' || evidence.version !== version || !clean(evidence.reference, 2000)) return false;
  const checked = Date.parse(evidence.checkedAt), expiry = Date.parse(evidence.expiresAt);
  return Number.isFinite(checked) && Number.isFinite(expiry) && checked <= now && now < expiry;
}

function refresh(plan, now) {
  const verified = new Set(plan.tasks.filter(task => task.status === 'VERIFIED').map(task => task.id));
  const evidence = plan.evidence && typeof plan.evidence === 'object' ? plan.evidence : {};
  for (const task of plan.tasks) {
    if (!task || task.status !== 'WAITING') continue;
    const dependencies = Array.isArray(task.dependencies) ? task.dependencies : [];
    const requirements = Array.isArray(task.requirements) ? task.requirements : [];
    if (dependencies.every(id => verified.has(id)) && requirements.every(key => evidenceValid(evidence[key], plan.version, now))) task.status = 'READY';
  }
  plan.next = plan.tasks.filter(task => task.status === 'READY').map(task => clone(task));
  plan.complete = plan.tasks.length > 0 && plan.tasks.every(task => task.status === 'VERIFIED');
}

export function recordTaskResult(rawState, input) {
  const {state, plan} = parseState(rawState);
  const now = Date.parse(input.at);
  if (!Number.isFinite(now)) throw new Error('INVALID_TIME');
  const task = validateContext(plan, input);
  if (!['READY','RESULT_READY'].includes(task.status)) throw new Error('TASK_NOT_EXECUTABLE');
  const attemptId = clean(input.attemptId, 120);
  const reference = clean(input.resultReference, 2000);
  const summary = clean(input.resultSummary, 5000);
  if (!attemptId || !reference || !summary) throw new Error('INCOMPLETE_RESULT');
  if (task.lastAttempt?.id === attemptId) return {state, changed:false, task};
  task.lastAttempt = {id:attemptId, at:new Date(now).toISOString(), status:input.ok === true ? 'SUCCESS' : 'FAILED'};
  if (input.ok === true) {
    task.status = 'RESULT_READY';
    task.resultReference = reference;
    task.resultSummary = summary;
    task.resultAt = new Date(now).toISOString();
  }
  refresh(plan, now);
  return {state, changed:true, task};
}

export function verifyTaskResult(rawState, input) {
  const {state, plan} = parseState(rawState);
  const now = Date.parse(input.at);
  if (!Number.isFinite(now)) throw new Error('INVALID_TIME');
  const task = validateContext(plan, input);
  if (task.status === 'VERIFIED') return {state, changed:false, task};
  if (task.status !== 'RESULT_READY' || !clean(task.resultReference, 2000)) throw new Error('RESULT_NOT_READY');
  task.status = 'VERIFIED';
  task.verifiedAt = new Date(now).toISOString();
  task.verifiedBy = 'OWNER';
  refresh(plan, now);
  return {state, changed:true, task};
}

export function currentStep(state) {
  const ready = state.businessPlan.tasks.filter(task => task.status === 'READY');
  if (ready.length) return ready.map(task => task.title).join('; ').slice(0, 4000);
  if (state.businessPlan.complete) return 'Proces zakończony i potwierdzony.';
  return 'Czeka na wynik, zależność albo potwierdzony warunek.';
}
