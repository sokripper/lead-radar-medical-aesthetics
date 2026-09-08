import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyOutreachProfile,restoreOutreachProfile,matchingExperience,openingCopy,followupCopy} from '../app/outreach-copy.ts';
import {demoLeads} from '../app/demo-data.ts';

const lead=id=>demoLeads.find(l=>l.id===id);
test('new and migrated profiles do not invent personal experience',()=>{
  const empty=emptyOutreachProfile();
  assert.equal(empty.experience,'');
  assert.equal(empty.experienceConfirmed,false);
  assert.deepEqual(restoreOutreachProfile(undefined),empty);
  assert.deepEqual(restoreOutreachProfile(null),empty);
  assert.equal(restoreOutreachProfile({experienceConfirmed:'true'}).experienceConfirmed,false);
  for(const id of [1,2,3,4]){
    const text=openingCopy(lead(id),empty);
    assert.doesNotMatch(text,/我也?做过|亲测|我的医生|效果很好|保证/);
    assert.doesNotMatch(text,/先说一声|这边也做项目推广/);
    assert.ok(!text.includes(lead(id).context));
    assert.ok(text.length<200);
  }
});
test('different comments get different, grounded opening questions',()=>{
  const text=id=>openingCopy(lead(id),emptyOutreachProfile());
  assert.match(text(1),/上海的超声炮机构/);
  assert.match(text(1),/有看中哪家没/);
  assert.match(text(2),/法令纹填充.*面诊过没/);
  assert.match(text(3),/双眼皮.*几天休息/);
  assert.match(text(4),/皮秒去痘印.*面诊问过没/);
  assert.doesNotMatch(text(4),/祛斑|一万|费用/);
  assert.doesNotMatch(text(2),/更纠结.*还是.*不自然/);
});
test('openers get straight to the topic without an automatic sender introduction',()=>{
  for(const id of [1,2,3,4]){
    const text=openingCopy(lead(id),emptyOutreachProfile());
    const firstLine=text.split('\n')[0];
    assert.match(firstLine,/^哈喽姐妹～/);
    assert.doesNotMatch(text,/你好呀|我是|我叫|看到你在|最关心哪个问题|了解您的需求/);
    assert.equal((text.match(/？/g)||[]).length,1);
    assert.ok(firstLine.length<65);
  }
});
test('neutral salutation is available and survives restoring saved settings',()=>{
  const p={...emptyOutreachProfile(),greeting:'哈喽'};
  assert.match(openingCopy(lead(1),restoreOutreachProfile(p)),/^哈喽～/);
  assert.doesNotMatch(openingCopy(lead(1),p),/姐妹/);
  assert.equal(restoreOutreachProfile(undefined).greeting,'哈喽姐妹');
});
test('fallback wording does not expose internal intent labels',()=>{
  for(const intent of ['上下文不足','内容未读出','日常互动']){
    assert.ok(!openingCopy({intent,context:'',location:'未知'},emptyOutreachProfile()).includes(intent));
  }
});
test('only confirmed and relevant experience is copied without invented outcomes',()=>{
  const profile={...emptyOutreachProfile(),project:'超声炮',experience:'我做过超声炮，当时先对比了几家的面诊安排。',experienceConfirmed:true};
  assert.equal(matchingExperience(lead(1),profile),profile.experience);
  assert.ok(openingCopy(lead(1),profile).includes(profile.experience));
  assert.equal(matchingExperience(lead(2),profile),'');
  assert.equal(matchingExperience(lead(1),{...profile,experienceConfirmed:false}),'');
  assert.equal(matchingExperience(lead(1),{...profile,project:''}),'');
  assert.equal(matchingExperience(lead(1),{...profile,experience:' '}),'');
  assert.doesNotMatch(openingCopy(lead(2),profile),/我做过/);
  assert.doesNotMatch(openingCopy(lead(1),profile),/推荐我的医生|提升很明显|恢复很快/);
  assert.ok(!openingCopy(lead(1),profile).split('\n')[0].endsWith('，'));
});
test('generic project fragments do not borrow another treatment experience',()=>{
  const p={...emptyOutreachProfile(),experience:'我做过泪沟填充。',experienceConfirmed:true};
  assert.equal(matchingExperience(lead(2),{...p,project:'填充'}),'');
  assert.equal(matchingExperience(lead(3),{...p,project:'眼皮'}),'');
  assert.equal(matchingExperience(lead(1),{...p,project:'面部'}),'');
});
test('supplied relationship text stays verbatim without a forced standalone declaration',()=>{
  const p={...emptyOutreachProfile(),disclosure:'我和这家机构有推广合作，转介有佣金。'};
  assert.ok(openingCopy(lead(1),p).includes(p.disclosure));
  for(const disclosure of [' ','先说一声，我这边也做项目推广。','也先跟你说明下，这次联系有推广推荐的目的。']){
    assert.doesNotMatch(openingCopy(lead(1),{...p,disclosure}),/先说一声|这边也做项目推广|也先跟你说明下/);
  }
  assert.deepEqual(restoreOutreachProfile(p),p);
});
test('confirmed personal wording leads straight into an optional recommendation',()=>{
  const p={...emptyOutreachProfile(),project:'超声炮',experience:'我之前也做过超声炮。',experienceConfirmed:true};
  assert.equal(openingCopy(lead(1),p),'哈喽姐妹～我之前也做过超声炮。\n需要的话，可以给你推荐。');
  const withCooperation={...p,disclosure:'我体验的那家现在也有合作。'};
  assert.equal(openingCopy(lead(1),withCooperation),'哈喽姐妹～我之前也做过超声炮。\n我体验的那家现在也有合作。\n需要的话，可以给你推荐。');
  assert.doesNotMatch(openingCopy(lead(1),p),/哪家没|面诊过没|先说一声/);
});
test('complete supplied offers are not followed by a duplicate question or offer',()=>{
  const p={...emptyOutreachProfile(),project:'超声炮',experience:'我之前也做过超声炮，需要的话，可以把我当时去的那家发你看看。',experienceConfirmed:true};
  assert.equal(openingCopy(lead(1),p),`哈喽姐妹～${p.experience}`);
  const cooperation='我体验的那家现在也有合作，需要的话发你看看。';
  assert.equal(openingCopy(lead(1),{...p,experience:'我之前也做过超声炮。',disclosure:cooperation}),`哈喽姐妹～我之前也做过超声炮。\n${cooperation}`);
});
test('generic affirmative demo replies receive topic-led followups without invented experience or contact harvesting',()=>{
  for(const id of [1,2,3,4]){
    const text=followupCopy(lead(id));
    assert.doesNotMatch(text,/我也?做过|手机号|微信|保证|一定有效/);
    assert.ok(text.length<150);
  }
  assert.match(followupCopy(lead(2)),/两种材料.*没法.*替你定/);
  assert.match(followupCopy(lead(3)),/分开问医生/);
  assert.doesNotMatch(followupCopy(lead(1)),/备选|哪家/);
  assert.ok(followupCopy(undefined));
});
