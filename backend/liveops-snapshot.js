const context = $('Validate Live Ops Access').first().json;
if (!context.authorized || context.tenantId !== 'PM') throw new Error('ACCESS_DENIED');

const tenant = context.tenantId;
const now = Date.now();
const cap = 250;
const truncated = [];

function text(value, max = 240) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/\b(?:sk|pk|rk|ghp|xox[baprs])[-_][A-Za-z0-9_-]{10,}\b/gi, '[UKRYTO]')
    .replace(/\bAIza[A-Za-z0-9_-]{10,}\b/g, '[UKRYTO]')
    .replace(/\b(api[_ -]?key|token|haslo|hasło|password|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[UKRYTO]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[UKRYTY ADRES]')
    .replace(/https?:\/\/\S+/gi, '[UKRYTY LINK]')
    .slice(0, max);
}

function number(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !/^-?\d+(?:[.,]\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function count(value) {
  const parsed = number(value);
  return parsed === null ? 0 : Math.max(0, Math.trunc(parsed));
}

function bool(value) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  const normalized = text(value, 24).trim().toLowerCase();
  if (['true','yes','ok','success','succeeded'].includes(normalized)) return true;
  if (['false','no','error','failed','failure'].includes(normalized)) return false;
  return null;
}

function time(value) {
  const safe = text(value, 80).trim();
  const parsed = Date.parse(safe);
  return Number.isFinite(parsed) ? {value:safe, ms:parsed} : {value:'', ms:0};
}

function freshness(value) {
  const parsed = time(value);
  if (!parsed.ms) return {status:'unknown', ageSeconds:null};
  const ageSeconds = Math.max(0, Math.floor((now - parsed.ms) / 1000));
  const status = ageSeconds <= 15 * 60 ? 'fresh' : ageSeconds <= 24 * 60 * 60 ? 'recent' : 'stale';
  return {status, ageSeconds};
}

function rows(name, tenantField, key) {
  const all = $(name).all().map(item => item.json).filter(row => row && row.id !== undefined);
  const scoped = tenantField ? all.filter(row => String(row[tenantField] || '') === tenant) : all;
  if (scoped.length > cap) truncated.push(key);
  return scoped.slice(0, cap);
}

function byNewest(list, selector) {
  return list.slice().sort((a, b) => time(selector(b)).ms - time(selector(a)).ms);
}

function normalized(value) {
  return text(value, 120).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_-]+/g, ' ');
}

function classifyAgent(status, errors) {
  const value = normalized(status);
  if (/error|fail|blad|awaria|stopped|zatrzym/.test(value)) return 'error';
  if (/approval|await|waiting|oczek|zgod|review|decyzj/.test(value)) return 'waiting';
  if (/listen|nasluch|idle|ready|scheduled|harmonogram/.test(value)) return 'listening';
  if (/running|working|started|start|process|in progress|w toku|pracuje/.test(value)) return 'working';
  if (errors > 0) return 'attention';
  if (/success|succeed|done|complete|ok|zakoncz|gotowe/.test(value)) return 'done';
  return 'unknown';
}

const stateLabels = {
  working:'Pracuje', waiting:'Czeka na zgodę', listening:'Nasłuchuje', done:'Zakończone',
  attention:'Wymaga uwagi', error:'Błąd', unknown:'Stan niepotwierdzony',
};
const publicStatuses = {
  working:'RUNNING', waiting:'WAITING_APPROVAL', listening:'WAITING_SYSTEM', done:'COMPLETED',
  attention:'FAILED', error:'FAILED', unknown:'UNKNOWN',
};

