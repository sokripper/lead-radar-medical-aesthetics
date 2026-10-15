"use client";
import { useState } from "react";
import { StatusPill } from "./WorkspaceUI";
import {
  type ManagedAccount,
  type ManagedPlatform,
  type ManagedAccountStatus,
  accountDraftError,
  demoOperators,
} from "./account-management";

const blank = (): ManagedAccount => ({
  id: "", platform: "小红书", name: "", handle: "", parentId: "", status: "待运维", assignedTo: [],
});

export default function AccountAdmin({ accounts, onChange }: {
  accounts: ManagedAccount[];
  onChange: (accounts: ManagedAccount[]) => void;
}) {
  const [draft, setDraft] = useState<ManagedAccount | null>(null);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"全部" | ManagedPlatform>("全部");
  const primaryChoices = accounts.filter(account => account.platform === draft?.platform && !account.parentId && account.id !== editingId);
  const shown = accounts.filter(account => filter === "全部" || account.platform === filter);
  const open = (account?: ManagedAccount) => {
    setDraft(account ? { ...account, assignedTo: [...account.assignedTo] } : blank());
    setEditingId(account?.id || "");
    setError("");
  };
  const save = () => {
    if (!draft) return;
    const next = { ...draft, name: draft.name.trim(), handle: draft.handle.trim(), id: editingId || crypto.randomUUID() };
    const issue = accountDraftError(next, accounts, editingId);
    if (issue) { setError(issue); return; }
    onChange(editingId ? accounts.map(account => account.id === editingId ? next : account) : [...accounts, next]);
    setDraft(null);
  };
  return <>
    <div className="page-heading">
      <div><div className="eyebrow">MANAGEMENT</div><h1>账号管理</h1><p>维护平台账号与主子关系，并分配给操作人。</p></div>
      <button className="button primary" onClick={() => open()}>新增账号</button>
    </div>
    <p className="prototype-note">管理权限页面演示 · 原型暂未接入真实权限校验；分配与状态仅保存在当前浏览器。</p>
    <section className="surface admin-accounts">
      <div className="admin-accounts-header"><div><h2>平台账号</h2><p>个人侧只会看到分配给自己的可用账号，不展示登录或云电脑配置。</p></div>
        <label className="field">平台筛选<select aria-label="账号平台筛选" value={filter} onChange={event => setFilter(event.target.value as typeof filter)}><option>全部</option><option>小红书</option><option>抖音</option></select></label>
      </div>
      <div className="admin-account-list">
        {shown.map(account => <article className={`admin-account-row ${account.parentId ? "sub-account" : ""}`} key={account.id}>
          <div className="admin-account-main"><strong>{account.parentId ? "↳ " : ""}{account.name}</strong><small>{account.platform} · {account.parentId ? `子账号，归属 ${accounts.find(item => item.id === account.parentId)?.name || "未知主账号"}` : "主账号"} · {account.handle}</small></div>
          <div className="admin-account-people">{account.assignedTo.length ? account.assignedTo.join("、") : "未分配操作人"}</div>
          <StatusPill status={account.status} />
          <button className="button secondary" onClick={() => open(account)}>编辑与分配</button>
        </article>)}
        {!shown.length && <p className="table-empty">暂无此平台账号。</p>}
      </div>
    </section>
    {draft && <div className="admin-dialog-backdrop"><section role="dialog" aria-modal="true" aria-label={editingId ? "编辑与分配账号" : "新增平台账号"} className="admin-account-dialog">
      <div className="admin-dialog-shell">
        <header><h2>{editingId ? "编辑与分配账号" : "新增平台账号"}</h2><button className="icon-button" aria-label="关闭账号表单" onClick={() => setDraft(null)}>×</button></header>
        <div className="admin-dialog-body">
          <p className="field-hint">主子账号用于管理归属；每个执行账号仍需由运维独立维护本地登录。这里不填写云电脑、密码或验证码。</p>
          <div className="admin-account-form">
            <label className="field">平台<select aria-label="账号平台" value={draft.platform} onChange={event => setDraft({ ...draft, platform: event.target.value as ManagedPlatform, parentId: "", status: "待运维" })}><option>小红书</option><option>抖音</option></select></label>
            <label className="field">账号名称<input aria-label="账号名称" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="例如：小红书品牌号" /></label>
            <label className="field">平台账号标识<input aria-label="平台账号标识" value={draft.handle} onChange={event => setDraft({ ...draft, handle: event.target.value, status: "待运维" })} placeholder="平台 ID / 用户名" /></label>
            <label className="field">账号类型<select aria-label="账号类型" value={draft.parentId ? "子账号" : "主账号"} onChange={event => setDraft({ ...draft, parentId: event.target.value === "子账号" ? primaryChoices[0]?.id || "" : "" })}><option>主账号</option><option disabled={!primaryChoices.length}>子账号</option></select></label>
            {draft.parentId && <label className="field">所属主账号<select aria-label="所属主账号" value={draft.parentId} onChange={event => setDraft({ ...draft, parentId: event.target.value })}>{primaryChoices.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            <label className="field">账号状态<select aria-label="账号状态" value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as ManagedAccountStatus })}><option>待运维</option><option>正常</option><option>已失效</option><option>受限</option></select></label>
          </div>
          <fieldset className="admin-assignees"><legend>分配给操作人</legend>{demoOperators.map(operator => <label key={operator} className="checkbox-label"><input type="checkbox" checked={draft.assignedTo.includes(operator)} onChange={event => setDraft({ ...draft, assignedTo: event.target.checked ? [...draft.assignedTo, operator] : draft.assignedTo.filter(item => item !== operator) })} />{operator}</label>)}</fieldset>
          <p className="field-hint">状态为“正常”且已分配的账号才会出现在对应操作人的触达选择中。本原型的状态由管理侧模拟；正式环境应同步实际登录状态。</p>
          {error && <p className="notice" role="alert">{error}</p>}
        </div>
        <footer><button className="button secondary" onClick={() => setDraft(null)}>取消</button><button className="button primary" onClick={save}>保存账号</button></footer>
      </div>
    </section></div>}
  </>;
}
