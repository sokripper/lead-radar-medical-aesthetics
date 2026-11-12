import test from "node:test";
import assert from "node:assert/strict";
import {
  createDirectory,
  visibleProjects,
  saveProject,
  scopeWorkspace,
  workspaceFor,
  updateProjectWorkspace,
  allocateTenantQuota,
} from "../app/project-management.ts";
const leads = [
  { id: 1, sourceTaskCode: "task-one" },
  { id: 2, sourceTaskCode: "task-two" },
];
const base = {
  schema: 11,
  members: [
    {
      id: "member",
      name: "成员",
      login: "member",
      role: "成员",
      enabled: true,
    },
  ],
  managedAccounts: [],
  quota: {
    A: { total: 100, used: 0, reserved: 0 },
    G: { total: 100, used: 0, reserved: 0 },
  },
  inboxMessages: [],
  inboxMonitoring: {},
  collectionTasks: [
    { id: 1, name: "任务一", sourceTaskCode: "task-one", status: "待配置" },
    { id: 2, name: "任务二", sourceTaskCode: "task-two", status: "待配置" },
  ],
  batches: [],
  tasks: [],
  grades: { 1: "A", 2: "B" },
  adjustments: {},
  supplements: {},
  selected: [],
  failed: [],
  batchId: 0,
  queue: { ids: [], blocked: [], included: [], drafts: {}, edited: [] },
};
const fixture = () => ({ ...createDirectory(base, leads, true), projects: [] });
test("quota allocation adds to the selected tenant and preserves usage", () => {
  const d = fixture();
  const tenant = d.tenants[0];
  tenant.shared.quota.A = { total: 100, used: 20, reserved: 10 };
  const result = allocateTenantQuota(d, tenant.id, { A: 50, G: 25 });
  assert.deepEqual(result.tenants[0].shared.quota.A, { total: 150, used: 20, reserved: 10 });
  assert.equal(result.tenants[0].shared.quota.G.total, tenant.shared.quota.G.total + 25);
  assert.equal(d.tenants[0].shared.quota.A.total, 100);
  assert.deepEqual(result.tenants.slice(1), d.tenants.slice(1));
});
test("quota allocation rejects invalid amounts and missing tenants", () => {
  const d = fixture();
  for (const A of [-1, 0.5, NaN, Infinity]) {
    assert.throws(() => allocateTenantQuota(d, d.tenants[0].id, { A, G: 1 }));
  }
  assert.throws(() => allocateTenantQuota(d, d.tenants[0].id, { A: 0, G: 0 }));
  assert.throws(() => allocateTenantQuota(d, "missing", { A: 1, G: 0 }));
  assert.throws(() => allocateTenantQuota(d, d.tenants[0].id, { A: Number.MAX_SAFE_INTEGER, G: 0 }));
});
const draft = (id, codes, tenantId = "tenant-fanxing") => ({
  id,
  name: id,
  tenantId,
  enabled: true,
  taskCodes: codes,
  memberIds: ["member"],
});
test("members see only assigned enabled projects in their own enabled tenant", () => {
  let d = saveProject(fixture(), draft("p1", ["task-one"]), leads);
  d = saveProject(d, { ...draft("p2", ["task-two"]), memberIds: [] }, leads);
  assert.deepEqual(
    visibleProjects(d, { tenantId: "tenant-fanxing", memberId: "member" }).map(
      (p) => p.id,
    ),
    ["p1"],
  );
  assert.equal(
    visibleProjects(d, { tenantId: "other", memberId: "member" }).length,
    0,
  );
  assert.equal(
    visibleProjects(
      { ...d, tenants: d.tenants.map((t) => ({ ...t, enabled: false })) },
      { tenantId: "tenant-fanxing", memberId: "member" },
    ).length,
    0,
  );
  assert.equal(
    visibleProjects(
      {
        ...d,
        tenants: d.tenants.map((t) => ({
          ...t,
          members: t.members.map((m) => ({ ...m, enabled: false })),
        })),
      },
      { tenantId: "tenant-fanxing", memberId: "member" },
    ).length,
    0,
  );
  assert.equal(visibleProjects(d, null).length, 2);
});
test("task ownership is unique and cross-tenant member assignment is rejected", () => {
  const d = saveProject(fixture(), draft("p1", ["task-one"]), leads);
  assert.throws(
    () => saveProject(d, draft("p2", ["task-one"]), leads),
    /已绑定/,
  );
  assert.throws(
    () =>
      saveProject(d, { ...draft("p2", []), memberIds: ["outsider"] }, leads),
    /当前租户/,
  );
  assert.throws(
    () => saveProject(d, draft("p2", ["unknown"]), leads),
    /可绑定列表/,
  );
});
test("project workspace contains only bound task data", () => {
  const scoped = scopeWorkspace(
    {
      ...base,
      batches: [
        { id: 10, sourceTaskCode: "task-one", ids: [1] },
        { id: 20, sourceTaskCode: "task-two", ids: [2] },
      ],
      tasks: [{ id: 30, sourceTaskCode: "task-two" }],
    },
    ["task-one"],
    leads,
  );
  assert.deepEqual(
    scoped.collectionTasks.map((t) => t.sourceTaskCode),
    ["task-one"],
  );
  assert.deepEqual(
    scoped.batches.map((b) => b.id),
    [10],
  );
  assert.deepEqual(scoped.tasks, []);
  assert.deepEqual(scoped.grades, { 1: "A" });
});
test("editing project members retains task progress and processed tasks cannot be unbound", () => {
  let d = saveProject(fixture(), draft("p1", ["task-one"]), leads);
  d = updateProjectWorkspace(d, "p1", (w) => ({
    ...w,
    collectionTasks: w.collectionTasks.map((t) => ({
      ...t,
      status: "解析完成",
      batchId: 10,
    })),
    batches: [{ id: 10, sourceTaskCode: "task-one", ids: [1] }],
  }));
  d = saveProject(
    d,
    { ...draft("p1", ["task-one", "task-two"]), memberIds: [] },
    leads,
  );
  assert.equal(
    d.projects[0].workspace.collectionTasks.find((t) => t.id === 1).status,
    "解析完成",
  );
  assert.throws(
    () => saveProject(d, draft("p1", ["task-two"]), leads),
    /不能解绑/,
  );
});
test("quota is shared by tenant while project task mutations stay isolated", () => {
  let d = saveProject(fixture(), draft("p1", ["task-one"]), leads);
  d = saveProject(d, draft("p2", ["task-two"]), leads);
  d = updateProjectWorkspace(d, "p1", (w) => ({
    ...w,
    quota: { ...w.quota, A: { ...w.quota.A, used: 1 } },
    grades: { 1: "C" },
  }));
  assert.equal(workspaceFor(d.projects[1], d.tenants[0]).quota.A.used, 1);
  assert.deepEqual(d.projects[1].workspace.grades, { 2: "B" });
});
