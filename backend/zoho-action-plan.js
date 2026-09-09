const crypto = require('crypto');
const source = $json && typeof $json === 'object' ? $json : {};
const value = key => source[key] === undefined || source[key] === null ? '' : String(source[key]).trim();
const operation = value('operation').toLowerCase();
const fail = error => ({json:{ok:false,mode:'invalid',error}});
if (value('tenant_id') !== 'PM') return fail('TENANT_NOT_ALLOWED');
if (operation === 'read') {
  const start = value('range_start'), end = value('range_end');
  const startDate = start && Number.isFinite(Date.parse(start)) ? new Date(start) : new Date();
  const endDate = end && Number.isFinite(Date.parse(end)) ? new Date(end) : new Date(startDate.getTime() + 30*86400000);
  if (endDate <= startDate || endDate-startDate > 31*86400000) return fail('INVALID_RANGE');
  const compact = date => date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  return {json:{ok:true,mode:'read',apiBase:'https://calendar.zoho.eu',calendarId:value('calendar_id'),range:JSON.stringify({start:compact(startDate),end:compact(endDate)})}};
}
const actionTypes={plan_create:'ZOHO_EVENT_CREATE',plan_update:'ZOHO_EVENT_UPDATE',plan_delete:'ZOHO_EVENT_DELETE'};
const actionType=actionTypes[operation];
if(!actionType)return fail('OPERATION_NOT_ALLOWED');
const clean=(key,max)=>value(key).slice(0,max);
const calendarId=clean('calendar_id',500),eventUid=clean('event_uid',500),etag=clean('etag',120);
const recurrenceId=clean('recurrence_id',80),recurrenceEditType=clean('recurrence_edit_type',20);
const title=clean('title',500),start=clean('start',80),end=clean('end',80),location=clean('location',255),description=clean('description',10000);
const allDay=source.all_day===true||value('all_day').toLowerCase()==='true';
const timezone=clean('timezone',80)||'Europe/Warsaw';
if(!calendarId||timezone!=='Europe/Warsaw')return fail('INVALID_CALENDAR');
if(recurrenceEditType&&!['only','following','all'].includes(recurrenceEditType))return fail('INVALID_RECURRENCE_SCOPE');
let attendees=[];try{const raw=Array.isArray(source.attendees)?source.attendees:JSON.parse(value('attendees_json')||'[]');if(!Array.isArray(raw))throw new Error();attendees=[...new Set(raw.map(v=>String(v).trim().toLowerCase()).filter(Boolean))];}catch{return fail('INVALID_ATTENDEES');}
if(attendees.length>50||attendees.some(v=>v.length>320||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)))return fail('INVALID_ATTENDEES');
const notifyRaw=source.notify_attendees===undefined||source.notify_attendees===''?0:Number(source.notify_attendees);
if(![0,1,2].includes(notifyRaw))return fail('INVALID_NOTIFICATION_MODE');
const notifyAttendees=attendees.length?notifyRaw:0;
if(actionType==='ZOHO_EVENT_CREATE'&&(!title||!start||!end))return fail('MISSING_EVENT_FIELDS');
if(actionType==='ZOHO_EVENT_UPDATE'&&(!eventUid||!etag||!(title||start||end||location||description)))return fail('MISSING_UPDATE_FIELDS');
if(actionType==='ZOHO_EVENT_DELETE'&&(!eventUid||!etag))return fail('MISSING_DELETE_FIELDS');
if((start||end)&&(!start||!end||!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end))||Date.parse(end)<=Date.parse(start)))return fail('INVALID_EVENT_TIME');
const payload={calendarId,eventUid,etag,recurrenceId,recurrenceEditType,title,start,end,allDay,location,description,attendees,notifyAttendees,timezone};
for(const key of Object.keys(payload))if(payload[key]===''||(Array.isArray(payload[key])&&!payload[key].length))delete payload[key];
const payloadPreview=JSON.stringify(payload),payloadHash=crypto.createHash('sha256').update(payloadPreview).digest('hex');
const now=new Date(),approvalId='zoho-'+String($execution.id)+'-'+operation.slice(5);
return {json:{ok:true,mode:'plan',tenantId:'PM',approvalId,actionType,payloadPreview,payloadHash,requestedBy:clean('requested_by',120)||'DONA',correlationId:clean('correlation_id',160)||String($execution.id),createdAt:now.toISOString(),expiresAt:new Date(now.getTime()+24*3600000).toISOString(),title:actionType==='ZOHO_EVENT_CREATE'?'Dodanie spotkania: '+title:actionType==='ZOHO_EVENT_UPDATE'?'Zmiana spotkania: '+(title||eventUid):'Anulowanie spotkania: '+(title||eventUid)}};