const agentRows = byNewest(rows('Read Agent Logs', '', 'agents'), row => row.start);
const seenAgents = new Set();
const agents = [];
for (const row of agentRows) {
  const name = text(row.agent || 'Agent', 120);
  const key = normalized(name) || 'agent-' + text(row.id, 80);
  if (seenAgents.has(key)) continue;
  seenAgents.add(key);
  const errors = count(row.liczba_bledow);
  const state = classifyAgent(row.status, errors);
  const started = time(row.start).value;
  agents.push({
    id:text(row.przebieg_id || row.id, 160), name, runId:text(row.przebieg_id, 160),
    state, status:publicStatuses[state], stateLabel:stateLabels[state], sourceStatus:text(row.status, 80),
    summary:text(row.temat_raportu, 240) || 'Bezpieczny ślad operacyjny agenta.',
    startedAt:started, lastSeenAt:started, errorCount:errors,
    topic:text(row.temat_raportu, 240), version:text(row.wersja, 80), freshness:freshness(started),
    metrics:{fetched:count(row.liczba_pobranych), alerts:count(row.liczba_alertow), events:count(row.liczba_wydarzen), errors},
  });
}

function approvalState(status, expiresAt, executionStatus) {
  const raw = normalized(status);
  const execution = normalized(executionStatus);
  const expiry = time(expiresAt).ms;
  if ((/request|pending|await|oczek/.test(raw) || !raw) && expiry && expiry <= now) return 'expired';
  if (/error|fail|blad/.test(execution)) return 'failed';
  if (/approve|accepted|zatwierdz/.test(raw)) return 'approved';
  if (/reject|declin|odrzu/.test(raw)) return 'rejected';
  if (/expir|wygasl/.test(raw)) return 'expired';
  if (/request|pending|await|oczek/.test(raw)) return 'pending';
  return 'unknown';
}

const approvalRows = byNewest(rows('Read Approvals', 'tenant_id', 'approvals'), row => row.created_at || row.createdAt);
const approvals = approvalRows.slice(0, 50).map(row => {
  const createdAt = time(row.created_at || row.createdAt).value;
  const expiresAt = time(row.expires_at || row.expiresAt).value;
  return {
    id:text(row.approval_id || row.id, 160), type:text(row.action_type, 120),
    state:approvalState(row.status, expiresAt, row.execution_status), status:text(row.status, 80),
    executionStatus:text(row.execution_status, 80), createdAt, expiresAt,
    approvedAt:time(row.approved_at).value, executedAt:time(row.executed_at).value,
    freshness:freshness(createdAt),
  };
});

const auditRows = byNewest(rows('Read Incidents', 'klient_id', 'audit'), row => row.czas);
const costAuditRows = byNewest(rows('Read Cost Audits', 'klient_id', 'costs').filter(row =>
  row.agent === 'PM Agent OS — OpenAI Cost Monitor' && row.narzedzia === 'openai-costs-api'
), row => row.czas);
const llmRows = byNewest(rows('Read LLM Observability', 'tenant_id', 'models'), row => row.started_at || row.utworzono);
const processRows = byNewest(rows('Read Processes', 'tenant_id', 'processes'), row => row.ostatnia_aktywnosc || row.utworzono);
const panelEventRows = byNewest(rows('Read Panel Events', 'tenant_id', 'events'), row => row.occurred_at || row.createdAt);

function parseJson(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string' || value.length > 100000) return null;
  try { return JSON.parse(value); } catch { return null; }
}

function displayName(value, fallback) {
  const safe = text(value, 120).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!safe) return fallback;
  return safe.charAt(0).toUpperCase() + safe.slice(1);
}

function processState(value, updatedAt) {
  const safe = normalized(value);
  if (/przerw|cancel|abort|error|fail|blad|zatrzym/.test(safe)) return 'interrupted';
  if (/zakoncz|complete|done|success|finished|gotowe/.test(safe)) return 'completed';
  if (/approval|zgod|decyzj|review/.test(safe)) return 'waiting_approval';
  if (/czeka|wait|kolejk|scheduled|zaplan/.test(safe)) return 'waiting_system';
  if (/w toku|running|active|working|process|in progress|pracuje/.test(safe)) {
    return freshness(updatedAt).status === 'stale' ? 'stalled' : 'running';
  }
  return 'unconfirmed';
}

