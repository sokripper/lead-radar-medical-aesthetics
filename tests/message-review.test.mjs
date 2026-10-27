import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewPage} from '../app/message-review.ts';
import {contextualOpeningCopy, productOpeningCopy} from '../app/outreach-copy.ts';

const items = Array.from({length:2503}, (_, i) => ({id:i + 1,name:`用户${i + 1}`,grade:['A','B','C','D'][i % 4],scene:'运营问题',context:'账号有流量但没有咨询',text:`草稿${i + 1}`,status:i % 2 ? '待执行' : '发送成功',edited:i === 1200,issue:i === 2502 ? '话术为空' : ''}));
test('2503 recipients are bounded to the selected page without mutating task membership or drafts', () => {
  const original = structuredClone(items);
  const first = reviewPage(items,'','全部','全部',1,20);
  const last = reviewPage(items,'','全部','全部',999,20);
  assert.equal(first.rows.length,20);
  assert.equal(first.pages,126);
  assert.deepEqual(last.rows.map(x=>x.id),[2501,2502,2503]);
  assert.equal(last.page,126);
  assert.deepEqual(items,original);
  assert.equal(reviewPage(items,'','全部','全部',61,20).rows[0].text,'草稿1201');
});
test('review search and issue filters span all pages and empty results are well defined', () => {
  assert.equal(reviewPage(items,'用户2503','全部','全部',1,10).rows[0].id,2503);
  assert.equal(reviewPage(items,'','全部','待处理',1,10).rows[0].id,2503);
  assert.equal(reviewPage(items,'','全部','已编辑',1,10).rows[0].id,1201);
  assert.ok(reviewPage(items,'','B','待执行',1,50).rows.every(x=>x.grade==='B' && x.status==='待执行'));
  const none=reviewPage(items,'不存在的名字','全部','全部',99,10);
  assert.equal(none.rows.length,0);assert.equal(none.page,1);assert.equal(none.pages,1);
  assert.equal(reviewPage(items,'','全部','全部',-1,9999).rows.length,10);
});
const rules={industry:'新媒体运营',offering:'小红书代运营与达人投放',audience:'商家',businessNeeds:'账号增长'};
test('contextual examples respond to different needs without invented experience or repeating the product pitch', () => {
  const leads=[
    {intent:'账号转化',context:'笔记有流量但没转化',businessScene:'运营问题'},
    {intent:'招聘运营',context:'招人还是外包',businessScene:'招聘运营'},
    {intent:'达人合作',context:'新品想找达人',businessScene:'达人投放'},
    {intent:'运营合作',context:'想了解收费',businessScene:'服务合作'},
  ];
  const messages=leads.map(l=>contextualOpeningCopy(l,rules));
  assert.equal(new Set(messages).size,4);
  assert.match(messages[0],/咨询/);assert.match(messages[1],/招人和外包/);assert.match(messages[2],/达人/);assert.match(messages[3],/费用/);
  for(const message of messages){
    assert.doesNotMatch(message,/我们提供|我之前|亲测|我也用过|保证|提升\d|免费|立即下单/);
    assert.ok(message.length < 120);
    assert.equal((message.match(/？/g)||[]).length,1);
  }
});
test('weak context and other industries do not inherit fabricated social-media needs', () => {
  const weak=contextualOpeningCopy({intent:'日常互动',context:'谢谢分享，收藏',businessScene:'泛讨论'},rules);
  assert.match(weak,/先了解|只是看看/);assert.doesNotMatch(weak,/你需要|正在找|看到你在/);
  const factory=contextualOpeningCopy({intent:'厂房租赁',context:'有没有500平的厂房'}, {industry:'工业招商',offering:'工业厂房租赁'});
  assert.match(factory,/厂房租赁/);assert.doesNotMatch(factory,/运营|投放|达人|500平的有/);
  assert.doesNotMatch(productOpeningCopy(rules,1),/看到你|你的帖子|你正在/);
});
