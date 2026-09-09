import json
from pathlib import Path

r=Path(__file__).resolve().parents[1]
nodes=[]
sample={'ok':True,'mode':'plan','approvalId':'zoho-sample','actionType':'ZOHO_EVENT_CREATE','calendarId':'sample-calendar','eventUid':'sample@zoho.com','etag':'1234','statusCode':200,'requestedBy':'DONA','payloadPreview':'{}','payloadHash':'0'*64,'createdAt':'2026-09-09T16:00:00Z','expiresAt':'2026-09-10T16:00:00Z','correlationId':'sample-correlation','rowId':'1','claimToken':'zoho-exec-sample','claimExpiresAt':'2026-09-09T16:05:00Z','method':'POST','url':'https://calendar.zoho.eu/api/v1/calendars/sample-calendar/events','eventData':'{}','recurrenceId':'','expectedEtag':'1234','executionStatus':'EXECUTED','executedAt':'2026-09-09T16:00:00Z','error':''}

def add(var,name,kind,params,version=None,**config):
    versions={'executeWorkflowTrigger':1.2,'scheduleTrigger':1.3,'code':2,'if':2.3,'switch':3.4,'httpRequest':4.4,'dataTable':1.1}
    spec={'type':'n8n-nodes-base.'+kind,'version':version or versions[kind],'config':{'name':name,'parameters':params,**config},'output':[sample]}
    nodes.append((var,spec));return var

def condition(left,right,kind='string',operation='equals'):
    result={'leftValue':left,'operator':{'type':kind,'operation':operation}}
    if operation not in ['true','false']: result['rightValue']=right
    return result

inputs=[
 {'name':'operation','type':'string'},{'name':'tenant_id','type':'string'},{'name':'calendar_id','type':'string'},
 {'name':'event_uid','type':'string'},{'name':'etag','type':'string'},{'name':'recurrence_id','type':'string'},
 {'name':'recurrence_edit_type','type':'string'},{'name':'title','type':'string'},{'name':'start','type':'string'},
 {'name':'end','type':'string'},{'name':'all_day','type':'boolean'},{'name':'location','type':'string'},
 {'name':'description','type':'string'},{'name':'attendees_json','type':'string'},{'name':'notify_attendees','type':'number'},
 {'name':'timezone','type':'string'},{'name':'requested_by','type':'string'},{'name':'correlation_id','type':'string'},
 {'name':'range_start','type':'string'},{'name':'range_end','type':'string'}]
