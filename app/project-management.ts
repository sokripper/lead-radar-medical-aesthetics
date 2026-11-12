import type { Workspace } from "./Operations";
import type { PlatformMember } from "./account-management";
import type { Prospect } from "./operations-state";

export type Tenant = {
  id: string;
  name: string;
  enabled: boolean;
  members: PlatformMember[];
  shared: Pick<
    Workspace,
    "managedAccounts" | "quota" | "inboxMessages" | "inboxMonitoring"
  >;
};
export type Project = {
  id: string;
  tenantId: string;
  name: string;
  enabled: boolean;
  taskCodes: string[];
  memberIds: string[];
  workspace: Workspace;
};
export type ProjectDraft = Omit<Project, "workspace">;
export type Actor = { tenantId: string; memberId: string } | null; // null: prototype super administrator
export type Directory = {
  version: 1;
  tenants: Tenant[];
  projects: Project[];
  catalog: Workspace;
};
export const baselineTaskCode = "6b27c68f027e412680393da7b322516e";
export const taskCodeOf = (lead: Prospect) =>
  lead.sourceTaskCode || baselineTaskCode;
export const projectLeads = (leads: Prospect[], codes: string[]) =>
  leads.filter((l) => codes.includes(taskCodeOf(l)));
export function visibleProjects(directory: Directory, actor: Actor) {
  if (!actor) return directory.projects;
  const tenant = directory.tenants.find(
    (t) => t.id === actor.tenantId && t.enabled,
  );
  if (!tenant?.members.some((m) => m.id === actor.memberId && m.enabled))
    return [];
  return directory.projects.filter(
    (p) =>
      p.tenantId === tenant.id &&
      p.enabled &&
      p.memberIds.includes(actor.memberId),
  );
}
export function scopeWorkspace(
  base: Workspace,
  codes: string[],
  leads: Prospect[],
): Workspace {
  const batches = base.batches.filter((b) =>
    codes.includes(b.sourceTaskCode || baselineTaskCode),
  );
  const ids = new Set([
    ...projectLeads(leads, codes).map((l) => l.id),
    ...batches.flatMap((b) => b.ids),
  ]);
  const map = <T>(value: Record<number, T>) =>
    Object.fromEntries(
      Object.entries(value).filter(([id]) => ids.has(Number(id))),
    );
  return {
    ...base,
    collectionTasks: base.collectionTasks.filter((t) =>
      codes.includes(t.sourceTaskCode),
    ),
    batches,
    tasks: base.tasks.filter((t) =>
      codes.includes(t.sourceTaskCode || baselineTaskCode),
    ),
    grades: map(base.grades),
    adjustments: map(base.adjustments),
    supplements: map(base.supplements),
    selected: [],
    failed: base.failed.filter((id) => ids.has(id)),
    batchId: batches.some((b) => b.id === base.batchId)
      ? base.batchId
      : batches[0]?.id || 0,
    queue: { ids: [], blocked: [], included: [], drafts: {}, edited: [] },
  };
}
export function createDirectory(
  base: Workspace,
  leads: Prospect[],
  trial: boolean,
): Directory {
  const shared = {
    managedAccounts: base.managedAccounts,
    quota: base.quota,
    inboxMessages: base.inboxMessages,
    inboxMonitoring: base.inboxMonitoring,
  };
  const tenant: Tenant = {
    id: "tenant-fanxing",
    name: "梵行科技",
    enabled: true,
    members: base.members || [],
    shared,
  };
  const codes = base.collectionTasks.map((t) => t.sourceTaskCode);
  const project = (id: string, name: string, taskCodes: string[]): Project => ({
    id,
    name,
    taskCodes,
    tenantId: tenant.id,
    enabled: true,
    memberIds: tenant.members.filter((m) => m.enabled).map((m) => m.id),
    workspace: scopeWorkspace(base, taskCodes, leads),
  });
  if (trial)
    return {
      version: 1,
      tenants: [tenant],
      catalog: base,
      projects: [project("project-trial", "品牌运营 · 流程体验", codes)],
    };
  const walkthrough = codes.filter((c) => c.includes("walkthrough"));
  return {
    version: 1,
    catalog: base,
    tenants: [
      tenant,
      {
        id: "tenant-global",
        name: "环球科创",
        enabled: true,
        members: [
          {
            id: "global-operator",
            name: "招商运营",
            login: "global.ops",
            role: "成员",
            enabled: true,
          },
        ],
        shared: {
          managedAccounts: [],
          quota: {
            A: { total: 0, used: 0, reserved: 0 },
            G: { total: 0, used: 0, reserved: 0 },
          },
          inboxMessages: [],
          inboxMonitoring: {},
        },
      },
    ],
    projects: [
      project(
        "project-brand",
        "品牌与门店获客",
        codes.filter((c) => c !== baselineTaskCode && !walkthrough.includes(c)),
      ),
      {
        ...project("project-walkthrough", "新项目 · 完整流程", walkthrough),
        memberIds: tenant.members.slice(0, 1).map((m) => m.id),
      },
    ],
  };
}
export function projectDraftError(directory: Directory, draft: ProjectDraft) {
  const tenant = directory.tenants.find((t) => t.id === draft.tenantId);
  const old = directory.projects.find((p) => p.id === draft.id);
  if (!draft.name.trim()) return "请填写项目名称。";
  if (!tenant) return "请选择所属租户。";
  if (old && old.tenantId !== draft.tenantId)
    return "已创建的项目不能变更所属租户。";
  if (
    directory.projects.some(
      (p) =>
        p.id !== draft.id &&
        p.tenantId === draft.tenantId &&
        p.name === draft.name.trim(),
    )
  )
    return "该租户下已存在同名项目。";
  if (draft.memberIds.some((id) => !tenant.members.some((m) => m.id === id)))
    return "项目成员必须属于当前租户。";
  if (
    draft.taskCodes.some(
      (code) =>
        !directory.catalog.collectionTasks.some(
          (t) => t.sourceTaskCode === code,
        ),
    )
  )
    return "选择的任务不在可绑定列表中。";
  if (
    directory.projects.some(
      (p) =>
        p.id !== draft.id &&
        p.taskCodes.some((code) => draft.taskCodes.includes(code)),
    )
  )
    return "部分任务已绑定其他项目，请重新选择。";
  if (
    old?.workspace.collectionTasks.some(
      (t) =>
        !draft.taskCodes.includes(t.sourceTaskCode) &&
        (t.batchId ||
          t.status === "解析中" ||
          old.workspace.tasks.some(
            (x) => x.sourceTaskCode === t.sourceTaskCode,
          )),
    )
  )
    return "已处理或执行中的任务不能解绑，请保留其归属与记录。";
  return "";
}
export function saveProject(
  directory: Directory,
  draft: ProjectDraft,
  leads: Prospect[],
): Directory {
  const error = projectDraftError(directory, draft);
  if (error) throw Error(error);
  const old = directory.projects.find((p) => p.id === draft.id);
  const fresh = scopeWorkspace(
    directory.catalog,
    draft.taskCodes.filter((c) => !old?.taskCodes.includes(c)),
    leads,
  );
  const previous = old
    ? scopeWorkspace(old.workspace, draft.taskCodes, leads)
    : null;
  const workspace = previous
    ? {
        ...previous,
        collectionTasks: [
          ...previous.collectionTasks,
          ...fresh.collectionTasks,
        ],
        batches: [...previous.batches, ...fresh.batches],
        tasks: [...previous.tasks, ...fresh.tasks],
        grades: { ...previous.grades, ...fresh.grades },
        failed: [...previous.failed, ...fresh.failed],
        queue: old!.workspace.queue,
        selected: old!.workspace.selected,
      }
    : fresh;
  const next: Project = {
    ...draft,
    name: draft.name.trim(),
    taskCodes: [...new Set(draft.taskCodes)],
    memberIds: [...new Set(draft.memberIds)],
    workspace,
  };
  return {
    ...directory,
    projects: old
      ? directory.projects.map((p) => (p.id === draft.id ? next : p))
      : [...directory.projects, next],
  };
}
export function workspaceFor(project: Project, tenant: Tenant): Workspace {
  return { ...project.workspace, ...tenant.shared, members: tenant.members };
}
export function updateProjectWorkspace(
  directory: Directory,
  projectId: string,
  update: (w: Workspace) => Workspace,
): Directory {
  const p = directory.projects.find((p) => p.id === projectId);
  const tenant = directory.tenants.find((t) => t.id === p?.tenantId);
  if (!p || !tenant) return directory;
  const next = update(workspaceFor(p, tenant));
  return {
    ...directory,
    projects: directory.projects.map((x) =>
      x.id === p.id ? { ...x, workspace: next } : x,
    ),
    tenants: directory.tenants.map((t) =>
      t.id === tenant.id
        ? {
            ...t,
            shared: {
              managedAccounts: next.managedAccounts,
              quota: next.quota,
              inboxMessages: next.inboxMessages,
              inboxMonitoring: next.inboxMonitoring,
            },
          }
        : t,
    ),
  };
}

export function allocateTenantQuota(
  directory: Directory,
  tenantId: string,
  amounts: Record<"A" | "G", number>,
): Directory {
  const tenant = directory.tenants.find((t) => t.id === tenantId);
  if (!tenant) throw Error("租户不存在。");
  if (
    Object.values(amounts).some((v) => !Number.isSafeInteger(v) || v < 0) ||
    !Object.values(amounts).some((v) => v > 0)
  )
    throw Error("请输入正整数额度。");
  if (
    (["A", "G"] as const).some(
      (m) => !Number.isSafeInteger(tenant.shared.quota[m].total + amounts[m]),
    )
  )
    throw Error("分配额度过大。");
  return {
    ...directory,
    tenants: directory.tenants.map((t) =>
      t.id === tenantId
        ? {
            ...t,
            shared: {
              ...t.shared,
              quota: {
                A: {
                  ...t.shared.quota.A,
                  total: t.shared.quota.A.total + amounts.A,
                },
                G: {
                  ...t.shared.quota.G,
                  total: t.shared.quota.G.total + amounts.G,
                },
              },
            },
          }
        : t,
    ),
  };
}
