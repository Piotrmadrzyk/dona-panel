import json
from pathlib import Path
r=Path(__file__).resolve().parents[1]
nodes=[]
def node(var,name,kind,params,version=None,**extra):
    versions={'webhook':2.1,'dataTable':1.1,'code':2,'if':2.3,'respondToWebhook':1.5}
    spec={'type':'n8n-nodes-base.'+kind,'version':version or versions[kind],'config':{'name':name,'parameters':params,**extra},'output':[{'authorized':True,'tenantId':'PM','ok':True,'error':'','statusCode':200,'kind':'social','id':'sample-id','eventId':'sample-event','title':'Sample','status':'APPROVED','brandId':'probatum','date':'2026-09-08T12:00:00Z'}]}
    nodes.append((var,spec));return var

def cond(field,value,op='eq'):return {'keyName':field,'condition':op,'keyValue':value}
def read(var,name,tid,conditions):return node(var,name,'dataTable',{'resource':'row','operation':'get','dataTableId':{'__rl':True,'mode':'id','value':tid},'returnAll':False,'limit':2,'matchType':'allConditions','filters':{'conditions':conditions}},executeOnce=True,alwaysOutputData=True)
def expr(v):return "={{ $('Check Exact Content').first().json."+v+" }}"
def gate(var,name,expression):return node(var,name,'if',{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict','version':2},'conditions':[{'leftValue':expression,'operator':{'type':'boolean','operation':'true'}}],'combinator':'and'}})
def write(var,name,tid,conditions,value,op='update'):
    return node(var,name,'dataTable',{'resource':'row','operation':op,'dataTableId':{'__rl':True,'mode':'id','value':tid},'matchType':'allConditions','filters':{'conditions':conditions},'columns':{'mappingMode':'defineBelow','value':value,'schema':[{'id':k,'displayName':k,'type':'string','display':True,'required':False,'defaultMatch':False,'canBeUsedToMatch':True} for k in value]}},executeOnce=True,alwaysOutputData=True)
node('request','Workspace Request','webhook',{'httpMethod':'POST','path':'dona-panel-actions','responseMode':'responseNode','options':{'allowedOrigins':'https://dona.probatum.pl'}})
read('secret','Panel Credential','gtb2O8mzxTu0Wd2l',[cond('nazwa','panel_haslo')])
auth=(r/'backend/workspace-auth.js').read_text().replace("body.operation !== 'snapshot'","!['decision','save_memory'].includes(body.operation)")
auth=auth.replace("return [{json:","const origin = $('Workspace Request').first().json.headers?.origin;\nif(authorized && origin !== 'https://dona.probatum.pl'){error='origin_not_allowed';statusCode=403;}\nreturn [{json:")
(r/'backend/action-auth.js').write_text(auth)
node('auth','Validate Access','code',{'jsCode':auth,'mode':'runOnceForAllItems'})
gate('access','Authorized','={{ $json.authorized }}')
read('social','Read Social Target','ML98cvIaIgZtd7u9',[cond('post_key',"={{ $('Workspace Request').first().json.body.kind === 'social' ? $('Workspace Request').first().json.body.id : '__NO_TARGET__' }}")])
read('approval','Read Approval Target','KGyAqpVVwhv7G0Ra',[cond('tenant_id','PM'),cond('approval_id',"={{ $('Workspace Request').first().json.body.kind === 'approval' ? $('Workspace Request').first().json.body.id : '__NO_TARGET__' }}")])
node('guard','Check Exact Content','code',{'jsCode':(r/'backend/action-guard.js').read_text(),'mode':'runOnceForAllItems'})
gate('valid','Content Is Current','={{ $json.ok }}')
gate('memoryGate','Memory Request',"={{ $('Check Exact Content').first().json.kind === 'memory' }}")
gate('socialGate','Social Decision',"={{ $('Check Exact Content').first().json.kind === 'social' }}")
write('saveMemory','Save Memory','XeJ2EyohsX0nIrgz',[cond('wpis_id',expr('id')),cond('tenant_id','PM')],{'wpis_id':expr('id'),'tenant_id':'PM','tresc':expr('text'),'typ':'notatka','status':'ACTIVE','tagi':expr('tags'),'aktor':'Piotr','zrodlo_kanal':'panel','zrodlo_ref':expr('sourceUrl'),'utworzono':expr('now'),'aktualizacja':expr('now')},'upsert')
write('saveSocial','Save Social Decision','ML98cvIaIgZtd7u9',[cond('id',expr('rowId')),cond('post_key',expr('id')),cond('status','DRAFT'),cond('caption_hash',expr('captionHash')),cond('caption',expr('caption')),cond('image_sha256',expr('imageHash')),cond('profile_key',expr('profileKey')),cond('fb_page_id',expr('pageId')),cond('source_url',expr('sourceUrl')),cond('image_url',expr('imageUrl'))],{'status':expr('status'),'approved_by':'Piotr','approved_at':expr('now'),'approved_hash':expr('approvedHash')})
write('saveApproval','Save Approval Decision','KGyAqpVVwhv7G0Ra',[cond('id',expr('rowId')),cond('tenant_id','PM'),cond('status','REQUESTED'),cond('payload_preview',expr('payloadPreview')),cond('expires_at',expr('expiresAt')),cond('action_type',expr('actionType')),cond('payload_hash',expr('payloadHash'))],{'status':expr('status'),'approved_by':'panel:piotr','approved_at':expr('now'),'decision_source':'dona_panel','evidence':'Owner reviewed exact content in authenticated panel'})
node('result','Confirm Saved Result','code',{'jsCode':(r/'backend/action-result.js').read_text(),'mode':'runOnceForAllItems'})
gate('saved','Saved Successfully','={{ $json.ok }}')
node('audit','Record Decision History','dataTable',{'resource':'row','operation':'insert','dataTableId':{'__rl':True,'mode':'id','value':'prNvnc22Kdu4GVQI'},'columns':{'mappingMode':'defineBelow','value':{'tenant_id':'PM','event_id':'={{ $json.eventId }}','kind':'={{ $json.kind }}','title':'={{ $json.title }}','status':'={{ $json.status }}','reference_id':'={{ $json.id }}','brand_id':'={{ $json.brandId }}','occurred_at':'={{ $json.date }}'}}},executeOnce=True,alwaysOutputData=True,onError='continueRegularOutput')
node('final','Return Saved Result','code',{'jsCode':"const r=$('Confirm Saved Result').first().json;return [{json:{...r,historySaved:$input.all().some(i=>i.json.event_id===r.eventId)}}];",'mode':'runOnceForAllItems'})
headers={'entries':[{'name':'Cache-Control','value':'no-store'},{'name':'X-Content-Type-Options','value':'nosniff'}]}
node('respond','Return Action','respondToWebhook',{'respondWith':'json','responseBody':'={{ $json }}','options':{'responseCode':'={{ $json.statusCode || 200 }}','responseHeaders':headers}})
node('deny','Return Denied','respondToWebhook',{'respondWith':'json','responseBody':'={{ {ok:false,error:$json.error} }}','options':{'responseCode':'={{ $json.statusCode || 400 }}','responseHeaders':headers}})
settings={'executionOrder':'v1','executionTimeout':60,'saveDataErrorExecution':'none','saveDataSuccessExecution':'none','saveExecutionProgress':False,'saveManualExecutions':False,'timezone':'Europe/Warsaw','callerPolicy':'workflowsFromSameOwner'}
lines=["import { workflow, node, trigger } from '@n8n/workflow-sdk';"]
for var,spec in nodes: lines.append('const '+var+' = '+('trigger' if spec['type'].endswith('webhook') else 'node')+'('+json.dumps(spec,ensure_ascii=False).replace('$','\\u0024')+');')
lines.append("export default workflow('dona-panel-actions','DONA Panel — decyzje i pamięć',"+json.dumps({'settings':settings})+")\n.add(request).to(secret).to(auth).to(access)\n.add(access.output(0).to(social).to(approval).to(guard).to(valid))\n.add(access.output(1).to(deny))\n.add(valid.output(0).to(memoryGate))\n.add(valid.output(1).to(deny))\n.add(memoryGate.output(0).to(saveMemory).to(result))\n.add(memoryGate.output(1).to(socialGate))\n.add(socialGate.output(0).to(saveSocial).to(result))\n.add(socialGate.output(1).to(saveApproval).to(result))\n.add(result).to(saved)\n.add(saved.output(0).to(audit).to(final).to(respond))\n.add(saved.output(1).to(deny));")
(r/'backend/actions.workflow.ts').write_text('\n'.join(lines))
(r/'backend/actions.nodes.json').write_text(json.dumps([{'name':n['config']['name'],'type':n['type'],'typeVersion':n['version'],'parameters':n['config']['parameters']} for _,n in nodes],ensure_ascii=False))
