import test from 'node:test';
import assert from 'node:assert/strict';
import { demoAccounts, restoreManagedAccounts, assignedAccounts, accountReady, accountDraftError, demoQuota, quotaRemaining, quotaCanReserve, reserveQuota, settleQuota, releaseQuota, restoreQuota } from '../app/account-management.ts';

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

test('A and G model quotas are independent and exclude in-flight reservations', () => {
  const quota = {
    A: { total: 8, used: 3, reserved: 1 }, G: { total: 5, used: 1, reserved: 1 },
  };
  assert.equal(quotaRemaining(quota, 'A'), 4);
  assert.equal(quotaRemaining(quota, 'G'), 3);
  assert.equal(quotaCanReserve(quota, { A: 4, G: 3 }), true);
  assert.equal(quotaCanReserve(quota, { A: 5, G: 0 }), false);
  assert.equal(reserveQuota(quota, 'A').A.reserved, 2);
  assert.deepEqual(settleQuota(reserveQuota(quota, 'G'), 'G').G, { total: 5, used: 2, reserved: 1 });
  assert.equal(releaseQuota(reserveQuota(quota, 'A'), 'A').A.reserved, 1);
});

test('saved model quotas and older quota shapes restore safely without overdraw', () => {
  assert.deepEqual(restoreQuota(null), demoQuota());
  assert.deepEqual(restoreQuota({
    A: { total: 10, used: 12, reserved: 3 }, B: { total: 6, used: 2, reserved: 8 },
    C: { total: 4, used: 1, reserved: 1 }, D: { total: 7, used: 2, reserved: 2 },
  }), {
    A: { total: 27, used: 17, reserved: 10 }, G: { total: 20, used: 15, reserved: 5 },
  });
  const migrated = restoreQuota({ PRECISION: { total: 10, used: 1, reserved: 2 }, BULK: { total: 6, used: 2, reserved: 1 } });
  assert.deepEqual(migrated.A, { total: 6, used: 2, reserved: 1 });
  assert.deepEqual(migrated.G, { total: 10, used: 1, reserved: 2 });
});
