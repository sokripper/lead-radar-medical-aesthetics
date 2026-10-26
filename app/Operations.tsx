"use client";
import { useState, useEffect, useRef, type ReactNode } from "react";
import Icon from "./Icon";
import {
  StatusPill,
  MessageBubble,
  Disclosure,
  MetricLine,
} from "./WorkspaceUI";
import { recipientEvents } from "./presentation";
import {
  type OutreachProfile,
  emptyOutreachProfile,
  restoreOutreachProfile,
  openingCopy,
  followupCopy,
  openingTemplates,
  approachLabels,
  projectNames,
  outreachIssue,
  outreachKey,
  productOpeningCopy,
} from "./outreach-copy";
import { RuleSummary, RuleFields } from "./RuleFields";
import AccountAdmin from "./AccountAdmin";
import {
  type ManagedAccount,
  type QuotaGrade,
  type TenantQuota,
  demoAccounts,
  demoQuota,
  restoreManagedAccounts,
  restoreQuota,
  assignedAccounts,
  accountReady,
  quotaRemaining,
  quotaCanReserve,
  reserveQuota,
  settleQuota,
  releaseQuota,
} from "./account-management";
import {
  type ScreeningRules,
  type TouchMode,
  touchModeOptions,
  touchModeLabel,
  defaultRules,
  restoreRules,
  rulesError,
  reviseRules,
  partitionResults,
} from "./workflow-config";
import { reviseMonitoring } from "./operations-state";
import {
  type Prospect,
  type SendStatus,
  type Monitoring,
  type Adjustment,
  type AccountStatus,
  type TodoStatus,
  taskStatus,
  todoStatus,
  beijingTime,
  toggleId,
  emptyMonitoring,
  monitorError,
  monitorStatus,
  canGenerate,
  adjustGrade,
  transitionSend,
  contactStatus,
  exportRows,
  csvCell,
  prepareDemoRecipients,
  readyRecipients,
  removeSubmitted,
  mergePreparedQueue,
  reachabilityOf,
} from "./operations-state";

type View = "screening" | "leads" | "workflow" | "accounts";
type Platform = "小红书";
type Batch = {
  id: number;
  name: string;
  sourceTaskCode?: string;
  ids: number[];
  time: string;
  rules?: ScreeningRules;
  touchMode: TouchMode;
};
type CollectionTaskStatus = "待配置" | "等待数据" | "可解析" | "解析中" | "解析完成";
type TaskWorkspaceTab = "overview" | "results" | "attention" | "rules";
type CollectionTask = {
  id: number;
  name: string;
  sourceTaskCode: string;
  platform: Platform;
  status: CollectionTaskStatus;
  createdAt: string;
  rules: ScreeningRules;
  touchMode: TouchMode;
  batchId?: number;
};
type Queue = {
  ids: number[];
  blocked: number[];
  included: number[];
  drafts: Record<number, string>;
  edited: number[];
  copyKeys?: Record<number, string>;
};
type Task = {
  id: number;
  name: string;
  senderAccountId?: string;
  senderAccountName?: string;
  quotaGrades: Record<number, QuotaGrade>;
  ids: number[];
  texts: Record<number, string>;
  results: Record<number, SendStatus>;
  replies: number[];
  followups: Record<number, string>;
  followResults: Record<number, SendStatus>;
  monitor: Monitoring;
  paused: boolean;
  todos: Record<number, TodoStatus>;
  notes: Record<number, { text: string; time: string }[]>;
  events: string[];
};
type Workspace = {
  rules: ScreeningRules;
  supplements: Record<number, string>;
  sender: string;
  dataState: string;
  schema: number;
  batches: Batch[];
  batchId: number;
  collectionTasks: CollectionTask[];
  grades: Record<number, Prospect["grade"]>;
  adjustments: Record<number, Adjustment[]>;
  failed: number[];
  selected: number[];
  queue: Queue;
  tasks: Task[];
  identity: string;
  attested: boolean;
  outreach: OutreachProfile;
  accounts: Record<Platform, AccountStatus>;
  managedAccounts: ManagedAccount[];
  industry: string;
  region: string;
  monitor: Monitoring;
  quota: TenantQuota;
};
const emptyQueue = (): Queue => ({
  ids: [],
  blocked: [],
  included: [],
  drafts: {},
  edited: [],
});
const platform = (l: Prospect): Platform => {
  if (!l.source.includes("小红书")) throw Error("不支持的数据平台");
  return "小红书";
};
const initial = (leads: Prospect[]): Workspace => ({
  rules: defaultRules(),
  supplements: {},
  sender: "",
  dataState: "待处理",
  schema: 10,
  batches: [],
  batchId: 0,
  collectionTasks: [{
    id: 10001,
    name: "社媒获客_小红书2",
    sourceTaskCode: "6b27c68f027e412680393da7b322516e",
    platform: "小红书",
    status: "待配置",
    createdAt: "2026/10/26 15:30:00",
    rules: defaultRules(),
    touchMode: "PRECISION",
  }],
  grades: Object.fromEntries(leads.map((l) => [l.id, l.grade])),
  adjustments: {},
  failed: [],
  selected: [],
  queue: emptyQueue(),
  tasks: [],
  identity: "",
  attested: false,
  outreach: emptyOutreachProfile(),
  accounts: { 小红书: "未授权" },
  managedAccounts: demoAccounts(),
  industry: "新媒体运营",
  region: "全国",
  monitor: emptyMonitoring(),
  quota: demoQuota(),
});
const labels = {
  A: "高意向",
  B: "有需求",
  C: "弱意向",
  D: "无明确意向",
  待判断: "待判断",
};
const quotaGradeKeys:QuotaGrade[] = ["A", "B", "C", "D"];
const quotaGradeOf = (grade:Prospect["grade"]):QuotaGrade => quotaGradeKeys.includes(grade as QuotaGrade) ? grade as QuotaGrade : "D";
const quotaNeedsOf = (recipients:Prospect[],grades:Record<number,Prospect["grade"]>):Record<QuotaGrade,number> =>
  recipients.reduce((needs,lead)=>({ ...needs, [quotaGradeOf(grades[lead.id])]: needs[quotaGradeOf(grades[lead.id])] + 1 }), { A:0, B:0, C:0, D:0 });
