const crypto=require('crypto');
const r=$json||{},fail=error=>({json:{ok:false,error}});
if(r.tenant_id!=='PM'||r.status!=='APPROVED'||r.approved_by!=='panel:piotr'||r.decision_source!=='dona_panel'||r.execution_status!=='READY'||r.single_use!==true)return fail('APPROVAL_NOT_EXECUTABLE');
if(!r.expires_at||!Number.isFinite(Date.parse(r.expires_at))||Date.parse(r.expires_at)<=Date.now())return fail('APPROVAL_EXPIRED');
const preview=String(r.payload_preview||''),digest=crypto.createHash('sha256').update(preview).digest('hex');
if(!/^[a-f0-9]{64}$/.test(r.payload_hash||'')||r.payload_hash!==digest)return fail('APPROVAL_CONTENT_CHANGED');
let p;try{p=JSON.parse(preview);}catch{return fail('INVALID_APPROVAL_PAYLOAD');}
const type=String(r.action_type||'').toUpperCase();if(!['ZOHO_EVENT_CREATE','ZOHO_EVENT_UPDATE','ZOHO_EVENT_DELETE'].includes(type))return fail('ACTION_NOT_ALLOWED');
const allowed=['calendarId','eventUid','etag','recurrenceId','recurrenceEditType','title','start','end','allDay','location','description','attendees','notifyAttendees','timezone'];if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!allowed.includes(k)))return fail('INVALID_APPROVAL_PAYLOAD');
if(!p.calendarId||p.timezone!=='Europe/Warsaw')return fail('INVALID_CALENDAR');
if(Array.isArray(p.attendees)&&(p.attendees.length>50||p.attendees.some(v=>typeof v!=='string'||v.length>320||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))))return fail('INVALID_ATTENDEES');
const format=(value,allDay)=>{const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';const iso=d.toISOString();return allDay?iso.slice(0,10).replace(/-/g,''):iso.slice(0,19).replace(/[-:]/g,'')+'Z';};
const eventData={};
if(type!=='ZOHO_EVENT_DELETE'){
 if(p.title)eventData.title=String(p.title).slice(0,500);
 if(p.start||p.end){const start=format(p.start,p.allDay===true),end=format(p.end,p.allDay===true);if(!start||!end||Date.parse(p.end)<=Date.parse(p.start))return fail('INVALID_EVENT_TIME');eventData.dateandtime={start,end,timezone:'Europe/Warsaw'};eventData.isallday=p.allDay===true;}
 if(p.location!==undefined)eventData.location=String(p.location).slice(0,255);
 if(p.description!==undefined)eventData.description=String(p.description).slice(0,10000);
 if(Array.isArray(p.attendees)&&p.attendees.length)eventData.attendees=p.attendees.map(email=>({email,status:'NEEDS-ACTION'}));
 eventData.notify_attendee=[0,1,2].includes(p.notifyAttendees)?p.notifyAttendees:0;
 if(type==='ZOHO_EVENT_UPDATE')eventData.etag=String(p.etag||'');
}else{
 eventData.uid=String(p.eventUid||'');eventData.etag=String(p.etag||'');eventData.notify_attendee=[0,1,2].includes(p.notifyAttendees)?p.notifyAttendees:0;
}
if(p.recurrenceId)eventData.recurrenceid=String(p.recurrenceId);
if(p.recurrenceEditType)eventData.recurrence_edittype=String(p.recurrenceEditType);
if(type==='ZOHO_EVENT_CREATE'&&(!eventData.title||!eventData.dateandtime))return fail('MISSING_EVENT_FIELDS');
if(type!=='ZOHO_EVENT_CREATE'&&(!p.eventUid||!p.etag))return fail('MISSING_EVENT_VERSION');
return {json:{ok:true,rowId:r.id,approvalId:r.approval_id,payloadHash:r.payload_hash,actionType:type,calendarId:String(p.calendarId),eventUid:String(p.eventUid||''),expectedEtag:String(p.etag||''),recurrenceId:String(p.recurrenceId||''),method:type==='ZOHO_EVENT_CREATE'?'POST':type==='ZOHO_EVENT_UPDATE'?'PATCH':'DELETE',url:'https://calendar.zoho.eu/api/v1/calendars/'+encodeURIComponent(String(p.calendarId))+'/events'+(p.eventUid?'/'+encodeURIComponent(String(p.eventUid)):''),eventData:JSON.stringify(eventData),claimToken:'zoho-exec-'+String($execution.id),claimedAt:new Date().toISOString(),claimExpiresAt:new Date(Date.now()+5*60000).toISOString(),title:type==='ZOHO_EVENT_CREATE'?'Dodano spotkanie do Zoho':type==='ZOHO_EVENT_UPDATE'?'Zmieniono spotkanie w Zoho':'Anulowano spotkanie w Zoho'}};
