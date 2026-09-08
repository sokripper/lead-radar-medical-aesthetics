import test from "node:test";
import assert from "node:assert/strict";
import { recipientEvents } from "../app/presentation.ts";
test("chat logs contain only the exact recipient, not other users or task events", () => {
  const events = [
    "时间 已受理演示提交",
    "时间 · 首轮 1 · 待执行 → 发送成功",
    "时间 · 首轮 11 · 待执行 → 发送失败",
    "时间 · 回复 11 · 已关闭 · 原因包含 · 回复 1 · ",
    "时间 · 跟进 1 · 待执行 → 发送成功",
    "时间 · 回复检查设置：仅首轮",
  ];
  const copy = [...events];
  assert.deepEqual(recipientEvents(events, 1), [events[1], events[4]]);
  assert.deepEqual(events, copy);
  assert.deepEqual(recipientEvents(events, 2), []);
});