add('tool','Calendar Tool Input','executeWorkflowTrigger',{'inputSource':'workflowInputs','workflowInputs':{'values':inputs}})
add('validate','Validate Calendar Tool Input','code',{'mode':'runOnceForEachItem','jsCode':(r/'backend/zoho-action-plan.js').read_text()})
add('valid','Valid Tool Request','if',{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict','version':2},'conditions':[condition('={{ $json.ok }}','', 'boolean','true')],'combinator':'and'}})
add('readMode','Read Calendar','if',{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict','version':2},'conditions':[condition('={{ $json.mode }}','read')],'combinator':'and'}})
http_options={'timeout':20000,'redirect':{'redirect':{'followRedirects':False}},'response':{'response':{'responseFormat':'json','fullResponse':True,'neverError':True}}}
add('calendars','Read Calendars for Tool','httpRequest',{'method':'GET','authentication':'genericCredentialType','genericAuthType':'oAuth2Api','options':http_options,'url':"={{ $('Validate Calendar Tool Input').first().json.apiBase + '/api/v1/calendars' }}",'sendQuery':True,'queryParameters':{'parameters':[{'name':'category','value':'own'}]}},credentials={'oAuth2Api':"__CREDENTIAL__"})
select_code="""const request=$('Validate Calendar Tool Input').first().json,raw=$json,body=raw.body||raw,code=Number(raw.statusCode)||200;
if(code<200||code>=300||!Array.isArray(body.calendars))return {json:{ok:false,error:'ZOHO_CALENDARS_READ_FAILED'}};
const selected=request.calendarId?body.calendars.filter(c=>String(c.uid)===request.calendarId):body.calendars.filter(c=>c.isdefault===true);
if(selected.length!==1)return {json:{ok:false,error:'SELECT_ZOHO_CALENDAR'}};
return {json:{...request,selectedCalendarId:String(selected[0].uid),selectedCalendarName:String(selected[0].name||'Zoho')}};"""
add('selectCalendar','Select Tool Calendar','code',{'mode':'runOnceForEachItem','jsCode':select_code})
add('events','Read Events for Tool','httpRequest',{'method':'GET','authentication':'genericCredentialType','genericAuthType':'oAuth2Api','options':http_options,'url':"={{ $('Validate Calendar Tool Input').first().json.apiBase + '/api/v1/calendars/' + encodeURIComponent($('Select Tool Calendar').first().json.selectedCalendarId) + '/events' }}",'sendQuery':True,'queryParameters':{'parameters':[{'name':'range','value':"={{ $('Validate Calendar Tool Input').first().json.range }}"},{'name':'byinstance','value':'true'},{'name':'timezone','value':'UTC'}]}},credentials={'oAuth2Api':"__CREDENTIAL__"})
add('readResult','Return Safe Calendar Read','code',{'mode':'runOnceForEachItem','jsCode':(r/'backend/zoho-action-read.js').read_text()})
approval_values={'tenant_id':'PM','approval_id':'={{ $json.approvalId }}','requested_by':'={{ $json.requestedBy }}','action_type':'={{ $json.actionType }}','payload_preview':'={{ $json.payloadPreview }}','payload_hash':'={{ $json.payloadHash }}','created_at':'={{ $json.createdAt }}','expires_at':'={{ $json.expiresAt }}','single_use':True,'status':'REQUESTED','execution_status':'PENDING','correlation_id':'={{ $json.correlationId }}','decision_source':'dona_calendar_tool','evidence':'Prepared by DONA; exact calendar operation requires owner review'}
add('savePlan','Save Calendar Approval','dataTable',{'resource':'row','operation':'insert','dataTableId':{'__rl':True,'mode':'id','value':'KGyAqpVVwhv7G0Ra'},'columns':{'mappingMode':'defineBelow','value':approval_values}},executeOnce=True)
plan_result="const p=$('Validate Calendar Tool Input').first().json;const saved=$json&&$json.id!==undefined;return [{json:{ok:saved,approvalId:p.approvalId,actionType:p.actionType,title:p.title,status:saved?'REQUESTED':'NOT_SAVED',message:saved?'Plan zapisany w Skrzynce decyzji. Żadna zmiana nie została jeszcze wykonana.':'Nie potwierdzono zapisu planu.'}}];"
add('planResult','Return Approval Plan','code',{'mode':'runOnceForAllItems','jsCode':plan_result})
invalid_result="return {json:{ok:false,error:String($json.error||'INVALID_REQUEST')}};"
add('invalid','Return Invalid Tool Request','code',{'mode':'runOnceForEachItem','jsCode':invalid_result})

add('schedule','Every Minute','scheduleTrigger',{'rule':{'interval':[{'field':'minutes','minutesInterval':1}]}})
filters=[{'keyName':'tenant_id','condition':'eq','keyValue':'PM'},{'keyName':'status','condition':'eq','keyValue':'APPROVED'},{'keyName':'execution_status','condition':'eq','keyValue':'READY'}]
add('ready','Read Ready Calendar Approvals','dataTable',{'resource':'row','operation':'get','dataTableId':{'__rl':True,'mode':'id','value':'KGyAqpVVwhv7G0Ra'},'returnAll':False,'limit':10,'orderBy':True,'orderByColumn':'approved_at','orderByDirection':'ASC','matchType':'allConditions','filters':{'conditions':filters}})
add('prepare','Prepare Approved Calendar Action','code',{'mode':'runOnceForEachItem','jsCode':(r/'backend/zoho-action-execute.js').read_text()})
add('executable','Approval Is Executable','if',{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict','version':2},'conditions':[condition('={{ $json.ok }}','', 'boolean','true')],'combinator':'and'}})
claim_filters=[{'keyName':'id','condition':'eq','keyValue':'={{ $json.rowId }}'},{'keyName':'tenant_id','condition':'eq','keyValue':'PM'},{'keyName':'approval_id','condition':'eq','keyValue':'={{ $json.approvalId }}'},{'keyName':'payload_hash','condition':'eq','keyValue':'={{ $json.payloadHash }}'},{'keyName':'status','condition':'eq','keyValue':'APPROVED'},{'keyName':'execution_status','condition':'eq','keyValue':'READY'},{'keyName':'single_use','condition':'eq','keyValue':'true'}]
add('claim','Claim Approved Calendar Action','dataTable',{'resource':'row','operation':'update','dataTableId':{'__rl':True,'mode':'id','value':'KGyAqpVVwhv7G0Ra'},'matchType':'allConditions','filters':{'conditions':claim_filters},'columns':{'mappingMode':'defineBelow','value':{'execution_status':'CLAIMED','consumed_by':'={{ $json.claimToken }}','claim_expires_at':'={{ $json.claimExpiresAt }}','evidence':'Owner-approved calendar operation claimed by single-use executor'}}})
claim_code="const a=$('Prepare Approved Calendar Action').first().json,rows=$input.all().map(i=>i.json).filter(r=>r.id!==undefined),match=rows.find(r=>r.id===a.rowId&&r.approval_id===a.approvalId&&r.consumed_by===a.claimToken&&r.execution_status==='CLAIMED');return match?[{json:a}]:[];"
add('claimOk','Confirm Calendar Action Claim','code',{'mode':'runOnceForAllItems','jsCode':claim_code})
add('createMode','Create Event','if',{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict','version':2},'conditions':[condition('={{ $json.actionType }}','ZOHO_EVENT_CREATE')],'combinator':'and'}})
add('current','Read Current Zoho Event','httpRequest',{'method':'GET','authentication':'genericCredentialType','genericAuthType':'oAuth2Api','options':http_options,'url':'={{ $json.url }}','sendQuery':True,'queryParameters':{'parameters':[{'name':'recurrenceid','value':'={{ $json.recurrenceId }}'}]}},credentials={'oAuth2Api':"__CREDENTIAL__"})
add('etag','Verify Current Event Version','code',{'mode':'runOnceForEachItem','jsCode':(r/'backend/zoho-action-etag.js').read_text()})
add('currentOk','Event Version Is Current','if',{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict','version':2},'conditions':[condition('={{ $json.ok }}','', 'boolean','true')],'combinator':'and'}})
write_params={'method':'={{ $json.method }}','authentication':'genericCredentialType','genericAuthType':'oAuth2Api','options':http_options,'url':'={{ $json.url }}','sendQuery':True,'queryParameters':{'parameters':[{'name':'eventdata','value':'={{ $json.eventData }}'}]}}
add('writeEvent','Execute Approved Zoho Action','httpRequest',write_params,credentials={'oAuth2Api':"__CREDENTIAL__"})
add('writeResult','Verify Zoho Write Result','code',{'mode':'runOnceForEachItem','jsCode':(r/'backend/zoho-action-result.js').read_text()})
stale_code="const a=$('Prepare Approved Calendar Action').first().json;return {json:{...a,ok:false,executionStatus:'FAILED',error:'STALE_EVENT',executedAt:new Date().toISOString(),auditStatus:'FAILED',auditTitle:'Operacja Zoho zatrzymana: wydarzenie zmieniło się po zatwierdzeniu'}};"
add('stale','Build Stale Event Result','code',{'mode':'runOnceForEachItem','jsCode':stale_code})
finish_filters=[{'keyName':'id','condition':'eq','keyValue':'={{ $json.rowId }}'},{'keyName':'approval_id','condition':'eq','keyValue':'={{ $json.approvalId }}'},{'keyName':'tenant_id','condition':'eq','keyValue':'PM'},{'keyName':'status','condition':'eq','keyValue':'APPROVED'},{'keyName':'execution_status','condition':'eq','keyValue':'CLAIMED'},{'keyName':'consumed_by','condition':'eq','keyValue':'={{ $json.claimToken }}'}]
add('finish','Save Calendar Execution Result','dataTable',{'resource':'row','operation':'update','dataTableId':{'__rl':True,'mode':'id','value':'KGyAqpVVwhv7G0Ra'},'matchType':'allConditions','filters':{'conditions':finish_filters},'columns':{'mappingMode':'defineBelow','value':{'execution_status':'={{ $json.executionStatus }}','executed_at':'={{ $json.executedAt }}','evidence':'={{ $json.error || "Zoho API confirmed the approved operation" }}'}}})
audit_values={'tenant_id':'PM','event_id':'={{ "zoho-" + $execution.id + "-" + $("Prepare Approved Calendar Action").first().json.approvalId }}','kind':'calendar','title':'={{ $("Verify Zoho Write Result").isExecuted ? $("Verify Zoho Write Result").first().json.auditTitle : $("Build Stale Event Result").first().json.auditTitle }}','status':'={{ $("Verify Zoho Write Result").isExecuted ? $("Verify Zoho Write Result").first().json.auditStatus : $("Build Stale Event Result").first().json.auditStatus }}','reference_id':'={{ $("Prepare Approved Calendar Action").first().json.approvalId }}','brand_id':'','occurred_at':'={{ $now.toISO() }}'}
add('audit','Record Calendar Execution','dataTable',{'resource':'row','operation':'insert','dataTableId':{'__rl':True,'mode':'id','value':'prNvnc22Kdu4GVQI'},'columns':{'mappingMode':'defineBelow','value':audit_values}},executeOnce=True,onError='continueRegularOutput')

lines=["import { workflow, node, trigger, newCredential } from '@n8n/workflow-sdk';"]
for var,spec in nodes:
    raw=json.dumps(spec,ensure_ascii=False).replace('"__CREDENTIAL__"',"newCredential('Zoho Calendar OAuth2')").replace('$','\\u0024')
    lines.append('const '+var+' = '+('trigger' if spec['type'].endswith('Trigger') else 'node')+'('+raw+');')
settings={'availableInMCP':True,'callerPolicy':'workflowsFromSameOwner','executionOrder':'v1','executionTimeout':120,'saveDataErrorExecution':'none','saveDataSuccessExecution':'none','saveExecutionProgress':False,'saveManualExecutions':False,'timezone':'Europe/Warsaw'}
lines.append("export default workflow('dona-zoho-actions','DONA — Zoho Calendar: plan i wykonanie po zgodzie',"+json.dumps({'settings':settings})+")\n"
 ".add(tool).to(validate).to(valid)\n"
 ".add(valid.output(0).to(readMode))\n"
 ".add(valid.output(1).to(invalid))\n"
 ".add(readMode.output(0).to(calendars).to(selectCalendar).to(events).to(readResult))\n"
 ".add(readMode.output(1).to(savePlan).to(planResult))\n"
 ".add(schedule).to(ready).to(prepare).to(executable)\n"
 ".add(executable.output(0).to(claim).to(claimOk).to(createMode))\n"
 ".add(createMode.output(0).to(writeEvent).to(writeResult).to(finish).to(audit))\n"
 ".add(createMode.output(1).to(current).to(etag).to(currentOk))\n"
 ".add(currentOk.output(0).to(writeEvent))\n"
 ".add(currentOk.output(1).to(stale).to(finish));")
(r/'backend/zoho-actions.workflow.ts').write_text('\n'.join(lines))
