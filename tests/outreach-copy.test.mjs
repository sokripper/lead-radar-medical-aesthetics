import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyOutreachProfile,restoreOutreachProfile,matchingExperience,openingCopy,followupCopy,openingTemplates,outreachIssue,outreachKey} from '../app/outreach-copy.ts';
import {readyRecipients,removeSubmitted,mergePreparedQueue} from '../app/operations-state.ts';
import {demoLeads} from '../app/demo-data.ts';

const lead=id=>demoLeads.find(l=>l.id===id);
const profile=(approach='experience')=>({...emptyOutreachProfile(),approach,project:'超声炮、法令纹填充、双眼皮、皮秒',experience:openingTemplates[approach],experienceConfirmed:true});
const queue=()=>({ids:[],blocked:[],included:[],drafts:{},edited:[],copyKeys:{}});

test('the two approved batch templates are the first-outreach paths',()=>{
  for(const approach of ['experience','cooperation']){
    for(const [id,project] of [[1,'超声炮'],[2,'法令纹填充'],[3,'双眼皮'],[4,'皮秒']]){
      const text=openingCopy(lead(id),profile(approach));
      assert.equal(text,`哈喽姐妹～${openingTemplates[approach].replace('{项目}',project)}`);
      assert.doesNotMatch(text,/\{项目\}|先说一声|你好呀|我是|看到你在|面诊过没|哪家没|？/);
      assert.equal(text.includes('现在也有合作'),approach==='cooperation');
    }
  }
});
test('missing, ambiguous or unconfirmed materials never silently switch to a question opener',()=>{
  const p=profile();
  for(const value of [emptyOutreachProfile(),{...p,experienceConfirmed:false},{...p,project:''},{...p,experience:''},{...p,project:'超声炮、面部提升'}]){
    assert.ok(outreachIssue(lead(1),value));
    assert.equal(openingCopy(lead(1),value),'');
  }
  assert.equal(openingCopy(lead(2),{...p,project:'超声炮'}),'');
  assert.equal(openingCopy({intent:'上下文不足',context:'',location:'未知'},p),'');
});
test('migration preserves old material but requires the batch template to be confirmed',()=>{
  assert.deepEqual(restoreOutreachProfile(undefined),emptyOutreachProfile());
  assert.deepEqual(restoreOutreachProfile(null),emptyOutreachProfile());
  const p=profile('cooperation');
  assert.deepEqual(restoreOutreachProfile(p),p);
  const legacy={...p}; delete legacy.approach;
  const restored=restoreOutreachProfile(legacy);
  assert.equal(restored.experience,legacy.experience);
  assert.equal(restored.experienceConfirmed,false);
  assert.equal(restoreOutreachProfile({...p,experienceConfirmed:'true'}).experienceConfirmed,false);
});
test('neutral greeting and project matching survive restoring settings',()=>{
  const p={...profile(),greeting:'哈喽'};
  assert.match(openingCopy(lead(1),restoreOutreachProfile(p)),/^哈喽～/);
  assert.doesNotMatch(openingCopy(lead(1),p),/姐妹/);
  assert.equal(matchingExperience(lead(2),{...p,project:'填充'}),'');
  assert.equal(matchingExperience(lead(3),{...p,project:'眼皮'}),'');
  assert.equal(matchingExperience(lead(1),{...p,project:'面部'}),'');
});
test('a fixed single-project story cannot be copied across a multi-project batch',()=>{
  const p={...profile(),experience:'我之前也做过超声炮，需要的话发你看看。'};
  assert.ok(outreachIssue(lead(2),p));
  assert.equal(openingCopy(lead(2),p),'');
  const single={...p,project:'超声炮'};
  assert.equal(openingCopy(lead(1),single),`哈喽姐妹～${p.experience}`);
});
test('user-supplied relationship remains and complete offers are not duplicated',()=>{
  const p={...profile('cooperation'),disclosure:'这家合作机构转介有佣金。'};
  assert.ok(openingCopy(lead(1),p).endsWith(p.disclosure));
  assert.equal((openingCopy(lead(1),p).match(/需要的话/g)||[]).length,1);
  assert.ok(outreachIssue(lead(1),{...p,experience:openingTemplates.experience,disclosure:''}));
  const self={...profile(),project:'超声炮',experience:'我之前也做过超声炮。'};
  assert.equal(openingCopy(lead(1),self),'哈喽姐妹～我之前也做过超声炮。\n需要的话，可以给你推荐。');
});
test('500 recipients use the same chosen angle; unmatched projects do not block the others',()=>{
  const people=Array.from({length:500},(_,i)=>({...lead([1,2,4][i%3]),id:i+100}));
  const p={...profile('cooperation'),project:'超声炮、皮秒'};
  const prepared={candidates:people.map(l=>l.id),matched:people.map(l=>l.id),blocked:[]};
  const q=mergePreparedQueue(queue(),prepared,Object.fromEntries(people.map(l=>[l.id,openingCopy(l,p)])),outreachKey(p));
  const pending=people.filter(l=>outreachIssue(l,p)).map(l=>l.id);
  const grades=Object.fromEntries(people.map(l=>[l.id,'A']));
  const ready=readyRecipients(people,q,grades,[],{'小红书':true},pending);
  assert.equal(ready.length,people.length-pending.length);
  assert.ok(ready.every(l=>q.drafts[l.id].includes('现在也有合作')));
  assert.ok(pending.every(id=>q.drafts[id]===undefined));
});
test('old drafts and manual empty edits are retained and not marked freshly generated',()=>{
  const old={ids:[1,2],included:[1,2],blocked:[],drafts:{1:'旧问题开场',2:''},edited:[1,2],copyKeys:{1:'old',2:'old'}};
  const p=profile();
  const q=mergePreparedQueue(old,{candidates:[1,2,4],matched:[1,2,4],blocked:[]},{1:openingCopy(lead(1),p),2:openingCopy(lead(2),p),4:openingCopy(lead(4),p)},outreachKey(p));
  assert.equal(q.drafts[1],'旧问题开场');
  assert.equal(q.drafts[2],'');
  assert.equal(q.copyKeys[1],'old');
  assert.equal(q.copyKeys[4],outreachKey(p));
  const stale=q.ids.filter(id=>q.copyKeys[id]!==outreachKey(p));
  assert.deepEqual(readyRecipients([lead(1),lead(2),lead(4)],q,{1:'A',2:'B',4:'B'},[],{'小红书':true},stale).map(l=>l.id),[4]);
  assert.notEqual(outreachKey(p),outreachKey(profile('cooperation')));
});
test('partial submission and another batch preserve all unsent drafts without auto-selecting them',()=>{
  const q={ids:[1,2,4],included:[1,2,4],blocked:[],drafts:{1:'提交',2:'待补充旧稿',4:'已编辑'},edited:[4],copyKeys:{1:'key',2:'old',4:'key'}};
  const rest=removeSubmitted(q,[1]);
  assert.deepEqual(rest.ids,[2,4]);
  assert.deepEqual(rest.drafts,{2:'待补充旧稿',4:'已编辑'});
  assert.deepEqual(rest.edited,[4]);
  assert.deepEqual(JSON.parse(JSON.stringify(rest)),rest);
  const next=mergePreparedQueue(rest,{candidates:[3],matched:[3],blocked:[]},{3:'新草稿'},'new');
  assert.deepEqual(next.ids,[2,4,3]);
  assert.deepEqual(next.included,[3]);
  assert.equal(next.drafts[4],'已编辑');
});
test('followups remain separate from first-outreach templates',()=>{
  for(const id of [1,2,3,4]){
    assert.doesNotMatch(followupCopy(lead(id)),/我也?做过|手机号|微信|保证|一定有效/);
  }
  assert.ok(followupCopy(undefined));
});
