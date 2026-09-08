"""Generate the read-only Drive and Media Intelligence adapter for the DONA panel."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
nodes = []


def add(var, name, kind, version, params, **settings):
    spec = {'type':'n8n-nodes-base.'+kind,'version':version,'config':{'name':name,'parameters':params,**settings}}
    nodes.append('const '+var+' = '+('trigger' if kind == 'webhook' else 'node')+'('+json.dumps(spec, ensure_ascii=False)+');')


def if_equal(var, name, expected):
    add(var,name,'if',2.3,{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict','version':2},'conditions':[{'leftValue':'={{ $json.operation }}','rightValue':expected,'operator':{'type':'string','operation':'equals'}}],'combinator':'and'}})


def field(name, kind='string'):
    return {'id':name,'displayName':name,'required':False,'defaultMatch':False,'display':True,'canBeUsedToMatch':True,'type':kind}


def execute(var, name, workflow_id, values, declared):
    add(var,name,'executeWorkflow',1.2,{
        'mode':'once','source':'database',
        'workflowId':{'__rl':True,'mode':'id','value':workflow_id},
        'workflowInputs':{
            'mappingMode':'defineBelow','value':values,'matchingColumns':[],
            'schema':[field(name, kind) for name,kind in declared],
            'attemptToConvertTypes':False,'convertFieldsToString':True,
        },
        'options':{'waitForSubWorkflow':True},
    })


add('request','Panel Tools Request','webhook',2.1,{'httpMethod':'POST','path':'dona-panel-tools','responseMode':'responseNode','options':{'allowedOrigins':'https://piotrmadrzyk.github.io,https://dona.probatum.pl'}})
add('secret','Panel Credential','dataTable',1.1,{'resource':'row','operation':'get','dataTableId':{'__rl':True,'mode':'id','value':'gtb2O8mzxTu0Wd2l'},'returnAll':False,'limit':2,'matchType':'allConditions','filters':{'conditions':[{'keyName':'nazwa','condition':'eq','keyValue':'panel_haslo'}]}},executeOnce=True,alwaysOutputData=True)
add('auth','Validate Panel Tools Access','code',2,{'mode':'runOnceForAllItems','language':'javaScript','jsCode':(ROOT/'backend/tools-auth.js').read_text()})
add('access','Authorized','if',2.3,{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict','version':2},'conditions':[{'leftValue':'={{ $json.authorized }}','operator':{'type':'boolean','operation':'true'}}],'combinator':'and'}})
if_equal('isSearch','Search Drive','drive_search')
if_equal('isRead','Read Drive File','drive_read')

drive_declared=[('operacja','string'),('tenant_id','string'),('nazwa','string'),('tresc','string'),('file_id','string'),('folder_id','string'),('nowa_nazwa','string'),('limit','number'),('typ_pliku','string'),('sortuj','string'),('od_daty','string'),('w_folderze','string')]
drive_empty={'tresc':'','file_id':'','folder_id':'','nowa_nazwa':'','typ_pliku':'','sortuj':'','od_daty':'','w_folderze':''}
execute('driveSearch','Run Safe Drive Search','MhOlUFeCGdmXxxtU',{
    **drive_empty,'operacja':"={{ $('Validate Panel Tools Access').first().json.searchMode === 'content' ? 'szukaj_w_tresci' : 'szukaj' }}",
    'tenant_id':'PM','nazwa':"={{ $('Validate Panel Tools Access').first().json.query }}",'limit':20,
},drive_declared)
execute('driveRead','Run Safe Drive Read','MhOlUFeCGdmXxxtU',{
    **drive_empty,'operacja':'pobierz','tenant_id':'PM','nazwa':'',
    'file_id':"={{ $('Validate Panel Tools Access').first().json.fileId }}",'limit':1,
},drive_declared)

media_declared=[('zapytanie','string'),('typ_zrodla','string'),('tenant_id','string'),('projekt_id','string'),('tryb','string'),('w_folderze','string'),('od_daty','string'),('material_uid','string'),('transcript_revision_id','string'),('mapping_json','string'),('mapping_wersja','string')]
execute('media','Run Media Intelligence','NOVrc2bJvF8s4oQa',{
    'zapytanie':"={{ 'Przeanalizuj film YouTube: ' + $('Validate Panel Tools Access').first().json.url }}",
    'typ_zrodla':'youtube','tenant_id':'PM','projekt_id':'','tryb':'','w_folderze':'','od_daty':'',
    'material_uid':'','transcript_revision_id':'','mapping_json':'','mapping_wersja':'',
},media_declared)

add('result','Normalize Panel Tool Result','code',2,{'mode':'runOnceForAllItems','language':'javaScript','jsCode':(ROOT/'backend/tools-result.js').read_text()})
headers={'entries':[{'name':'Cache-Control','value':'no-store'},{'name':'X-Content-Type-Options','value':'nosniff'}]}
add('respond','Return Panel Tool Result','respondToWebhook',1.5,{'respondWith':'json','responseBody':'={{ $json }}','options':{'responseCode':'={{ $json.statusCode || 200 }}','responseHeaders':headers}})
add('deny','Return Panel Tool Error','respondToWebhook',1.5,{'respondWith':'json','responseBody':'={{ {ok:false,error:$json.error} }}','options':{'responseCode':'={{ $json.statusCode || 400 }}','responseHeaders':headers}})

settings={'executionOrder':'v1','executionTimeout':900,'saveDataErrorExecution':'none','saveDataSuccessExecution':'none','saveExecutionProgress':False,'saveManualExecutions':False,'timezone':'Europe/Warsaw','callerPolicy':'workflowsFromSameOwner'}
graph="""
export default workflow('dona-panel-tools','DONA Panel — Media i Dysk',SETTINGS)
  .add(request).to(secret).to(auth).to(access)
  .add(access.output(0).to(isSearch))
  .add(access.output(1).to(deny))
  .add(isSearch.output(0).to(driveSearch).to(result).to(respond))
  .add(isSearch.output(1).to(isRead))
  .add(isRead.output(0).to(driveRead).to(result))
  .add(isRead.output(1).to(media).to(result));
""".replace('SETTINGS',json.dumps({'settings':settings},ensure_ascii=False))
(ROOT/'backend/tools.workflow.ts').write_text("import { workflow, node, trigger } from '@n8n/workflow-sdk';\n"+'\n'.join(nodes)+'\n'+graph)
