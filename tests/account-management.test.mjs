import test from 'node:test';
import assert from 'node:assert/strict';
import { demoAccounts, restoreManagedAccounts, assignedAccounts, accountReady, accountDraftError } from '../app/account-management.ts';

test('personal side sees only accounts assigned to the current operator and supported platform', () => {
  const accounts = demoAccounts();
  assert.deepEqual(assignedAccounts(accounts).map(item => item.id), ['xhs-main', 'xhs-sub']);
  assert.equal(accountReady(accounts, 'xhs-main'), true);
  assert.equal(accountReady(accounts, 'dy-main'), false);
});

test('revoking assignment or losing login disables that exact account', () => {
  const accounts = demoAccounts();
  assert.equal(accountReady(accounts.map(item => item.id === 'xhs-main' ? { ...item, assignedTo: [] } : item), 'xhs-main'), false);
  assert.equal(accountReady(accounts.map(item => item.id === 'xhs-sub' ? { ...item, status: '已失效' } : item), 'xhs-sub'), false);
});

test('child accounts must belong to a primary on the same platform', () => {
  const accounts = demoAccounts();
  assert.equal(accountDraftError(accounts[1], accounts, 'xhs-sub'), '');
  assert.match(accountDraftError({ ...accounts[1], platform: '抖音' }, accounts, 'xhs-sub'), /同平台/);
  assert.match(accountDraftError({ ...accounts[0], parentId: 'dy-main' }, accounts, 'xhs-main'), /同平台/);
});

test('old empty or pre-assignment account records migrate safely', () => {
  assert.equal(restoreManagedAccounts([]).length, 3);
  const old = restoreManagedAccounts([{ id: 'old', platform: '小红书', name: '旧账号', handle: 'old', parentId: '', status: '待运维登录' }]);
  assert.deepEqual(old[0].assignedTo, []);
  assert.equal(old[0].status, '待运维');
});
