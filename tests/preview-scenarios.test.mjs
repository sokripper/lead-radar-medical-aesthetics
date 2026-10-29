import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarioLeads,withPreviewScenarios} from '../app/preview-scenarios.ts';
import {taskStatus} from '../app/operations-state.ts';
import {quotaRemaining} from '../app/account-management.ts';
const base=()=>({tasks:[],inboxMessages:[],collectionTasks:[],batches:[],grades:{},quota:{A:{total:100,used:10,reserved:0},G:{total:200,used:20,reserved:3}}});
test('linked preview records cover task states without re-seeding or changing available quota',()=>{
 const before=base();const seeded=withPreviewScenarios(before,scenarioLeads);
 assert.deepEqual(seeded.tasks.map(t=>taskStatus(Object.values(t.results),t.paused)),['待执行','执行中','已暂停','已完成','部分完成','有待核实项','已取消']);
 assert.equal(withPreviewScenarios(seeded,scenarioLeads),seeded);
 assert.equal(quotaRemaining(before.quota,'G'),quotaRemaining(seeded.quota,'G'));
 assert.equal(new Set(scenarioLeads.map(l=>l.id)).size,scenarioLeads.length);
});
test('associated private messages point to a successful comment by the receiving account',()=>{
 const seeded=withPreviewScenarios(base(),scenarioLeads);
 for(const m of seeded.inboxMessages.filter(m=>m.association)) {
  const task=seeded.tasks.find(t=>t.id===m.association.taskId);
  assert.equal(task.results[m.association.leadId],'发送成功');
  assert.equal(task.senderAccountId,m.accountId);
  assert.equal(task.targets[m.association.leadId].userId,m.userId);
 }
});
