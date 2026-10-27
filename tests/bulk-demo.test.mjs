import test from 'node:test';
import assert from 'node:assert/strict';
import {demoLeads,bulkDemoLeads,bulkDemoTaskCode} from '../app/demo-data.ts';
import {partitionResults} from '../app/workflow-config.ts';
test('A model demo has independent identities and 24 usable records across all four grades',()=>{
  assert.equal(new Set(demoLeads.map(lead=>lead.id)).size,demoLeads.length);
  assert.equal(demoLeads.filter(lead=>!lead.sourceTaskCode).length,10);
  assert.ok(bulkDemoLeads.every(lead=>lead.sourceTaskCode===bulkDemoTaskCode));
  const grades=Object.fromEntries(bulkDemoLeads.map(lead=>[lead.id,lead.grade]));
  const {completed,attention}=partitionResults(bulkDemoLeads,grades,[]);
  assert.equal(completed.length,24);assert.equal(attention.length,2);
  for(const grade of ['A','B','C','D']) assert.equal(completed.filter(lead=>lead.grade===grade).length,6);
});
