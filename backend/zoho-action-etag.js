const action=$('Prepare Approved Calendar Action').first().json,raw=$json||{},body=raw.body||raw,code=Number(raw.statusCode)||200,event=Array.isArray(body.events)?body.events[0]:null;
const current=event&&String(event.uid||'')===action.eventUid&&String(event.etag||'')===action.expectedEtag;
return {json:{...action,ok:current,error:current?'':'STALE_EVENT',currentEtag:event?String(event.etag||''):''}};
