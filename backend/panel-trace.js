const j = $input.first().json || {};
let answer = j.output;
if (answer === undefined || answer === null) answer = j.text;
if (answer === undefined || answer === null) answer = j.response;
if (answer === undefined || answer === null) answer = j.message;
if (answer && typeof answer === 'object') answer = JSON.stringify(answer);
if (answer === undefined || answer === null) answer = 'Nie dostałam odpowiedzi od Dony.';

const branchLabels = {
  poczta: 'Agent Poczty', dysk: 'Agent Dysku', sprzedaz: 'Agent Sprzedaży',
  klienci: 'Agent Klientów', marketing: 'Agent Marketingu', www: 'Agent WWW',
  media: 'Agent Mediów', pieniadze: 'Agent Finansów', system: 'Agent Systemowy',
  serwis: 'Agent Serwisowy', research: 'Agent Research'
};
const toolLabels = {
  drugi_mozg: 'Drugi mózg', szukaj_w_wiedzy: 'Baza wiedzy',
  szukaj_w_starej_wiedzy: 'Archiwum wiedzy', kolekcja_aparatow: 'Kolekcja aparatów'
};
const safeInput = value => {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return {};
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' ? parsed : {}; }
  catch { return {}; }
};
const rawSteps = Array.isArray(j.intermediateSteps) ? j.intermediateSteps.slice(0, 12) : [];
const trace = [{ id: 'dona', label: 'DONA przyjęła polecenie', detail: 'Orkiestrator', status: 'done' }];
for (let i = 0; i < rawSteps.length; i++) {
  const step = rawSteps[i] || {};
  const action = step.action || step;
  const tool = String(action.tool || action.toolName || step.tool || '').trim();
  let label = toolLabels[tool] || '';
  let detail = 'Potwierdzone wywołanie narzędzia';
  if (tool === 'deleguj_do_galezi') {
    const input = safeInput(action.toolInput || action.tool_input || action.input);
    const branch = String(input.galaz || '').toLowerCase().replace(/[^a-z]/g, '');
    label = branchLabels[branch] || 'Agent specjalistyczny';
    detail = 'Dyspozytor DONY';
  }
  if (!label) continue;
  trace.push({ id: 'tool-' + (i + 1), label, detail, status: 'done' });
}
trace.push({ id: 'result', label: 'DONA złożyła odpowiedź', detail: 'Wynik wraca do panelu', status: 'done' });
return [{ json: { answer: String(answer), trace } }];
