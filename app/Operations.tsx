"use client";
import { useState, useEffect, useRef, type ReactNode } from "react";
import Icon from "./Icon";
import {
  StatusPill,
  MessageBubble,
  Disclosure,
  MetricLine,
  ProgressSteps,
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
  contextualOpeningCopy,
  contextualCopyVersion,
} from "./outreach-copy";
import MessageWorkbench from "./MessageWorkbench";
import { originalPostUrl } from "./source-data";
import { bulkDemoTaskCode } from "./demo-data";
import { RuleSummary, RuleFields } from "./RuleFields";
import AccountAdmin from "./AccountAdmin";
import {
  type ManagedAccount,
  type QuotaModel,
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
  canEditTask,
  canEditTaskMessage,
  editTaskMessage,
  startNextRecipient,
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
  sourceBatchId?: number;
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
  sourceTaskName?: string;
  sourceTaskCode?: string;
  createdAt?: string;
  startedAt?: string;
  senderAccountId?: string;
  senderAccountName?: string;
  quotaModel: QuotaModel;
  ids: number[];
  texts: Record<number, string>;
  editedCopyIds?: number[];
  copyRules?: ScreeningRules;
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
function withBulkDemo(workspace: Workspace, leads: Prospect[]): Workspace {
  const sample = leads.filter(lead => lead.sourceTaskCode === bulkDemoTaskCode);
  if (!sample.length || workspace.collectionTasks.some(task => task.sourceTaskCode === bulkDemoTaskCode)) return workspace;
  const rules = defaultRules();
  return { ...workspace,
    grades: { ...Object.fromEntries(sample.map(lead => [lead.id, lead.grade])), ...workspace.grades },
    failed: [...new Set([...workspace.failed, ...sample.filter(lead => lead.sourceIssue === "missing_body").map(lead => lead.id)])],
    collectionTasks: [...workspace.collectionTasks, { id: 10002, name: "A 类模型 · 全量触达演示", sourceTaskCode: bulkDemoTaskCode, platform: "小红书", status: "解析完成", createdAt: "2026/10/27", rules, touchMode: "BULK", batchId: 20002 }],
    batches: [...workspace.batches, { id: 20002, name: "A 类模型 · 全量触达演示", sourceTaskCode: bulkDemoTaskCode, ids: sample.map(lead => lead.id), time: "2026/10/27", rules, touchMode: "BULK" }],
  };
}
const initial = (leads: Prospect[]): Workspace => withBulkDemo({
  rules: defaultRules(),
  supplements: {},
  sender: "xhs-main",
  dataState: "待处理",
  schema: 11,
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
  identity: "梵行科技运营顾问",
  attested: true,
  outreach: {
    ...emptyOutreachProfile(),
    project: "小红书代运营／商旅账号运营／账号流量／转化问题／投放效果／账号运营／品牌种草／达人合作／招聘运营／自建团队",
    experienceConfirmed: true,
  },
  accounts: { 小红书: "未授权" },
  managedAccounts: demoAccounts(),
  industry: "新媒体运营",
  region: "全国",
  monitor: emptyMonitoring(),
  quota: demoQuota(),
}, leads);
const labels = {
  A: "高意向",
  B: "有需求",
  C: "弱意向",
  D: "无明确意向",
  待判断: "待判断",
};
const quotaModelKeys:QuotaModel[] = ["A", "G"];
const quotaModelOf = (mode:TouchMode):QuotaModel => mode === "BULK" ? "A" : "G";
const quotaNeedsOf = (recipients:Prospect[],mode:TouchMode):Record<QuotaModel,number> =>
  mode === "BULK" ? { A:recipients.length, G:0 } : { A:0, G:recipients.length };
const sharedTasks = [
  { code: "6b27c68f027e412680393da7b322516e", name: "社媒获客_小红书2", status: "已入库" },
  { code: bulkDemoTaskCode, name: "A 类模型 · 全量触达演示", status: "已入库" },
] as const;
const taskStatusCopy: Record<CollectionTaskStatus, { title: string; detail: string }> = {
  待配置: {
    title: "已自动同步任务，请选择筛选模型",
    detail: "任务 Key 和名称来自羚羊共享库。选择 A 类或 G 类模型，并补充业务信息后即可开始处理。",
  },
  等待数据: {
    title: "等待共享库数据入库",
    detail: "任务已登记。系统将按羚羊任务 ID 检查数据，入库前可以修改任务信息和业务规则。",
  },
  可解析: {
    title: "数据已就绪，可以开始处理",
    detail: "开始前仍可核对筛选模型和业务信息；开始后，本次模型与规则将锁定为任务快照。",
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
function FlowPage({ open, title, subtitle, onClose, footer, children }: {
  open: boolean; title: string; subtitle?: string; onClose: () => void;
  footer?: ReactNode; children: ReactNode; wide?: boolean; className?: string;
}) {
  if (!open) return null;
  return <section className="flow-page">
    <button className="button text" onClick={onClose}>← 返回任务</button>
    <div className="page-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></div>
    <div className="surface flow-page-body">{children}</div>
    {footer && <footer className="flow-page-footer">{footer}</footer>}
  </section>;
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
  const [activeTouchTaskId, setActiveTouchTaskId] = useState<number | null>(null);
  const [activeHistoryBatchId, setActiveHistoryBatchId] = useState<number | null>(null);
  const [reviewStep, setReviewStep] = useState<1 | 2>(1);
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
  const [previousView, setPreviousView] = useState(view);
  if (view !== previousView) {
    setPreviousView(view);
    setReview(false);
    setCreateTaskOpen(false);
    setActiveTouchTaskId(null);
    setActiveHistoryBatchId(null);
  }
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
          localStorage.removeItem("lead-radar-workspace-11");
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
        const raw = localStorage.getItem("lead-radar-workspace-11") || localStorage.getItem("lead-radar-workspace-10") || localStorage.getItem("lead-radar-workspace-9") || localStorage.getItem("lead-radar-workspace-8");
        if (raw) {
          const x = JSON.parse(raw);
          if (
            ![8, 9, 10, 11].includes(x.schema) ||
            !Array.isArray(x.batches) ||
            !Array.isArray(x.tasks) ||
            !x.queue ||
            !x.grades
          )
            throw Error();
          setW(withBulkDemo({
            ...initial(leads),
            ...x,
            schema: 11,
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
            sender: x.schema === 4 && x.sender === "xhs" ? "xhs-main" : x.sender || "xhs-main",
            identity: x.identity || "梵行科技运营顾问",
            attested: typeof x.attested === "boolean" ? x.attested : true,
            outreach: x.outreach?.experienceConfirmed
              ? restoreOutreachProfile(x.outreach)
              : initial(leads).outreach,
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
              quotaModel: t.quotaModel === "A" || t.quotaModel === "G"
                ? t.quotaModel
                : Object.values((t as Task & {quotaGrades?:Record<number,string>}).quotaGrades || {}).includes("D") ? "A" : "G",
              senderAccountId: t.senderAccountId || (x.schema === 4 ? "xhs-main" : undefined),
              senderAccountName: t.senderAccountName || (x.schema === 4 ? "小红书品牌号" : undefined),
              todos: t.todos || {},
              notes: t.notes || {},
              monitor: { ...t.monitor, checking: false },
            })),
          }, leads));
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
      localStorage.setItem("lead-radar-workspace-11", JSON.stringify(w));
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
  const current = review && w.queue.sourceBatchId
    ? w.batches.find((batch) => batch.id === w.queue.sourceBatchId)
    : view === "screening"
    ? w.batches.find((batch) => batch.id === activeCollectionTask?.batchId)
    : w.batches.find((batch) => batch.id === activeHistoryBatchId);
  const activeTouchMode: TouchMode = current?.touchMode || (view === "screening" ? activeCollectionTask?.touchMode : undefined) || "PRECISION";
  const activeRules = current?.rules || (view === "screening" ? activeCollectionTask?.rules : undefined) || w.rules;
  const rows = leads.filter((l) =>
    (current?.ids || []).includes(l.id),
  );
  const contact = (id: number) =>
    contactStatus(
      w.tasks.filter((t) => t.ids.includes(id)).map((t) => t.results[id]),
    );
  const occupied = w.tasks.flatMap((t) => t.ids);
  const reachability = (lead: Prospect) => reachabilityOf(lead,w.grades[lead.id]);
  const contactableForMode = (lead: Prospect) => {
    const grade = w.grades[lead.id];
    if (lead.sourceIssue || grade === "待判断") return false;
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
      l.sourceIssue === attentionFilter ||
      (attentionFilter === "OTHER" && !l.sourceIssue),
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
  const taskAudience = rows.filter((lead) => available(lead.id));
  const identityOK = canGenerate("formal", w.identity, w.attested);
  const productCopy = (l: Prospect) => activeTouchMode === "BULK" && w.grades[l.id] === "D";
  const copyKeyFor = (l: Prospect) => productCopy(l)
    ? JSON.stringify(["PRODUCT_CONVERSATION_V2", activeRules.revision, activeRules.offering, activeRules.businessNeeds])
    : JSON.stringify([contextualCopyVersion, activeRules.revision, activeRules.offering, l.context]);
  function copyIssue(l: Prospect) {
    const issue = rulesError(activeRules);
    return issue ||
      (w.queue.drafts[l.id] !== undefined && w.queue.copyKeys?.[l.id] !== copyKeyFor(l)
        ? "生成规则已更新，请核对或更新这条话术。" : "");
  }
  const copyPending = leads.filter(l => w.queue.included.includes(l.id) && !w.queue.blocked.includes(l.id) && copyIssue(l));
  const personalAccounts = assignedAccounts(w.managedAccounts);
  const selectedAccount = personalAccounts.find(account => account.id === w.sender);
  const remainingQuota:Record<QuotaModel,number> = {
    A:quotaRemaining(w.quota,"A"), G:quotaRemaining(w.quota,"G"),
  };
  const remainingQuotaSummary = quotaModelKeys.map(model=>`${model} 类模型 ${remainingQuota[model].toLocaleString()}`).join(" · ");
  const senderReady = accountReady(w.managedAccounts, w.sender);
  const taskAccount = (t: Task) => w.managedAccounts.find(account => account.id === t.senderAccountId);
  const taskReady = (t: Task) => accountReady(w.managedAccounts, t.senderAccountId || "");
  const ready = identityOK && senderReady
    ? readyRecipients(leads, w.queue, w.grades, occupied, { 小红书: true }, copyPending.map(l => l.id), leads.filter(l=>available(l.id)).map(l=>l.id)).filter(l => available(l.id))
    : [];
  const activeQuotaModel = quotaModelOf(activeTouchMode);
  const readyQuotaNeeds = quotaNeedsOf(ready, activeTouchMode);
  const readyQuotaAvailable = quotaCanReserve(w.quota, readyQuotaNeeds);
  const readyQuotaSummary = `${activeQuotaModel} 类模型 ${ready.length} 次`;
  const quotaShortageSummary = `${activeQuotaModel} 类模型需 ${readyQuotaNeeds[activeQuotaModel]} / 余 ${remainingQuota[activeQuotaModel]}`;
  const detailLead = leads.find((l) => l.id === detail);
  const task = w.tasks.find((t) => t.id === convo?.task);
  const person = leads.find((l) => l.id === convo?.lead);
  const replyTask = w.tasks.find((t) => t.id === reply?.task);
  const replyQuotaModel = reply ? replyTask?.quotaModel || "G" : null;
  const replyQuotaAvailable = Boolean(replyQuotaModel && quotaRemaining(w.quota, replyQuotaModel) > 0);
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
  const activeTouchTask = w.tasks.find((item) => item.id === activeTouchTaskId);
  function message(l: Prospect) {
    if (productCopy(l)) return productOpeningCopy(activeRules, l.id);
    return contextualOpeningCopy(l, activeRules);
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
            ids: leads.filter(l => (l.sourceTaskCode || "6b27c68f027e412680393da7b322516e") === task.sourceTaskCode).map(l => l.id),
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
    if (!current || !taskAudience.length) return;
    const ids = taskAudience.map((lead) => lead.id);
    const p = { candidates: ids, matched: ids, blocked: [] as number[] };
    const allocatedAccount = selectedAccount?.status === "正常"
      ? selectedAccount.id
      : personalAccounts.find((account) => account.status === "正常")?.id || "";
    submitting.current = false;
    patch({
      sender: allocatedAccount,
      queue: { ...mergePreparedQueue(
        w.queue.sourceBatchId === current.id ? w.queue : emptyQueue(),
        p,
        Object.fromEntries(leads.filter(l => p.matched.includes(l.id)).map(l => [l.id, message(l)])),
        Object.fromEntries(leads.filter(l => p.matched.includes(l.id)).map(l => [l.id, copyKeyFor(l)])),
      ), sourceBatchId: current.id, included: ids },
    });
    setReviewStep(1);
    setReview(true);
  }
  function send() {
    if (submitting.current || !ready.length || ready.length !== w.queue.included.length || !readyQuotaAvailable) return;
    submitting.current = true;
    const ids = ready.map((l) => l.id);
    const sourceName = current?.name || "筛选任务";
    const sourceCode = current?.sourceTaskCode || "";
    // eslint-disable-next-line react-hooks/purity -- Timestamp is created only in the explicit send event handler.
    const id = Date.now();
    setW((old) => ({
      ...old,
      tasks: [
        ...old.tasks,
        {
          id,
          name: `${sourceName} · 触达批次 ${old.tasks.length + 1}`,
          sourceTaskName: sourceName,
          sourceTaskCode: sourceCode,
          createdAt: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
          senderAccountId: old.sender,
          senderAccountName: old.managedAccounts.find(account => account.id === old.sender)?.name || "未指定账号",
          quotaModel: activeQuotaModel,
          ids,
          editedCopyIds: old.queue.edited.filter(id => ids.includes(id)),
          copyRules: { ...activeRules },
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
      quota: quotaModelKeys.reduce(
        (quota, model) => reserveQuota(quota, model, readyQuotaNeeds[model]),
        old.quota,
      ),
      monitor: emptyMonitoring(),
      selected: [],
    }));
    setReview(false);
    navigate("workflow");
    window.setTimeout(() => setActiveTouchTaskId(id), 0);
    setNotice(
      `已创建触达任务“${sourceName} · 触达批次 ${w.tasks.length + 1}”，可在任务详情中继续编辑话术并查看执行结果。`,
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
        const quotaModel = t.quotaModel;
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
          if (quotaRemaining(quota, quotaModel) <= 0) return t;
          quota = reserveQuota(quota, quotaModel);
        }
        const next = transitionSend(from, event);
        if (next !== from && next === "发送成功") {
          quota = settleQuota(quota, quotaModel);
        } else if (next !== from && ["发送失败", "已取消"].includes(next)) {
          quota = releaseQuota(quota, quotaModel);
        }
        return {
          ...t,
          startedAt: !follow && next === "执行中" ? t.startedAt || new Date().toISOString() : t.startedAt,
          [key]: !follow && from === "执行中" && ["发送成功", "发送失败"].includes(next) && !t.paused
            ? startNextRecipient({ ...t[key], [id]: next }, t.ids)
            : { ...t[key], [id]: next },
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
  function startTouchTask(task: Task) {
    if (task.paused || !taskReady(task) || Object.values(task.results).some(status => status === "执行中" || status === "结果待核实")) return;
    const pendingIds = task.ids.filter((id) => task.results[id] === "待执行");
    if (!pendingIds.length) return;
    if (pendingIds.some((id) => !task.texts[id]?.trim())) {
      setNotice("请先补全名单中的空白话术，再开始触达。");
      return;
    }
    setW((old) => ({
      ...old,
      tasks: old.tasks.map((item) => item.id === task.id ? {
        ...item,
        startedAt: item.startedAt || new Date().toISOString(),
        results: startNextRecipient(item.results, item.ids),
        events: [
          ...item.events,
          `${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} · 已开始执行 ${pendingIds.length} 条触达`,
        ],
      } : item),
    }));
    setNotice(`任务已开始触达，共 ${pendingIds.length} 条。`);
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
      ["用户", "平台", "筛选模型", "意向等级", "话术类型", "业务场景", "触达建议", "地区", "评论", "依据", "联系状态"],
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
    const error = rulesError(activeRules);
    if (error) { setNotice(error); setRegenerate(null); return; }
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
  function refreshUneditedCopy() {
    if (!identityOK || rulesError(activeRules)) return;
    const candidates = leads.filter(l => w.queue.included.includes(l.id) && !w.queue.edited.includes(l.id));
    patch({ queue: { ...w.queue,
      drafts: { ...w.queue.drafts, ...Object.fromEntries(candidates.map(l => [l.id, message(l)])) },
      copyKeys: { ...w.queue.copyKeys, ...Object.fromEntries(candidates.map(l => [l.id, copyKeyFor(l)])) },
    } });
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
    setNotice(`已按当前筛选模型重新生成 ${candidates.length} 条；其他草稿保留。`);
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
      <div hidden={review || createTaskOpen}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORKSPACE</div>
          <h1>
            {view === "screening"
              ? activeCollectionTask?.name || "采集任务"
              : view === "leads"
                ? current?.name || "历史名单"
                : activeTouchTask?.name || "触达任务"}
          </h1>
          <p>
            {view === "screening"
              ? activeCollectionTask
                ? `羚羊任务 ID：${activeCollectionTask.sourceTaskCode}`
                : "管理羚羊任务，数据就绪后开始解析。"
              : view === "leads"
                ? current ? "查看本次筛选结果及关联的触达任务。" : "按筛选任务查看已处理名单。"
                : activeTouchTask
                  ? `来自${activeTouchTask.sourceTaskName || "筛选任务"} · ${activeTouchTask.quotaModel} 类模型`
                  : "按任务查看名单、话术、执行账号和发送结果。"}
          </p>
        </div>
      </div>
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
                    <thead><tr><th>任务名称</th><th>羚羊任务 ID</th><th>筛选模型</th><th>业务规则</th><th>创建时间</th><th>状态</th><th>操作</th></tr></thead>
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
                <div><span>筛选模型</span><strong>{touchModeLabel(activeCollectionTask.touchMode)}</strong></div>
                <div><span>业务范围</span><strong>{activeCollectionTask.status === "待配置" ? "待配置" : activeCollectionTask.rules.industry}</strong></div>
              </div>
              <nav className="task-workspace-tabs" aria-label="任务工作区">
                {[
                  ["overview", "任务概览"],
                  ["results", activeCollectionTask.touchMode === "BULK" ? "A 类模型结果" : "G 类模型结果"],
                  ["attention", `数据异常${attention.length ? `（${attention.length}）` : ""}`],
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
              <ProgressSteps className="task-progress-steps" steps={["同步任务", "选择模型与规则", "处理数据", "处理结果"]}
                current={activeCollectionTask.status === "待配置" ? 1 : ["等待数据", "可解析"].includes(activeCollectionTask.status) ? 1 : activeCollectionTask.status === "解析中" ? 2 : 3}
                complete={activeCollectionTask.status === "解析完成"} />
            </section>
          )}
          {activeCollectionTask && taskWorkspaceTab === "rules" && (
            <section className="surface screening-rules task-rule-snapshot">
              <div className="section-heading">
                <div><h2>{activeCollectionTask.status === "解析完成" ? "本次规则快照" : "当前业务规则"}</h2><p>规则只作用于当前任务；开始解析后锁定。</p></div>
                {["待配置", "等待数据", "可解析"].includes(activeCollectionTask.status) && <button className="button secondary" onClick={() => openEditCollectionTask(activeCollectionTask)}>{activeCollectionTask.status === "待配置" ? "配置业务规则" : "编辑规则"}</button>}
              </div>
              <div className="mode-snapshot"><strong>{touchModeLabel(activeCollectionTask.touchMode)}</strong><span>{touchModeOptions.find(item=>item.key===activeCollectionTask.touchMode)?.description}</span></div>
              <RuleSummary rules={activeCollectionTask.rules} />
            </section>
          )}
          {activeCollectionTask && taskWorkspaceTab === "attention" && (
            <section className="surface task-attention-overview">
              <div><h2>数据异常</h2><p>源数据异常记录不纳入本次触达，可查看异常原因和小红书原文。正常数据继续流转。</p></div>
              {current ? (
                <>
                  <div className="task-attention-counts">
                    <div><strong>{attention.filter(lead => lead.sourceIssue === "missing_context").length}</strong><span>上下文缺失</span></div>
                    <div><strong>{attention.filter(lead => lead.sourceIssue === "missing_body").length}</strong><span>正文获取失败</span></div>
                    {attention.some(lead => !lead.sourceIssue) && <div><strong>{attention.filter(lead => !lead.sourceIssue).length}</strong><span>其他异常</span></div>}
                  </div>
                  <button className="button secondary" disabled={!attention.length} onClick={() => setAttentionOpen(true)}>查看异常记录</button>
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
      {view === "leads" && !current && <section className="surface touch-task-list-surface">
        <div className="section-heading"><h2>已处理任务</h2><span className="field-hint">{w.batches.length} 个任务</span></div>
        {w.batches.length ? <div className="table-wrap"><table className="touch-task-table">
          <thead><tr><th>筛选任务</th><th>模型</th><th>数据量</th><th>意向分布</th><th>触达任务</th><th>操作</th></tr></thead>
          <tbody>{w.batches.map(batch => <tr key={batch.id}>
            <td><strong>{batch.name}</strong><small>{batch.time}</small></td>
            <td>{quotaModelOf(batch.touchMode)} 类模型</td>
            <td>{batch.ids.length} 条</td>
            <td>{["A", "B", "C", "D"].map(grade => `${grade} ${batch.ids.filter(id => w.grades[id] === grade && !w.failed.includes(id)).length}`).join(" / ")}</td>
            <td>{w.tasks.filter(task => task.sourceTaskCode === batch.sourceTaskCode).length} 个</td>
            <td><button className="button text" onClick={() => {
              setActiveHistoryBatchId(batch.id); setFilter("ALL"); setSearch("");
              setBatchFilter(""); setRegionFilter(""); setContactFilter("");
              patch({ batchId: batch.id, selected: [] });
            }}>查看名单</button></td>
          </tr>)}</tbody>
        </table></div> : <div className="empty-state"><h3>还没有已处理任务</h3><button className="button primary" onClick={() => navigate("screening")}>去处理数据</button></div>}
      </section>}
      {view === "leads" && current && <section className="surface history-task-context">
        <button className="button text" onClick={() => setActiveHistoryBatchId(null)}>← 返回历史任务</button>
        <span>{quotaModelOf(current.touchMode)} 类模型 · 任务 ID：{current.sourceTaskCode}</span>
        {w.tasks.filter(task => task.sourceTaskCode === current.sourceTaskCode).map(task => <button className="button secondary" key={task.id} onClick={() => {
          navigate("workflow"); window.setTimeout(() => setActiveTouchTaskId(task.id), 0);
        }}>查看触达批次 {w.tasks.indexOf(task) + 1}</button>)}
      </section>}
      {((view === "leads" && Boolean(current)) || (view === "screening" && Boolean(activeCollectionTask) && taskWorkspaceTab === "results")) &&
        (rows.length ? (
          <section className="surface result-surface">
            <div className="section-heading result-heading">
              <div>
                <h2>
                  {view === "leads" ? "历史名单" : `${touchModeLabel(activeTouchMode)}结果`}{" "}
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
                  {attention.length} 条数据异常，已从触达范围中排除，不影响正常数据。
                </span>
                <button
                  className="button secondary"
                  onClick={() => setAttentionOpen(true)}
                >
                  查看异常（{attention.length}）
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
            <div className="table-wrap">
              <table className="lead-table">
                <colgroup>
                  <col className="record-col" />
                  <col className="user-col" />
                  <col className="grade-col" />
                  <col className="need-col" />
                  <col className="region-col" />
                  <col className="action-col" />
                </colgroup>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>用户</th>
                    <th>意向等级</th>
                    <th>业务需求</th>
                    <th>地区</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((l, index) => (
                    <tr key={l.id}>
                      <td className="record-number">{index + 1}</td>
                      <td>
                        <div className="person">
                          <span className={`avatar tone-${l.id % 4}`}>
                            {l.name[0]}
                          </span>
                          <div>
                            <strong>{l.name}</strong>
                            <small>{l.handle}</small>
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
                        <div className="need">
                          <div className="intent-line">
                            <strong>{l.businessScene || "待判断"}</strong>
                            <span className={`touch-tag touch-${reachability(l)==='优先触达'?'priority':reachability(l)==='建议触达'?'recommended':reachability(l)==='探索触达'?'explore':'hold'}`}>
                              {occupied.includes(l.id) ? "已加入触达" : contactableForMode(l) ? "可触达" : "不触达"}
                            </span>
                          </div>
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
                        <div className="lead-row-actions">
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
                        </div>
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
                <strong>本任务 {taskAudience.length} 位用户可进入新触达任务</strong>
                <span className="field-hint">按任务范围生成，搜索和列表筛选不影响触达范围</span>
              </div>
              {current && w.tasks.some(task => task.sourceTaskCode === current.sourceTaskCode) && <button className="button secondary" onClick={() => {
                const linked = w.tasks.filter(task => task.sourceTaskCode === current.sourceTaskCode).at(-1)!;
                navigate("workflow"); window.setTimeout(() => setActiveTouchTaskId(linked.id), 0);
              }}>查看已建触达任务</button>}
              <button
                className="button primary"
                disabled={!loaded || !taskAudience.length}
                onClick={prepare}
              >
                下一步：构建触达任务
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
        !activeTouchTask ? (
          <>
            <div className="engage-summary">
              <div><strong>{w.tasks.length}</strong><span>触达任务</span></div>
              <div><strong>{w.tasks.reduce((sum, item) => sum + item.ids.length, 0)}</strong><span>触达用户</span></div>
              <div><strong>{unread}</strong><span>待跟进回复</span></div>
            </div>
            {w.queue.ids.length > 0 && w.queue.sourceBatchId && (
              <section className="draft-resume">
                <div><strong>有一个待创建的触达任务</strong><p>名单和话术已保留，可继续核对。</p></div>
                <button className="button primary" onClick={() => { submitting.current = false; setReview(true); }}>继续创建</button>
              </section>
            )}
            {!w.tasks.length ? (
              <section className="surface empty-state">
                <h2>还没有触达任务</h2>
                <p>请进入筛选任务，基于该任务的可触达名单构建触达任务。</p>
                <button className="button primary" onClick={() => navigate("screening")}>去查看筛选任务</button>
              </section>
            ) : (
              <section className="surface touch-task-list-surface">
                <div className="section-heading"><div><h2>触达任务</h2><p>每个任务独立管理名单、话术、账号和执行结果。</p></div></div>
                <div className="table-wrap">
                  <table className="touch-task-table">
                    <thead><tr><th>任务名称</th><th>来源筛选任务</th><th>模型</th><th>名单</th><th>执行账号</th><th>状态</th><th>操作</th></tr></thead>
                    <tbody>{w.tasks.map((t) => {
                      const status = taskStatus(Object.values(t.results), t.paused, !taskReady(t));
                      return <tr key={t.id}>
                        <td><strong>{t.name}</strong><small>{t.createdAt || "已创建"}</small></td>
                        <td>{t.sourceTaskName || "历史筛选任务"}</td>
                        <td><span className={`mode-pill mode-${t.quotaModel === "A" ? "bulk" : "precision"}`}>{t.quotaModel} 类</span></td>
                        <td>{t.ids.length} 位</td>
                        <td>{t.senderAccountName || "待分配"}</td>
                        <td><StatusPill status={status} /></td>
                        <td><button className="button text" onClick={() => setActiveTouchTaskId(t.id)}>进入任务</button></td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            <section className="surface touch-task-detail-head">
              <div className="task-workspace-bar">
                <button className="button text back-to-tasks" onClick={() => setActiveTouchTaskId(null)}>← 返回触达任务列表</button>
                <div className="inline-actions">
                  {activeTouchTask.ids.some((id) => activeTouchTask.results[id] === "待执行") && !activeTouchTask.paused && !Object.values(activeTouchTask.results).some(status => status === "执行中" || status === "结果待核实") && (
                    <button className="button primary" disabled={!taskReady(activeTouchTask) || activeTouchTask.ids.some(id => activeTouchTask.results[id] === "待执行" && !activeTouchTask.texts[id]?.trim())} onClick={() => startTouchTask(activeTouchTask)}>开始触达</button>
                  )}
                  {(activeTouchTask.paused || Object.values(activeTouchTask.results).includes("执行中") || (activeTouchTask.startedAt && Object.values(activeTouchTask.results).includes("待执行"))) && (
                    <button className="button secondary" disabled={activeTouchTask.paused && (!taskReady(activeTouchTask) || activeTouchTask.ids.some(id => activeTouchTask.results[id] === "待执行" && !activeTouchTask.texts[id]?.trim()))}
                      onClick={() => setW(old => ({ ...old, tasks: old.tasks.map(item => item.id === activeTouchTask.id ? {
                        ...item, paused: !item.paused,
                        results: item.paused ? startNextRecipient(item.results, item.ids) : item.results,
                        events: [...item.events, `${new Date().toLocaleString("zh-CN")} · ${item.paused ? "恢复任务" : "暂停任务"}`],
                      } : item) }))}>{activeTouchTask.paused ? "恢复任务" : "暂停任务"}</button>
                  )}
                </div>
              </div>
              {activeTouchTask.ids.every(id => activeTouchTask.results[id] === "待执行") && <ProgressSteps className="flow-steps" steps={["确认触达范围", "话术与账号", "开始触达"]} current={2} />}
              <label className="field touch-task-name">任务名称
                <input aria-label="触达任务名称" value={activeTouchTask.name} disabled={!canEditTask(activeTouchTask)}
                  onChange={event => { const name = event.target.value; setW(old => ({ ...old, tasks: old.tasks.map(item => item.id === activeTouchTask.id && canEditTask(item) ? { ...item, name } : item) })); }} />
              </label>
              {activeTouchTask.paused && <p className="task-pause-note">已暂停，可修改任务名称和待执行话术；正在发送的记录等待结果后保留快照。</p>}
              <div className="touch-task-summary-grid">
                <div><span>来源筛选任务</span><strong>{activeTouchTask.sourceTaskName || "历史筛选任务"}</strong></div>
                <div><span>筛选模型</span><strong>{activeTouchTask.quotaModel} 类模型</strong></div>
                <div><span>执行账号</span><strong>{activeTouchTask.senderAccountName || "待分配"}</strong></div>
                <div><span>任务状态</span><StatusPill status={taskStatus(Object.values(activeTouchTask.results), activeTouchTask.paused, !taskReady(activeTouchTask))} /></div>
              </div>
              <MetricLine items={[
                { label: "名单", value: activeTouchTask.ids.length },
                { label: "待执行", value: activeTouchTask.ids.filter((id) => activeTouchTask.results[id] === "待执行").length },
                { label: "执行中", value: activeTouchTask.ids.filter((id) => activeTouchTask.results[id] === "执行中").length },
                { label: "发送成功", value: activeTouchTask.ids.filter((id) => activeTouchTask.results[id] === "发送成功").length },
                { label: "异常", value: activeTouchTask.ids.filter((id) => ["发送失败", "结果待核实"].includes(activeTouchTask.results[id])).length },
              ]} />
            </section>
            <section className="surface touch-recipient-surface">
              <div className="section-heading"><div><h2>任务名单与话术</h2><p>开始前或暂停后可编辑待执行话术；执行中的任务保持只读。</p></div></div>
              <MessageWorkbench key={activeTouchTask.id}
                items={activeTouchTask.ids.map(id => {
                  const lead = leads.find(item => item.id === id)!;
                  return { id, name: lead.name, grade: w.grades[id], scene: lead.businessScene, context: lead.context, text: activeTouchTask.texts[id] || "", status: activeTouchTask.results[id], edited: activeTouchTask.editedCopyIds?.includes(id), issue: activeTouchTask.results[id] === "待执行" && !activeTouchTask.texts[id]?.trim() ? "请补全话术" : "" };
                })}
                renderEditor={id => {
                  const lead = leads.find(item => item.id === id)!;
                  const editable = canEditTaskMessage(activeTouchTask, id);
                  const sourceRules = activeTouchTask.copyRules || w.batches.find(batch => batch.sourceTaskCode && batch.sourceTaskCode === activeTouchTask.sourceTaskCode)?.rules || w.rules;
                  const suggestion = w.grades[id] === "D" ? productOpeningCopy(sourceRules, id) : contextualOpeningCopy(lead, sourceRules);
                  const updateText = (text: string) => setW(old => ({ ...old, tasks: old.tasks.map(item => item.id === activeTouchTask.id ? editTaskMessage(item, id, text) : item) }));
                  return <>
                    <section className="message-context"><span>原始内容</span><p>{lead.context}</p><details><summary>查看关联依据</summary><p>{lead.evidence}</p></details></section>
                    <label className="field">触达话术<textarea aria-label={`${lead.name}的任务话术`} value={activeTouchTask.texts[id] || ""} disabled={!editable} onChange={event => updateText(event.target.value)} /></label>
                    <div className="message-editor-meta"><span>{editable ? "编辑自动保存" : activeTouchTask.results[id] === "待执行" ? "任务执行中，暂停后可编辑" : "执行时话术快照 · 不可修改"}</span><span>{(activeTouchTask.texts[id] || "").length} 字</span></div>
                    {editable && <details className="message-suggestion"><summary>查看自然表达建议</summary><p>{suggestion}</p><button className="button secondary" onClick={() => updateText(suggestion)}>采用建议，替换当前话术</button></details>}
                    <div className="recipient-card-footer"><StatusPill status={activeTouchTask.results[id]} /><button className="button text" onClick={() => setConvo({ task: activeTouchTask.id, lead: id })}>查看会话</button></div>
                    <Disclosure title="演示执行结果" className="demo-controls">{controls(activeTouchTask, id)}</Disclosure>
                  </>;
                }}
              />
            </section>
          </>
        )
      )}
      </div>
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
      <FlowPage
        open={review}
        wide
        title="创建触达任务"
        subtitle={current?.name || "当前筛选任务"}
        className="review-sheet"
        onClose={() => setReview(false)}
        footer={
          <>
            <button className="button secondary" onClick={() => reviewStep === 1 ? setReview(false) : setReviewStep(1)}>{reviewStep === 1 ? "返回筛选结果" : "上一步：触达范围"}</button>
            <span>{w.queue.included.length} 位 · {activeQuotaModel} 类模型</span>
            <button
              className="button primary"
              disabled={reviewStep === 1 ? !w.queue.included.length : !ready.length || ready.length !== w.queue.included.length || !readyQuotaAvailable}
              onClick={() => reviewStep === 1 ? setReviewStep(2) : send()}
            >
              {reviewStep === 1 ? "下一步：话术与账号" : "保存并进入触达任务"}
            </button>
          </>
        }
      >
        <ProgressSteps className="flow-steps" steps={["确认触达范围", "话术与账号", "开始触达"]} current={reviewStep - 1} />
        {reviewStep === 1 ? <section className="audience-confirm">
          <h2>按本任务的可触达范围创建</h2>
          <p>{activeQuotaModel === "G" ? "纳入本任务中的 A、B、C 类用户。" : "纳入本任务中的 A、B、C、D 类用户。"}已加入触达任务的记录不会重复进入。</p>
          <div className="audience-count"><strong>{w.queue.included.length}</strong><span>位用户将进入本次触达任务</span></div>
          <div className="audience-breakdown">{["A", "B", "C", "D"].map(grade => <div key={grade}><span>{grade} 类</span><strong>{w.queue.included.filter(id => w.grades[id] === grade).length}</strong></div>)}</div>
          <p className="field-hint">数据异常 {attention.length} 条 · 已加入触达 {rows.filter(l => occupied.includes(l.id)).length} 条</p>
          <details className="scope-exceptions"><summary>查看名单 / 排除个别记录</summary>
            <MessageWorkbench listOnly items={leads.filter(l => w.queue.ids.includes(l.id)).map(l => ({ id: l.id, name: l.name, grade: w.grades[l.id], context: l.context, text: "", status: w.queue.included.includes(l.id) ? "已纳入" : "本次排除" }))}
              renderEditor={id => <button className="button text" onClick={() => patch({queue:{...w.queue,included:toggleId(w.queue.included,id)}})}>{w.queue.included.includes(id) ? "本次排除" : "恢复纳入"}</button>} />
          </details>
        </section> : <>
        <section className="touch-task-draft-summary">
          <div><span>来源筛选任务</span><strong>{current?.name || "当前筛选任务"}</strong></div>
          <div><span>筛选模型</span><strong>{touchModeLabel(activeTouchMode)}</strong></div>
          <div><span>可创建名单</span><strong>{ready.length} 位</strong></div>
        </section>
        <div className="draft-account-row"><label className="field">执行账号<select aria-label="触达任务执行账号" value={w.sender} onChange={e=>patch({sender:e.target.value})}><option value="">请选择已分配账号</option>{personalAccounts.map(account=><option key={account.id} value={account.id} disabled={account.status!=="正常"}>{account.name}</option>)}</select></label><p className="field-hint">{activeQuotaModel} 类模型可用 {remainingQuota[activeQuotaModel].toLocaleString()} 次 · 创建时预占 {w.queue.included.length} 次</p></div>
        <div className="review-batch-tools">
          <div><strong>话术审核</strong><p>查看重点样本或待处理项，无需逐条翻阅。筛选和翻页不改变任务范围。</p></div>
          <button className="button secondary" disabled={!identityOK || !w.queue.included.some(id => !w.queue.edited.includes(id))} onClick={refreshUneditedCopy}>更新未编辑话术</button>
        </div>
        <details className="message-policy"><summary>自然交流 · 先回应需求，再轻量引导</summary><p>A/B/C 结合原帖、评论与业务资料回应一个具体问题；信息不足先询问，不假定需求。D 仅介绍真实业务，不伪造上下文。不编造体验、客户案例、价格和承诺。当前原型使用场景示例，正式生成需接入模型。</p></details>
        {!senderReady && <p className="notice" role="alert">{personalAccounts.length ? "系统未找到状态正常的已分配账号。" : "暂无分配给你的账号，请联系管理员。"}</p>}
        {senderReady && !readyQuotaAvailable && <p className="notice" role="alert">当前模型额度不足（{quotaShortageSummary}），请减少数量或联系管理员。</p>}
        {copyPending.length > 0 && <p className="notice">{copyPending.length} 位的话术需要更新，请处理后继续。</p>}
        {w.queue.blocked.length > 0 && (
          <p className="notice">
            {w.queue.blocked
              .map((id) => leads.find((l) => l.id === id)?.name)
              .join("、")}
            ：身份无法确认，已排除。
          </p>
        )}
        {!identityOK && (
          <section className="notice">
            <label className="field">补充对外身份<input value={w.identity} onChange={e => patch({ identity: e.target.value, attested: false })} placeholder="实际提供服务的企业或品牌" /></label>
            <label className="checkbox-label"><input type="checkbox" checked={w.attested} onChange={e => patch({ attested: e.target.checked })} />确认以上信息真实</label>
          </section>
        )}
        <MessageWorkbench key={w.queue.sourceBatchId}
          items={leads.filter(l => w.queue.included.includes(l.id) && !w.queue.blocked.includes(l.id)).map(l => ({
            id: l.id, name: l.name, grade: w.grades[l.id], scene: l.businessScene, context: l.context,
            text: w.queue.drafts[l.id] || "", status: "已生成", edited: w.queue.edited.includes(l.id),
            issue: copyIssue(l) || (!w.queue.drafts[l.id]?.trim() ? "请补全话术" : ""),
          }))}
          renderEditor={id => {
            const l = leads.find(item => item.id === id)!;
            return <>
              <section className="message-context"><span>原始内容</span><p>{l.context}</p><details><summary>查看关联依据</summary><p>{l.evidence}</p></details></section>
              {copyIssue(l) && <p className="notice">{copyIssue(l)}<button className="button text" onClick={() => patch({ queue: { ...w.queue, copyKeys: { ...w.queue.copyKeys, [id]: copyKeyFor(l) } } })}>保留当前话术并确认</button></p>}
              <label className="field">触达话术
                <textarea aria-label={`${l.name}的拟发送内容`} value={w.queue.drafts[id] || ""} placeholder="填写本次沟通内容"
                  onChange={e => patch({ queue: { ...w.queue, drafts: { ...w.queue.drafts, [id]: e.target.value },
                    copyKeys: { ...w.queue.copyKeys, [id]: copyIssue(l) ? (w.queue.copyKeys?.[id] || "") : copyKeyFor(l) },
                    edited: [...new Set([...w.queue.edited, id])] } })} />
              </label>
              <div className="message-editor-meta"><span>{w.queue.edited.includes(id) ? "已编辑 · 自动保存" : "已生成 · 可直接编辑"}</span><span>{(w.queue.drafts[id] || "").length} 字</span></div>
              {!w.queue.drafts[id]?.trim() && <p className="message-issue">请补全话术后继续。</p>}
              <details className="message-suggestion"><summary>查看自然表达建议</summary><p>{message(l)}</p><button className="button secondary" onClick={() => regenerateOne(id)}>采用建议，替换当前话术</button></details>
            </>;
          }}
        />
        </>}
      </FlowPage>
      <FlowPage
        open={createTaskOpen}
        wide
        title="配置模型与业务信息"
        onClose={() => { setCreateTaskOpen(false); setEditingCollectionTaskId(null); }}
        footer={
          <>
            <button className="button secondary" onClick={() => { setCreateTaskOpen(false); setEditingCollectionTaskId(null); }}>取消</button>
            <button
              className="button primary"
              disabled={!collectionTaskDraft.name.trim() || !collectionTaskDraft.sourceTaskCode.trim() || Boolean(rulesError(collectionTaskDraft.rules))}
              onClick={createCollectionTask}
            >
              保存模型与规则
            </button>
          </>
        }
      >
        <p>任务 Key 与名称由系统从羚羊共享库自动同步。先选择本次筛选模型，再补充业务信息；开始处理后将锁定本次配置。</p>
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
            <legend>选择筛选模型</legend>
            <p>额度按所选模型独立扣减，开始处理后不可切换模型。</p>
            <div className="touch-mode-options">
              {touchModeOptions.map(option=><label key={option.key} className={`touch-mode-card ${collectionTaskDraft.touchMode===option.key?"selected":""}`}>
                <input type="radio" name="touch-mode" value={option.key} checked={collectionTaskDraft.touchMode===option.key} onChange={()=>setCollectionTaskDraft(old=>({...old,touchMode:option.key}))}/>
                <span><strong>{option.label}</strong><small>{option.description}</small>{option.note && <em>{option.note}</em>}</span>
              </label>)}
            </div>
          </fieldset>
          <div className="form-section-title">
            <h3>本次业务信息</h3>
            <p>{collectionTaskDraft.touchMode === "PRECISION" ? "仅处理 A/B/C 意向等级，并生成上下文话术。" : "处理 A/B/C/D 意向等级，其中 D 类使用产品话术。"}</p>
          </div>
          <RuleFields
            value={collectionTaskDraft.rules}
            onChange={(rules) => setCollectionTaskDraft((old) => ({ ...old, rules }))}
          />
          {rulesError(collectionTaskDraft.rules) && <p role="alert">{rulesError(collectionTaskDraft.rules)}</p>}
        </div>
      </FlowPage>
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
        title="数据异常"
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
        <p>以下记录未纳入本次触达。可通过原文链接查看来源内容，正常数据不受影响。</p>
        <div className="filter-tabs">
          {[
            ["ALL", "全部异常"],
            ["missing_context", "上下文缺失"],
            ["missing_body", "正文获取失败"],
            ...(attention.some(lead => !lead.sourceIssue) ? [["OTHER", "其他异常"]] : []),
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
        {attentionRows.map(l => {
          const url = originalPostUrl(l.sourceUrl);
          const label = l.sourceIssue === "missing_body" ? "正文获取失败" : l.sourceIssue === "missing_context" ? "上下文缺失" : w.failed.includes(l.id) ? "分析未完成" : "信息不足";
          return <article className="attention-card source-anomaly-card" key={l.id}>
            <header><h3>{l.name}</h3><span className="subtle-tag">{label}</span></header>
            {l.context && <blockquote>{l.context}</blockquote>}
            <p>{l.sourceIssue === "missing_body" ? "源数据未提供可用正文，未纳入本次触达。" : l.sourceIssue === "missing_context" ? "源数据缺少关联原帖或父评论，无法判断具体需求，未纳入本次触达。" : "当前记录未形成有效判断，未纳入本次触达。"}</p>
            <footer><span className="field-hint">{l.sourceIssue ? "来源：瓴羊采集数据" : l.source}</span>
              {url ? <a className="button secondary" href={url} target="_blank" rel="noopener noreferrer">查看小红书原文 ↗</a> : <span className="source-link-missing">未提供原文链接</span>}
            </footer>
          </article>;
        })}
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
                quota: reserveQuota(old.quota, replyQuotaModel as QuotaModel),
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