const processStateLabels = {
  running:'Pracuje', waiting_approval:'Czeka na zgodę', waiting_system:'Czeka na system',
  completed:'Zakończony', interrupted:'Przerwany', stalled:'Brak świeżego śladu',
  unconfirmed:'Stan niepotwierdzony',
};

const operationalProcessRows = processRows.filter(row => !/test harness/.test(normalized(row.typ)));
const processes = operationalProcessRows.slice(0, 50).map(row => {
  const updatedAt = time(row.ostatnia_aktywnosc || row.updatedAt || row.utworzono).value;
  const createdAt = time(row.utworzono || row.createdAt).value;
  const state = processState(row.status, updatedAt);
  const result = text(row.wynik, 420).trim();
  const resultState = !result ? 'none' : state === 'completed' ? 'confirmed' : 'partial';
  return {
    id:text(row.proces_id || row.id, 180), name:displayName(row.typ, 'Proces Dony'),
    type:text(row.typ, 120), state, stateLabel:processStateLabels[state], status:text(row.status, 80),
    description:text(row.opis, 300), currentStep:text(row.krok_obecny, 360),
    result, resultState, resultLabel:resultState === 'confirmed' ? 'Wynik potwierdzony' : resultState === 'partial' ? 'Wynik częściowy' : 'Brak końcowego wyniku',
    requestedBy:text(row.requested_by, 100), createdAt, updatedAt, freshness:freshness(updatedAt),
    hasCheckpoint:!!parseJson(row.stan_json),
  };
});

function eventState(value) {
  const safe = normalized(value);
  if (/reject|odrzu/.test(safe)) return {state:'done', label:'Odrzucono'};
  if (/approve|zatwierdz/.test(safe)) return {state:'done', label:'Zatwierdzono'};
  if (/saved|zapis/.test(safe)) return {state:'done', label:'Zapisano'};
  if (/publish|opublik/.test(safe)) return {state:'done', label:'Opublikowano'};
  if (/sent|wyslan|wysłan/.test(safe)) return {state:'done', label:'Wysłano'};
  if (/success|complete|done|executed|zakoncz|wykonan/.test(safe)) return {state:'done', label:'Zakończono'};
  if (/error|fail|blad/.test(safe)) return {state:'attention', label:'Błąd'};
  return {state:'unconfirmed', label:'Stan niepotwierdzony'};
}

const events = panelEventRows.slice(0, 50).map(row => {
  const outcome = eventState(row.status);
  const occurredAt = time(row.occurred_at || row.createdAt).value;
  return {
    id:text(row.event_id || row.id, 180), kind:text(row.kind, 80),
    title:text(row.title, 260) || displayName(row.kind, 'Zdarzenie Panelu'),
    status:text(row.status, 80), state:outcome.state, stateLabel:outcome.label,
    occurredAt, referenceId:text(row.reference_id, 180), brandId:text(row.brand_id, 100),
    freshness:freshness(occurredAt),
  };
});

function costEntries(value) {
  const parsed = parseJson(value);
  const candidates = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' ? [parsed] : [];
  const entries = [];
  for (const item of candidates) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const period = normalized(item.okres || item.period);
    const total = number(item.total_cost);
    const currency = text(item.currency, 12).toUpperCase();
    if (!['today','daily','dzis','dzisiaj','month','monthly','current month','miesiac'].includes(period)) continue;
    if (total === null || total < 0 || currency !== 'USD') continue;
    const source = normalized(item.zrodlo) === 'openai costs api' ? 'OpenAI Costs API' : '';
    entries.push({
      period:/month|miesiac/.test(period) ? 'month' : 'today', total,
      generatedAt:time(item.generated_at).value, source,
    });
  }
  return entries;
}

