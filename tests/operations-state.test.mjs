import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleId, eligibleIds, canConfirmSend, prepareDemoRecipients, readyRecipients } from '../app/operations-state.ts';

test('changing selection does not mutate the shared lead list', () => {
  const original = [1, 2];
  assert.deepEqual(toggleId(original, 1), [2]);
  assert.deepEqual(toggleId(original, 3), [1, 2, 3]);
  assert.deepEqual(original, [1, 2]);
});
test('only selected, verified and approved leads with nonempty drafts may enter a task', () => {
  assert.deepEqual(eligibleIds([1,2,3,4], [1,2,4], [1,3,4], [], {1:'hello',3:'hello',4:' '}), [1]);
});
test('already contacted people never enter another first-outreach task', () => {
  assert.deepEqual(eligibleIds([1,2], [1,2], [1,2], [1], {1:'hello',2:'hello'}), [2]);
});
test('unselected approved leads are not accidentally sent', () => {
  assert.deepEqual(eligibleIds([2], [1,2], [1,2], [], {1:'hello',2:'hello'}), [2]);
});
test('single send confirmation is enabled only for a ready audience and account', () => {
  assert.equal(canConfirmSend([1], 'demo', false), true);
  assert.equal(canConfirmSend([], 'demo', false), false);
  assert.equal(canConfirmSend([1], '', false), false);
  assert.equal(canConfirmSend([1], 'demo', true), false);
});
test('deselecting a recipient excludes their draft from final confirmation', () => {
  assert.deepEqual(eligibleIds([1], [1], [], [], {1:'edited text'}), []);
});
test('background preparation isolates identity exceptions without blocking valid recipients', () => {
  const result = prepareDemoRecipients([1,2,3,4,4,99], [1,2,3,4], [2]);
  assert.deepEqual(result, { candidates:[1,3,4], matched:[1,4], blocked:[3] });
  assert.deepEqual(eligibleIds(result.candidates, result.matched, result.matched, [2], {1:'hello',3:'never send',4:'hello'}), [1,4]);
});
test('an all-failed identity check cannot produce a sendable task', () => {
  const result = prepareDemoRecipients([3], [3], []);
  assert.equal(canConfirmSend(result.matched, 'demo', false), false);
});
test('final queue uses current edited message text without an extra per-message approval step', () => {
  const drafts = {1:'edited by customer'};
  const ids = eligibleIds([1], [1], [1], [], drafts);
  const snapshot = Object.fromEntries(ids.map((id) => [id,drafts[id]]));
  drafts[1] = 'later change';
  assert.deepEqual(snapshot, {1:'edited by customer'});
});
test('only supported source records can enter a task', () => {
  const people=[{id:1,source:'小红书评论'},{id:4,source:'未支持渠道评论'}];
  const queue={ids:[1,4],blocked:[],included:[1,4],drafts:{1:'hello',4:'hello'}};
  assert.deepEqual(readyRecipients(people,queue,{1:'A',4:'B'},[],{'小红书':true}).map(x=>x.id),[1]);
});
test('current classification, exclusions, empty drafts and historical sends all gate sending', () => {
  const people=[1,2,3,4,5,6].map(id=>({id,source:'小红书评论'}));
  const queue={ids:[1,2,3,4,5,6],blocked:[3],included:[1,2,3,4,5,6],drafts:{1:'hello',2:'hello',3:'hello',4:' ',5:'hello',6:'hello'}};
  assert.deepEqual(readyRecipients(people,queue,{1:'A',2:'A',3:'B',4:'B',5:'C',6:'D'},[2],{'小红书':true}).map(x=>x.id),[1]);
});
test('an empty initial workspace has no selectable or sendable fixture data', () => {
  assert.deepEqual(prepareDemoRecipients([1,2],[],[]).candidates,[]);
  assert.deepEqual(readyRecipients([{id:1,source:'小红书评论'}],{ids:[],blocked:[],included:[],drafts:{}},{1:'A'},[],{'小红书':true}),[]);
});
