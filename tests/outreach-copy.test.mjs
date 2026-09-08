import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyOutreachProfile,restoreOutreachProfile,matchingExperience,openingCopy,followupCopy} from '../app/outreach-copy.ts';
import {demoLeads} from '../app/demo-data.ts';

const lead=id=>demoLeads.find(l=>l.id===id);
const identity='测试署名';
test('new and migrated profiles do not invent personal experience',()=>{
  const empty=emptyOutreachProfile();
  assert.equal(empty.experience,'');
  assert.equal(empty.experienceConfirmed,false);
  assert.deepEqual(restoreOutreachProfile(undefined),empty);
  assert.deepEqual(restoreOutreachProfile(null),empty);
  assert.equal(restoreOutreachProfile({experienceConfirmed:'true'}).experienceConfirmed,false);
  for(const id of [1,2,3,4]){
    const text=openingCopy(lead(id),identity,empty);
    assert.doesNotMatch(text,/我也?做过|亲测|我的医生|效果很好|保证/);
    assert.match(text,/推广推荐的目的/);
    assert.ok(!text.includes(lead(id).context));
    assert.ok(text.length<200);
  }
});
test('different comments get different, grounded opening questions',()=>{
  const text=id=>openingCopy(lead(id),identity,emptyOutreachProfile());
  assert.match(text(1),/上海的超声炮机构/);
  assert.match(text(1),/备选/);
  assert.match(text(2),/材料怎么选.*不自然/);
  assert.match(text(3),/安排请假/);
  assert.match(text(4),/次数和费用.*不适合/);
  assert.doesNotMatch(text(4),/祛斑|一万/);
});
test('only confirmed and relevant experience is copied without invented outcomes',()=>{
  const profile={...emptyOutreachProfile(),project:'超声炮',experience:'我做过超声炮，当时先对比了几家的面诊安排。',experienceConfirmed:true};
  assert.equal(matchingExperience(lead(1),profile),profile.experience);
  assert.ok(openingCopy(lead(1),identity,profile).includes(profile.experience));
  assert.equal(matchingExperience(lead(2),profile),'');
  assert.equal(matchingExperience(lead(1),{...profile,experienceConfirmed:false}),'');
  assert.equal(matchingExperience(lead(1),{...profile,project:''}),'');
  assert.equal(matchingExperience(lead(1),{...profile,experience:' '}),'');
  assert.doesNotMatch(openingCopy(lead(2),identity,profile),/我做过/);
  assert.doesNotMatch(openingCopy(lead(1),identity,profile),/推荐我的医生|提升很明显|恢复很快/);
});
test('promotion purpose cannot silently disappear; real relationship statement stays verbatim',()=>{
  const p={...emptyOutreachProfile(),disclosure:'我和这家机构有推广合作，转介有佣金。'};
  assert.ok(openingCopy(lead(1),identity,p).includes(p.disclosure));
  assert.match(openingCopy(lead(1),identity,{...p,disclosure:' '}),/推广推荐的目的/);
  assert.match(openingCopy(lead(1),identity,{...p,disclosure:'有问题可以问我。'}),/推广推荐的目的/);
  assert.deepEqual(restoreOutreachProfile(p),p);
});
test('generic affirmative demo replies receive topic-led followups without invented experience or contact harvesting',()=>{
  for(const id of [1,2,3,4]){
    const text=followupCopy(lead(id));
    assert.doesNotMatch(text,/我也?做过|手机号|微信|保证|一定有效/);
    assert.ok(text.length<150);
  }
  assert.match(followupCopy(lead(2)),/材料.*没法替你判断/);
  assert.match(followupCopy(lead(3)),/个人情况问医生/);
  assert.ok(followupCopy(undefined));
});
