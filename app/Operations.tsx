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
} from "./outreach-copy";
import { RuleSummary, RuleFields } from "./RuleFields";
import {
  type ScreeningRules,
  defaultRules,
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
} from "./operations-state";

type View = "screening" | "leads" | "workflow";
type Platform = "小红书";
type Batch = {
  id: number;
  name: string;
  ids: number[];
  time: string;
  rules?: ScreeningRules;
};
type Queue = {
  ids: number[];
  blocked: number[];
  included: number[];
  drafts: Record<number, string>;
  edited: number[];
};
type Task = {
  id: number;
  name: string;
  ids: number[];
  texts: Record<number, string>;
  results: Record<number, SendStatus>;
  replies: number[];
  followups: Record<number, string>;
  followResults: Record<number, SendStatus>;
  monitor: Monitoring;
  paused: boolean;
  todos: Record<number, TodoStatus>;
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
  industry: string;
  region: string;
  monitor: Monitoring;
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
  schema: 4,
  batches: [],
  batchId: 0,
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
  industry: "医美",
  region: "全国",
  monitor: emptyMonitoring(),
});
const labels = {
  A: "高意向",
  B: "有需求",
  C: "弱意向",
  D: "排除",
  待判断: "待判断",
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
  const [filter, setFilter] = useState("AB");
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [contactFilter, setContactFilter] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [ruleDraft, setRuleDraft] = useState(defaultRules);
  const [attentionOpen, setAttentionOpen] = useState(false);
  const [attentionFilter, setAttentionFilter] = useState("ALL");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginStep, setLoginStep] = useState<
    "waiting" | "scanned" | "expired" | "verification"
  >("waiting");
  const previousAccount = useRef<AccountStatus>("未授权");
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
  } | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const upload = useRef<HTMLInputElement>(null);
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
        const raw = localStorage.getItem("lead-radar-workspace-4");
        if (raw) {
          const x = JSON.parse(raw);
          if (
            x.schema !== 4 ||
            !Array.isArray(x.batches) ||
            !Array.isArray(x.tasks) ||
            !x.queue ||
            !x.grades
          )
            throw Error();
          setW({
            ...initial(leads),
            ...x,
            rules: x.rules || {
              ...defaultRules(),
              industry: x.industry || "医美",
              region: x.region || "全国",
            },
            supplements: x.supplements || {},
            sender: x.sender || "",
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
            tasks: x.tasks.map((t: Task) => ({ ...t, todos: t.todos || {} })),
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
      localStorage.setItem("lead-radar-workspace-4", JSON.stringify(w));
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
  const current = w.batches.find((b) => b.id === w.batchId);
  const rows = leads.filter((l) =>
    (view === "leads" ? pool : current?.ids || []).includes(l.id),
  );
  const contact = (id: number) =>
    contactStatus(
      w.tasks.filter((t) => t.ids.includes(id)).map((t) => t.results[id]),
    );
  const occupied = w.tasks.flatMap((t) => t.ids);
  const available = (id: number) =>
    ["A", "B"].includes(w.grades[id]) &&
    !w.failed.includes(id) &&
    !occupied.includes(id);
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
          (filter === "AB"
            ? ["A", "B"].includes(w.grades[l.id])
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
  const ready = leads.filter(
    (l) =>
      w.sender === "xhs" &&
      identityOK &&
      w.queue.ids.includes(l.id) &&
      w.queue.included.includes(l.id) &&
      !w.queue.blocked.includes(l.id) &&
      available(l.id) &&
      w.accounts[platform(l)] === "正常" &&
      w.queue.drafts[l.id]?.trim(),
  );
  const detailLead = leads.find((l) => l.id === detail);
  const task = w.tasks.find((t) => t.id === convo?.task);
  const person = leads.find((l) => l.id === convo?.lead);
  const replyTask = w.tasks.find((t) => t.id === reply?.task);
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
    return openingCopy(l, w.outreach);
  }
  function chooseFile(f?: File) {
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) {
      patch({ dataState: "待补充" });
      setNotice("请选择 Excel 文件。");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setNotice("文件选择演示仅接受 50 MB 以内文件。");
      return;
    }
    setFile(f);
    patch({ dataState: "待处理" });
  }
  function runSample() {
    if (busy) return;
    setBusy(true);
    patch({ dataState: "处理中" });
    processingTimer.current = window.setTimeout(() => {
      const id = Date.now();
      setW((old) => ({
        ...old,
        batches: [
          {
            id,
            name: file
              ? `${file.name}（示例预览）`
              : `医美需求样本 ${old.batches.length + 1}`,
            ids: leads.map((l) => l.id),
            time: new Date().toLocaleString("zh-CN", {
              timeZone: "Asia/Shanghai",
            }),
            rules: JSON.parse(JSON.stringify(old.rules)),
          },
          ...old.batches,
        ],
        batchId: id,
        selected: [],
        failed: [8],
        dataState: "部分完成",
      }));
      setBusy(false);
      setFile(null);
      setFilter("AB");
      setSearch("");
      setBatchFilter("");
      setRegionFilter("");
      setContactFilter("");
      setNotice(
        "示例部分处理完成：有效结果已保留，另有待判断与处理失败记录。未读取真实文件。",
      );
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
    submitting.current = false;
    patch({
      queue: {
        ...w.queue,
        ids: p.candidates,
        blocked: p.blocked,
        included: p.matched,
        drafts: {
          ...w.queue.drafts,
          ...Object.fromEntries(
            leads
              .filter((l) => p.matched.includes(l.id))
              .map((l) => [l.id, w.queue.drafts[l.id] || message(l)]),
          ),
        },
      },
    });
    setReview(true);
  }
  function send() {
    if (submitting.current || !ready.length || monitorError(w.monitor)) return;
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
          events: [
            `${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} 已受理演示提交`,
          ],
        },
      ],
      queue: emptyQueue(),
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
    setW((old) => ({
      ...old,
      tasks: old.tasks.map((t) => {
        if (t.id !== tid) return t;
        const key = follow ? "followResults" : "results";
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
          old.accounts[platform(leads.find((l) => l.id === id)!)] !== "正常" &&
          from !== "执行中" &&
          !event.startsWith("verified-") &&
          event !== "cancel"
        )
          return t;
        const next = transitionSend(from, event);
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
      }),
    }));
  }
  function controls(t: Task, id: number, follow = false) {
    const status = (follow ? t.followResults : t.results)[id];
    const blocked =
      (follow && ["已关闭", "已转人工"].includes(t.todos[id])) ||
      t.paused ||
      w.accounts[platform(leads.find((l) => l.id === id)!)] !== "正常";
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
      t.ids.some(
        (i) => w.accounts[platform(leads.find((l) => l.id === i)!)] !== "正常",
      )
    )
      return;
    const id = t.ids.find(
      (i) => t.results[i] === "发送成功" && !t.replies.includes(i),
    );
    setW((old) => ({
      ...old,
      tasks: old.tasks.map((x) =>
        x.id === t.id
          ? {
              ...x,
              replies: add && id !== undefined ? [...x.replies, id] : x.replies,
              monitor: {
                ...x.monitor,
                lastCheck: new Date().toLocaleString("zh-CN", {
                  timeZone: "Asia/Shanghai",
                }),
              },
            }
          : x,
      ),
    }));
    setNotice(
      add && id !== undefined
        ? "收到示例回复，待办尚未处理。"
        : "检查完成（模拟）：没有新增回复，未生成内容。",
    );
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
    });
  }
  function todoActions(t: Task, id: number) {
    const state = todoStatus(t.followResults[id], t.todos[id]);
    return (
      <div className="task-todo">
        <p>待回复：{state}</p>
        {state === "已转人工" && (
          <button
            className="button text"
            onClick={() => {
              if (window.confirm("确认接管问题已解决，恢复此待办？"))
                setTodo(t, id, "待处理");
            }}
          >
            确认恢复处理
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
                if (window.confirm("转人工后停止自动处理此待办，是否继续？"))
                  setTodo(t, id, "已转人工");
              }}
            >
              转人工
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
      ["用户", "平台", "等级", "地区", "评论", "依据", "联系状态"],
      ...data.map((l) => [
        l.name,
        platform(l),
        w.failed.includes(l.id) ? "处理失败" : w.grades[l.id],
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
    patch({
      queue: {
        ...w.queue,
        drafts: {
          ...w.queue.drafts,
          [id]: message(leads.find((l) => l.id === id)!),
        },
        edited: w.queue.edited.filter((i) => i !== id),
      },
    });
    setRegenerate(null);
  }
  function openRules() {
    setRuleDraft({ ...w.rules, grades: { ...w.rules.grades } });
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
  function startLogin() {
    previousAccount.current = w.accounts.小红书;
    setLoginStep("waiting");
    setLoginOpen(true);
    patch({ accounts: { 小红书: "授权中" } });
  }
  function closeLogin() {
    setLoginOpen(false);
    patch({ accounts: { 小红书: previousAccount.current } });
  }
  function finishDemoLogin() {
    if (loginStep !== "scanned") return;
    patch({ accounts: { 小红书: "正常" } });
    setLoginOpen(false);
    setNotice("已模拟收到登录成功结果，未连接真实小红书账号。");
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
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORKSPACE</div>
          <h1>
            {view === "screening"
              ? "数据处理"
              : view === "leads"
                ? "历史名单"
                : "触达与跟进"}
          </h1>
          <p>
            {view === "screening"
              ? "上传数据，查看结果，再决定下一步。"
              : view === "leads"
                ? "复用已有名单，查看联系记录。"
                : "查看发送结果，处理新回复。"}
          </p>
        </div>
        <button className="button secondary" onClick={() => openSettings()}>
          <Icon name="settings" size={17} />
          账号与规则
        </button>
      </div>
      <p className="prototype-note">
        演示工作区 · 数据处理、登录与发送均为模拟，记录仅保存在当前浏览器。
      </p>
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
          <section
            className={`surface import-surface ${current ? "import-compact" : "import-start"}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              chooseFile(e.dataTransfer.files[0]);
            }}
          >
            {!current && (
              <div className="upload-intro">
                <span className="upload-emblem">
                  <Icon name="upload" size={28} />
                </span>
                <h2>上传羚羊导出的 Excel</h2>
                <p>整理帖子、评论和作者信息，先得到一份可使用的名单。</p>
              </div>
            )}
            {current && (
              <div className="batch-info">
                <Icon name="file" size={22} />
                <div>
                  <strong>{current.name}</strong>
                  <small>
                    {completed.length} 位已完成 · {attention.length} 位需要处理
                  </small>
                </div>
              </div>
            )}
            <div className="inline-actions import-actions">
              <button
                className={`button ${current ? "secondary" : "primary"}`}
                disabled={!loaded || busy}
                onClick={() => upload.current?.click()}
              >
                {current ? "重新上传" : "选择数据文件"}
              </button>
              <button
                className={`button ${file ? "primary" : "secondary"}`}
                disabled={!loaded || busy}
                onClick={runSample}
              >
                {busy
                  ? "正在整理样本…"
                  : file
                    ? "预览示例结果"
                    : "体验示例数据"}
              </button>
              {busy && (
                <button
                  className="button secondary"
                  onClick={() => {
                    if (processingTimer.current)
                      clearTimeout(processingTimer.current);
                    setBusy(false);
                    patch({ dataState: "已取消" });
                  }}
                >
                  取消处理
                </button>
              )}
              {current && (
                <select
                  aria-label="切换数据批次"
                  value={w.batchId}
                  onChange={(e) => {
                    patch({ batchId: Number(e.target.value), selected: [] });
                    setFilter("AB");
                  }}
                >
                  {w.batches.map((b) => (
                    <option value={b.id} key={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {(file ||
              busy ||
              w.dataState === "已取消" ||
              w.dataState === "待补充") && (
              <div className="import-feedback" role="status">
                {file && <span>{file.name}</span>}
                <StatusPill status={w.dataState} />
              </div>
            )}
            {!current && (
              <p className="field-hint">
                文件入口仅预览固定样本，不读取真实文件内容。
              </p>
            )}
          </section>
          <section
            className={`surface screening-rules ${current ? "rules-compact" : ""}`}
          >
            {current ? (
              <div className="rules-short">
                <Disclosure
                  title={`本批次筛选规则 · ${(current.rules || w.rules).industry} · ${(current.rules || w.rules).region}`}
                >
                  <RuleSummary rules={current.rules || w.rules} />
                </Disclosure>
                <button
                  className="button secondary"
                  disabled={!loaded}
                  onClick={openRules}
                >
                  调整筛选规则
                </button>
              </div>
            ) : (
              <>
                <div className="section-heading">
                  <div>
                    <h2>本次筛选规则</h2>
                    <p>
                      {w.rules.industry} · {w.rules.region} · {w.rules.audience}
                    </p>
                  </div>
                  <button
                    className="button secondary"
                    disabled={!loaded}
                    onClick={openRules}
                  >
                    调整筛选规则
                  </button>
                </div>
                <RuleSummary rules={w.rules} />
              </>
            )}
            {current?.rules && current.rules.revision !== w.rules.revision && (
              <p className="rule-change-note">
                已保存新的筛选规则，将用于之后的分析。当前批次结果保持不变。
              </p>
            )}
          </section>
        </>
      )}
      <input
        className="visually-hidden"
        type="file"
        ref={upload}
        accept=".xlsx"
        aria-label="选择数据文件"
        onChange={(e) => {
          chooseFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {view !== "workflow" &&
        (rows.length ? (
          <section className="surface result-surface">
            <div className="section-heading result-heading">
              <div>
                <h2>
                  {view === "leads" ? "历史名单" : "筛选结果"}{" "}
                  <span className="count">{completed.length}</span>
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
                  ["AB", "A/B 潜客"],
                  ["ALL", "全部"],
                  ["A", "A 高意向"],
                  ["B", "B 有需求"],
                  ["C", "C 弱意向"],
                  ["D", "D 排除"],
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
              去上传数据
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
                    <p>小红书演示账号 · 私信</p>
                  </div>
                  <StatusPill
                    status={taskStatus(
                      Object.values(t.results),
                      t.paused,
                      w.accounts.小红书 !== "正常",
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
                        w.accounts.小红书 !== "正常",
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
                        w.accounts.小红书 !== "正常" ||
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
                        w.accounts.小红书 !== "正常" ||
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
        title="账号与规则"
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
          <h3>小红书账号</h3>
          <div className="connected-account">
            <span className="avatar tone-0">小</span>
            <div>
              <strong>
                {w.accounts.小红书 === "正常"
                  ? "小红书演示账号"
                  : "尚未连接账号"}
              </strong>
              <p role="status">登录状态：{w.accounts.小红书}</p>
            </div>
          </div>
          <p>状态由登录结果自动更新，无需手动填写。</p>
          <div className="inline-actions">
            <button className="button primary" onClick={startLogin}>
              {w.accounts.小红书 === "正常" ? "重新登录" : "登录小红书"}
            </button>
            {w.accounts.小红书 === "正常" && (
              <button
                className="button secondary"
                onClick={() => {
                  if (
                    window.confirm(
                      "断开连接后暂停受影响的发送和回复检查，草稿与历史保留。是否继续？",
                    )
                  )
                    patch({ accounts: { 小红书: "未授权" }, sender: "" });
                }}
              >
                断开连接
              </button>
            )}
          </div>
          <p className="field-hint">当前为交互演示，登录结果不连接真实账号。</p>
        </section>
        <section className="settings-section">
          <h3>筛选规则</h3>
          <p>
            {w.rules.industry} · {w.rules.region}
          </p>
          <p>{w.rules.audience}</p>
          <button className="button secondary" onClick={openRules}>
            查看和调整筛选规则
          </button>
        </section>
        <details
          className="settings-section signature-details"
          open={!identityOK}
        >
          <summary>沟通署名与体验素材</summary>
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
          <p className="field-hint">按沟通对象选择；不确定“姐妹”是否适用时用“哈喽”，不根据医美需求判断性别。</p>
          <label className="field">
            体验对应项目（可选）
            <input
              aria-label="体验对应项目"
              placeholder="填写实际做过的项目名称"
              value={w.outreach.project}
              onChange={(e) => patch({ outreach: {
                ...w.outreach, project: e.target.value, experienceConfirmed: false,
              } })}
            />
          </label>
          <label className="field">
            真实经历与推荐话术（可选）
            <textarea
              aria-label="真实体验素材"
              rows={3}
              maxLength={240}
              placeholder="填写你们确认过的原话，可直接包含“需要的话发你看看”等推荐句。"
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
            确认是发送者本人的真实经历，并同意用于沟通
          </label>
          <p className="field-hint">
            已确认且项目匹配时，按“打招呼 → 真实经历 → 按需推荐”生成；无对应素材时保留问题开场。修改素材后需重新确认。
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
              <small>演示提交，不发送真实消息</small>
            </div>
            <button
              className="button primary"
              disabled={!ready.length || Boolean(monitorError(w.monitor))}
              onClick={send}
            >
              确认发送 {ready.length} 条
            </button>
          </>
        }
      >
        <section className="settings-section">
          <h3>发送账号</h3>
          <label className="field">
            小红书账号
            <select
              aria-label="发送账号"
              value={w.accounts.小红书 === "正常" ? w.sender : ""}
              onChange={(e) => patch({ sender: e.target.value })}
            >
              <option value="" disabled>
                请选择可用账号
              </option>
              <option value="xhs" disabled={w.accounts.小红书 !== "正常"}>
                小红书演示账号 · {w.accounts.小红书}
              </option>
            </select>
          </label>
          {w.accounts.小红书 !== "正常" && (
            <p role="alert">
              没有可用账号。
              <button
                className="button text"
                onClick={() => openSettings(true)}
              >
                去设置
              </button>
            </p>
          )}
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
              <label className="field">
                拟发送内容
                <textarea
                  aria-label={`${l.name}的拟发送内容`}
                  value={w.queue.drafts[l.id] || ""}
                  onChange={(e) =>
                    patch({
                      queue: {
                        ...w.queue,
                        drafts: { ...w.queue.drafts, [l.id]: e.target.value },
                        edited: [...new Set([...w.queue.edited, l.id])],
                      },
                    })
                  }
                />
              </label>
              <p className="field-hint">体验分享式建议 · 请核对真实经历和推广说明，确认后再发送。</p>
              <div className="review-tools">
                <span>{`小红书 · ${w.accounts.小红书}`}</span>
                {w.accounts.小红书 !== "正常" && (
                  <button
                    className="button text"
                    onClick={() => openSettings(true)}
                  >
                    去设置
                  </button>
                )}
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
        <p>修改用于之后的分析，已有结果、人工判断和任务内容不变。</p>
        <p className="field-hint">
          当前原型保存规则及批次快照，示例分类固定；未接入模型分析。
        </p>
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
        open={loginOpen}
        title="登录小红书"
        className="login-sheet"
        onClose={closeLogin}
        footer={
          <button className="button secondary" onClick={closeLogin}>
            取消登录
          </button>
        }
      >
        <p>
          在这里扫码，并在手机上确认。登录结果由系统读取，扫码本身不代表已登录。
        </p>
        <div className="login-preview">
          <span className="subtle-tag">演示 · 不可扫码</span>
          <div
            className="qr-placeholder"
            aria-label="二维码展示占位，不是真实登录二维码"
          >
            <span>二维码展示区</span>
            <small>接入 RPA 后显示当前登录二维码</small>
          </div>
          <strong role="status">
            {loginStep === "waiting"
              ? "等待扫码"
              : loginStep === "scanned"
                ? "已扫码，等待手机确认"
                : loginStep === "expired"
                  ? "二维码已过期"
                  : "需要在登录窗口完成额外验证"}
          </strong>
          {loginStep === "expired" && (
            <button
              className="button secondary"
              onClick={() => setLoginStep("waiting")}
            >
              刷新二维码
            </button>
          )}
          {loginStep === "verification" && (
            <button
              className="button secondary"
              onClick={() =>
                setNotice(
                  "演示未连接登录窗口；正式环境在这里交由用户完成验证。",
                )
              }
            >
              打开登录窗口
            </button>
          )}
        </div>
        <p className="field-hint">
          二维码仅向当前用户临时展示，不存入名单或聊天。当前原型不读取验证码、不保存登录凭证。
        </p>
        <details className="demo-login-controls">
          <summary>演示登录过程</summary>
          <div className="inline-actions">
            <button
              className="button secondary"
              disabled={loginStep !== "waiting"}
              onClick={() => setLoginStep("scanned")}
            >
              模拟已扫码
            </button>
            <button
              className="button primary"
              disabled={loginStep !== "scanned"}
              onClick={finishDemoLogin}
            >
              模拟收到登录成功结果
            </button>
            <button
              className="button text"
              onClick={() => setLoginStep("expired")}
            >
              模拟二维码过期
            </button>
            <button
              className="button text"
              onClick={() => setLoginStep("verification")}
            >
              模拟额外验证
            </button>
          </div>
        </details>
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
              onClick={() => regenerate !== null && regenerateOne(regenerate)}
            >
              确认覆盖本条
            </button>
          </>
        }
      >
        <p>重新生成将覆盖这条手工编辑，其他正文保持不变。</p>
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
              <span>发送账号 · 小红书演示账号</span>
              <StatusPill status={w.accounts.小红书} />
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
              w.accounts.小红书 !== "正常" ||
              !identityOK ||
              Boolean(
                replyTask && reply && replyTask.todos[reply.lead] !== "待确认",
              )
            }
            onClick={() => {
              if (
                !reply ||
                !replyTask ||
                replyTask.paused ||
                replyTask.followups[reply.lead] ||
                w.accounts.小红书 !== "正常" ||
                !identityOK ||
                replyTask.todos[reply.lead] !== "待确认"
              )
                return;
              setW((old) => ({
                ...old,
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
        <label className="field">
          拟回复内容
          <textarea
            aria-label="拟回复内容"
            value={reply?.text || ""}
            onChange={(e) => {
              const text = e.target.value;
              setReply((r) => (r ? { ...r, text } : r));
              if (reply && replyTask) setTodo(replyTask, reply.lead, "处理中");
              if (reply)
                setReplyDrafts((d) => ({
                  ...d,
                  [`${reply.task}:${reply.lead}`]: text,
                }));
            }}
          />
        </label>
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
          disabled={!reply?.text.trim() || !identityOK}
          onClick={() => {
            if (reply && replyTask) setTodo(replyTask, reply.lead, "待确认");
          }}
        >
          内容已审核，进入待确认
        </button>
        <p>提交与发送结果分别记录。</p>
      </Sheet>
    </>
  );
}
