const action=$('Prepare Approved Calendar Action').first().json,raw=$json||{},body=raw.body||raw,code=Number(raw.statusCode)||0,event=Array.isArray(body.events)?body.events[0]:null;
const expected={ZOHO_EVENT_CREATE:'added',ZOHO_EVENT_UPDATE:'updated',ZOHO_EVENT_DELETE:'deleted'}[action.actionType];
const ok=code>=200&&code<300&&event&&String(event.estatus||'').toLowerCase()===expected;
return {json:{...action,ok,executionStatus:ok?'EXECUTED':'FAILED',error:ok?'':'ZOHO_WRITE_FAILED_'+code,eventUid:String(event?.uid||action.eventUid||''),eventEtag:String(event?.etag||''),executedAt:new Date().toISOString(),auditStatus:ok?'EXECUTED':'FAILED',auditTitle:ok?action.title:'Operacja Zoho nie została potwierdzona'}};
