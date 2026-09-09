const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('backend/workspace.workflow.ts','utf8');
const nodes = [...source.matchAll(/^const \w+ = (?:node|trigger)\((\{.*\})\);$/gm)].map(match=>JSON.parse(match[1]));

test('legacy research tables use verified schema and owner-gated reads',()=>{
  for (const [name,id] of [['Read Research','fUm0Roh35CycVB8Y'],['Read Competitor Observations','HVksoxfn9IR8A2sc']]) {
    const node=nodes.find(n=>n.config.name===name);
    assert.ok(node,name);
    assert.equal(node.config.parameters.dataTableId.value,id);
    assert.equal(node.config.parameters.filters,undefined,'klient_id is a customer reference, not tenant identity');
    assert.equal(node.config.parameters.returnAll,false);
    assert.equal(node.config.parameters.limit,251);
  }
  assert.match(source,/gate\.output\(0\)/);
  const runtime=fs.readFileSync('backend/workspace-snapshot.js','utf8');
  assert.match(runtime,/context\.tenantId !== 'PM'/);
  assert.match(runtime,/readOwnerTable\('Read Research','researches'\)/);
  assert.match(runtime,/readOwnerTable\('Read Competitor Observations','competitorObservations'\)/);
});

test('each independent snapshot table read runs once and preserves the empty response path',()=>{
  const tables=nodes.filter(n=>n.type==='n8n-nodes-base.dataTable');
  assert.ok(tables.length>=29);
  for(const node of tables){
    assert.equal(node.config.executeOnce,true,node.config.name);
    assert.equal(node.config.alwaysOutputData,true,node.config.name);
  }
});