const sharedTasks = [
  { code: "6b27c68f027e412680393da7b322516e", name: "社媒获客_小红书2", status: "已入库" },
] as const;
const taskStatusCopy: Record<CollectionTaskStatus, { title: string; detail: string }> = {
  待配置: {
    title: "已自动同步任务，请选择触达模式",
    detail: "任务 Key 和名称来自羚羊共享库。选择精准或批量触达，并补充业务信息后即可开始处理。",
  },
  等待数据: {
    title: "等待共享库数据入库",
    detail: "任务已登记。系统将按羚羊任务 ID 检查数据，入库前可以修改任务信息和业务规则。",
  },
  可解析: {
    title: "数据已就绪，可以开始处理",
    detail: "开始前仍可核对触达模式和业务信息；开始后，本次模式与规则将锁定为任务快照。",
  },
  解析中: {
    title: "正在处理任务数据",
    detail: "系统正在执行基础校验、去重和对应模式的名单处理。可以离开本页，稍后再次进入查看。",
  },
  解析完成: {
    title: "解析完成，可以处理结果",
    detail: "触达名单、需要处理的记录和本次模式快照均保留在当前任务内。",
  },
};
function Sheet({
  open,
  title,
  children,
  footer,
  onClose,
  wide = false,
  className = "",
  subtitle,
  avatar,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
  subtitle?: string;
  avatar?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  return (
    <dialog
      aria-label={title}
      ref={ref}
      className={`side-sheet ${wide ? "wide" : ""} ${className}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-shell">
        <header>
          <div className="sheet-title">
            {avatar && <span className="avatar tone-0">{avatar}</span>}
            <div>
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <button
            className="icon-button"
            aria-label="关闭面板"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="sheet-scroll">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </dialog>
  );
}
export default function Operations({
  leads,
  view,
  navigate,
}: {
  leads: Prospect[];
  view: View;
  navigate: (v: View) => void;
}) {
  const [w, setW] = useState(() => initial(leads));
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const [filter, setFilter] = useState("CONTACTABLE");
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [contactFilter, setContactFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [editingCollectionTaskId, setEditingCollectionTaskId] = useState<number | null>(null);
  const [activeCollectionTaskId, setActiveCollectionTaskId] = useState<number | null>(null);
  const [taskWorkspaceTab, setTaskWorkspaceTab] = useState<TaskWorkspaceTab>("overview");
  const [collectionTaskDraft, setCollectionTaskDraft] = useState(() => ({
    name: "",
    sourceTaskCode: "",
    touchMode: "PRECISION" as TouchMode,
    rules: defaultRules(),
  }));
  const [settings, setSettings] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [ruleDraft, setRuleDraft] = useState(defaultRules);
  const [attentionOpen, setAttentionOpen] = useState(false);
  const [attentionFilter, setAttentionFilter] = useState("ALL");
  const [monitorEdit, setMonitorEdit] = useState<{
    task: number;
    draft: Monitoring;
  } | null>(null);
  const [monitorSaveError, setMonitorSaveError] = useState("");
  const [returnReview, setReturnReview] = useState(false);
  const [review, setReview] = useState(false);
  const [detail, setDetail] = useState<number | null>(null);
  const [adjusting, setAdjusting] = useState<{
    id: number;
    grade: Prospect["grade"];
  } | null>(null);
  const [reason, setReason] = useState("");
  const [regenerate, setRegenerate] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"selected" | "filtered">(
    "filtered",
  );
  const [convo, setConvo] = useState<{ task: number; lead: number } | null>(
    null,
  );
  const [reply, setReply] = useState<{
    task: number;
    lead: number;
    text: string;
    contextChanged: boolean;
    reviewedLatest: boolean;
  } | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const processingTimer = useRef<number | null>(null);
  const submitting = useRef(false);
  const patch = (x: Partial<Workspace>) => setW((old) => ({ ...old, ...x }));
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 6000);
    return () => window.clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const resetRequested = new URLSearchParams(window.location.search).get("reset") === "1";
        if (resetRequested) {
          localStorage.removeItem("lead-radar-workspace-10");
          localStorage.removeItem("lead-radar-workspace-9");
          localStorage.removeItem("lead-radar-workspace-8");
          localStorage.removeItem("lead-radar-workspace-7");
          localStorage.removeItem("lead-radar-workspace-6");
          localStorage.removeItem("lead-radar-workspace-5");
          localStorage.removeItem("lead-radar-workspace-4");
          localStorage.removeItem("lead-radar-reply-drafts-4");
          window.history.replaceState({}, "", window.location.pathname);
        }
        const raw = localStorage.getItem("lead-radar-workspace-10") || localStorage.getItem("lead-radar-workspace-9") || localStorage.getItem("lead-radar-workspace-8");
        if (raw) {
          const x = JSON.parse(raw);
          if (
            ![8, 9, 10].includes(x.schema) ||
            !Array.isArray(x.batches) ||
            !Array.isArray(x.tasks) ||
            !x.queue ||
            !x.grades
          )
            throw Error();
          setW({
            ...initial(leads),
            ...x,
            schema: 10,
            batches: x.batches.map((batch: Batch) => ({
              ...batch,
              touchMode: batch.touchMode === "BULK" ? "BULK" : "PRECISION",
            })),
            collectionTasks: Array.isArray(x.collectionTasks)
              ? x.collectionTasks.map((task: CollectionTask) => ({
                  ...task,
                  platform: "小红书",
                  touchMode: task.touchMode === "BULK" ? "BULK" : "PRECISION",
                  rules: restoreRules(task.rules),
                }))
              : x.batches.map((batch: Batch) => ({
                  id: batch.id,
                  name: batch.name,
                  sourceTaskCode: batch.sourceTaskCode || `legacy-${batch.id}`,
                  platform: "小红书",
                  status: "解析完成",
                  createdAt: batch.time,
                  rules: restoreRules(batch.rules || x.rules),
                  touchMode: batch.touchMode === "BULK" ? "BULK" : "PRECISION",
                  batchId: batch.id,
                })),
            managedAccounts: restoreManagedAccounts(x.managedAccounts),
            quota: restoreQuota(x.quota),
            rules: restoreRules(x.rules || {
              industry: x.industry || "新媒体运营",
              region: x.region || "全国",
            }),
            supplements: x.supplements || {},
            sender: x.schema === 4 && x.sender === "xhs" ? "xhs-main" : x.sender || "",
            outreach: restoreOutreachProfile(x.outreach),
            dataState: ["处理中"].includes(x.dataState)
              ? "已取消"
              : x.dataState || "待处理",
            accounts: {
              小红书:
                typeof x.accounts?.小红书 === "string" &&
                x.accounts.小红书 !== "授权中"
                  ? x.accounts.小红书
                  : "未授权",
            },
            tasks: x.tasks.map((t: Task) => ({
              ...t,
              quotaGrades: t.quotaGrades || Object.fromEntries(t.ids.map(id => [id, quotaGradeOf(x.grades[id])])),
              senderAccountId: t.senderAccountId || (x.schema === 4 ? "xhs-main" : undefined),
              senderAccountName: t.senderAccountName || (x.schema === 4 ? "小红书品牌号" : undefined),
              todos: t.todos || {},
              notes: t.notes || {},
              monitor: { ...t.monitor, checking: false },
            })),
          });
        }
        const drafts = localStorage.getItem("lead-radar-reply-drafts-4");
        if (drafts) setReplyDrafts(JSON.parse(drafts));
      } catch {
        setSaveError("本地记录无法恢复。请先核对历史发送记录，避免重复联系。");
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(restore);
  }, [leads]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("lead-radar-workspace-10", JSON.stringify(w));
    } catch {
      queueMicrotask(() => setSaveError("本地保存失败，刷新可能丢失编辑。"));
    }
  }, [loaded, w]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        "lead-radar-reply-drafts-4",
        JSON.stringify(replyDrafts),
      );
    } catch {
      queueMicrotask(() => setSaveError("跟进草稿保存失败，请保留当前编辑。"));
    }
  }, [loaded, replyDrafts]);
  const pool = [...new Set(w.batches.flatMap((b) => b.ids))];
  const activeCollectionTask = w.collectionTasks.find((task) => task.id === activeCollectionTaskId);
  const current = view === "screening"
    ? w.batches.find((batch) => batch.id === activeCollectionTask?.batchId)
    : w.batches.find((batch) => batch.id === w.batchId);
  const activeTouchMode: TouchMode = activeCollectionTask?.touchMode || current?.touchMode || "PRECISION";
  const activeRules = activeCollectionTask?.rules || current?.rules || w.rules;
  const rows = leads.filter((l) =>
    (view === "leads" ? pool : current?.ids || []).includes(l.id),
  );
  const contact = (id: number) =>
    contactStatus(
      w.tasks.filter((t) => t.ids.includes(id)).map((t) => t.results[id]),
    );
  const occupied = w.tasks.flatMap((t) => t.ids);
  const reachability = (lead: Prospect) => reachabilityOf(lead,w.grades[lead.id]);
  const contactableForMode = (lead: Prospect) => {
    const grade = w.grades[lead.id];
    if (grade === "待判断") return false;
    return activeTouchMode === "BULK" ? ["A", "B", "C", "D"].includes(grade) : ["A", "B", "C"].includes(grade);
  };
  const available = (id: number) => {
    const lead=leads.find(item=>item.id===id);
    return Boolean(lead&&contactableForMode(lead)&&!w.failed.includes(id)&&!occupied.includes(id));
  };
  const { completed, attention } = partitionResults(rows, w.grades, w.failed);
  const attentionRows = attention.filter(
    (l) =>
      attentionFilter === "ALL" ||
      (attentionFilter === "FAILED"
        ? w.failed.includes(l.id)
        : !w.failed.includes(l.id)),
  );
  const visible = completed.filter(
    (l) =>
      (filter === "ALL" || filter === "FAILED"
        ? filter === "ALL" || w.failed.includes(l.id)
        : !w.failed.includes(l.id) &&
          (filter === "CONTACTABLE"
            ? contactableForMode(l)
            : w.grades[l.id] === filter)) &&
      `${l.name}${l.context}${l.intent}${l.location}`.includes(search.trim()) &&
      (!batchFilter ||
        w.batches
          .find((b) => b.id === Number(batchFilter))
          ?.ids.includes(l.id)) &&
      (!regionFilter || l.location === regionFilter) &&
      (!contactFilter || contact(l.id) === contactFilter),
  );
  const selected = w.selected.filter(
    (id) => rows.some((l) => l.id === id) && available(id),
  );
  const identityOK = canGenerate("formal", w.identity, w.attested);
  const productCopy = (l: Prospect) => activeTouchMode === "BULK" && w.grades[l.id] === "D";
  const copyKeyFor = (l: Prospect) => productCopy(l)
    ? JSON.stringify(["PRODUCT", activeRules.revision, activeRules.offering, activeRules.businessNeeds])
    : JSON.stringify(["CONTEXT", outreachKey(w.outreach)]);
  function copyIssue(l: Prospect) {
    const issue = productCopy(l) ? rulesError(activeRules) : outreachIssue(l, w.outreach);
    return issue ||
      (w.queue.drafts[l.id] !== undefined && w.queue.copyKeys?.[l.id] !== copyKeyFor(l)
        ? "话术已更新，请重新生成；原编辑已保留" : "");
  }
  const copyPending = leads.filter(l => w.queue.ids.includes(l.id) && !w.queue.blocked.includes(l.id) && copyIssue(l));
  const personalAccounts = assignedAccounts(w.managedAccounts);
  const selectedAccount = personalAccounts.find(account => account.id === w.sender);
  const remainingQuota:Record<QuotaGrade,number> = {
    A:quotaRemaining(w.quota,"A"), B:quotaRemaining(w.quota,"B"), C:quotaRemaining(w.quota,"C"), D:quotaRemaining(w.quota,"D"),
  };
  const remainingQuotaSummary = quotaGradeKeys.map(grade=>`${grade} ${remainingQuota[grade].toLocaleString()}`).join(" · ");
  const senderReady = accountReady(w.managedAccounts, w.sender);
  const taskAccount = (t: Task) => w.managedAccounts.find(account => account.id === t.senderAccountId);
  const taskReady = (t: Task) => accountReady(w.managedAccounts, t.senderAccountId || "");
  const ready = identityOK && senderReady
    ? readyRecipients(leads, w.queue, w.grades, occupied, { 小红书: true }, copyPending.map(l => l.id), leads.filter(l=>available(l.id)).map(l=>l.id)).filter(l => available(l.id))
    : [];
  const readyQuotaNeeds = quotaNeedsOf(ready, w.grades);
  const readyQuotaAvailable = quotaCanReserve(w.quota, readyQuotaNeeds);
  const readyQuotaSummary = quotaGradeKeys.filter(grade=>readyQuotaNeeds[grade]>0).map(grade=>`${grade} ${readyQuotaNeeds[grade]} 次`).join(" · ");
  const quotaShortageSummary = quotaGradeKeys.filter(grade=>readyQuotaNeeds[grade]>remainingQuota[grade]).map(grade=>`${grade} 需 ${readyQuotaNeeds[grade]} / 余 ${remainingQuota[grade]}`).join(" · ");
  const detailLead = leads.find((l) => l.id === detail);
  const task = w.tasks.find((t) => t.id === convo?.task);
  const person = leads.find((l) => l.id === convo?.lead);
  const replyTask = w.tasks.find((t) => t.id === reply?.task);
  const replyQuotaGrade = reply ? replyTask?.quotaGrades?.[reply.lead] || quotaGradeOf(w.grades[reply.lead]) : null;
  const replyQuotaAvailable = Boolean(replyQuotaGrade && quotaRemaining(w.quota, replyQuotaGrade) > 0);
  const unread = w.tasks.reduce(
    (n, t) =>
      n +
      t.replies.filter(
        (id) =>
          !["已完成", "已关闭", "已转人工"].includes(
            todoStatus(t.followResults[id], t.todos[id]),
          ),
      ).length,
    0,
  );
  function message(l: Prospect) {
    return productCopy(l) ? productOpeningCopy(activeRules, l.id) : openingCopy(l, w.outreach);
  }
  function openCollectionTask(task: CollectionTask) {
    setActiveCollectionTaskId(task.id);
    setTaskWorkspaceTab(task.status === "解析完成" ? "results" : "overview");
    setFilter(task.touchMode === "BULK" ? "ALL" : "CONTACTABLE");
    setSearch("");
    setAttentionFilter("ALL");
    if (task.batchId) patch({ batchId: task.batchId, selected: [] });
  }
  function closeCollectionTask() {
    setActiveCollectionTaskId(null);
    setTaskWorkspaceTab("overview");
    patch({ selected: [] });
  }
  function openEditCollectionTask(task: CollectionTask) {
    if (!["待配置", "等待数据", "可解析"].includes(task.status)) return;
    setEditingCollectionTaskId(task.id);
    setCollectionTaskDraft({
      name: task.name,
      sourceTaskCode: task.sourceTaskCode,
      touchMode: task.touchMode,
      rules: JSON.parse(JSON.stringify(task.rules)),
    });
    setCreateTaskOpen(true);
  }
  function createCollectionTask() {
    const name = collectionTaskDraft.name.trim();
    const code = collectionTaskDraft.sourceTaskCode.trim();
    if (!name || !code || rulesError(collectionTaskDraft.rules)) return;
    if (w.collectionTasks.some((task) => task.sourceTaskCode === code && task.id !== editingCollectionTaskId)) {
      setNotice("该羚羊任务 ID 已创建，请直接查看现有任务。");
      return;
    }
    const available = sharedTasks.some((task) => task.code === code);
    if (editingCollectionTaskId !== null) {
      setW((old) => ({
        ...old,
        collectionTasks: old.collectionTasks.map((task) => task.id === editingCollectionTaskId ? {
          ...task,
          name,
          sourceTaskCode: code,
          status: available ? "可解析" : "等待数据",
          touchMode: collectionTaskDraft.touchMode,
          rules: JSON.parse(JSON.stringify(collectionTaskDraft.rules)),
        } : task),
      }));
      setCreateTaskOpen(false);
      setEditingCollectionTaskId(null);
      setNotice("任务信息和业务规则已更新。");
      return;
    }
    const id = Date.now();
    setW((old) => ({
      ...old,
      collectionTasks: [{
        id,
        name,
        sourceTaskCode: code,
        platform: "小红书",
        status: available ? "可解析" : "等待数据",
        touchMode: collectionTaskDraft.touchMode,
        createdAt: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
        rules: JSON.parse(JSON.stringify(collectionTaskDraft.rules)),
      }, ...old.collectionTasks],
    }));
    setCreateTaskOpen(false);
    setEditingCollectionTaskId(null);
    setNotice(available ? "任务已创建，已检测到数据，可以开始解析。" : "任务已创建，将在数据入库后提醒解析。");
  }
  function refreshCollectionTask(task: CollectionTask) {
    const available = sharedTasks.some((item) => item.code === task.sourceTaskCode);
    if (!available) {
      setNotice("暂未检测到完整数据，后台会继续检查。");
      return;
    }
    setW((old) => ({
      ...old,
      collectionTasks: old.collectionTasks.map((item) => item.id === task.id ? { ...item, status: "可解析" } : item),
    }));
    setNotice("数据已就绪，可以开始解析。");
  }
  function runCollectionTask(task: CollectionTask) {
    if (busy || task.status !== "可解析") return;
    setActiveCollectionTaskId(task.id);
    setTaskWorkspaceTab("overview");
    const existing = w.batches.find((batch) => batch.sourceTaskCode === task.sourceTaskCode);
    if (existing) {
      setW((old) => ({
        ...old,
        batchId: existing.id,
        selected: [],
        collectionTasks: old.collectionTasks.map((item) => item.id === task.id ? { ...item, status: "解析完成", batchId: existing.id } : item),
      }));
      setFilter(task.touchMode === "BULK" ? "ALL" : "CONTACTABLE");
      setTaskWorkspaceTab("results");
      setNotice("该任务已完成解析，已切换到现有结果。");
      return;
    }
    setBusy(true);
    setW((old) => ({
      ...old,
      dataState: "处理中",
      collectionTasks: old.collectionTasks.map((item) => item.id === task.id ? { ...item, status: "解析中" } : item),
    }));
    processingTimer.current = window.setTimeout(() => {
      const id = Date.now();
      setW((old) => ({
        ...old,
        batches: [
          {
            id,
            name: task.name,
            sourceTaskCode: task.sourceTaskCode,
            ids: leads.map((l) => l.id),
            time: new Date().toLocaleString("zh-CN", {
              timeZone: "Asia/Shanghai",
            }),
            rules: JSON.parse(JSON.stringify(task.rules)),
            touchMode: task.touchMode,
          },
          ...old.batches,
        ],
        batchId: id,
        selected: [],
        failed: [8],
        dataState: "部分完成",
        collectionTasks: old.collectionTasks.map((item) => item.id === task.id ? { ...item, status: "解析完成", batchId: id } : item),
      }));
      setBusy(false);
      setFilter(task.touchMode === "BULK" ? "ALL" : "CONTACTABLE");
      setTaskWorkspaceTab("results");
      setSearch("");
      setBatchFilter("");
      setRegionFilter("");
      setContactFilter("");
      setNotice(`“${task.name}”已完成解析。`);
    }, 1000);
  }
  function prepare() {
    if (!selected.length) return;
    if (!identityOK) {
      setSettings(true);
      setNotice("请补充沟通署名，不能编造身份。");
      return;
    }
    const p = prepareDemoRecipients(selected, pool, occupied);
    const allocatedAccount = selectedAccount?.status === "正常"
      ? selectedAccount.id
      : personalAccounts.find((account) => account.status === "正常")?.id || "";
    submitting.current = false;
    patch({
      sender: allocatedAccount,
      queue: mergePreparedQueue(
        w.queue,
        p,
        Object.fromEntries(leads.filter(l => p.matched.includes(l.id)).map(l => [l.id, message(l)])),
        Object.fromEntries(leads.filter(l => p.matched.includes(l.id)).map(l => [l.id, copyKeyFor(l)])),
      ),
    });
    setReview(true);
  }
  function send() {
    if (submitting.current || !ready.length || !readyQuotaAvailable || monitorError(w.monitor)) return;
    submitting.current = true;
    const ids = ready.map((l) => l.id);
    // eslint-disable-next-line react-hooks/purity -- Timestamp is created only in the explicit send event handler.
    const id = Date.now();
    setW((old) => ({
      ...old,
      tasks: [
        ...old.tasks,
        {
          id,
          name: `触达任务 ${old.tasks.length + 1}`,
          senderAccountId: old.sender,
          senderAccountName: old.managedAccounts.find(account => account.id === old.sender)?.name || "未指定账号",
          quotaGrades: Object.fromEntries(ready.map(lead => [lead.id, quotaGradeOf(old.grades[lead.id])])),
          ids,
          texts: Object.fromEntries(
            ready.map((l) => [l.id, old.queue.drafts[l.id]]),
          ),
          results: Object.fromEntries(
            ids.map((i) => [i, "待执行" as SendStatus]),
          ),
          replies: [],
          followups: {},
          followResults: {},
          monitor: reviseMonitoring(emptyMonitoring(), old.monitor),
          paused: false,
          todos: {},
          notes: {},
          events: [
            `${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} 已受理演示提交`,
          ],
        },
      ],
      queue: removeSubmitted(old.queue, ids),
      quota: quotaGradeKeys.reduce(
        (quota, grade) => reserveQuota(quota, grade, readyQuotaNeeds[grade]),
        old.quota,
      ),
      monitor: emptyMonitoring(),
      selected: [],
    }));
    setReview(false);
    navigate("workflow");
    setNotice(
      "提交已受理，消息处于待执行。可通过模拟结果继续测试；未发送真实消息。",
    );
  }
  function outcome(
    tid: number,
    id: number,
    event: Parameters<typeof transitionSend>[1],
    follow = false,
  ) {
    setNotice("");
    setW((old) => {
      let quota = old.quota;
      const tasks = old.tasks.map((t) => {
        if (t.id !== tid) return t;
        const key = follow ? "followResults" : "results";
        const quotaGrade = t.quotaGrades?.[id] || quotaGradeOf(old.grades[id]);
        if (follow && ["已关闭", "已转人工"].includes(t.todos[id])) return t;
        const from = t[key][id] || "待执行";
        if (
          t.paused &&
          from === "待执行" &&
          event !== "cancel" &&
          !event.startsWith("verified-")
        )
          return t;
        if (
          !accountReady(old.managedAccounts, t.senderAccountId || "") &&
          from !== "执行中" &&
          !event.startsWith("verified-") &&
          event !== "cancel"
        )
          return t;
        if (from === "发送失败" && event === "retry") {
          if (quotaRemaining(quota, quotaGrade) <= 0) return t;
          quota = reserveQuota(quota, quotaGrade);
        }
        const next = transitionSend(from, event);
        if (next !== from && next === "发送成功") {
          quota = settleQuota(quota, quotaGrade);
        } else if (next !== from && ["发送失败", "已取消"].includes(next)) {
          quota = releaseQuota(quota, quotaGrade);
        }
        return {
          ...t,
          [key]: { ...t[key], [id]: next },
          events:
            next === from
              ? t.events
              : [
                  ...t.events,
                  `${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} · ${follow ? "跟进" : "首轮"} ${id} · ${from} → ${next}（模拟）`,
                ],
        };
      });
      return { ...old, tasks, quota };
    });
  }
  function controls(t: Task, id: number, follow = false) {
    const status = (follow ? t.followResults : t.results)[id];
    const blocked =
      (follow && ["已关闭", "已转人工"].includes(t.todos[id])) ||
      t.paused ||
      !taskReady(t);
    return (
      <div className="inline-actions result-controls">
        {(status === "待执行" || status === "执行中") && (
          <>
            {(
              ["start", "success", "failure", "unknown", "cancel"] as const
            ).map((event, i) => (
              <button
                className="button secondary"
                key={event}
                disabled={
                  (status === "执行中" &&
                    (event === "start" || event === "cancel")) ||
                  (status === "待执行" && event !== "cancel" && blocked)
                }
                onClick={() => outcome(t.id, id, event, follow)}
              >
                {
                  [
                    "模拟开始执行",
                    "模拟发送成功",
                    "模拟发送失败",
                    "模拟结果待核实",
                    "取消待执行",
                  ][i]
                }
              </button>
            ))}
          </>
        )}
        {status === "发送失败" && (
          <button
            className="button secondary"
            disabled={blocked}
            onClick={() => outcome(t.id, id, "retry", follow)}
          >
            确认已修复并重试
          </button>
        )}
        {status === "结果待核实" && (
          <>
            <button
              className="button secondary"
              onClick={() => outcome(t.id, id, "verified-success", follow)}
            >
              模拟核实为已发送
            </button>
            <button
              className="button secondary"
              onClick={() => outcome(t.id, id, "verified-failure", follow)}
            >
              模拟核实为未发送
            </button>
          </>
        )}
      </div>
    );
  }
  function checkReply(t: Task, add = true) {
    if (
      t.paused ||
      monitorStatus(t.monitor) !== "等待检查" ||
      !taskReady(t)
    )
      return;
    setW((old) => ({
      ...old,
      tasks: old.tasks.map((x) =>
        x.id === t.id
          ? { ...x, monitor: { ...x.monitor, checking: true } }
          : x,
      ),
    }));
    window.setTimeout(() => {
      const replyId = t.ids.find(
        (i) => t.results[i] === "发送成功" && !t.replies.includes(i),
      );
      const found = add && replyId !== undefined;
      setW((old) => ({
        ...old,
        tasks: old.tasks.map((x) => {
          if (x.id !== t.id) return x;
          return {
            ...x,
            replies:
              found && !x.replies.includes(replyId!)
                ? [...x.replies, replyId!]
                : x.replies,
            monitor: {
              ...x.monitor,
              checking: false,
              lastCheck: new Date().toLocaleString("zh-CN", {
                timeZone: "Asia/Shanghai",
              }),
            },
          };
        }),
      }));
      setNotice(
        found
          ? "收到示例回复，待办尚未处理。"
          : "检查完成（模拟）：没有新增回复，未生成内容。",
      );
    }, 800);
  }
  function setTodo(t: Task, id: number, status: TodoStatus, reason = "") {
    setW((old) => ({
      ...old,
      tasks: old.tasks.map((x) =>
        x.id === t.id
          ? {
              ...x,
              todos: { ...x.todos, [id]: status },
              events: [
                ...x.events,
                `${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} · 回复 ${id} · ${status}${reason ? ` · ${reason}` : ""}`,
              ],
            }
          : x,
      ),
    }));
  }
  function beginReply(t: Task, id: number) {
    if (
      ["已关闭", "已转人工", "已完成"].includes(
        todoStatus(t.followResults[id], t.todos[id]),
      )
    )
      return;
    setTodo(t, id, "处理中");
    setReply({
      task: t.id,
      lead: id,
      text:
        replyDrafts[`${t.id}:${id}`] ??
        followupCopy(leads.find((l) => l.id === id)),
      contextChanged: true,
      reviewedLatest: false,
    });
  }
  function addNote(t: Task, id: number) {
    const key = `${t.id}:${id}`;
    const text = noteDrafts[key]?.trim();
    if (!text) return;
    const note = {
      text,
      time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    };
    setW((old) => ({
      ...old,
      tasks: old.tasks.map((x) =>
        x.id === t.id
          ? {
              ...x,
              notes: { ...x.notes, [id]: [...(x.notes[id] || []), note] },
            }
          : x,
      ),
    }));
    setNoteDrafts((old) => ({ ...old, [key]: "" }));
    setNotice("跟进备注已保存。备注不会作为私信发送。");
  }
  function todoActions(t: Task, id: number) {
    const state = todoStatus(t.followResults[id], t.todos[id]);
    return (
      <div className="task-todo">
        <p>待回复：{state === "已转人工" ? "人工接管中" : state}</p>
        {state === "已转人工" && (
          <button
            className="button text"
            onClick={() => {
              if (window.confirm("确认问题已解决，并恢复自动处理此待办？"))
                setTodo(t, id, "待处理");
            }}
          >
            问题已解决，恢复自动处理
          </button>
        )}
        {![
          "已完成",
          "已关闭",
          "已转人工",
          "等待发送结果",
          "结果待核实",
        ].includes(state) && (
          <>
            <button
              className="button text"
              onClick={() => {
                if (
                  window.confirm(
                    "停止自动处理后，将由当前操作人手动跟进。是否继续？",
                  )
                )
                  setTodo(t, id, "已转人工");
              }}
            >
              停止自动处理
            </button>
            <button
              className="button text"
              onClick={() => {
                const reason = window.prompt("请输入关闭原因");
                if (reason?.trim()) {
                  setTodo(t, id, "已关闭", reason.trim());
                  setNotice(`待办已关闭：${reason.trim()}`);
                }
              }}
            >
              关闭待办
            </button>
          </>
        )}
      </div>
    );
  }
  function changeMonitor(t: Task, action: "pause" | "end") {
    setW((old) => ({
      ...old,
      tasks: old.tasks.map((x) =>
        x.id === t.id
          ? {
              ...x,
              monitor:
                action === "end"
                  ? { ...x.monitor, ended: true }
                  : { ...x.monitor, paused: !x.monitor.paused },
            }
          : x,
      ),
    }));
  }
  function exportList() {
    const data = exportRows(exportScope, rows, w.selected, visible);
    const csv = [
      ["用户", "平台", "触达模式", "意向等级", "话术类型", "业务场景", "触达建议", "地区", "评论", "依据", "联系状态"],
      ...data.map((l) => [
        l.name,
        platform(l),
        touchModeLabel(activeTouchMode),
        w.failed.includes(l.id) ? "处理失败" : w.grades[l.id],
        productCopy(l) ? "产品话术" : "上下文话术",
        l.businessScene || "待判断",
        reachability(l),
        l.location,
        l.context,
        l.evidence,
        contact(l.id),
      ]),
    ]
      .map((r) => r.map(csvCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "线索雷达-示例名单.csv";
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }
  function regenerateOne(id: number) {
    if (!identityOK) return;
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const error = productCopy(lead) ? rulesError(activeRules) : outreachIssue(lead, w.outreach);
    if (error) { setNotice(error); setRegenerate(null); openSettings(true); return; }
    patch({
      queue: {
        ...w.queue,
        drafts: {
          ...w.queue.drafts,
          [id]: message(lead),
        },
        copyKeys: { ...w.queue.copyKeys, [id]: copyKeyFor(lead) },
        edited: w.queue.edited.filter((i) => i !== id),
      },
    });
    setRegenerate(null);
  }
  function regenerateBatch() {
    if (!identityOK) return;
    const candidates = leads.filter(l => w.queue.included.includes(l.id) && !w.queue.blocked.includes(l.id) && available(l.id) && !copyIssue(l));
    if (!candidates.length) { setRegenerate(null); setNotice("请先补充业务信息或上下文话术素材"); openSettings(true); return; }
    patch({ queue: { ...w.queue,
      drafts: { ...w.queue.drafts, ...Object.fromEntries(candidates.map(l => [l.id, message(l)])) },
      copyKeys: { ...w.queue.copyKeys, ...Object.fromEntries(candidates.map(l => [l.id, copyKeyFor(l)])) },
      edited: w.queue.edited.filter(id => !candidates.some(l => l.id === id)),
    } });
    setRegenerate(null);
    setNotice(`已按当前触达模式重新生成 ${candidates.length} 条；其他草稿保留。`);
  }
  function openRules() {
    setRuleDraft({ ...w.rules, grades: { ...w.rules.grades }, contactableScenes:[...w.rules.contactableScenes] });
    setRulesOpen(true);
  }
  function saveRules() {
    if (rulesError(ruleDraft)) return;
    const rules = reviseRules(w.rules, ruleDraft);
    patch({ rules, industry: rules.industry, region: rules.region });
    setRulesOpen(false);
    setNotice(
      "筛选规则已保存，用于之后的分析；已有结果、人工调整和消息保持不变。",
    );
  }
  function retryFailed(id: number) {
    setW((old) => {
      const failed = old.failed.filter((i) => i !== id);
      return {
        ...old,
        failed,
        dataState: failed.length ? "部分完成" : "处理完成",
      };
    });
    setNotice("该条已完成模拟重试；信息仍不足时保留待判断，其他结果未重跑。");
  }
  function openMonitor(t: Task) {
    const active =
      t.monitor.enabled &&
      !["已结束", "已到期"].includes(monitorStatus(t.monitor));
    setMonitorSaveError("");
    setMonitorEdit({
      task: t.id,
      draft: active ? { ...t.monitor } : { ...emptyMonitoring() },
    });
  }
  function saveMonitor() {
    if (!monitorEdit) return;
    const target = w.tasks.find((t) => t.id === monitorEdit.task);
    if (!target) return;
    try {
      const monitor = reviseMonitoring(target.monitor, monitorEdit.draft);
      setW((old) => ({
        ...old,
        tasks: old.tasks.map((t) =>
          t.id === target.id
            ? {
                ...t,
                monitor,
                events: [
                  ...t.events,
                  `${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} · 回复检查设置：${monitor.enabled ? monitor.interval + " 分钟，截止 " + monitor.deadline : "仅首轮"}`,
                ],
              }
            : t,
        ),
      }));
      setMonitorEdit(null);
      setNotice("回复检查设置已保存，不重发首条消息；只检查发送成功的用户。");
    } catch (e) {
      setMonitorSaveError((e as Error).message);
    }
  }
  function openSettings(back = false) {
    setReturnReview(back);
    if (back) setReview(false);
    setSettings(true);
  }
  function saveSettings() {
    setSettings(false);
    if (returnReview) {
      setReview(true);
      setReturnReview(false);
      setNotice("已返回原草稿，请核对最新配置。正文未自动改写。");
    }
  }
  if (view === "accounts") {
    return <AccountAdmin accounts={w.managedAccounts} quota={w.quota} onQuotaChange={quota => patch({ quota })} onChange={managedAccounts => {
      setW(old => ({ ...old, managedAccounts,
        sender: accountReady(managedAccounts, old.sender) ? old.sender : "",
      }));
    }} />;
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORKSPACE</div>
          <h1>
            {view === "screening"
              ? activeCollectionTask?.name || "采集任务"
              : view === "leads"
                ? "历史名单"
                : "触达与跟进"}
          </h1>
          <p>
            {view === "screening"
              ? activeCollectionTask
                ? `羚羊任务 ID：${activeCollectionTask.sourceTaskCode}`
                : "管理羚羊任务，数据就绪后开始解析。"
              : view === "leads"
                ? "复用已有名单，查看联系记录。"
                : "查看发送结果，处理新回复。"}
          </p>
        </div>
        {view !== "screening" && <button className="button secondary" onClick={() => openSettings()}>
          <Icon name="settings" size={17} />
          规则与话术
        </button>}
      </div>
      <p className="prototype-note">
        演示工作区 · 个人侧仅使用已分配账号，数据处理与发送均为模拟，记录仅保存在当前浏览器。
      </p>
      {view === "workflow" && (
        <section className="surface personal-account-picker" aria-label="账号待处理队列">
          <div>
            <strong>当前账号队列</strong>
            <p>切换查看本人各账号的待处理用户；具体分流策略由系统统一执行。</p>
          </div>
          <label className="field">
            查看账号
            <select
              aria-label="个人侧选择发送账号"
              value={selectedAccount ? w.sender : ""}
              onChange={(event) => patch({ sender: event.target.value })}
            >
              <option value="">请选择账号</option>
              {personalAccounts.map(account => (
                <option key={account.id} value={account.id} disabled={account.status !== "正常"}>
                  {account.name}{account.status === "正常" ? "" : ` · ${account.status}`}
                </option>
              ))}
            </select>
          </label>
          {!personalAccounts.length && <p className="account-picker-message" role="alert">暂无分配给你的账号，请联系管理员分配。</p>}
          {quotaGradeKeys.every(grade=>remainingQuota[grade]<=0) && <p className="account-picker-message" role="alert">A/B/C/D 额度均不足，新的发送已暂停，请联系管理员补充额度。</p>}
          {quotaGradeKeys.some(grade=>remainingQuota[grade]>0) && <p className="account-picker-message quota-ok">剩余可用额度：{remainingQuotaSummary}</p>}
        </section>
      )}
      {saveError && (
        <div className="notice" role="alert">
          {saveError}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="关闭提示"
            onClick={() => setNotice("")}
          >
            <Icon name="close" />
          </button>
        </div>
      )}
      {view === "screening" && (
        <>
          {!activeCollectionTask ? (
            <section className="surface collection-task-surface">
              <div className="collection-task-heading">
                <div>
                  <h2>任务列表</h2>
                  <p>系统按羚羊共享库中的任务 Key 自动建档；每个任务独立维护业务规则和处理记录。</p>
                </div>
                <span className="auto-sync-indicator"><i />自动同步已开启</span>
              </div>
              {!w.collectionTasks.length ? (
                <div className="collection-task-empty">
                  <span className="upload-emblem"><Icon name="data" size={28} /></span>
                  <h3>暂未同步到羚羊任务</h3>
                  <p>系统会按共享库中的任务 Key 自动建档，无需手动填写任务 ID。同步后请补充该任务的业务规则。</p>
                </div>
              ) : (
                <div className="collection-task-table-wrap">
                  <table className="collection-task-table">
                    <thead><tr><th>任务名称</th><th>羚羊任务 ID</th><th>触达模式</th><th>业务规则</th><th>创建时间</th><th>状态</th><th>操作</th></tr></thead>
                    <tbody>
                      {w.collectionTasks.map((task) => (
                        <tr key={task.id}>
                          <td>
                            <button className="task-name-link" onClick={() => openCollectionTask(task)}>{task.name}</button>
                            <small>{task.platform}</small>
                          </td>
                          <td><code>{task.sourceTaskCode}</code></td>
                          <td><span className={`mode-pill mode-${task.touchMode.toLowerCase()}`}>{touchModeLabel(task.touchMode)}</span></td>
                          <td>{task.status === "待配置" ? <strong>待配置</strong> : <><strong>{task.rules.industry}</strong><small>{task.rules.audience}</small></>}</td>
                          <td>{task.createdAt}</td>
                          <td><StatusPill status={task.status} /></td>
                          <td className="collection-task-actions">
                            <button className="button text" onClick={() => openCollectionTask(task)}>进入任务</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : (
            <section className="surface task-workspace">
              <div className="task-workspace-bar">
                <button className="button text back-to-tasks" onClick={closeCollectionTask}>← 返回任务列表</button>
                <div className="task-workspace-actions">
                  {["待配置", "等待数据", "可解析"].includes(activeCollectionTask.status) && (
                    <button className="button secondary" onClick={() => openEditCollectionTask(activeCollectionTask)}>{activeCollectionTask.status === "待配置" ? "配置业务规则" : "编辑规则"}</button>
                  )}
                  {activeCollectionTask.status === "等待数据" && (
                    <button className="button secondary" onClick={() => refreshCollectionTask(activeCollectionTask)}>刷新状态</button>
                  )}
                  {activeCollectionTask.status === "可解析" && (
                    <button className="button primary" disabled={busy} onClick={() => runCollectionTask(activeCollectionTask)}>开始处理</button>
                  )}
                </div>
              </div>
              <div className="task-workspace-summary">
                <div><span>状态</span><StatusPill status={activeCollectionTask.status} /></div>
                <div><span>平台</span><strong>{activeCollectionTask.platform}</strong></div>
                <div><span>触达模式</span><strong>{touchModeLabel(activeCollectionTask.touchMode)}</strong></div>
                <div><span>业务范围</span><strong>{activeCollectionTask.status === "待配置" ? "待配置" : activeCollectionTask.rules.industry}</strong></div>
              </div>
              <nav className="task-workspace-tabs" aria-label="任务工作区">
                {[
                  ["overview", "任务概览"],
                  ["results", activeCollectionTask.touchMode === "BULK" ? "批量名单" : "筛选结果"],
                  ["attention", `需要处理${attention.length ? `（${attention.length}）` : ""}`],
                  ["rules", "规则快照"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={taskWorkspaceTab === key ? "active" : ""}
                    onClick={() => setTaskWorkspaceTab(key as TaskWorkspaceTab)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </section>
          )}
          {activeCollectionTask && taskWorkspaceTab === "overview" && (
            <section className={`surface task-status-panel status-${activeCollectionTask.status}`}>
              <div className="task-status-icon"><Icon name={activeCollectionTask.status === "解析完成" ? "check" : "data"} size={24} /></div>
              <div>
                <h2>{taskStatusCopy[activeCollectionTask.status].title}</h2>
                <p>{taskStatusCopy[activeCollectionTask.status].detail}</p>
              </div>
              <ol className="task-progress-steps">
                {["同步任务", "选择模式与规则", "处理数据", "处理结果"].map((step, index) => {
                  const progress = activeCollectionTask.status === "待配置" ? 1 : ["等待数据", "可解析"].includes(activeCollectionTask.status) ? 2 : activeCollectionTask.status === "解析中" ? 3 : 4;
                  return <li key={step} className={index < progress ? "done" : ""}><span>{index + 1}</span>{step}</li>;
                })}
              </ol>
            </section>
          )}
          {activeCollectionTask && taskWorkspaceTab === "rules" && (
            <section className="surface screening-rules task-rule-snapshot">
              <div className="section-heading">
                <div><h2>{activeCollectionTask.status === "解析完成" ? "本次规则快照" : "当前业务规则"}</h2><p>规则只作用于当前任务；开始解析后锁定。</p></div>
                {["待配置", "等待数据", "可解析"].includes(activeCollectionTask.status) && <button className="button secondary" onClick={() => openEditCollectionTask(activeCollectionTask)}>{activeCollectionTask.status === "待配置" ? "配置业务规则" : "编辑规则"}</button>}
              </div>
              <div className="mode-snapshot"><strong>{touchModeLabel(activeCollectionTask.touchMode)}</strong><span>{touchModeOptions.find(item=>item.key===activeCollectionTask.touchMode)?.note}</span></div>
              <RuleSummary rules={activeCollectionTask.rules} />
            </section>
          )}
          {activeCollectionTask && taskWorkspaceTab === "attention" && (
            <section className="surface task-attention-overview">
              <div><h2>需要处理</h2><p>待判断和处理失败记录独立于正常筛选结果，不会清空已选用户和沟通草稿。</p></div>
              {current ? (
                <>
                  <div className="task-attention-counts">
                    <div><strong>{attention.filter((lead) => !w.failed.includes(lead.id)).length}</strong><span>待判断</span></div>
                    <div><strong>{attention.filter((lead) => w.failed.includes(lead.id)).length}</strong><span>处理失败</span></div>
                  </div>
                  <button className="button primary" disabled={!attention.length} onClick={() => setAttentionOpen(true)}>查看并处理记录</button>
                </>
              ) : <p className="table-empty">任务尚未产生解析结果。</p>}
            </section>
          )}
          {activeCollectionTask && taskWorkspaceTab === "results" && !current && (
            <section className="surface empty-state task-result-empty">
              <h2>{activeCollectionTask.status === "解析中" ? "任务正在处理" : "暂时没有触达名单"}</h2>
              <p>{activeCollectionTask.status === "解析中" ? "完成后会在这里展示本次触达名单。" : "数据就绪后开始处理，即可查看结果。"}</p>
              {activeCollectionTask.status === "可解析" && <button className="button primary" onClick={() => runCollectionTask(activeCollectionTask)}>开始处理</button>}
            </section>
          )}
        </>
      )}
      {(view === "leads" || (view === "screening" && Boolean(activeCollectionTask) && taskWorkspaceTab === "results")) &&
        (rows.length ? (
          <section className="surface result-surface">
            <div className="section-heading result-heading">
              <div>
                <h2>
                  {view === "leads" ? "历史名单" : activeTouchMode === "BULK" ? "批量触达名单" : "精准触达结果"}{" "}
                  <span className="count">{visible.length}</span>
                  {visible.length !== completed.length && <small className="result-total"> / 共 {completed.length}</small>}
                </h2>
              </div>
              <button
                className="button secondary"
                onClick={() => setExportOpen(true)}
              >
                导出
              </button>
            </div>
            {attention.length > 0 && (
              <div className="attention-strip">
                <span>
                  {attention.length} 条需要处理：
                  {
                    attention.filter((l) => !w.failed.includes(l.id)).length
                  }{" "}
                  条待判断，
                  {attention.filter((l) => w.failed.includes(l.id)).length}{" "}
                  条处理失败。可以稍后处理。
                </span>
                <button
                  className="button secondary"
                  onClick={() => setAttentionOpen(true)}
                >
                  需要处理（{attention.length}）
                </button>
              </div>
            )}
            <div className="result-toolbar">
              <div className="filter-tabs">
                {[
                  ...(activeTouchMode === "BULK" ? [["ALL", "全部可触达"]] : [["CONTACTABLE", "可触达 A/B/C"], ["ALL", "全部"]]),
                  ["A", "A 高意向"],
                  ["B", "B 有需求"],
                  ["C", "C 弱意向"],
                  ["D", activeTouchMode === "BULK" ? "D 产品话术" : "D 不触达"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={filter === key ? "active" : ""}
                    onClick={() => {
                      setFilter(key);
                      patch({ selected: [] });
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                aria-label="搜索用户"
                placeholder="搜索用户、需求或地区"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  patch({ selected: [] });
                }}
              />
            </div>
            {view === "leads" && (
              <div className="history-filters">
                <label>
                  批次
                  <select
                    aria-label="筛选批次"
                    value={batchFilter}
                    onChange={(e) => {
                      setBatchFilter(e.target.value);
                      patch({ selected: [] });
                    }}
                  >
                    <option value="">全部批次</option>
                    {w.batches.map((b) => (
                      <option value={b.id} key={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  地区
                  <select
                    aria-label="筛选地区"
                    value={regionFilter}
                    onChange={(e) => {
                      setRegionFilter(e.target.value);
                      patch({ selected: [] });
                    }}
                  >
                    <option value="">全部地区</option>
                    {[...new Set(rows.map((l) => l.location))].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  联系状态
                  <select
                    aria-label="筛选联系状态"
                    value={contactFilter}
                    onChange={(e) => {
                      setContactFilter(e.target.value);
                      patch({ selected: [] });
                    }}
                  >
                    <option value="">全部状态</option>
                    {[
                      "未联系",
                      "待执行",
                      "已联系",
                      "发送失败",
                      "结果待核实",
                      "已取消",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="button text"
                  onClick={() => {
                    setBatchFilter("");
                    setRegionFilter("");
                    setContactFilter("");
                  }}
                >
                  清空条件
                </button>
              </div>
            )}
            <div className="table-wrap">
              <table className="lead-table">
                <colgroup>
                  <col className="select-col" />
                  <col className="user-col" />
                  <col className="grade-col" />
                  <col className="scene-col" />
                  <col className="need-col" />
                  <col className="region-col" />
                  <col className="action-col" />
                </colgroup>
                <thead>
                  <tr>
                    <th>
                      <input
                        aria-label="选择当前可联系用户"
                        type="checkbox"
                        checked={
                          visible.some((l) => available(l.id)) &&
                          visible
                            .filter((l) => available(l.id))
                            .every((l) => w.selected.includes(l.id))
                        }
                        onChange={() => {
                          const ids = visible
                            .filter((l) => available(l.id))
                            .map((l) => l.id);
                          patch({
                            selected: ids.every((id) => w.selected.includes(id))
                              ? []
                              : ids,
                          });
                        }}
                      />
                    </th>
                    <th>用户</th>
                    <th>意向等级</th>
                    <th>业务场景</th>
                    <th>需求与依据</th>
                    <th>地区</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((l) => (
                    <tr
                      key={l.id}
                      className={
                        w.selected.includes(l.id) && available(l.id)
                          ? "selected"
                          : ""
                      }
                    >
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`选择 ${l.name}`}
                          checked={w.selected.includes(l.id) && available(l.id)}
                          disabled={!available(l.id)}
                          onChange={() =>
                            patch({ selected: toggleId(w.selected, l.id) })
                          }
                        />
                      </td>
                      <td>
                        <div className="person">
                          <span className={`avatar tone-${l.id % 4}`}>
                            {l.name[0]}
                          </span>
                          <div>
                            <strong>{l.name}</strong>
                            <small>
                              {platform(l)} · {contact(l.id)}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {w.failed.includes(l.id) ? (
                          <span className="subtle-tag">处理失败</span>
                        ) : (
                          <label
                            className={`grade-choice grade-${w.grades[l.id].toLowerCase()}`}
                          >
                            <select
                              aria-label={`调整 ${l.name} 的等级`}
                              value={w.grades[l.id]}
                              onChange={(e) => {
                                setAdjusting({
                                  id: l.id,
                                  grade: e.target.value as Prospect["grade"],
                                });
                                setReason("");
                              }}
                            >
                              {Object.entries(labels).map(([g, label]) => (
                                <option key={g} value={g}>
                                  {g} · {label}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </td>
                      <td>
                        <div className="scene-cell">
                          <strong>{l.businessScene || "待判断"}</strong>
                          <span className={`touch-tag touch-${reachability(l)==='优先触达'?'priority':reachability(l)==='建议触达'?'recommended':reachability(l)==='探索触达'?'explore':'hold'}`}>
                            {activeTouchMode === "BULK" ? "批量触达" : contactableForMode(l) ? reachability(l) : "不触达"}
                          </span>
                          <span className={`copy-type-tag ${productCopy(l) ? "product" : "context"}`}>{productCopy(l) ? "产品话术" : "上下文话术"}</span>
                        </div>
                      </td>
                      <td>
                        <div className="need">
                          <strong>{l.intent}</strong>
                          <p>{l.context}</p>
                          <small className="row-evidence">
                            {w.adjustments[l.id]?.length
                              ? "人工调整 · 详情可查原因 · "
                              : ""}
                            {w.failed.includes(l.id)
                              ? "正文读取失败，未形成等级"
                              : l.evidence}
                          </small>
                        </div>
                      </td>
                      <td>{l.location}</td>
                      <td>
                        <button
                          className="button text"
                          onClick={() => setDetail(l.id)}
                        >
                          详情
                        </button>
                        {w.tasks.some((t) => t.ids.includes(l.id)) && (
                          <button
                            className="button text"
                            onClick={() =>
                              setConvo({
                                task: w.tasks
                                  .filter((t) => t.ids.includes(l.id))
                                  .at(-1)!.id,
                                lead: l.id,
                              })
                            }
                          >
                            查看聊天
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visible.length && (
                <p className="table-empty">没有符合条件的用户</p>
              )}
            </div>
            <div className="selection-bar">
              <div>
                <strong>{selected.length} 位用户已选择</strong>
                <span className="field-hint">批量话术：{approachLabels[w.outreach.approach]}</span>
                <button className="button text" onClick={() => openSettings(false)}>设置批量话术</button>
                <button
                  className="button text"
                  onClick={() => patch({ selected: [] })}
                >
                  清空
                </button>
              </div>
              <button
                className="button primary"
                disabled={!loaded || !selected.length}
                onClick={prepare}
              >
                生成沟通内容
              </button>
            </div>
          </section>
        ) : view === "leads" ? (
          <section className="surface empty-state">
            <h2>还没有历史名单</h2>
            <button
              className="button primary"
              onClick={() => navigate("screening")}
            >
              去处理数据
            </button>
          </section>
        ) : null)}
      {view === "workflow" && (
        <>
          <div className="engage-summary">
            <div>
              <strong>{w.tasks.length}</strong>
              <span>触达任务</span>
            </div>
            <div>
              <strong>{unread}</strong>
              <span>待回复</span>
            </div>
          </div>
          {w.queue.ids.length > 0 && (
            <section className="draft-resume">
              <strong>沟通草稿已保留</strong>
              <button
                className="button primary"
                onClick={() => {
                  submitting.current = false;
                  setReview(true);
                }}
              >
                继续确认
              </button>
            </section>
          )}
          {!w.tasks.length && (
            <section className="surface empty-state">
              <h2>还没有触达任务</h2>
              <button
                className="button primary"
                onClick={() => navigate(pool.length ? "leads" : "screening")}
              >
                从名单选人
              </button>
            </section>
          )}
          {unread > 0 && (
            <section className="reply-inbox" aria-label="新回复">
              <h2>
                新回复 <span className="count">{unread}</span>
              </h2>
              {w.tasks.flatMap((t) =>
                t.replies
                  .filter(
                    (id) =>
                      !["已完成", "已关闭", "已转人工"].includes(
                        todoStatus(t.followResults[id], t.todos[id]),
                      ),
                  )
                  .map((id) => {
                    const l = leads.find((l) => l.id === id)!;
                    return (
                      <article className="inbox-row" key={t.id + ":" + id}>
                        <span className={`avatar tone-${id % 4}`}>
                          {l.name[0]}
                        </span>
                        <div>
                          <strong>{l.name}</strong>
                          <p>可以，想再了解一下。</p>
                          <small>{t.name} · 小红书私信</small>
                        </div>
                        <StatusPill
                          status={todoStatus(t.followResults[id], t.todos[id])}
                        />
                        <button
                          className="button primary"
                          onClick={() => setConvo({ task: t.id, lead: id })}
                        >
                          打开聊天
                        </button>
                      </article>
                    );
                  }),
              )}
            </section>
          )}
          <div className="task-list">
            {w.tasks.map((t) => (
              <section className="surface task-card" key={t.id}>
                <div className="task-heading">
                  <div>
                    <h2>{t.name}</h2>
                    <p>{t.senderAccountName || "历史账号"} · 小红书私信</p>
                  </div>
                  <StatusPill
                    status={taskStatus(
                      Object.values(t.results),
                      t.paused,
                      !taskReady(t),
                    )}
                  />
                  <details className="task-menu">
                    <summary aria-label={t.name + "更多操作"}>
                      更多操作 <Icon name="down" size={14} />
                    </summary>
                    <div>
                      <button
                        className="button secondary"
                        onClick={() =>
                          setW((old) => ({
                            ...old,
                            tasks: old.tasks.map((x) =>
                              x.id === t.id ? { ...x, paused: !x.paused } : x,
                            ),
                          }))
                        }
                      >
                        {t.paused ? "恢复任务" : "暂停任务"}
                      </button>
                      <button
                        className="button secondary"
                        disabled={
                          !t.ids.some((id) => t.results[id] === "待执行")
                        }
                        onClick={() => {
                          if (
                            !window.confirm(
                              "结束首轮任务将取消尚未执行消息，已发出的动作继续归集结果。是否继续？",
                            )
                          )
                            return;
                          setW((old) => ({
                            ...old,
                            tasks: old.tasks.map((x) =>
                              x.id === t.id
                                ? {
                                    ...x,
                                    results: Object.fromEntries(
                                      Object.entries(x.results).map(
                                        ([id, status]) => [
                                          id,
                                          status === "待执行"
                                            ? "已取消"
                                            : status,
                                        ],
                                      ),
                                    ),
                                    events: [
                                      ...x.events,
                                      "用户结束首轮任务：取消尚未执行消息",
                                    ],
                                  }
                                : x,
                            ),
                          }));
                        }}
                      >
                        结束首轮任务
                      </button>
                    </div>
                  </details>
                </div>
                <MetricLine
                  items={[
                    { label: "用户", value: t.ids.length },
                    {
                      label: "待执行",
                      value: t.ids.filter((id) =>
                        ["待执行", "执行中"].includes(t.results[id]),
                      ).length,
                    },
                    {
                      label: "发送成功",
                      value: t.ids.filter((id) => t.results[id] === "发送成功")
                        .length,
                    },
                    {
                      label: "失败 / 待核实",
                      value: t.ids.filter((id) =>
                        ["发送失败", "结果待核实"].includes(t.results[id]),
                      ).length,
                    },
                  ]}
                />
                <div className="monitor-strip">
                  <div>
                    <Icon name="clock" size={16} />
                    <p>
                      回复检查：
                      {monitorStatus(
                        t.monitor,
                        undefined,
                        !taskReady(t),
                      )}
                      {t.monitor.enabled && ` · ${t.monitor.interval} 分钟`}
                    </p>
                    {t.monitor.enabled && (
                      <small>
                        截止{" "}
                        {new Date(
                          beijingTime(t.monitor.deadline),
                        ).toLocaleString("zh-CN", {
                          timeZone: "Asia/Shanghai",
                        })}
                        （北京时间）
                      </small>
                    )}
                  </div>
                  <button
                    className="button text"
                    onClick={() => openMonitor(t)}
                  >
                    回复检查设置
                  </button>
                </div>
                <div className="task-people">
                  {t.ids.map((id) => {
                    const l = leads.find((l) => l.id === id)!;
                    return (
                      <details className="task-person" key={id}>
                        <summary>
                          <span className={`avatar tone-${id % 4}`}>
                            {l.name[0]}
                          </span>
                          <strong>{l.name}</strong>
                          <StatusPill status={t.results[id]} />
                          {t.replies.includes(id) && (
                            <span className="reply-tag">
                              {todoStatus(t.followResults[id], t.todos[id])}
                            </span>
                          )}
                          <Icon name="down" size={16} />
                        </summary>
                        <div className="task-conversation">
                          <div className="conversation-preview">
                            <p>{t.texts[id]}</p>
                            <button
                              className="button text"
                              onClick={() => setConvo({ task: t.id, lead: id })}
                            >
                              查看聊天
                            </button>
                          </div>
                          <Disclosure
                            title="演示首轮发送结果"
                            className="demo-controls"
                          >
                            {controls(t, id)}
                          </Disclosure>
                          {t.replies.includes(id) && (
                            <>
                              {todoActions(t, id)}
                              <MessageBubble
                                incoming
                                sender={l.name}
                                text="可以，想再了解一下。"
                              />
                              {t.followups[id] ? (
                                <>
                                  <MessageBubble
                                    sender="我方"
                                    text={t.followups[id]}
                                    status={t.followResults[id]}
                                  />
                                  <p className="followup-summary">
                                    跟进：{t.followResults[id]}
                                    {t.followResults[id] !== "发送成功"
                                      ? " · 待办未完成"
                                      : " · 已回复"}
                                  </p>
                                  <Disclosure
                                    title="演示跟进发送结果"
                                    className="demo-controls"
                                  >
                                    {controls(t, id, true)}
                                  </Disclosure>
                                </>
                              ) : (
                                <button
                                  className="button primary"
                                  disabled={
                                    t.paused ||
                                    ["已关闭", "已转人工"].includes(
                                      todoStatus(
                                        t.followResults[id],
                                        t.todos[id],
                                      ),
                                    )
                                  }
                                  onClick={() => beginReply(t, id)}
                                >
                                  回复这位用户
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </details>
                    );
                  })}
                </div>
                <Disclosure title="演示回复检查" className="demo-controls">
                  <div className="inline-actions">
                    <button
                      className="button secondary"
                      disabled={
                        t.paused ||
                        !taskReady(t) ||
                        monitorStatus(t.monitor) !== "等待检查"
                      }
                      onClick={() => checkReply(t, false)}
                    >
                      模拟检查无新回复
                    </button>
                    <button
                      className="button secondary"
                      disabled={
                        t.paused ||
                        !taskReady(t) ||
                        monitorStatus(t.monitor) !== "等待检查" ||
                        !t.ids.some(
                          (id) =>
                            t.results[id] === "发送成功" &&
                            !t.replies.includes(id),
                        )
                      }
                      onClick={() => checkReply(t)}
                    >
                      模拟新回复
                    </button>
                  </div>
                  {t.monitor.lastCheck && (
                    <p>最近检查：{t.monitor.lastCheck}</p>
                  )}
                </Disclosure>
              </section>
            ))}
          </div>
        </>
      )}
      <Sheet
        open={settings}
        title="规则与话术"
        onClose={saveSettings}
        footer={
          <>
            <span>仅此浏览器保存</span>
            <button className="button primary" onClick={saveSettings}>
              保存并返回
            </button>
          </>
        }
      >
        <section className="settings-section">
          <h3>筛选规则</h3>
          <p>
            {w.rules.industry} · {w.rules.audience}
          </p>
          <p>{w.rules.offering}</p>
          <p>{w.rules.businessNeeds}</p>
          <button className="button secondary" onClick={openRules}>
            查看和调整筛选规则
          </button>
        </section>
        <details
          className="settings-section signature-details"
          open={!identityOK || !w.outreach.experienceConfirmed}
        >
          <summary>批量话术与真实素材</summary>
          <p>
            请填写实际对外身份并确认。当前环境只使用虚构名单模拟，不发送真实私信。
          </p>
          <label className="field">
            真实对外身份
            <input
              aria-label="真实对外身份"
              value={w.identity}
              onChange={(e) =>
                patch({
                  identity: e.target.value,
                  attested: false,
                  outreach: { ...w.outreach, experienceConfirmed: false },
                })
              }
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={w.attested}
              onChange={(e) => patch({ attested: e.target.checked })}
            />
            确认上述为真实对外身份
          </label>
          <p className="field-hint">
            身份用于事实核对，不自动加进开场。不报名字、不长篇自我介绍，直接接对方的问题。
          </p>
          <label className="field">
            开场称呼
            <select
              aria-label="开场称呼"
              value={w.outreach.greeting}
              onChange={(e) => patch({ outreach: {
                ...w.outreach, greeting: e.target.value as OutreachProfile["greeting"],
              } })}
            >
              <option value="哈喽姐妹">哈喽姐妹</option>
              <option value="哈喽">哈喽</option>
            </select>
          </label>
          <p className="field-hint">按沟通对象选择；不确定“姐妹”是否适用时使用中性称呼“哈喽”。</p>
          <fieldset className="settings-section">
            <legend>批量开场方式</legend>
            {(["experience", "cooperation"] as const).map(approach => (
              <label className="checkbox-label" key={approach}>
                <input type="radio" name="outreach-approach" value={approach}
                  checked={w.outreach.approach === approach}
                  onChange={() => patch({ outreach: { ...w.outreach, approach, experience: openingTemplates[approach], experienceConfirmed: false } })}
                />
                <span><strong>{approachLabels[approach]}</strong><small className="field-hint">{w.outreach.greeting}～{openingTemplates[approach]}</small></span>
              </label>
            ))}
            <button className="button text" onClick={() => patch({ outreach: { ...w.outreach, experience: openingTemplates[w.outreach.approach], experienceConfirmed: false } })}>使用所选标准话术</button>
          </fieldset>
          <label className="field">
            可使用这套话术的项目
            <input
              aria-label="体验对应项目"
              placeholder="支持多个项目，用顿号或逗号分隔"
              value={w.outreach.project}
              onChange={(e) => patch({ outreach: {
                ...w.outreach, project: e.target.value, experienceConfirmed: false,
              } })}
            />
          </label>
          <button className="button text" disabled={!selected.length && !w.queue.included.length} onClick={() => {
            const ids = selected.length ? selected : w.queue.included;
            const projects = [...new Set(leads.filter(l => ids.includes(l.id)).map(l => projectNames(l.intent)[0]).filter(Boolean))];
            patch({ outreach: { ...w.outreach, project: projects.join("、"), experienceConfirmed: false } });
          }}>填入本次名单的项目，供核对</button>
          <label className="field">
            本批使用的话术
            <textarea
              aria-label="真实体验素材"
              rows={3}
              maxLength={240}
              placeholder="{项目} 会替换成每位用户对应的已确认项目，也可修改原话。"
              value={w.outreach.experience}
              onChange={(e) => patch({ outreach: {
                ...w.outreach, experience: e.target.value, experienceConfirmed: false,
              } })}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              aria-label="确认真实体验素材"
              disabled={!identityOK || !w.outreach.project.trim() || !w.outreach.experience.trim()}
              checked={w.outreach.experienceConfirmed}
              onChange={(e) => patch({ outreach: {
                ...w.outreach, experienceConfirmed: e.target.checked,
              } })}
            />
            {w.outreach.approach === "cooperation"
              ? "确认上述项目均有本人体验、可推荐机构及对应合作关系，同意用于本批话术"
              : "确认上述项目均有本人体验及可推荐机构，同意用于本批话术"}
          </label>
          <p className="field-hint">
            一次配置可用于多位用户。仅替换各自对应的项目；缺少对应素材的用户单独待补充，其余继续生成，不切换成提问开场。
          </p>
          <label className="field">
            合作关系说明（如有）
            <textarea
              aria-label="推广与合作说明"
              rows={2}
              maxLength={160}
              placeholder="如有机构合作、转介或返佣，请按实际情况说明。"
              value={w.outreach.disclosure}
              onChange={(e) => patch({ outreach: { ...w.outreach, disclosure: e.target.value } })}
            />
          </label>
          <p className="field-hint">
            有合作时按填写的原话带入，不额外插入固定声明，也不重复已有推荐句。已有草稿保留原文，重新生成后才应用新素材。
          </p>
          <p>不编造使用经历、疗效、资质或价格；具体诊疗问题交由专业人员处理。每次发送仍需人工确认。</p>
        </details>
      </Sheet>
      <Sheet
        open={review}
        wide
        title="发送前确认"
        subtitle="核对收件人、账号和正文，确认后提交"
        className="review-sheet"
        onClose={() => setReview(false)}
        footer={
          <>
            <div>
              <strong>{ready.length} 条可提交</strong>
              <small>{readyQuotaAvailable ? `提交后按等级预占：${readyQuotaSummary || "无"}` : `额度不足：${quotaShortageSummary}`}</small>
            </div>
            <button
              className="button primary"
              disabled={!ready.length || !readyQuotaAvailable || Boolean(monitorError(w.monitor))}
              onClick={send}
            >
              确认发送 {ready.length} 条
            </button>
          </>
        }
      >
        <section className="settings-section">
          <h3>本批模式：{touchModeLabel(activeTouchMode)}</h3>
          <p>{activeTouchMode === "BULK" ? "A/B/C 使用上下文话术；D 使用基于客户产品信息生成的产品话术。" : "仅发送 A/B/C，并结合帖子或评论上下文生成沟通话术。"}</p>
          <p className="field-hint">上下文话术模板：{w.outreach.greeting}～{w.outreach.experience}。设置变化不会覆盖旧草稿，可确认后统一重新生成。</p>
          <button className="button secondary" onClick={() => openSettings(true)}>设置批量话术</button>
          <button className="button text" disabled={!identityOK || !w.queue.included.length} onClick={() => setRegenerate(-1)}>按当前话术重新生成本批</button>
          {copyPending.length > 0 && <p className="notice">{copyPending.length} 位待补充素材或更新正文，其余用户可继续确认。</p>}
        </section>
        <section className="settings-section">
          <h3>系统分配的执行账号</h3>
          <div className="allocated-account">
            <strong>{selectedAccount?.name || "暂无可用账号"}</strong>
            <span>{selectedAccount ? `小红书 · ${selectedAccount.status}` : "请联系管理员检查账号分配"}</span>
          </div>
          <p className="field-hint">本批用户已进入当前账号的待发送队列，发送前不能临时改派。</p>
          {!senderReady && <p role="alert">{personalAccounts.length ? "系统未找到状态正常的已分配账号。" : "暂无分配给你的账号，请联系管理员。"}</p>}
          {senderReady && !readyQuotaAvailable && <p role="alert">部分意向等级额度不足（{quotaShortageSummary}），请减少对应等级的数量或联系管理员补充额度。</p>}
          <h3>后续回复检查</h3>
          <label className="checkbox-label">
            <input
              type="radio"
              name="monitor"
              checked={!w.monitor.enabled}
              onChange={() => patch({ monitor: emptyMonitoring() })}
            />
            仅首轮
          </label>
          <label className="checkbox-label">
            <input
              type="radio"
              name="monitor"
              checked={w.monitor.enabled}
              onChange={() =>
                patch({ monitor: { ...emptyMonitoring(), enabled: true } })
              }
            />
            启用后续回复检查
          </label>
          {w.monitor.enabled && (
            <>
              <label className="field">
                检查间隔
                <select
                  aria-label="检查间隔"
                  value={w.monitor.interval}
                  onChange={(e) =>
                    patch({
                      monitor: { ...w.monitor, interval: e.target.value },
                    })
                  }
                >
                  <option value="" disabled>
                    请选择
                  </option>
                  <option value="30">30 分钟</option>
                  <option value="60">60 分钟</option>
                </select>
              </label>
              <label className="field">
                截止时间
                <input
                  aria-label="检查截止时间"
                  type="datetime-local"
                  value={w.monitor.deadline}
                  onChange={(e) =>
                    patch({
                      monitor: { ...w.monitor, deadline: e.target.value },
                    })
                  }
                />
              </label>
              <p>
                时间统一按北京时间填写，截止时间须晚于当前时间且不超过启用后 7
                天。范围为本次任务中模拟发送成功的会话；检查由演示按钮触发，不运行后台轮询。
              </p>
              {monitorError(w.monitor) && (
                <p role="alert">{monitorError(w.monitor)}</p>
              )}
            </>
          )}
        </section>
        {w.queue.blocked.length > 0 && (
          <p className="notice">
            {w.queue.blocked
              .map((id) => leads.find((l) => l.id === id)?.name)
              .join("、")}
            ：身份无法确认，已排除。
          </p>
        )}
        {!identityOK && (
          <p className="notice">
            缺少真实对外身份，不能生成正式内容。
            <button className="button text" onClick={() => openSettings(true)}>
              去设置
            </button>
          </p>
        )}
        {leads
          .filter(
            (l) =>
              w.queue.ids.includes(l.id) && !w.queue.blocked.includes(l.id),
          )
          .map((l) => (
            <article className="review-card" key={l.id}>
              <header>
                <strong>
                  {l.name} · {platform(l)} · 私信（演示）
                </strong>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    aria-label={`本次发送给 ${l.name}`}
                    checked={w.queue.included.includes(l.id)}
                    onChange={() =>
                      patch({
                        queue: {
                          ...w.queue,
                          included: toggleId(w.queue.included, l.id),
                        },
                      })
                    }
                  />
                  本次发送
                </label>
              </header>
              <p>联系依据：{l.evidence}</p>
              <blockquote>{l.context}</blockquote>
              {copyIssue(l) && <p className="notice">{copyIssue(l)} <button className="button text" onClick={() => openSettings(true)}>补充话术素材</button></p>}
              <label className="field">
                拟发送内容
                <textarea
                  aria-label={`${l.name}的拟发送内容`}
                  value={w.queue.drafts[l.id] || ""}
                  placeholder="素材齐全后按所选体验推荐话术生成"
                  onChange={(e) =>
                    patch({
                      queue: {
                        ...w.queue,
                        drafts: { ...w.queue.drafts, [l.id]: e.target.value },
                        copyKeys: { ...w.queue.copyKeys, [l.id]: copyIssue(l) ? (w.queue.copyKeys?.[l.id] || "") : copyKeyFor(l) },
                        edited: [...new Set([...w.queue.edited, l.id])],
                      },
                    })
                  }
                />
              </label>
              <p className="field-hint">{productCopy(l) ? "产品话术 · 不引用对方上下文" : `${approachLabels[w.outreach.approach]} · 上下文话术`} · 核对正文后确认发送。</p>
              <div className="review-tools">
                <span>{selectedAccount ? `小红书 · ${selectedAccount.name}` : "请在上方选择已分配账号"}</span>
                <button
                  className="button text"
                  disabled={!identityOK}
                  onClick={() =>
                    w.queue.edited.includes(l.id)
                      ? setRegenerate(l.id)
                      : regenerateOne(l.id)
                  }
                >
                  重新生成示例
                </button>
              </div>
            </article>
          ))}
      </Sheet>
      <Sheet
        open={createTaskOpen}
        wide
        title="配置采集任务"
        onClose={() => { setCreateTaskOpen(false); setEditingCollectionTaskId(null); }}
        footer={
          <>
            <button className="button secondary" onClick={() => { setCreateTaskOpen(false); setEditingCollectionTaskId(null); }}>取消</button>
            <button
              className="button primary"
              disabled={!collectionTaskDraft.name.trim() || !collectionTaskDraft.sourceTaskCode.trim() || Boolean(rulesError(collectionTaskDraft.rules))}
              onClick={createCollectionTask}
            >
              保存模式与规则
            </button>
          </>
        }
      >
        <p>任务 Key 与名称由系统从羚羊共享库自动同步。先选择本次触达模式，再补充业务信息；开始处理后将锁定本次配置。</p>
        <div className="collection-task-form">
          <div className="collection-task-basics">
            <label className="field">
              任务中文名称
              <input
                aria-label="任务中文名称"
                readOnly
                value={collectionTaskDraft.name}
              />
            </label>
            <label className="field">
              羚羊任务 ID
              <input
                aria-label="羚羊任务 ID"
                readOnly
                value={collectionTaskDraft.sourceTaskCode}
              />
            </label>
          </div>
          <fieldset className="touch-mode-selector">
            <legend>选择触达模式</legend>
            <p>触达模式只影响名单范围和话术策略；额度始终按 A/B/C/D 分别扣减。开始处理后不可切换模式。</p>
            <div className="touch-mode-options">
              {touchModeOptions.map(option=><label key={option.key} className={`touch-mode-card ${collectionTaskDraft.touchMode===option.key?"selected":""}`}>
                <input type="radio" name="touch-mode" value={option.key} checked={collectionTaskDraft.touchMode===option.key} onChange={()=>setCollectionTaskDraft(old=>({...old,touchMode:option.key}))}/>
                <span><strong>{option.label}</strong><small>{option.description}</small><em>{option.note}</em></span>
              </label>)}
            </div>
          </fieldset>
          <div className="form-section-title">
            <h3>本次业务信息</h3>
            <p>{collectionTaskDraft.touchMode === "PRECISION" ? "用于精准判断 A/B/C 与生成上下文话术。" : "用于 A/B/C 上下文话术和 D 类产品话术。"}</p>
          </div>
          <RuleFields
            value={collectionTaskDraft.rules}
            onChange={(rules) => setCollectionTaskDraft((old) => ({ ...old, rules }))}
          />
          {rulesError(collectionTaskDraft.rules) && <p role="alert">{rulesError(collectionTaskDraft.rules)}</p>}
        </div>
      </Sheet>
      <Sheet
        open={rulesOpen}
        wide
        title="调整筛选规则"
        onClose={() => setRulesOpen(false)}
        footer={
          <>
            <button
              className="button secondary"
              onClick={() => setRulesOpen(false)}
            >
              取消修改
            </button>
            <button
              className="button primary"
              disabled={Boolean(rulesError(ruleDraft))}
              onClick={saveRules}
            >
              保存筛选规则
            </button>
          </>
        }
      >
        <p>填写业务信息即可。系统会自动应用通用分级和排除规则，修改后仅影响之后处理的数据。</p>
        <RuleFields value={ruleDraft} onChange={setRuleDraft} />
        {rulesError(ruleDraft) && <p role="alert">{rulesError(ruleDraft)}</p>}
      </Sheet>
      <Sheet
        open={attentionOpen}
        wide
        title="需要处理"
        onClose={() => setAttentionOpen(false)}
        footer={
          <button
            className="button primary"
            onClick={() => setAttentionOpen(false)}
          >
            返回正常结果
          </button>
        }
      >
        <p>这些记录可以稍后处理。已完成名单、已选用户和沟通草稿不会被清空。</p>
        <div className="filter-tabs">
          {[
            ["ALL", "全部异常"],
            ["PENDING", "待判断"],
            ["FAILED", "处理失败"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={attentionFilter === key ? "active" : ""}
              onClick={() => setAttentionFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {attentionRows.map((l) => (
          <article className="attention-card" key={l.id}>
            <h3>
              {l.name}{" "}
              <span className="subtle-tag">
                {w.failed.includes(l.id) ? "处理失败" : "待判断"}
              </span>
            </h3>
            <blockquote>{l.context || "正文暂未读取"}</blockquote>
            <p>
              {w.failed.includes(l.id)
                ? "正文读取失败，未形成判断。"
                : l.evidence}
            </p>
            {w.failed.includes(l.id) ? (
              <button
                className="button secondary"
                onClick={() => retryFailed(l.id)}
              >
                重试此条（模拟）
              </button>
            ) : (
              <>
                <label className="field">
                  补充信息
                  <textarea
                    aria-label={`补充 ${l.name} 的信息`}
                    value={w.supplements[l.id] || ""}
                    onChange={(e) =>
                      patch({
                        supplements: {
                          ...w.supplements,
                          [l.id]: e.target.value,
                        },
                      })
                    }
                  />
                </label>
                <p className="field-hint">
                  补充自动保存，保持待判断；可人工判断，当前原型不自动分析。
                </p>
                <label className="field">
                  人工判断
                  <select
                    aria-label={`判断 ${l.name} 的等级`}
                    value=""
                    onChange={(e) => {
                      setAdjusting({
                        id: l.id,
                        grade: e.target.value as Prospect["grade"],
                      });
                      setReason("");
                    }}
                  >
                    <option value="" disabled>
                      选择等级，并填写原因
                    </option>
                    {Object.entries(labels).map(([g, label]) => (
                      <option key={g} value={g}>
                        {g} · {label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <button className="button text" onClick={() => setDetail(l.id)}>
              查看依据
            </button>
          </article>
        ))}
        {!attentionRows.length && (
          <p className="table-empty">当前没有这类记录。</p>
        )}
      </Sheet>
      <Sheet
        open={Boolean(monitorEdit)}
        title="回复检查设置"
        onClose={() => setMonitorEdit(null)}
        footer={
          <>
            <button
              className="button secondary"
              onClick={() => setMonitorEdit(null)}
            >
              取消修改
            </button>
            <button
              className="button primary"
              disabled={Boolean(monitorEdit && monitorError(monitorEdit.draft))}
              onClick={saveMonitor}
            >
              保存回复检查设置
            </button>
          </>
        }
      >
        <p>
          可以在首次发送后开启或调整。仅检查此任务中发送成功的用户，不重新发送首条消息。
        </p>
        <label className="checkbox-label">
          <input
            type="radio"
            name="task-monitor"
            checked={!monitorEdit?.draft.enabled}
            onChange={() =>
              setMonitorEdit((m) =>
                m ? { ...m, draft: { ...m.draft, enabled: false } } : m,
              )
            }
          />
          仅首轮
        </label>
        <label className="checkbox-label">
          <input
            type="radio"
            name="task-monitor"
            checked={Boolean(monitorEdit?.draft.enabled)}
            onChange={() =>
              setMonitorEdit((m) =>
                m ? { ...m, draft: { ...m.draft, enabled: true } } : m,
              )
            }
          />
          启用后续回复检查
        </label>
        {monitorEdit?.draft.enabled && (
          <>
            <label className="field">
              检查间隔
              <select
                aria-label="任务检查间隔"
                value={monitorEdit.draft.interval}
                onChange={(e) =>
                  setMonitorEdit((m) =>
                    m
                      ? {
                          ...m,
                          draft: { ...m.draft, interval: e.target.value },
                        }
                      : m,
                  )
                }
              >
                <option value="" disabled>
                  请选择
                </option>
                <option value="30">30 分钟</option>
                <option value="60">60 分钟</option>
              </select>
            </label>
            <label className="field">
              检查截止时间（北京时间）
              <input
                type="datetime-local"
                aria-label="任务检查截止时间"
                value={monitorEdit.draft.deadline}
                onChange={(e) =>
                  setMonitorEdit((m) =>
                    m
                      ? {
                          ...m,
                          draft: { ...m.draft, deadline: e.target.value },
                        }
                      : m,
                  )
                }
              />
            </label>
            <p>
              截止时间晚于当前时间，且不超过本次启用后 7
              天。调整不会重置当前计划的起始时间。
            </p>
            {monitorError(monitorEdit.draft) && (
              <p role="alert">{monitorError(monitorEdit.draft)}</p>
            )}
          </>
        )}
        {monitorSaveError && <p role="alert">{monitorSaveError}</p>}
        <p className="field-hint">检查由演示按钮触发，不运行真实后台轮询。</p>
      </Sheet>
      <Sheet
        open={Boolean(detailLead)}
        title={detailLead?.name || "用户详情"}
        subtitle={
          detailLead
            ? platform(detailLead) + " · " + detailLead.location
            : undefined
        }
        avatar={detailLead?.name[0]}
        onClose={() => setDetail(null)}
      >
        {detailLead && (
          <>
            <div className="detail-status">
              <StatusPill
                status={
                  w.failed.includes(detailLead.id)
                    ? "处理失败"
                    : w.grades[detailLead.id] +
                      " " +
                      labels[w.grades[detailLead.id]]
                }
              />
              <StatusPill status={contact(detailLead.id)} />
            </div>
            <section className="detail-section detail-reach">
              <h3>业务场景与触达建议</h3>
              <p>
                <strong>{detailLead.businessScene || "待判断"}</strong>
                <span className={`touch-tag touch-${reachability(detailLead)==='优先触达'?'priority':reachability(detailLead)==='建议触达'?'recommended':reachability(detailLead)==='探索触达'?'explore':'hold'}`}>{reachability(detailLead)}</span>
              </p>
              <small>触达建议与意向等级分开判断，便于保留可承接的间接需求。</small>
            </section>
            <section className="detail-section">
              <h3>为什么推荐这位用户</h3>
              <p>{detailLead.evidence}</p>
              <button
                className="button text"
                onClick={() => {
                  setAdjusting({
                    id: detailLead.id,
                    grade: w.grades[detailLead.id],
                  });
                  setReason("");
                }}
              >
                调整意向等级
              </button>
            </section>
            <section className="detail-section">
              <h3>原始评论</h3>
              <blockquote>{detailLead.context}</blockquote>
            </section>
            <section className="detail-section">
              <h3>相关帖子</h3>
              <p className="field-hint">
                虚构样本未提供原帖和父评论，不补写缺失原文。
              </p>
            </section>
            <Disclosure title="人工调整记录">
              {w.adjustments[detailLead.id]?.length ? (
                <ol className="audit-list">
                  {w.adjustments[detailLead.id].map((a, i) => (
                    <li key={i}>
                      <strong>
                        {a.from} → {a.to} · {a.reason}
                      </strong>
                      <br />
                      {a.actor} ·{" "}
                      {new Date(a.time).toLocaleString("zh-CN", {
                        timeZone: "Asia/Shanghai",
                      })}
                    </li>
                  ))}
                </ol>
              ) : (
                <p>暂无人工调整</p>
              )}
            </Disclosure>
          </>
        )}
      </Sheet>
      <Sheet
        open={Boolean(adjusting)}
        title="调整意向等级"
        className="compact-sheet"
        onClose={() => setAdjusting(null)}
        footer={
          <button
            className="button primary"
            disabled={!reason.trim()}
            onClick={() => {
              if (!adjusting) return;
              const a = adjustGrade(
                w.grades[adjusting.id],
                adjusting.grade,
                reason,
              );
              patch({
                grades: { ...w.grades, [adjusting.id]: adjusting.grade },
                adjustments: {
                  ...w.adjustments,
                  [adjusting.id]: [...(w.adjustments[adjusting.id] || []), a],
                },
                selected: w.selected.filter((id) => id !== adjusting.id),
              });
              setAdjusting(null);
            }}
          >
            保存调整
          </button>
        }
      >
        <label className="field">
          调整为
          <select
            aria-label="调整后的意向等级"
            value={adjusting?.grade || "待判断"}
            onChange={(e) =>
              setAdjusting(
                (current) =>
                  current && {
                    ...current,
                    grade: e.target.value as Prospect["grade"],
                  },
              )
            }
          >
            {(Object.keys(labels) as Prospect["grade"][]).map((grade) => (
              <option key={grade} value={grade}>
                {grade === "待判断" ? grade : `${grade} ${labels[grade]}`}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          调整原因
          <textarea
            aria-label="调整原因"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      </Sheet>
      <Sheet
        open={regenerate !== null}
        title="确认覆盖正文"
        className="compact-sheet"
        onClose={() => setRegenerate(null)}
        footer={
          <>
            <button
              className="button secondary"
              onClick={() => setRegenerate(null)}
            >
              取消，保留编辑
            </button>
            <button
              className="button primary"
              onClick={() => regenerate === -1 ? regenerateBatch() : regenerate !== null && regenerateOne(regenerate)}
            >
              {regenerate === -1 ? "确认按本批话术重新生成" : "确认覆盖本条"}
            </button>
          </>
        }
      >
        <p>{regenerate === -1 ? "只更新本次勾选且素材齐全的用户，包含这些用户的手工编辑；待补充、未勾选及已发送内容保留。取消不会修改任何正文。" : "重新生成将覆盖这条手工编辑，其他正文保持不变。"}</p>
      </Sheet>
      <Sheet
        open={exportOpen}
        title="导出名单"
        className="compact-sheet"
        onClose={() => setExportOpen(false)}
        footer={
          <button
            className="button primary"
            disabled={
              !exportRows(exportScope, rows, w.selected, visible).length
            }
            onClick={exportList}
          >
            导出 {exportRows(exportScope, rows, w.selected, visible).length}{" "}
            位用户
          </button>
        }
      >
        <label className="checkbox-label">
          <input
            type="radio"
            name="export"
            disabled={!w.selected.length}
            checked={exportScope === "selected"}
            onChange={() => setExportScope("selected")}
          />
          已选用户（{rows.filter((l) => w.selected.includes(l.id)).length}）
        </label>
        <label className="checkbox-label">
          <input
            type="radio"
            name="export"
            checked={exportScope === "filtered"}
            onChange={() => setExportScope("filtered")}
          />
          当前筛选结果（{visible.length}）
        </label>
        <p>导出 CSV，只包含本次范围的虚构用户和业务字段。</p>
      </Sheet>
      <Sheet
        open={Boolean(task && person)}
        className="chat-sheet"
        title={person ? `与${person.name}的聊天` : "聊天记录"}
        subtitle={task ? `${task.name} · 小红书私信` : undefined}
        avatar={person?.name[0]}
        onClose={() => setConvo(null)}
        footer={
          task &&
          person && (
            <div className="chat-composer">
              <textarea
                aria-label="聊天回复草稿"
                disabled={
                  !task.replies.includes(person.id) ||
                  Boolean(task.followups[person.id]) ||
                  ["已关闭", "已转人工", "已完成"].includes(
                    todoStatus(
                      task.followResults[person.id],
                      task.todos[person.id],
                    ),
                  )
                }
                placeholder={
                  task.replies.includes(person.id)
                    ? "输入回复，或直接生成回复建议"
                    : "等待对方回复后，在这里准备回复"
                }
                value={replyDrafts[`${task.id}:${person.id}`] || ""}
                onChange={(e) =>
                  setReplyDrafts((d) => ({
                    ...d,
                    [`${task.id}:${person.id}`]: e.target.value,
                  }))
                }
              />
              <div className="composer-actions">
                <p>
                  内容确认后才会提交
                  <br />
                  当前仅模拟，不发送真实消息
                </p>
                <button
                  className="button primary"
                  disabled={
                    !task.replies.includes(person.id) ||
                    Boolean(task.followups[person.id]) ||
                    task.paused ||
                    ["已关闭", "已转人工", "已完成"].includes(
                      todoStatus(
                        task.followResults[person.id],
                        task.todos[person.id],
                      ),
                    )
                  }
                  onClick={() => beginReply(task, person.id)}
                >
                  <Icon name="spark" size={16} />
                  回复这位用户
                </button>
              </div>
            </div>
          )
        }
      >
        {task && person && (
          <>
            <div className="chat-context">
              <span>发送账号 · {task.senderAccountName || "历史账号"}</span>
              <StatusPill status={taskAccount(task)?.status || "未授权"} />
            </div>
            <div className="monitor-strip">
              <div>
                <Icon name="clock" size={16} />
                <p>回复检查：{monitorStatus(task.monitor)}</p>
              </div>
              <button className="button text" onClick={() => openMonitor(task)}>
                回复检查设置
              </button>
            </div>
            {task.monitor.enabled && (
              <div className="chat-monitor-actions">
                <button
                  className="button text"
                  disabled={["已到期", "已结束"].includes(
                    monitorStatus(task.monitor),
                  )}
                  onClick={() => changeMonitor(task, "pause")}
                >
                  {task.monitor.paused ? "恢复回复检查" : "暂停回复检查"}
                </button>
                <button
                  className="button text"
                  onClick={() => changeMonitor(task, "end")}
                >
                  结束回复检查
                </button>
              </div>
            )}
            <div className="chat-history">
              <div className="chat-divider">小红书私信 · 演示聊天记录</div>
              <MessageBubble
                sender="我方"
                text={task.texts[person.id]}
                status={task.results[person.id]}
              />

              {task.replies.includes(person.id) ? (
                <>
                  <MessageBubble
                    incoming
                    sender={person.name}
                    text="可以，想再了解一下。"
                  />
                  {task.followups[person.id] && (
                    <MessageBubble
                      sender="我方"
                      text={task.followups[person.id]}
                      status={task.followResults[person.id]}
                    />
                  )}
                </>
              ) : (
                <p className="chat-divider">暂无新回复</p>
              )}
            </div>
            {task.replies.includes(person.id) && todoActions(task, person.id)}
            <section className="chat-notes">
              <div>
                <h3>跟进备注</h3>
                <p>仅供内部查看，不会作为私信发送。</p>
              </div>
              {(task.notes[person.id] || []).length > 0 && (
                <ol className="note-list">
                  {task.notes[person.id].map((note, index) => (
                    <li key={`${note.time}-${index}`}>
                      <p>{note.text}</p>
                      <small>当前操作人 · {note.time}</small>
                    </li>
                  ))}
                </ol>
              )}
              <textarea
                aria-label="跟进备注"
                placeholder="记录沟通重点、后续关注事项"
                value={noteDrafts[`${task.id}:${person.id}`] || ""}
                onChange={(e) =>
                  setNoteDrafts((old) => ({
                    ...old,
                    [`${task.id}:${person.id}`]: e.target.value,
                  }))
                }
              />
              <button
                className="button secondary"
                disabled={!noteDrafts[`${task.id}:${person.id}`]?.trim()}
                onClick={() => addNote(task, person.id)}
              >
                保存备注
              </button>
            </section>
            <Disclosure title="演示结果操作" className="demo-controls">
              {controls(task, person.id)}
              {task.followups[person.id] && controls(task, person.id, true)}
            </Disclosure>
            <Disclosure title="操作记录" className="chat-log">
              {recipientEvents(task.events, person.id).length ? (
                <ol className="audit-list">
                  {recipientEvents(task.events, person.id).map((e, i) => (
                    <li key={i}>
                      {e.replace(
                        new RegExp(` · (首轮|跟进|回复) ${person.id} · `),
                        " · $1 · ",
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p>暂无此用户的操作记录。</p>
              )}
            </Disclosure>
          </>
        )}
      </Sheet>
      <Sheet
        open={Boolean(reply)}
        title="确认跟进回复"
        onClose={() => setReply(null)}
        footer={
          <button
            className="button primary"
            disabled={
              !reply?.text.trim() ||
              !replyTask ||
              replyTask.paused ||
              Boolean(replyTask.followups[reply?.lead || 0]) ||
              !taskReady(replyTask) ||
              !replyQuotaAvailable ||
              !identityOK ||
              Boolean(
                replyTask && reply && replyTask.todos[reply.lead] !== "待确认",
              ) ||
              Boolean(reply?.contextChanged && !reply.reviewedLatest)
            }
            onClick={() => {
              if (
                !reply ||
                !replyTask ||
                replyTask.paused ||
                replyTask.followups[reply.lead] ||
                !taskReady(replyTask) ||
                !replyQuotaAvailable ||
                !identityOK ||
                replyTask.todos[reply.lead] !== "待确认" ||
                (reply.contextChanged && !reply.reviewedLatest)
              )
                return;
              setW((old) => ({
                ...old,
                quota: reserveQuota(old.quota, replyQuotaGrade as QuotaGrade),
                tasks: old.tasks.map((t) =>
                  t.id === reply.task
                    ? {
                        ...t,
                        followups: { ...t.followups, [reply.lead]: reply.text },
                        followResults: {
                          ...t.followResults,
                          [reply.lead]: "待执行" as SendStatus,
                        },
                      }
                    : t,
                ),
              }));
              setReply(null);
              setNotice("跟进提交已受理，等待发送结果；待办尚未完成。");
            }}
          >
            确认提交回复
          </button>
        }
      >
        <blockquote>用户回复（示例）：可以，想再了解一下。</blockquote>
        {reply?.contextChanged && (
          <div className="context-update" role="alert">
            <strong>确认前收到了一条新消息</strong>
            <p>最新消息（示例）：我更关注恢复期，能先说明一下吗？</p>
            <p>请结合最新上下文重新核对回复内容，再进入待确认。</p>
          </div>
        )}
        <label className="field">
          拟回复内容
          <textarea
            aria-label="拟回复内容"
            value={reply?.text || ""}
            onChange={(e) => {
              const text = e.target.value;
              setReply((r) =>
                r ? { ...r, text, reviewedLatest: false } : r,
              );
              if (reply && replyTask) setTodo(replyTask, reply.lead, "处理中");
              if (reply)
                setReplyDrafts((d) => ({
                  ...d,
                  [`${reply.task}:${reply.lead}`]: text,
                }));
            }}
          />
        </label>
        {reply?.contextChanged && (
          <label className="checkbox-label context-review-check">
            <input
              type="checkbox"
              checked={reply.reviewedLatest}
              onChange={(e) =>
                setReply((r) =>
                  r ? { ...r, reviewedLatest: e.target.checked } : r,
                )
              }
            />
            我已根据最新消息重新核对回复正文
          </label>
        )}
        <p>
          回复状态：
          {replyTask && reply
            ? todoStatus(
                replyTask.followResults[reply.lead],
                replyTask.todos[reply.lead],
              )
            : ""}
        </p>
        <button
          className="button secondary"
          disabled={
            !reply?.text.trim() ||
            !identityOK ||
            Boolean(reply?.contextChanged && !reply.reviewedLatest)
          }
          onClick={() => {
            if (reply && replyTask) setTodo(replyTask, reply.lead, "待确认");
          }}
        >
          {reply?.contextChanged ? "重新核对完成，进入待确认" : "内容已审核，进入待确认"}
        </button>
        <p>提交与发送结果分别记录。</p>
      </Sheet>
    </>
  );
}
