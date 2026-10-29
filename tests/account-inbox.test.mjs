import test from 'node:test';
import assert from 'node:assert/strict';
import {matchComments} from '../app/account-inbox.ts';
const record=(accountId,userId,leadId,text='想了解代运营收费')=>({accountId,taskId:1,leadId,target:{userId,text,post:{title:'账号服务',content:'服务介绍'}},replyText:'可以聊聊具体需求'});
test('incoming private messages match only comments sent by the receiving account',()=>{
 const message={accountId:'a',text:'代运营收费',userId:'u1'};
 const hits=matchComments(message,[record('a','u1',1),record('b','u1',2),record('a','u2',3)]);
 assert.deepEqual(hits.map(h=>h.leadId),[1]);assert.deepEqual(hits[0].keywords,['代运营','收费']);
});
test('same user with several comments retains multiple candidates and does not select one automatically',()=>{
 const hits=matchComments({accountId:'a',userId:'u1',text:'收费'},[record('a','u1',1),record('a','u1',2,'投放效果不理想')]);
 assert.equal(hits.length,2);assert.equal(hits[0].leadId,1);assert.ok(hits.every(h=>h.sameUser));
});
test('missing user identity allows keyword suggestions without claiming verified identity',()=>{
 const hits=matchComments({accountId:'a',text:'代运营'},[record('a','u1',1),record('a','u2',2)]);
 assert.equal(hits.length,2);assert.ok(hits.every(h=>!h.sameUser));
});
test('unmatched incoming private messages remain unassociated; matching does not mutate them',()=>{
 const message={id:'inbox-1',accountId:'a',text:'你好'};
 assert.deepEqual(matchComments(message,[record('a','u1',1)]),[]);assert.equal(message.association,undefined);
});
