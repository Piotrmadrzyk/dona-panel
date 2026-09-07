"""Generate the n8n SDK definition from reviewable runtime modules. No secrets."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
nodes = []
def add(var, name, kind, version, params, **settings):
    spec = {'type':'n8n-nodes-base.'+kind,'version':version,'config':{'name':name,'parameters':params,**settings}}
    nodes.append('const '+var+' = '+('trigger' if kind=='webhook' else 'node')+'('+json.dumps(spec,ensure_ascii=False)+');')

def table(var,name,table_id,field,value,limit=251):
    add(var,name,'dataTable',1.1,{'resource':'row','operation':'get','dataTableId':{'__rl':True,'mode':'id','value':table_id},'matchType':'allConditions','filters':{'conditions':[{'keyName':field,'condition':'eq','keyValue':value}]},'returnAll':False,'limit':limit,'orderBy':True,'orderByColumn':'createdAt','orderByDirection':'DESC'},executeOnce=True,alwaysOutputData=True,notes='Empty results are intentionally passed to the explicit empty-array handling in Build Snapshot, or fail-closed authentication. No writes.')

add('request','Workspace Request','webhook',2.1,{'httpMethod':'POST','path':'dona-workspace','responseMode':'responseNode','options':{'allowedOrigins':'https://piotrmadrzyk.github.io'}})
table('secret','Panel Credential','gtb2O8mzxTu0Wd2l','nazwa','panel_haslo',2)
add('auth','Validate Access','code',2,{'mode':'runOnceForAllItems','language':'javaScript','jsCode':(ROOT/'backend/workspace-auth.js').read_text()})
add('gate','Authorized','if',2.3,{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict','version':2},'conditions':[{'leftValue':'={{ $json.authorized }}','operator':{'type':'boolean','operation':'true'}}],'combinator':'and'}})
tables=[('config','Tenant Configuration','Njc9seD34Eeck9Vf','client_id'),('customers','Read Customers','WlE2p5ab7BLjhoSr','client_id'),('approvals','Read Approvals','KGyAqpVVwhv7G0Ra','tenant_id'),('leads','Read Leads','gAMd9Fouz9dffQaD','client_id'),('offers','Read Offers','2jCWFfufSfo7X9kr','client_id'),('meetings','Read Meetings','XfBmAVssaQ1dvOpE','client_id'),('tasks','Read Tasks','9lpZx2cRIk7edt8a','tenant_id'),('documents','Read Documents','ESx6r7mHmbKM4rj3','klient_id'),('events','Read Events','OUh2puv86Ip0YZLE','client_id')]
for var,name,tid,field in tables:
    table(var,name,tid,field,"={{ $('Validate Access').first().json.tenantId }}")
add('snapshot','Build Snapshot','code',2,{'mode':'runOnceForAllItems','language':'javaScript','jsCode':(ROOT/'backend/workspace-snapshot.js').read_text()})
headers={'entries':[{'name':'Cache-Control','value':'no-store'},{'name':'X-Content-Type-Options','value':'nosniff'}]}
add('success','Return Snapshot','respondToWebhook',1.5,{'respondWith':'json','responseBody':'={{ $json }}','options':{'responseCode':200,'responseHeaders':headers}})
add('deny','Return Denied','respondToWebhook',1.5,{'respondWith':'json','responseBody':'={{ {ok:false,error:$json.error} }}','options':{'responseCode':'={{ $json.statusCode }}','responseHeaders':headers}})
chain='.to('.join([v[0] for v in tables]+['snapshot','success']) + ')'*(len(tables)+1)
source='// Generated with python3 scripts/build-workspace.py. Runtime code lives in backend/*.js.\n'+'\n'.join(nodes)+"\nexport default workflow('dona-workspace-pilot','DONA Panel — Workspace API (pilot)')\n  .add(request).to(secret).to(auth).to(gate)\n  .add(gate.output(0).to("+chain+"))\n  .add(gate.output(1).to(deny));\n"
(ROOT/'backend/workspace.workflow.ts').write_text(source)
