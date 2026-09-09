const crypto = require('crypto');
const body = $('Live Ops Request').first().json.body;
const records = $input.all().map(item => item.json).filter(row => row.nazwa === 'panel_haslo');
const validBody = body && typeof body === 'object' && !Array.isArray(body);
const password = validBody && typeof body.haslo === 'string' ? body.haslo : '';
const stored = records.length === 1 && typeof records[0].wartosc === 'string' ? records[0].wartosc : '';
const authorized = !!stored && !!password && password.length <= 256 && crypto.timingSafeEqual(
  crypto.createHash('sha256').update(password).digest(),
  crypto.createHash('sha256').update(stored).digest()
);
const operation = validBody && typeof body.operation === 'string' ? body.operation.trim().toLowerCase() : '';
let error = authorized ? '' : 'auth';
let statusCode = authorized ? 200 : 401;
if (authorized && !['liveops', 'snapshot'].includes(operation)) {
  error = 'operation_not_allowed';
  statusCode = 400;
}
if (authorized && ['tenant_id','tenantId','role','rola','user_id','userId','client_id','klient_id'].some(key => Object.prototype.hasOwnProperty.call(body,key))) {
  error = 'client_identity_not_allowed';
  statusCode = 403;
}
const origin = $('Live Ops Request').first().json.headers?.origin;
if (authorized && origin !== 'https://dona.probatum.pl') { error = 'origin_not_allowed'; statusCode = 403; }
return [{json:{authorized:authorized && !error,tenantId:'PM',operation,statusCode,error}}];
