import test from 'node:test';
import assert from 'node:assert/strict';
import {postOnlyDemoLeads,postOnlyCode,withPostOnlyPreview,removeObsoletePostSamples} from '../app/post-only-demo.ts';
const base=()=>({tasks:[],collectionTasks:[],batches:[],quota:{A:{total:100,used:0,reserved:0},G:{total:100,used:0,reserved:0}}});
test('showcase contains one mixed task with comment replies and post comments',()=>{
 const initial=base();const result=withPostOnlyPreview(initial,postOnlyDemoLeads);
 assert.equal(result.tasks.length,1);
 const task=result.tasks[0];assert.equal(task.ids.length,7);
 assert.equal(Object.values(task.targets).filter(t=>t.kind==='comment').length,1);
 assert.equal(Object.values(task.targets).filter(t=>t.kind==='post').length,6);
 assert.equal(task.results[-70010],undefined);assert.equal(task.results[70010],'发送成功');
 assert.equal(result.collectionTasks.length,1);assert.equal(result.batches.length,1);
 assert.equal(result.quota.A.used,2);assert.equal(result.quota.A.reserved,3);
 assert.deepEqual(result.quota.G,initial.quota.G);
 assert.equal(withPostOnlyPreview(result,postOnlyDemoLeads),result);
});
test('existing standalone demo tasks merge preserving results and edited copy without double quota',()=>{
 const initial=base();
 initial.tasks=[{id:32001,sourceTaskCode:postOnlyCode,ids:[-70001],texts:{[-70001]:'已编辑的话术'},results:{[-70001]:'发送成功'},editedCopyIds:[-70001]}];
 initial.collectionTasks=[{id:32000,sourceTaskCode:postOnlyCode}];
 initial.quota.A={total:101,used:1,reserved:0};
 const result=withPostOnlyPreview(initial,postOnlyDemoLeads);
 assert.equal(result.tasks.length,1);
 assert.equal(result.tasks[0].results[-70001],'发送成功');
 assert.equal(result.tasks[0].texts[-70001],'已编辑的话术');
 assert.deepEqual(result.tasks[0].editedCopyIds,[-70001]);
 assert.equal(result.quota.A.used,3);assert.equal(result.quota.A.reserved,2);
 assert.equal(result.quota.A.total,105);
});

test('old prototype supplementary rows are removed from both task and pending queue',()=>{
 const initial=base();initial.tasks=[{id:9,quotaModel:'A',ids:[1,-1],results:{1:'发送成功',[-1]:'待执行'},texts:{1:'保留',[-1]:'旧补充'},targets:{[-1]:{kind:'post'}}}];
 initial.queue={ids:[-1],included:[-1],blocked:[]};initial.quota.A.reserved=1;
 const next=removeObsoletePostSamples(initial,postOnlyDemoLeads);
 assert.deepEqual(next.tasks[0].ids,[1]);assert.deepEqual(next.queue.included,[]);assert.equal(next.quota.A.reserved,0);
});
