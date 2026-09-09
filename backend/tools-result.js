const auth = $('Validate Panel Tools Access').first().json || {};
const rows = $input.all().map(item => item.json && typeof item.json === 'object' ? item.json : {});
const first = rows[0] || {};

function text(value, max = 500) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeMessage(value, max = 500) {
  return text(value, max * 2)
    .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{12,}\b/g, '[ukryto]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [ukryto]')
    .replace(/((?:api[_ -]?key|token|secret|has(?:ł|l)o|password)\s*[:=]\s*)[^\s,;]+/gi, '$1[ukryto]')
    .slice(0, max);
}

function driveUrl(value) {
  const candidate = text(value, 2000);
  return /^https:\/\/(?:drive|docs)\.google\.com\//i.test(candidate) ? candidate : '';
}

function youtubeUrl(value) {
  const candidate = text(value, 1000);
  if (/^https:\/\/youtu\.be\/[A-Za-z0-9_-]{11}(?:[?&#/].*)?$/i.test(candidate)) return candidate;
  return /^https:\/\/(?:(?:www|m)\.)?youtube\.com\/(?:watch\?(?:[^#]*&)?v=[A-Za-z0-9_-]{11}(?:[&#].*)?|(?:shorts|live|embed)\/[A-Za-z0-9_-]{11}(?:[/?#].*)?)$/i.test(candidate) ? candidate : '';
}

function boundedNumber(value, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(max, Math.max(0, number));
}

function diagnosticText(value, depth = 0) {
  if (depth > 3 || value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).slice(0, 2000);
  if (Array.isArray(value)) return value.slice(0, 5).map(item => diagnosticText(item, depth + 1)).join(' ');
  if (typeof value !== 'object') return '';
  return ['error', 'message', 'description', 'cause', 'response', 'blad', 'powod', 'wiadomosc', 'komunikat', 'statusCode', 'httpCode', 'code']
    .map(key => diagnosticText(value[key], depth + 1)).filter(Boolean).join(' ');
}

function classifyFailure(value, fallback) {
  const diagnostic = diagnosticText(value).toLowerCase();
  if (/payment required|insufficient (?:credit|fund)|billing|balance|402/.test(diagnostic)) {
    return { statusCode: 402, error: 'ai_payment_required', message: 'Brakuje środków na usługę AI. Uzupełnij saldo, a potem uruchom analizę ręcznie.' };
  }
  if (/rate.?limit|too many requests|quota exceeded|resource exhausted|429/.test(diagnostic)) {
    return { statusCode: 503, error: 'service_rate_limited', message: 'Usługa osiągnęła chwilowy limit. Sprawdź zapisane wyniki przed ręcznym ponowieniem.' };
  }
  if (/timed? ?out|timeout|deadline exceeded|504/.test(diagnostic)) {
    return { statusCode: 504, error: 'service_timeout', message: 'Usługa nie potwierdziła wyniku w wyznaczonym czasie. Sprawdź historię pracy przed ręcznym ponowieniem.' };
  }
  if (/unauthori[sz]ed|forbidden|authentication|credential|access denied|\b401\b|\b403\b/.test(diagnostic)) {
    return { statusCode: 502, error: 'service_access_failed', message: 'Usługa pomocnicza odrzuciła dostęp. Połączenie wymaga sprawdzenia przez administratora.' };
  }
  return { statusCode: 502, error: fallback, message: 'Nie udało się potwierdzić wyniku usługi. Sprawdź historię pracy przed ręcznym ponowieniem.' };
}

function failureResponse(fallback) {
  const failure = classifyFailure(first, fallback);
  return [{ json: { ok: false, ...failure, doNotRetryAutomatically: true } }];
}

if (auth.operation === 'drive_search') {
  const status = text(first.status || 'blad', 32).toLowerCase();
  if (!['ok', 'nie_znaleziono'].includes(status)) return failureResponse('drive_search_failed');
  const source = Array.isArray(first.wyniki) ? first.wyniki : [];
  const seen = new Set();
  const results = source.map(row => {
    const id = text(row && row.id, 200);
    const url = driveUrl(row && (row.link || row.url));
    if (!/^[A-Za-z0-9_-]{10,200}$/.test(id) || seen.has(id)) return null;
    seen.add(id);
    return { id, name: text(row && (row.nazwa || row.name), 240), type: text(row && (row.typ || row.mimeType), 120), url };
  }).filter(Boolean).slice(0, 20);
  return [{ json: { ok: true, statusCode: 200, status, query: text(auth.query, 500), results } }];
}

if (auth.operation === 'drive_read') {
  const status = text(first.status || 'blad', 32).toLowerCase();
  if (status !== 'ok') return failureResponse('drive_read_failed');
  return [{ json: {
    ok: true,
    statusCode: 200,
    status,
    fileId: text(auth.fileId, 200),
    name: text(first.nazwa || first.name, 240),
    type: text(first.typ || first.mimeType, 120),
    text: String(first.tresc ?? first.info ?? '').slice(0, 40000)
  } }];
}

const rawStatus = text(first.status || first.status_koncowy || '', 32).toUpperCase();
const status = ['SUCCESS', 'PARTIAL', 'FAILED', 'PYTANIE'].includes(rawStatus) ? rawStatus : 'FAILED';
if (status === 'FAILED') {
  const failure = classifyFailure(first, 'media_failed');
  return [{ json: {
    ok: false,
    ...failure,
    status: 'FAILED',
    mayHavePartialResult: true,
    doNotRetryAutomatically: true
  } }];
}

const seenFiles = new Set();
const files = (Array.isArray(first.pliki) ? first.pliki : [])
  .map(row => {
    const url = driveUrl(row && (row.link || row.url));
    if (!url || seenFiles.has(url)) return null;
    seenFiles.add(url);
    return { name: text(row && (row.nazwa || row.name), 240) || 'Plik', type: text(row && (row.typ || row.mimeType), 120), url };
  }).filter(Boolean).slice(0, 20);

const stageAliases = {
  transcript: ['transcript', 'transkrypcja'],
  analysis: ['analysis', 'analiza'],
  summary: ['summary', 'podsumowanie'],
  synthesis: ['synthesis', 'synteza'],
  mindMap: ['mindMap', 'mind_map', 'mapa_mysli'],
  metadata: ['metadata', 'metadane'],
  drive: ['drive', 'zapis_drive']
};
const sourceStages = first.etapy && typeof first.etapy === 'object' && !Array.isArray(first.etapy) ? first.etapy : {};
const stages = {};
function stageValue(value) {
  if (value === true || value === false) return value;
  const normalized = text(value, 24).toUpperCase();
  if (/^(OK|SUCCESS|DONE)$/.test(normalized)) return true;
  if (/^(FAILED|ERROR|BRAK|MISSING)$/.test(normalized)) return false;
  return 'PENDING';
}
for (const [canonical, aliases] of Object.entries(stageAliases)) {
  const key = aliases.find(alias => Object.prototype.hasOwnProperty.call(sourceStages, alias));
  if (key) stages[canonical] = stageValue(sourceStages[key]);
}

const defaultMessages = {
  SUCCESS: 'Analiza zakończona. Otwórz folder, aby zobaczyć zapisane wyniki.',
  PARTIAL: 'Analiza zakończyła się częściowo. Otwórz folder, aby sprawdzić zapisane wyniki.',
  PYTANIE: 'Media Intelligence potrzebuje doprecyzowania. Odpowiedz w rozmowie z DONĄ.'
};
const suppliedMessage = safeMessage(first.komunikat || first.pytanie || '', 500);
const source = youtubeUrl(first.zrodlo || first.source_url) || youtubeUrl(auth.url);
return [{ json: {
  ok: ['SUCCESS', 'PARTIAL'].includes(status),
  statusCode: 200,
  status,
  message: suppliedMessage || defaultMessages[status],
  title: text(first.tytul || first.title, 240),
  source,
  folderUrl: driveUrl(first.folder_url || first.folderUrl),
  files,
  stages,
  transcriptCharacters: Math.floor(boundedNumber(first.znakow_transkrypcji, 100000000)),
  coverage: boundedNumber(first.pokrycie_procent, 100),
  mayHavePartialResult: status === 'PARTIAL',
  doNotRetryAutomatically: true
} }];
