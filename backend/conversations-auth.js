const crypto = require('crypto');
const request = $('Conversation Request').first().json || {};
const body = request.body;
const records = $input.all().map(item => item.json).filter(row => row.nazwa === 'panel_haslo');
const validBody = body && typeof body === 'object' && !Array.isArray(body);
const password = validBody && typeof body.haslo === 'string' ? body.haslo : '';
const stored = records.length === 1 && typeof records[0].wartosc === 'string' ? records[0].wartosc : '';
const authorized = !!stored && !!password && password.length <= 256 && crypto.timingSafeEqual(
  crypto.createHash('sha256').update(password).digest(),
  crypto.createHash('sha256').update(stored).digest()
);
const operation = validBody && typeof body.operation === 'string' ? body.operation.trim().toLowerCase() : '';
const threadId = validBody && typeof body.threadId === 'string' ? body.threadId.trim() : '';
const allowedOrigins = ['https://dona.probatum.pl'];
const origin = typeof request.headers?.origin === 'string' ? request.headers.origin : '';
let error = authorized ? '' : 'auth';
let statusCode = authorized ? 200 : 401;
if (authorized && !allowedOrigins.includes(origin)) { error = 'origin_not_allowed'; statusCode = 403; }
if (authorized && !['list', 'load', 'create', 'append'].includes(operation)) { error = 'operation_not_allowed'; statusCode = 400; }
if (authorized && ['tenant_id','tenantId','role_id','rola_id','user_id','userId'].some(key => Object.prototype.hasOwnProperty.call(body,key))) {
  error = 'client_identity_not_allowed'; statusCode = 403;
}
if (authorized && ['load','append'].includes(operation) && !(threadId === 'PM' || /^thread-[a-f0-9-]{20,80}$/i.test(threadId))) {
  error = 'invalid_thread'; statusCode = 400;
}
const brandId = validBody && ['probatum','silverandglass','edwardjanusz'].includes(body.brandId) ? body.brandId : '';
const title = validBody && typeof body.title === 'string' ? body.title.trim().slice(0, 80) : '';
const role = validBody && typeof body.role === 'string' ? body.role.trim().toLowerCase() : '';
const content = validBody && typeof body.content === 'string' ? body.content.trim() : '';
const messageId = validBody && typeof body.messageId === 'string' && /^msg-[a-f0-9-]{20,80}$/i.test(body.messageId) ? body.messageId : '';
if (authorized && operation === 'append' && (!['user','dona'].includes(role) || !content || content.length > 30000)) {
  error = 'invalid_message'; statusCode = 400;
}
return [{json:{
  authorized: authorized && !error,
  tenantId: 'PM', operation, threadId, brandId, title,
  role, content, messageId, statusCode, error
}}];
