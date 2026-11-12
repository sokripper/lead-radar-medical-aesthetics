"use client";
import { useState, useEffect } from "react";
import Operations, { initial, type Workspace } from "./Operations";
import ProjectAdmin from "./ProjectAdmin";
import AccountAdmin from "./AccountAdmin";
import Icon from "./Icon";
import { demoLeads } from "./demo-data";
import { postActions } from "./comment-outreach";
import { createTrialWorkspace } from "./trial-workspace";
import { currentOperator } from "./account-management";
import {
  type Directory,
  type Actor,
  type Project,
  createDirectory,
  visibleProjects,
  projectLeads,
  workspaceFor,
  updateProjectWorkspace,
} from "./project-management";

type WorkView = "screening" | "leads" | "workflow" | "inbox" | "accounts";
type View = WorkView | "projects" | "tenants";
const names: Record<View, string> = {
  projects: "项目空间",
  tenants: "租户管理",
  screening: "数据处理",
  leads: "历史名单",
  workflow: "评论触达",
  inbox: "私信监控",
  accounts: "社媒账号管理",
};
const dataLeads = [...demoLeads, ...postActions(demoLeads)];
export default function Home() {
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [trial, setTrial] = useState(false);
  const [view, setView] = useState<View>("projects");
  const [projectId, setProjectId] = useState("");
  const [actor, setActor] = useState<Actor>(null);
  const [accountTenant, setAccountTenant] = useState("");
  const [help, setHelp] = useState(false);
  const [previewTools, setPreviewTools] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search),
        isTrial = params.get("trial") === "1";
      setTrial(isTrial);
      const key = isTrial
        ? "lead-radar-project-trial-1"
        : "lead-radar-project-overview-1";
      try {
        if (params.get("restart") === "1" || params.get("reset") === "1") {
          localStorage.removeItem(key);
          params.delete("restart");
          params.delete("reset");
          window.history.replaceState(
            {},
            "",
            `${window.location.pathname}?${params}`,
          );
        }
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved) as Directory;
          if (
            parsed.version !== 1 ||
            !Array.isArray(parsed.tenants) ||
            !Array.isArray(parsed.projects) ||
            !parsed.catalog
          )
            throw Error();
          setDirectory(parsed);
          return;
        }
        let base = initial(dataLeads);
        // Keep existing local progress when introducing project ownership. Legacy keys remain untouched.
        const legacy = localStorage.getItem(
          isTrial ? "lead-radar-trial-workspace-1" : "lead-radar-workspace-11",
        );
        if (legacy && !isTrial) {
          try {
            const previous = JSON.parse(legacy) as Workspace;
            if (
              previous.schema === 11 &&
              previous.collectionTasks?.length &&
              previous.queue
            )
              base = { ...base, ...previous };
          } catch {
            /* Fresh project preview; original storage is retained. */
          }
        }
        if (isTrial) base = createTrialWorkspace(base, dataLeads);
        setDirectory(createDirectory(base, dataLeads, isTrial));
      } catch {
        setError(
          "本地项目记录无法读取，未覆盖原记录。可使用“重新开始体验”打开新的体验数据。",
        );
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!directory) return;
    try {
      localStorage.setItem(
        trial ? "lead-radar-project-trial-1" : "lead-radar-project-overview-1",
        JSON.stringify(directory),
      );
    } catch {
      queueMicrotask(() => setError("本地保存失败，请保留当前页面。"));
    }
  }, [directory, trial]);
  const superAdmin = !actor;
  const accessible = directory ? visibleProjects(directory, actor) : [];
  const project = accessible.find(
    (p) =>
      p.id === projectId &&
      p.enabled &&
      directory?.tenants.find((t) => t.id === p.tenantId)?.enabled,
  );
  const tenant = directory?.tenants.find(
    (t) =>
      t.id ===
      (actor?.tenantId ||
        (view === "accounts" ? accountTenant : project?.tenantId) ||
        accountTenant ||
        directory.tenants[0]?.id),
  );
  const member = tenant?.members.find((m) => m.id === actor?.memberId);
  const manageAccounts =
    superAdmin ||
    Boolean(tenant?.enabled && member?.enabled && member.role === "管理员");
  const filteredLeads = projectLeads(demoLeads, project?.taskCodes || []);
  const projectWorkspace =
    project && directory
      ? workspaceFor(
          project,
          directory.tenants.find((t) => t.id === project.tenantId)!,
        )
      : null;
  const openProject = (p: Project) => {
    setProjectId(p.id);
    setAccountTenant(p.tenantId);
    setView("screening");
  };
  const changeIdentity = (value: string) => {
    setActor(value ? (JSON.parse(value) as Actor) : null);
    setProjectId("");
    setAccountTenant("");
    setView("projects");
  };
  const nav = (
    key: View,
    icon: "folder" | "data" | "chat" | "settings",
    label = names[key],
  ) => (
    <button
      key={key}
      className={view === key ? "active" : ""}
      aria-current={view === key ? "page" : undefined}
      onClick={() => setView(key)}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
  return (
    <main className="console-shell">
      <aside className="console-nav">
        <a
          className="console-brand"
          href="#main"
          onClick={() => setView("projects")}
        >
          <span>
            <Icon name="data" size={22} />
          </span>
          <div>
            线索雷达<small>LEAD RADAR</small>
          </div>
        </a>
        <p className="workspace-caption">社交线索工作台</p>
        <nav aria-label="主导航">
          {nav("projects", "folder")}
          {nav("screening", "data")}
          {nav("leads", "folder")}
          {nav("workflow", "chat")}
          {nav("inbox", "chat")}
          {superAdmin && (
            <>
              <div className="directory-nav-section">平台管理 · 超级管理员</div>
              {nav("tenants", "settings")}
            </>
          )}
          {manageAccounts && (
            <>
              {!superAdmin && (
                <div className="directory-nav-section">租户管理</div>
              )}
              {nav("accounts", "settings")}
            </>
          )}
        </nav>
        <div className="nav-bottom">
          <div className="demo-badge">
            <i />
            交互原型 · 虚构数据
          </div>
          <button onClick={() => setHelp(!help)}>
            <Icon name="info" size={17} />
            原型工具
          </button>
        </div>
      </aside>
      <section className="console-main" id="main">
        <header className="console-topbar">
          <div>
            {project &&
            ["screening", "leads", "workflow", "inbox"].includes(view) ? (
              <>
                <button
                  className="directory-crumb"
                  onClick={() => setView("projects")}
                >
                  项目空间
                </button>
                <span>/</span>
                {project.name}
                <span>/</span>
              </>
            ) : (
              "工作空间 / "
            )}
            <strong>{names[view]}</strong>
          </div>
          <span className="topbar-version">
            {superAdmin
              ? "超级管理员"
              : `${tenant?.name || ""} · ${member?.name || "成员"}`}
          </span>
        </header>
        <div className="console-content">
          {directory &&
            ["screening", "leads", "workflow", "inbox"].includes(view) && (
              <label className="directory-tenant-selector">
                当前项目
                <select
                  aria-label="当前项目"
                  value={project?.id || ""}
                  onChange={(e) => {
                    const p = accessible.find((p) => p.id === e.target.value);
                    if (p) {
                      setProjectId(p.id);
                      setAccountTenant(p.tenantId);
                    } else setProjectId("");
                  }}
                >
                  <option value="">请选择项目</option>
                  {accessible
                    .filter(
                      (p) =>
                        p.enabled &&
                        directory.tenants.find((t) => t.id === p.tenantId)
                          ?.enabled,
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {superAdmin
                          ? ` · ${directory.tenants.find((t) => t.id === p.tenantId)?.name}`
                          : ""}
                      </option>
                    ))}
                </select>
              </label>
            )}
          {error && (
            <section className="help-strip directory-error" role="alert">
              {error}
            </section>
          )}
          {help && (
            <section className="help-strip directory-tools">
              <div>
                <strong>原型体验</strong>
                <p>
                  切换角色，检查项目访问范围。这里只模拟权限，不连接真实账号或数据库。
                </p>
                <label>
                  体验身份
                  <select
                    aria-label="体验身份"
                    value={actor ? JSON.stringify(actor) : ""}
                    onChange={(e) => changeIdentity(e.target.value)}
                  >
                    <option value="">超级管理员</option>
                    {directory?.tenants.flatMap((t) =>
                      t.members.map((m) => (
                        <option
                          key={`${t.id}:${m.id}`}
                          value={JSON.stringify({
                            tenantId: t.id,
                            memberId: m.id,
                          })}
                        >
                          {t.name} · {m.name}（
                          {m.role === "管理员" ? "租户管理员" : "成员"}
                          {!m.enabled ? " / 停用" : ""}）
                        </option>
                      )),
                    )}
                  </select>
                </label>
                <label className="directory-check">
                  <input
                    type="checkbox"
                    checked={trial || previewTools}
                    disabled={trial}
                    onChange={(e) => setPreviewTools(e.target.checked)}
                  />
                  显示测试操作
                </label>
                <div className="directory-actions">
                  <a className="button text" href={trial ? "?" : "?trial=1"}>
                    {trial ? "全部状态版本" : "从零流程版本"}
                  </a>
                  <a
                    className="button text"
                    href={trial ? "?trial=1&restart=1" : "?reset=1"}
                  >
                    重新开始体验
                  </a>
                </div>
              </div>
              <button
                className="icon-button"
                aria-label="关闭原型工具"
                onClick={() => setHelp(false)}
              >
                <Icon name="close" />
              </button>
            </section>
          )}
          {trial && view === "projects" && (
            <section className="help-strip">
              <div>
                <strong>从项目开始，体验完整流程</strong>
                <p>
                  进入项目 → 打开待配置任务 → 确认规则 → 处理数据 →
                  创建评论任务。
                </p>
              </div>
              <a className="button secondary" href="?">
                查看全部状态
              </a>
            </section>
          )}
          {!directory && !error && (
            <div className="surface directory-empty">正在加载项目…</div>
          )}
          {directory && (
            <div hidden={view !== "projects"}>
              <ProjectAdmin
                key={`projects:${actor?.memberId || "super"}`}
                directory={directory}
                onChange={setDirectory}
                kind="projects"
                actor={actor}
                leads={dataLeads}
                onOpen={openProject}
              />
            </div>
          )}
          {directory && view === "tenants" && (
            <ProjectAdmin
              key={`tenants:${actor?.memberId || "super"}`}
              directory={directory}
              onChange={setDirectory}
              kind="tenants"
              actor={actor}
              leads={dataLeads}
              onOpen={openProject}
            />
          )}
          {directory && view === "accounts" && manageAccounts && tenant && (
            <>
              {superAdmin && (
                <label className="directory-tenant-selector">
                  当前租户
                  <select
                    aria-label="账号管理所属租户"
                    value={tenant.id}
                    onChange={(e) => {
                      setAccountTenant(e.target.value);
                    }}
                  >
                    {directory.tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <AccountAdmin
                key={tenant.id}
                hideMembers
                hideQuota
                accounts={tenant.shared.managedAccounts}
                quota={tenant.shared.quota}
                members={tenant.members}
                onMembersChange={() => {}}
                onChange={(accounts) =>
                  setDirectory((old) =>
                    old
                      ? {
                          ...old,
                          tenants: old.tenants.map((t) =>
                            t.id === tenant.id
                              ? {
                                  ...t,
                                  shared: {
                                    ...t.shared,
                                    managedAccounts: accounts,
                                  },
                                }
                              : t,
                          ),
                        }
                      : old,
                  )
                }
                onQuotaChange={(quota) =>
                  setDirectory((old) =>
                    old
                      ? {
                          ...old,
                          tenants: old.tenants.map((t) =>
                            t.id === tenant.id
                              ? { ...t, shared: { ...t.shared, quota } }
                              : t,
                          ),
                        }
                      : old,
                  )
                }
              />
            </>
          )}
          {directory &&
            !["projects", "tenants", "accounts"].includes(view) &&
            (project && projectWorkspace ? (
              <Operations
                key={`${project.id}:${actor?.memberId || "super"}`}
                trial={trial}
                leads={filteredLeads}
                view={view as WorkView}
                navigate={(next) => {
                  if (next !== "accounts" || manageAccounts) setView(next);
                }}
                previewTools={trial || previewTools}
                scope={{
                  workspace: projectWorkspace,
                  operatorId: actor?.memberId || currentOperator,
                  onChange: (update) =>
                    setDirectory((old) =>
                      old
                        ? updateProjectWorkspace(old, project.id, (w) =>
                            typeof update === "function" ? update(w) : update,
                          )
                        : old,
                    ),
                }}
              />
            ) : (
              <section className="surface directory-empty">
                <h2>请先选择项目</h2>
                <p>项目可能尚未分配或已停用。</p>
                <button
                  className="button primary"
                  onClick={() => setView("projects")}
                >
                  返回项目空间
                </button>
              </section>
            ))}
        </div>
      </section>
    </main>
  );
}
