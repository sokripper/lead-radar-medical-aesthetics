"use client";
import { useState, type Dispatch, type SetStateAction } from "react";
import type { Prospect } from "./operations-state";
import DirectoryDialog from "./DirectoryDialog";
import TenantQuotaDialog from "./TenantQuotaDialog";
import { quotaRemaining } from "./account-management";
import type { PlatformMember } from "./account-management";
import {
  type Directory,
  type Project,
  type ProjectDraft,
  type Tenant,
  type Actor,
  visibleProjects,
  saveProject,
  allocateTenantQuota,
} from "./project-management";

type Props = {
  directory: Directory;
  onChange: Dispatch<SetStateAction<Directory | null>>;
  kind: "projects" | "tenants" | "members";
  actor: Actor;
  leads: Prospect[];
  onOpen: (p: Project) => void;
};
export default function ProjectAdmin({
  directory,
  onChange,
  kind: requestedKind,
  actor,
  leads,
  onOpen,
}: Props) {
  const admin = !actor;
  const [activeTenantId, setActiveTenantId] = useState("");
  const activeTenant = directory.tenants.find((t) => t.id === activeTenantId);
  const kind =
    requestedKind === "tenants" && activeTenant ? "members" : requestedKind;
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const enterTenant = (id: string) => {
    setActiveTenantId(id);
    setTenantFilter(id);
    setSearch("");
    setPage(1);
    setNotice("");
  };
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [error, setError] = useState("");
  const [tenantDraft, setTenantDraft] = useState<{
    id: string;
    name: string;
    enabled: boolean;
  } | null>(null);
  const [memberDraft, setMemberDraft] = useState<
    (PlatformMember & { tenantId: string; existing: boolean }) | null
  >(null);
  const tenantName = (id: string) =>
    directory.tenants.find((t) => t.id === id)?.name || "—";
  const projects = visibleProjects(directory, actor).filter(
    (p) =>
      (!tenantFilter || p.tenantId === tenantFilter) &&
      `${p.name} ${tenantName(p.tenantId)}`.includes(search.trim()),
  );
  const tenants = directory.tenants.filter((t) =>
    t.name.includes(search.trim()),
  );
  const members = directory.tenants
    .flatMap((t) => t.members.map((m) => ({ ...m, tenantId: t.id })))
    .filter(
      (m) =>
        (!tenantFilter || m.tenantId === tenantFilter) &&
        `${m.name} ${m.login}`.includes(search.trim()),
    );
  const count =
    kind === "projects"
      ? projects.length
      : kind === "tenants"
        ? tenants.length
        : members.length;
  const pages = Math.max(1, Math.ceil(count / 10)),
    current = Math.min(page, pages);
  const slice = <T,>(items: T[]) =>
    items.slice((current - 1) * 10, current * 10);
  const editProject = (p?: Project) => {
    setError("");
    setDraft(
      p
        ? { ...p, taskCodes: [...p.taskCodes], memberIds: [...p.memberIds] }
        : {
            id: crypto.randomUUID(),
            name: "",
            tenantId: tenantFilter || directory.tenants[0]?.id || "",
            enabled: true,
            taskCodes: [],
            memberIds: [],
          },
    );
  };
  const toggle = (items: string[], id: string) =>
    items.includes(id) ? items.filter((x) => x !== id) : [...items, id];
  const save = () => {
    if (!draft || !admin) return;
    try {
      const next = saveProject(directory, draft, leads);
      onChange(next);
      setDraft(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const state = (enabled: boolean) => (
    <span className={`directory-status ${enabled ? "" : "off"}`}>
      {enabled ? "启用" : "停用"}
    </span>
  );
  const back = () => {
    setDraft(null);
    setTenantDraft(null);
    setMemberDraft(null);
    setError("");
  };
  if (!admin && kind !== "projects")
    return (
      <div className="surface directory-empty">你没有此页面的管理权限。</div>
    );
  if (draft && admin) {
    const selectedTenant = directory.tenants.find(
      (t) => t.id === draft.tenantId,
    );
    const existing = directory.projects.some((p) => p.id === draft.id);
    const tasks = directory.catalog.collectionTasks.filter(
      (t) =>
        !draft.taskCodes.includes(t.sourceTaskCode) &&
        !directory.projects.some(
          (p) => p.id !== draft.id && p.taskCodes.includes(t.sourceTaskCode),
        ),
    );
    return (
      <div className="directory-editor">
        <button className="button text" onClick={back}>
          ← 返回项目列表
        </button>
        <div className="page-heading">
          <div>
            <div className="eyebrow">PROJECT SETTINGS</div>
            <h1>{existing ? "项目配置" : "新建项目"}</h1>
            <p>将采集任务与成员放入项目，成员即可进入项目处理数据。</p>
          </div>
        </div>
        <div className="directory-editor-grid">
          <div>
            <section className="surface directory-section">
              <h2>
                <span>01</span>基本信息
              </h2>
              <div className="directory-fields">
                <label>
                  项目名称
                  <input
                    autoFocus
                    value={draft.name}
                    placeholder="例如：环球科创 · 厂房招商"
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  所属租户
                  <select
                    value={draft.tenantId}
                    disabled={existing}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        tenantId: e.target.value,
                        memberIds: [],
                      })
                    }
                  >
                    <option value="">请选择租户</option>
                    {directory.tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {!t.enabled ? "（已停用）" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="directory-check">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) =>
                    setDraft({ ...draft, enabled: e.target.checked })
                  }
                />
                启用项目
              </label>
            </section>
            <section className="surface directory-section">
              <div className="directory-section-head">
                <div>
                  <h2>
                    <span>02</span>绑定瓴羊任务
                  </h2>
                  <p>按任务名称选择，可绑定多个瓴羊任务。</p>
                </div>
                <span className="directory-count">
                  已选 {draft.taskCodes.length}
                </span>
              </div>
              <select
                className="task-name-select"
                aria-label="绑定瓴羊任务"
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    setDraft({
                      ...draft,
                      taskCodes: [...draft.taskCodes, e.target.value],
                    });
                }}
              >
                <option value="">
                  {tasks.length ? "请选择瓴羊任务名称" : "暂无可绑定任务"}
                </option>
                {tasks.map((t) => (
                  <option key={t.sourceTaskCode} value={t.sourceTaskCode}>
                    {t.name}
                    {directory.catalog.collectionTasks.filter(
                      (x) => x.name === t.name,
                    ).length > 1
                      ? `（${t.createdAt} · ${t.sourceTaskCode.slice(-6)}）`
                      : ""}
                  </option>
                ))}
              </select>
              <div className="bound-task-tags">
                {draft.taskCodes.map((code) => (
                  <span key={code}>
                    {directory.catalog.collectionTasks.find(
                      (t) => t.sourceTaskCode === code,
                    )?.name || "已绑定任务"}
                    <button
                      type="button"
                      aria-label={`移除任务：${directory.catalog.collectionTasks.find((t) => t.sourceTaskCode === code)?.name || code}`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          taskCodes: draft.taskCodes.filter((c) => c !== code),
                        })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </section>
            <section className="surface directory-section">
              <div className="directory-section-head">
                <div>
                  <h2>
                    <span>03</span>分配项目成员
                  </h2>
                  <p>
                    仅展示所属租户的成员；未加入项目的成员无法查看项目数据。
                  </p>
                </div>
                <span className="directory-count">
                  已选 {draft.memberIds.length}
                </span>
              </div>
              <div className="directory-choice-list">
                {selectedTenant?.members.map((m) => (
                  <label className="directory-choice" key={m.id}>
                    <input
                      type="checkbox"
                      checked={draft.memberIds.includes(m.id)}
                      onChange={() =>
                        setDraft({
                          ...draft,
                          memberIds: toggle(draft.memberIds, m.id),
                        })
                      }
                    />
                    <div>
                      <strong>{m.name}</strong>
                      <small>{m.login}</small>
                    </div>
                    <span>{m.enabled ? m.role : "已停用"}</span>
                  </label>
                ))}
                {!selectedTenant?.members.length && (
                  <p className="directory-empty">
                    该租户暂无成员，可先保存项目，再到租户详情添加成员。
                  </p>
                )}
              </div>
            </section>
          </div>
          <aside className="surface directory-summary">
            <span className="eyebrow">项目归属</span>
            <h3>{draft.name || "未命名项目"}</h3>
            <p>{selectedTenant?.name || "请选择租户"}</p>
            <dl>
              <div>
                <dt>绑定任务</dt>
                <dd>{draft.taskCodes.length} 个</dd>
              </div>
              <div>
                <dt>项目成员</dt>
                <dd>{draft.memberIds.length} 人</dd>
              </div>
            </dl>
            <p className="directory-muted">
              任务数据进入绑定项目，成员权限随项目分配生效。
            </p>
          </aside>
        </div>
        <footer className="directory-savebar">
          {error && <p role="alert">{error}</p>}
          <button className="button secondary" onClick={back}>
            取消
          </button>
          <button className="button primary" onClick={save}>
            保存项目
          </button>
        </footer>
      </div>
    );
  }
  const tenantEditor =
    tenantDraft && admin ? (
      <DirectoryDialog
        title={tenantDraft.id ? "编辑租户" : "新建租户"}
        onClose={back}
      >
        <section className="directory-simple-form">
          <label>
            租户名称
            <input
              autoFocus
              value={tenantDraft.name}
              onChange={(e) =>
                setTenantDraft({ ...tenantDraft, name: e.target.value })
              }
            />
          </label>
          <label className="directory-check">
            <input
              type="checkbox"
              checked={tenantDraft.enabled}
              onChange={(e) =>
                setTenantDraft({ ...tenantDraft, enabled: e.target.checked })
              }
            />
            启用租户
          </label>
          <p className="directory-muted">
            停用后，该租户成员无法进入项目，已有数据保留。
          </p>
          {error && (
            <p className="directory-error" role="alert">
              {error}
            </p>
          )}
          <div className="directory-actions">
            <button className="button secondary" onClick={back}>
              取消
            </button>
            <button
              className="button primary"
              onClick={() => {
                const name = tenantDraft.name.trim();
                if (!name) {
                  setError("请填写租户名称。");
                  return;
                }
                if (
                  directory.tenants.some(
                    (t) => t.id !== tenantDraft.id && t.name === name,
                  )
                ) {
                  setError("租户名称已存在。");
                  return;
                }
                const item: Tenant = directory.tenants.find(
                  (t) => t.id === tenantDraft.id,
                ) || {
                  id: crypto.randomUUID(),
                  name,
                  enabled: true,
                  members: [],
                  shared: {
                    managedAccounts: [],
                    quota: {
                      A: { total: 0, used: 0, reserved: 0 },
                      G: { total: 0, used: 0, reserved: 0 },
                    },
                    inboxMessages: [],
                    inboxMonitoring: {},
                  },
                };
                const next = { ...item, name, enabled: tenantDraft.enabled };
                onChange({
                  ...directory,
                  tenants: tenantDraft.id
                    ? directory.tenants.map((t) =>
                        t.id === next.id ? next : t,
                      )
                    : [...directory.tenants, next],
                });
                back();
              }}
            >
              保存租户
            </button>
          </div>
        </section>
      </DirectoryDialog>
    ) : null;
  const memberEditor =
    memberDraft && admin ? (
      <DirectoryDialog
        title={memberDraft.existing ? "编辑成员" : "添加成员"}
        onClose={back}
      >
        <section className="directory-simple-form">
          <div className="directory-fields">
            <label>
              所属租户
              <select
                disabled={memberDraft.existing || Boolean(activeTenant)}
                value={memberDraft.tenantId}
                onChange={(e) =>
                  setMemberDraft({ ...memberDraft, tenantId: e.target.value })
                }
              >
                <option value="">请选择租户</option>
                {directory.tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              成员姓名
              <input
                value={memberDraft.name}
                onChange={(e) =>
                  setMemberDraft({ ...memberDraft, name: e.target.value })
                }
              />
            </label>
            <label>
              登录账号
              <input
                value={memberDraft.login}
                onChange={(e) =>
                  setMemberDraft({ ...memberDraft, login: e.target.value })
                }
              />
            </label>
            <label>
              租户角色
              <select
                value={memberDraft.role}
                onChange={(e) =>
                  setMemberDraft({
                    ...memberDraft,
                    role: e.target.value as PlatformMember["role"],
                  })
                }
              >
                <option value="成员">普通成员</option>
                <option value="管理员">租户管理员</option>
              </select>
            </label>
          </div>
          <label className="directory-check">
            <input
              type="checkbox"
              checked={memberDraft.enabled}
              onChange={(e) =>
                setMemberDraft({ ...memberDraft, enabled: e.target.checked })
              }
            />
            启用成员
          </label>
          <p className="directory-muted">
            项目访问范围在“项目配置”中分配。租户管理员还可维护本租户的社媒账号。
          </p>
          {error && (
            <p role="alert" className="directory-error">
              {error}
            </p>
          )}
          <div className="directory-actions">
            <button className="button secondary" onClick={back}>
              取消
            </button>
            <button
              className="button primary"
              onClick={() => {
                const tenant = directory.tenants.find(
                  (t) => t.id === memberDraft.tenantId,
                );
                const name = memberDraft.name.trim(),
                  login = memberDraft.login.trim();
                if (!tenant || !name || !login) {
                  setError("请完整填写所属租户、姓名和登录账号。");
                  return;
                }
                if (
                  directory.tenants.some((t) =>
                    t.members.some(
                      (m) => m.id !== memberDraft.id && m.login === login,
                    ),
                  )
                ) {
                  setError("登录账号已存在，请使用其他账号。");
                  return;
                }
                const item: PlatformMember = {
                  id: memberDraft.id,
                  name,
                  login,
                  role: memberDraft.role,
                  enabled: memberDraft.enabled,
                };
                onChange({
                  ...directory,
                  tenants: directory.tenants.map((t) =>
                    t.id === tenant.id
                      ? {
                          ...t,
                          members: memberDraft.existing
                            ? t.members.map((m) =>
                                m.id === item.id ? item : m,
                              )
                            : [...t.members, item],
                        }
                      : t,
                  ),
                });
                back();
              }}
            >
              保存成员
            </button>
          </div>
        </section>
      </DirectoryDialog>
    ) : null;
  return (
    <div className="directory-page">
      {activeTenant && (
        <button
          className="button text tenant-back"
          onClick={() => {
            setActiveTenantId("");
            setTenantFilter("");
            setSearch("");
            setPage(1);
            setNotice("");
          }}
        >
          ← 返回租户列表
        </button>
      )}
      {notice && (
        <div className="tenant-notice" role="status">
          {notice}
        </div>
      )}
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {kind === "projects" ? "PROJECTS" : "PLATFORM MANAGEMENT"}
          </div>
          <h1>
            {kind === "projects"
              ? "项目空间"
              : kind === "tenants"
                ? "租户管理"
                : activeTenant?.name || "成员管理"}
          </h1>
          <p>
            {kind === "projects"
              ? admin
                ? "以项目归集任务，按成员分配访问权限。"
                : "选择已分配的项目，查看任务并开展工作。"
              : kind === "tenants"
                ? "维护客户主体，项目、成员和数据按租户隔离。"
                : "查看该租户的成员、项目归属与共享额度。"}
          </p>
        </div>
        {admin && (
          <div className="directory-actions">
            {activeTenant && (
              <>
                <button
                  className="button secondary"
                  onClick={() => {
                    setError("");
                    setTenantDraft({
                      id: activeTenant.id,
                      name: activeTenant.name,
                      enabled: activeTenant.enabled,
                    });
                  }}
                >
                  编辑租户
                </button>
                <button
                  className="button secondary"
                  onClick={() => setQuotaOpen(true)}
                >
                  分配额度
                </button>
              </>
            )}
            <button
              className="button primary"
              onClick={() => {
                setError("");
                if (kind === "projects") editProject();
                else if (kind === "tenants")
                  setTenantDraft({ id: "", name: "", enabled: true });
                else
                  setMemberDraft({
                    id: crypto.randomUUID(),
                    name: "",
                    login: "",
                    enabled: true,
                    role: "成员",
                    tenantId: tenantFilter || directory.tenants[0]?.id || "",
                    existing: false,
                  });
              }}
            >
              {kind === "projects"
                ? "+ 新建项目"
                : kind === "tenants"
                  ? "+ 新建租户"
                  : "+ 添加成员"}
            </button>
          </div>
        )}
      </div>
      {activeTenant && (
        <section className="tenant-overview">
          <div className="surface tenant-identity">
            <span>租户状态</span>
            {state(activeTenant.enabled)}
            <div>
              <strong>{activeTenant.members.length}</strong> 位成员 ·{" "}
              <strong>
                {
                  directory.projects.filter(
                    (p) => p.tenantId === activeTenant.id,
                  ).length
                }
              </strong>{" "}
              个项目
            </div>
          </div>
          {(["A", "G"] as const).map((model) => {
            const q = activeTenant.shared.quota[model];
            return (
              <div className="surface tenant-quota-card" key={model}>
                <span>{model} 类模型额度</span>
                <strong>
                  {quotaRemaining(
                    activeTenant.shared.quota,
                    model,
                  ).toLocaleString()}
                  <small>次可用</small>
                </strong>
                <p>
                  总额度 {q.total.toLocaleString()} · 已使用{" "}
                  {q.used.toLocaleString()} · 预占 {q.reserved.toLocaleString()}
                </p>
              </div>
            );
          })}
        </section>
      )}
      {activeTenant && <h2 className="tenant-members-title">租户成员</h2>}
      {kind === "projects" && (
        <div className="directory-intro">
          <div className="directory-intro-mark">P</div>
          <div>
            <strong>
              {admin ? "项目是任务与成员的共同工作空间" : "你的项目工作台"}
            </strong>
            <p>
              {admin
                ? "创建项目 → 绑定瓴羊任务 → 分配成员 → 进入项目处理数据"
                : "项目内保留数据处理、历史名单与评论触达的完整流程。"}
            </p>
          </div>
        </div>
      )}
      <section className="surface directory-list">
        <div className="directory-toolbar">
          <input
            aria-label="搜索列表"
            placeholder={
              kind === "projects"
                ? "搜索项目名称"
                : kind === "tenants"
                  ? "搜索租户名称"
                  : "搜索成员姓名或登录账号"
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {admin && kind !== "tenants" && !activeTenant && (
            <select
              aria-label="筛选租户"
              value={tenantFilter}
              onChange={(e) => {
                setTenantFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">全部租户</option>
              {directory.tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <span>
            {count}{" "}
            {kind === "members"
              ? "位成员"
              : kind === "tenants"
                ? "个租户"
                : "个项目"}
          </span>
        </div>
        <div className="table-wrap">
          <table className="directory-table">
            <thead>
              <tr>
                {(kind === "projects"
                  ? [
                      "项目名称",
                      "所属租户",
                      "采集任务",
                      "项目成员",
                      "状态",
                      "操作",
                    ]
                  : kind === "tenants"
                    ? ["租户名称", "成员", "项目", "状态", "操作"]
                    : [
                        "成员",
                        "所属租户",
                        "租户角色",
                        "已加入项目",
                        "状态",
                        "操作",
                      ]
                ).map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kind === "projects" &&
                slice(projects).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{tenantName(p.tenantId)}</td>
                    <td>{p.taskCodes.length} 个</td>
                    <td>{p.memberIds.length} 人</td>
                    <td>{state(p.enabled)}</td>
                    <td>
                      <div className="directory-actions">
                        <button
                          className="button text"
                          disabled={
                            !p.enabled ||
                            !directory.tenants.find((t) => t.id === p.tenantId)
                              ?.enabled
                          }
                          onClick={() => onOpen(p)}
                        >
                          进入项目
                        </button>
                        {admin && (
                          <button
                            className="button text muted"
                            onClick={() => editProject(p)}
                          >
                            配置
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              {kind === "tenants" &&
                slice(tenants).map((t) => (
                  <tr key={t.id}>
                    <td>
                      <button
                        className="button text tenant-name"
                        onClick={() => enterTenant(t.id)}
                      >
                        {t.name}
                      </button>
                    </td>
                    <td>{t.members.length} 人</td>
                    <td>
                      {
                        directory.projects.filter((p) => p.tenantId === t.id)
                          .length
                      }{" "}
                      个
                    </td>
                    <td>{state(t.enabled)}</td>
                    <td>
                      <button
                        className="button text"
                        onClick={() => {
                          enterTenant(t.id);
                        }}
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              {kind === "members" &&
                slice(members).map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.name}</strong>
                      <small>{m.login}</small>
                    </td>
                    <td>{tenantName(m.tenantId)}</td>
                    <td>{m.role === "管理员" ? "租户管理员" : "普通成员"}</td>
                    <td>
                      <div className="directory-project-tags">
                        {directory.projects
                          .filter(
                            (p) =>
                              p.tenantId === m.tenantId &&
                              p.memberIds.includes(m.id),
                          )
                          .map((p) => (
                            <span key={p.id}>{p.name}</span>
                          ))}
                        {!directory.projects.some(
                          (p) =>
                            p.tenantId === m.tenantId &&
                            p.memberIds.includes(m.id),
                        ) && (
                          <span className="directory-muted">未分配项目</span>
                        )}
                      </div>
                    </td>
                    <td>{state(m.enabled)}</td>
                    <td>
                      <button
                        className="button text"
                        onClick={() => {
                          setError("");
                          setMemberDraft({ ...m, existing: true });
                        }}
                      >
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!count && (
          <div className="directory-empty">
            <h3>
              {search || tenantFilter
                ? "没有匹配结果"
                : kind === "projects"
                  ? "暂无可访问项目"
                  : "暂无记录"}
            </h3>
            <p>
              {kind === "projects"
                ? admin
                  ? "新建项目，绑定任务并分配成员后即可开始。"
                  : "请联系管理员分配项目。"
                : "请先添加记录。"}
            </p>
          </div>
        )}
        <div className="directory-pagination">
          <span>每页 10 条</span>
          <button
            className="button secondary"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            上一页
          </button>
          <b>
            {current} / {pages}
          </b>
          <button
            className="button secondary"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            下一页
          </button>
        </div>
      </section>
      {tenantEditor}
      {memberEditor}
      {activeTenant && quotaOpen && (
        <TenantQuotaDialog
          tenant={activeTenant}
          onClose={() => setQuotaOpen(false)}
          onAllocate={(amounts) => {
            onChange((old) =>
              old ? allocateTenantQuota(old, activeTenant.id, amounts) : old,
            );
            setQuotaOpen(false);
            setNotice(
              `已为 ${activeTenant.name} 分配额度：A 类 +${amounts.A} 次，G 类 +${amounts.G} 次。`,
            );
          }}
        />
      )}
    </div>
  );
}
