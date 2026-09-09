const crypto = require('crypto');
const request = $('Panel Tools Request').first().json || {};
const body = request.body;
const rows = $input.all().map(item => item.json).filter(row => row.nazwa === 'panel_haslo');
const validBody = body && typeof body === 'object' && !Array.isArray(body);
const password = validBody && typeof body.haslo === 'string' ? body.haslo : '';
const stored = rows.length === 1 && typeof rows[0].wartosc === 'string' ? rows[0].wartosc : '';
const authorized = !!stored && !!password && password.length <= 256 && crypto.timingSafeEqual(
  crypto.createHash('sha256').update(password).digest(),
  crypto.createHash('sha256').update(stored).digest()
);
const allowedOrigins = ['https://dona.probatum.pl'];
const origin = typeof request.headers?.origin === 'string' ? request.headers.origin : '';
const operation = validBody && typeof body.operation === 'string' ? body.operation.trim().toLowerCase() : '';
let error = authorized ? '' : 'auth';
let statusCode = authorized ? 200 : 401;
if (authorized && !allowedOrigins.includes(origin)) { error = 'origin_not_allowed'; statusCode = 403; }
if (authorized && !['drive_search', 'drive_read', 'youtube_analyze'].includes(operation)) {
  error = 'operation_not_allowed'; statusCode = 400;
}
if (authorized && ['tenant_id','tenantId','role','rola','role_id','user_id','userId','folder_id','w_folderze'].some(key => Object.prototype.hasOwnProperty.call(body,key))) {
  error = 'client_scope_not_allowed'; statusCode = 403;
}
let query = validBody && typeof body.query === 'string' ? body.query.trim().slice(0, 500) : '';
const searchMode = validBody && body.searchMode === 'content' ? 'content' : 'name';
const fileId = validBody && typeof body.fileId === 'string' ? body.fileId.trim() : '';
let url = validBody && typeof body.url === 'string' ? body.url.trim() : '';
function normalizeYouTubeUrl(value) {
  const candidate = String(value || '').trim();
  if (!candidate || candidate.length > 1000 || /\s/.test(candidate)) return '';
  if (/^https:\/\/youtu\.be\/[A-Za-z0-9_-]{11}(?:[?&#].*)?$/i.test(candidate)) return candidate;
  const full = candidate.match(/^https:\/\/(?:(?:www|m)\.)?youtube\.com\/([^?#]*)(?:\?([^#]*))?(?:#.*)?$/i);
  if (!full) return '';
  const path = full[1] || '';
  const queryString = full[2] || '';
  if (path === 'watch' && /(?:^|&)v=[A-Za-z0-9_-]{11}(?:&|$)/.test(queryString)) return candidate;
  if (/^(?:shorts|live|embed)\/[A-Za-z0-9_-]{11}(?:\/|$)/i.test(path)) return candidate;
  return '';
}
if (authorized && operation === 'drive_search' && !query) { error = 'invalid_query'; statusCode = 400; }
if (authorized && operation === 'drive_read' && !/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) { error = 'invalid_file'; statusCode = 400; }
if (authorized && operation === 'youtube_analyze') {
  url = normalizeYouTubeUrl(url);
  if (!url) { error = 'invalid_youtube_url'; statusCode = 400; }
}
return [{json:{
  authorized: authorized && !error, tenantId:'PM', operation, query, searchMode,
  fileId, url, statusCode, error
}}];