let today = null;
let month = null;
let costsMeasuredAt = '';
let costsSource = 'PM_audyt';
for (const row of costAuditRows) {
  const entries = costEntries(row.wynik);
  for (const entry of entries) {
    if (entry.period === 'today' && today === null) today = entry.total;
    if (entry.period === 'month' && month === null) month = entry.total;
    if (!costsMeasuredAt) costsMeasuredAt = entry.generatedAt || time(row.czas).value;
    if (entry.source) costsSource = entry.source;
  }
  if (today !== null && month !== null) break;
}

function warsawKey(ms) {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(ms);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return values.year + '-' + values.month + '-' + values.day;
}

const todayKey = warsawKey(now);
const monthKey = todayKey.slice(0, 7);
let calculatedToday = 0;
let calculatedMonth = 0;
let measuredRows = 0;
for (const row of auditRows) {
  const amount = number(row.koszt);
  const stamp = time(row.czas).ms;
  if (amount === null || amount < 0 || !stamp) continue;
  const key = warsawKey(stamp);
  if (key.slice(0, 7) === monthKey) calculatedMonth += amount;
  if (key === todayKey) calculatedToday += amount;
  measuredRows++;
}
if (today === null) today = calculatedToday;
if (month === null) month = calculatedMonth;
if (!costsMeasuredAt && costAuditRows.length) costsMeasuredAt = time(costAuditRows[0].czas).value;

const modelGroups = new Map();
for (const row of llmRows) {
  const model = text(row.model || 'Nieznany model', 120);
  const key = model || 'Nieznany model';
  if (!modelGroups.has(key)) modelGroups.set(key, {model:key, requests:0, successes:0, failures:0, unknown:0, rateLimited:0, retries:0, latencyTotal:0, latencyCount:0, workflows:new Set(), lastUsedAt:''});
  const group = modelGroups.get(key);
  const succeeded = bool(row.success);
  const latency = number(row.latency_ms);
  group.requests++;
  if (succeeded === true) group.successes++;
  else if (succeeded === false) group.failures++;
  else group.unknown++;
  if (bool(row.rate_limited) === true) group.rateLimited++;
  group.retries += count(row.retry_count);
  if (latency !== null && latency >= 0) { group.latencyTotal += latency; group.latencyCount++; }
  const workflow = text(row.workflow, 140);
  if (workflow) group.workflows.add(workflow);
  const usedAt = time(row.started_at || row.utworzono).value;
  if (!group.lastUsedAt || time(usedAt).ms > time(group.lastUsedAt).ms) group.lastUsedAt = usedAt;
}
const models = Array.from(modelGroups.values()).map(group => ({
  model:group.model, requests:group.requests, successes:group.successes, failures:group.failures,
  unknown:group.unknown, rateLimited:group.rateLimited, retries:group.retries,
  averageLatencyMs:group.latencyCount ? Math.round(group.latencyTotal / group.latencyCount) : null,
  avgLatencyMs:group.latencyCount ? Math.round(group.latencyTotal / group.latencyCount) : null,
  successRate:group.successes + group.failures ? Number((group.successes * 100 / (group.successes + group.failures)).toFixed(1)) : null,
  workflows:Array.from(group.workflows).slice(0, 8), lastUsedAt:group.lastUsedAt, updatedAt:group.lastUsedAt,
  freshness:freshness(group.lastUsedAt),
})).sort((a,b) => b.requests - a.requests || time(b.lastUsedAt).ms - time(a.lastUsedAt).ms);

const incidentTitles = {
  payment_required:'Brak środków u dostawcy AI', rate_limited:'Limit dostawcy został osiągnięty',
  timeout:'Operacja przekroczyła limit czasu', authentication:'Połączenie wymaga ponownej autoryzacji',
  unavailable_resource:'Brakuje wymaganego zasobu', operation_failed:'Operacja zakończyła się błędem',
  provider_error:'Dostawca AI zwrócił błąd',
};

