import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrialWorkspace,trialWorkspaceKey,trialDraftKey} from '../app/trial-workspace.ts';
import {demoLeads,walkthroughTaskCode} from '../app/demo-data.ts';
import {commentTarget} from '../app/comment-outreach.ts';
test('fresh trial contains only one unconfigured task and no previous execution or quota usage',()=>{
 const base={schema:11,collectionTasks:[{id:99}],tasks:[{id:99}],batches:[{id:99}],inboxMessages:[{id:'old'}],queue:{ids:[99]},quota:{A:{used:20},G:{used:20}}};
 const result=createTrialWorkspace(base,demoLeads);
 assert.equal(result.collectionTasks.length,1);
 assert.equal(result.collectionTasks[0].status,'待配置');
 assert.equal(result.collectionTasks[0].sourceTaskCode,walkthroughTaskCode);
 for(const key of ['tasks','batches','inboxMessages','selected','failed']) assert.deepEqual(result[key],[]);
 for(const q of Object.values(result.quota)) {assert.equal(q.used,0);assert.equal(q.reserved,0);assert.ok(q.total>=26);}
 const rows=demoLeads.filter(l=>l.sourceTaskCode===walkthroughTaskCode);
 assert.equal(rows.length,26);
 assert.equal(rows.filter(l=>!l.sourceIssue&&commentTarget(l)).length,24);
 assert.equal(base.tasks.length,1);
 assert.notEqual(trialWorkspaceKey,'lead-radar-workspace-11');
 assert.notEqual(trialDraftKey,'lead-radar-reply-drafts-4');
});
