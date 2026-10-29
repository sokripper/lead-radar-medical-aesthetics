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