function incidentCode(value, rateLimited) {
  if (rateLimited) return 'rate_limited';
  const safe = normalized(value);
  if (/payment|required|credit|balance|insufficient|platn|srodk/.test(safe)) return 'payment_required';
  if (/rate|429|quota|limit/.test(safe)) return 'rate_limited';
  if (/timeout|timed out|czas/.test(safe)) return 'timeout';
  if (/auth|401|403|token|credential|uprawn/.test(safe)) return 'authentication';
  if (/not found|missing|deleted|404|brak zasobu/.test(safe)) return 'unavailable_resource';
  return 'operation_failed';
}

function incidentStatus(occurredAt) {
  const current = freshness(occurredAt).status;
  return current === 'fresh' || current === 'recent' ? 'open' : 'historical';
}

const incidents = [];
const seenAudit = new Set();
for (const row of auditRows) {
  const owner = text(row.agent || row.kto || row.projekt_id || 'DONA', 120);
  const key = normalized(owner) || 'audit-' + text(row.id, 80);
  if (seenAudit.has(key)) continue;
  seenAudit.add(key);
  if (!text(row.blad, 1)) continue;
  const occurredAt = time(row.czas).value;
  const code = incidentCode(row.blad, false);
  incidents.push({
    id:'audit-' + text(row.audyt_id || row.id, 150), source:'audit', owner, code,
    title:incidentTitles[code], severity:code === 'payment_required' || code === 'authentication' ? 'critical' : 'warning',
    status:incidentStatus(occurredAt), occurredAt, retryable:null, freshness:freshness(occurredAt),
  });
}

const seenLlm = new Set();
for (const row of llmRows) {
  const workflow = text(row.workflow, 140);
  const operation = text(row.operation, 100);
  const model = text(row.model, 120);
  const key = [workflow, operation, model].join('|');
  if (seenLlm.has(key)) continue;
  seenLlm.add(key);
  const rateLimited = bool(row.rate_limited) === true;
  if (bool(row.success) !== false && !rateLimited) continue;
  const occurredAt = time(row.started_at || row.utworzono).value;
  let code = incidentCode(row.reason_code, rateLimited);
  if (code === 'operation_failed') code = 'provider_error';
  incidents.push({
    id:'llm-' + text(row.log_id || row.id, 150), source:'llm', owner:workflow || 'Dostawca AI', model,
    code, title:incidentTitles[code], severity:code === 'payment_required' || code === 'authentication' ? 'critical' : 'warning',
    status:incidentStatus(occurredAt), occurredAt, retryable:bool(row.retryable), freshness:freshness(occurredAt),
  });
}
incidents.sort((a,b) => time(b.occurredAt).ms - time(a.occurredAt).ms);
incidents.splice(25);

function sourceFreshness(list, selector) {
  let latestAt = '';
  for (const row of list) {
    const candidate = time(selector(row)).value;
    if (candidate && (!latestAt || time(candidate).ms > time(latestAt).ms)) latestAt = candidate;
  }
  return {latestAt, ...freshness(latestAt)};
}

const freshnessBySource = {
  agents:sourceFreshness(agentRows, row => row.start),
  audit:sourceFreshness(auditRows, row => row.czas),
  costs:sourceFreshness(costAuditRows, row => row.czas),
  models:sourceFreshness(llmRows, row => row.started_at || row.utworzono),
  approvals:sourceFreshness(approvalRows, row => row.created_at || row.createdAt),
  processes:sourceFreshness(operationalProcessRows, row => row.ostatnia_aktywnosc || row.utworzono),
  events:sourceFreshness(panelEventRows, row => row.occurred_at || row.createdAt),
};
const latestAt = Object.values(freshnessBySource).map(item => item.latestAt).filter(Boolean).sort((a,b) => time(b).ms-time(a).ms)[0] || '';
const overallFreshness = {latestAt, ...freshness(latestAt), sources:freshnessBySource};

