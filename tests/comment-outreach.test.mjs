import test from 'node:test';
import assert from 'node:assert/strict';
import {retainedPosts, commentTarget} from '../app/comment-outreach.ts';
const post = {id:'post-1',authorId:'provider-1',authorName:'服务商',title:'推广服务',content:'主帖推广内容'};
const lead = {id:1,handle:'buyer-1',name:'咨询用户',grade:'A',context:'怎么合作？',commentId:'comment-1',sourcePost:post};
test('source posts survive grade exclusion and multiple comments retain one linked post',()=>{
 assert.deepEqual(retainedPosts([lead,{...lead,id:2,grade:'D',commentId:'comment-2'}]),[post]);
 assert.deepEqual(retainedPosts([{...lead,grade:'D'}]),[post]);
});
test('comment target keeps author and commenter distinct and snapshots original evidence',()=>{
 const local={...lead,sourcePost:{...post}};
 const target=commentTarget(local);
 local.sourcePost.title='后续改动';local.context='后续改动';
 assert.equal(target.post.title,'推广服务');assert.equal(target.text,'怎么合作？');
 assert.equal(target.post.authorId,'provider-1');assert.equal(target.userId,'buyer-1');
 assert.equal(target.commentId,'comment-1');
});
test('missing location data cannot become a comment target',()=>{
 assert.equal(commentTarget({...lead,sourcePost:undefined}),null);
 assert.equal(commentTarget({...lead,commentId:undefined}),null);
 assert.equal(commentTarget({...lead,sourcePost:{...post,authorId:''}}),null);
});

import {postActions, canReply, advanceCommentPlan} from '../app/comment-outreach.ts';
test('A accepts contextual D, G rejects D, neither accepts missing context',()=>{
 assert.equal(canReply({...lead,grade:'D'},'BULK'),true);
 assert.equal(canReply({...lead,grade:'D'},'PRECISION'),false);
 assert.equal(canReply({...lead,context:'这个可以吗？'},'BULK'),false);
 assert.equal(canReply({...lead,sourceIssue:'missing_context'},'BULK'),false);
});
const raw={...lead,id:101,recordKind:'post',commentId:undefined,context:post.content};
test('only main-post records without matching comments become direct-post actions',()=>{
 assert.equal(postActions([lead]).length,0);
 assert.equal(postActions([raw,lead]).length,0);
 assert.equal(postActions([raw,{...lead,sourceTaskCode:'another-task'}]).length,1);
 const actions=postActions([raw]);
 assert.equal(actions.length,1);assert.equal(actions[0].id,-101);
 assert.equal(commentTarget(actions[0]).kind,'post');assert.equal(commentTarget(actions[0]).commentId,'');
 assert.equal(canReply(raw,'BULK'),false);assert.equal(canReply(raw,'PRECISION'),false);
 assert.equal(postActions([{...raw,sourcePost:{...post,content:''}}]).length,0);
});
test('successful replies do not skip other rows or inspect historical post coverage',()=>{
 const next=advanceCommentPlan({1:'发送成功',2:'待执行',[-101]:'待执行'},[1,2,-101]);
 assert.equal(next.results[2],'执行中');assert.equal(next.results[-101],'待执行');
 assert.equal(advanceCommentPlan({[-101]:'待执行'},[-101]).results[-101],'执行中');
 assert.equal(advanceCommentPlan({1:'发送失败',[-101]:'待执行'},[1,-101],false).results[-101],'待执行');
});
