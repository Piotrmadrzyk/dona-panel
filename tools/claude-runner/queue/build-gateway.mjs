import { readFile, writeFile } from 'node:fs/promises';
const read = path => readFile(new URL(path,import.meta.url),'utf8');
const strip = text => text.replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const router = await read('../model-router.mjs');
const validation = router.slice(router.indexOf('export function validateTask'),router.indexOf('export function selectExecutors'));
const common = `const { createHash } = require('crypto');\nconst fail = code => {throw new Error(code);};\n`
  + strip(validation) + strip(await read('./queries.mjs')) + strip(await read('./gateway.mjs'));
const auth = common + `
const spec = authenticateQuery($input.first().json.headers);
return [{json: spec || {query:'SELECT false AS authorized;',params:[]}}];`;
const operation = common + `
const input = $('Pilot API').first().json;
const auth = $input.first().json;
let spec, httpStatus=200;
try {
  if (auth.error) throw new Error('BACKEND_UNAVAILABLE');
  spec = authorizedQuery(input.body,auth,$('Hash worker key').first().json.params[0]);
} catch(error) {
  const allowed = ['AUTH_FAILED','INVALID_REQUEST','OPERATION_NOT_ALLOWED','SCOPE_MISMATCH','BACKEND_UNAVAILABLE'];
  const reason = allowed.includes(error.message) ? error.message : 'INVALID_REQUEST';
  httpStatus = reason==='AUTH_FAILED' ? 401 : reason==='BACKEND_UNAVAILABLE' ? 503 : 400;
  spec = {query:'SELECT false AS ok,$1::text AS error;',params:[reason]};
}
return [{json:{...spec,httpStatus}}];`;
const normalize = `const row=$input.first().json;
const httpStatus=$('Prepare scoped operation').first().json.httpStatus;
if (row.error && httpStatus===200) return [{json:{httpStatus:503,body:{ok:false,error:'BACKEND_UNAVAILABLE'}}}];
const body={ok:row.ok===true};
for(const key of ['lease','job','revision','error']) if(row[key]!==undefined) body[key]=row[key];
// pg bigint values may be strings. Accept only lossless safe nonnegative integers.
function revision(value) {const n=Number(value); if(!Number.isSafeInteger(n)||n<0) throw new Error('INVALID_REVISION'); return n;}
if(body.revision!==undefined && body.revision!==null) body.revision=revision(body.revision);
if(body.lease) body.lease.revision=revision(body.lease.revision);
return [{json:{httpStatus,body}}];`;
const codeNode = (variable,name,jsCode) => `const ${variable}=node({type:'n8n-nodes-base.code',version:2,config:{name:${JSON.stringify(name)},parameters:{mode:'runOnceForAllItems',jsCode:${JSON.stringify(jsCode)}}}});`;
const dbNode = (variable,name) => `const ${variable}=node({type:'n8n-nodes-base.postgres',version:2.7,config:{name:${JSON.stringify(name)},onError:'continueRegularOutput',credentials:{postgres:{id:'ULc4tEMGTKt9kicK',name:'PM OS — Postgres/Supabase'}},parameters:{operation:'executeQuery',query:expr('{{ $json.query }}'),options:{queryBatching:'single',queryReplacement:expr('{{ $json.params }}')}}}});`;
const code = `import {workflow,node,trigger,expr} from '@n8n/workflow-sdk';
const start=trigger({type:'n8n-nodes-base.webhook',version:2.1,config:{name:'Pilot API',parameters:{httpMethod:'POST',path:'dona-router-pilot',responseMode:'responseNode',options:{}}}});
${codeNode('hash','Hash worker key',auth)}
${dbNode('authorize','Check scoped key')}
${codeNode('prepare','Prepare scoped operation',operation)}
${dbNode('run','Execute scoped operation')}
${codeNode('format','Format safe response',normalize)}
const respond=node({type:'n8n-nodes-base.respondToWebhook',version:1.5,config:{name:'Return pilot response',parameters:{respondWith:'json',responseBody:expr('{{ $json.body }}'),options:{responseCode:expr('{{ $json.httpStatus }}'),responseHeaders:{entries:[{name:'Cache-Control',value:'no-store'}]}}}}});
export default workflow('dona-router-pilot-gateway','DONA — Router pilot: scoped gateway').add(start).to(hash).to(authorize).to(prepare).to(run).to(format).to(respond);`;
await writeFile(new URL('./gateway.workflow.ts',import.meta.url),code);