const active = agents.filter(item => item.state === 'working' && item.freshness.status !== 'stale').length;
const waiting = agents.filter(item => item.state === 'waiting').length;
const listening = agents.filter(item => item.state === 'listening' && item.freshness.status !== 'stale').length;
const completed = agents.filter(item => item.state === 'done').length;
const processRunning = processes.filter(item => item.state === 'running').length;
const processWaitingApproval = processes.filter(item => item.state === 'waiting_approval').length;
const processWaitingSystem = processes.filter(item => item.state === 'waiting_system').length;
const processCompleted = processes.filter(item => item.state === 'completed').length;
const processAttention = processes.filter(item => ['interrupted','stalled','unconfirmed'].includes(item.state)).length;
const confirmed24h = agents.filter(item => item.state === 'done' && item.freshness.status !== 'stale').length
  + processes.filter(item => item.state === 'completed' && item.freshness.status !== 'stale').length
  + events.filter(item => item.state === 'done' && item.freshness.status !== 'stale').length;
const agentAttention = agents.filter(item => ['error','attention','unknown'].includes(item.state) || (['working','waiting'].includes(item.state) && item.freshness.status === 'stale')).length;
const openIncidents = incidents.filter(item => item.status === 'open').length;
const pendingApprovals = approvals.filter(item => item.state === 'pending').length;
const health = openIncidents || agentAttention || processAttention ? 'attention' : active + processRunning ? 'working' : agents.length + processes.length ? 'quiet' : 'unknown';

const costs = {
  currency:'USD', today:Number(today.toFixed(6)), month:Number(month.toFixed(6)), measuredAt:costsMeasuredAt,
  updatedAt:costsMeasuredAt,
  source:costsSource, monitorRows:costAuditRows.length, fallbackMeasuredRows:measuredRows,
  freshness:freshness(costsMeasuredAt),
};
const summary = {
  health, totalAgents:agents.length, active:active + processRunning, waiting:waiting + processWaitingApproval,
  listening:listening + processWaitingSystem, completed:completed + processCompleted, attention:agentAttention + processAttention,
  pendingApprovals, openIncidents, requests:llmRows.length, costTodayUsd:costs.today, costMonthUsd:costs.month,
  running:active + processRunning, waitingApproval:Math.max(waiting + processWaitingApproval, pendingApprovals), waitingSystem:listening + processWaitingSystem,
  failed24h:Math.max(agentAttention + processAttention, openIncidents), succeeded24h:confirmed24h, confirmed24h,
  processes:processes.length, processRunning, processWaitingApproval, processWaitingSystem, processCompleted, processAttention,
  costToday:costs.today, costMonth:costs.month, currency:costs.currency,
};

return [{json:{
  ok:true, generatedAt:new Date(now).toISOString(), readOnly:true, summary, agents, approvals,
  processes, events, costs, incidents, models, freshness:overallFreshness,
  meta:{
    mode:'owner_live_ops', readOnly:true, tenantId:tenant, limit:cap, windowHours:24,
    truncated:truncated.length > 0, truncatedSources:truncated, sourceFreshness:overallFreshness,
    classificationVersion:'liveops-v1',
    sources:[
      {id:'agents', records:agentRows.length, scope:'owner', freshness:freshnessBySource.agents},
      {id:'audit', records:auditRows.length, scope:'tenant', freshness:freshnessBySource.audit},
      {id:'costs', records:costAuditRows.length, scope:'exact-monitor', freshness:freshnessBySource.costs},
      {id:'models', records:llmRows.length, scope:'tenant', freshness:freshnessBySource.models},
      {id:'approvals', records:approvalRows.length, scope:'tenant', freshness:freshnessBySource.approvals},
      {id:'processes', records:operationalProcessRows.length, scope:'tenant', freshness:freshnessBySource.processes},
      {id:'events', records:panelEventRows.length, scope:'tenant', freshness:freshnessBySource.events},
    ],
  },
}}];
