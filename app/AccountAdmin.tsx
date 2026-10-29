"use client";
import { useState } from "react";
import { StatusPill } from "./WorkspaceUI";
import {
  type ManagedAccount,
  type QuotaModel,
  type TenantQuota,
  type ManagedPlatform,
  type ManagedAccountStatus,
  accountDraftError,
  type PlatformMember,
  currentOperator,
  quotaRemaining,
} from "./account-management";

const blank = (): ManagedAccount => ({
  id: "", platform: "小红书", name: "", handle: "", status: "待运维", assignedTo: [],
});

export default function AccountAdmin({ accounts, onChange, quota, onQuotaChange, members, onMembersChange }: {
  members: PlatformMember[];
  onMembersChange: (members: PlatformMember[]) => void;
  accounts: ManagedAccount[];
  onChange: (accounts: ManagedAccount[]) => void;
  quota: TenantQuota;
  onQuotaChange: (quota: TenantQuota) => void;
}) {
  const [tab,setTab]=useState<"members"|"social"|"quota">("members");
  const [member,setMember]=useState<PlatformMember|null>(null);
  const [memberError,setMemberError]=useState("");
  const [memberSearch,setMemberSearch]=useState("");
  const memberName=(id:string)=>members.find(m=>m.id===id)?.name || id;
  const saveMember=()=>{
    if(!member) return;
    if(!member.name.trim() || !member.login.trim()){setMemberError("请填写成员姓名和登录账号。");return;}
    if(members.some(m=>m.id!==member.id && m.login===member.login.trim())){setMemberError("登录账号已存在。");return;}
    const next={...member,id:member.id || crypto.randomUUID(),name:member.name.trim(),login:member.login.trim()};
    onMembersChange(member.id?members.map(m=>m.id===member.id?next:m):[...members,next]);setMember(null);
  };
  const [draft, setDraft] = useState<ManagedAccount | null>(null);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"全部" | ManagedPlatform>("全部");
  const [quotaTotal, setQuotaTotal] = useState<Record<QuotaModel, string>>({ A: String(quota.A.total), G: String(quota.G.total) });
  const quotaModels: QuotaModel[] = ["A", "G"];
  const quotaStatus = quotaModels.some(model => quotaRemaining(quota, model) > 0) ? "额度正常" : "额度不足";
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
      <div><div className="eyebrow">MANAGEMENT</div><h1>账号管理</h1><p>管理本平台成员，以及分配给成员使用的社媒账号。</p></div>
      {tab==="social" && <button className="button primary" onClick={() => open()}>添加社媒账号</button>}
      {tab==="members" && <button className="button primary" onClick={()=>{setMember({id:"",name:"",login:"",role:"成员",enabled:true});setMemberError("");}}>添加平台成员</button>}
    </div>
    <nav className="management-tabs" aria-label="账号管理分类">{([['members','平台成员'],['social','社媒账号'],['quota','主体额度']] as const).map(([key,label])=><button key={key} aria-current={tab===key?'page':undefined} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}</nav>
    {tab==="members" && <section className="surface admin-accounts">
      <div className="admin-accounts-header"><div><h2>平台成员</h2><p>成员登录本平台；管理员维护成员、账号分配和主体额度。</p></div><label className="field">搜索成员<input aria-label="搜索平台成员" placeholder="姓名或登录账号" value={memberSearch} onChange={e=>setMemberSearch(e.target.value)}/></label></div>
      <div className="table-wrap"><table className="management-table"><thead><tr><th>成员</th><th>平台角色</th><th>已分配社媒账号</th><th>成员状态</th><th>操作</th></tr></thead><tbody>{members.filter(m=>`${m.name} ${m.login}`.includes(memberSearch.trim())).map(m=><tr key={m.id}><td><strong>{m.name}{m.id===currentOperator && <span className="member-current">当前成员</span>}</strong><small>登录账号：{m.login}</small></td><td>{m.role}<small>{m.role==='管理员'?'管理成员、账号与额度':'执行任务、查看分配账号的私信'}</small></td><td><div className="assigned-account-tags">{accounts.filter(a=>a.assignedTo.includes(m.id)).map(a=><span key={a.id}>{a.platform} · {a.name}</span>)}{!accounts.some(a=>a.assignedTo.includes(m.id))&&<span>未分配</span>}</div></td><td><span className={`member-state ${m.enabled?'enabled':''}`}>{m.enabled?'启用':'停用'}</span></td><td><button className="button text" onClick={()=>{setMember({...m});setMemberError("");}}>编辑成员</button></td></tr>)}</tbody></table></div>
      <p className="management-footnote">社媒账号的使用权限在“社媒账号”中分配。额度归当前主体共享。</p>
    </section>}
    {tab==="quota" && <>
    <section className="surface quota-overview" aria-label="主体共享触达额度">
      <div className="quota-heading">
        <div><h2>主体触达额度</h2></div>
        <StatusPill status={quotaStatus} />
      </div>
      <div className="quota-buckets">
        {quotaModels.map(model => {
          const bucket = quota[model];
          const remaining = quotaRemaining(quota, model);
          const usage = bucket.total ? Math.min(100, Math.round(((bucket.used + bucket.reserved) / bucket.total) * 100)) : 100;
          const label = `${model} 类模型额度`;
          return <section className={`quota-bucket quota-bucket-${model.toLowerCase()}`} key={model}>
            <header><div><strong>{label}</strong></div><b>{remaining.toLocaleString()} 可用</b></header>
            <div className="quota-metrics">
              <div><span>总额度</span><strong>{bucket.total.toLocaleString()}</strong></div>
              <div><span>已使用</span><strong>{bucket.used.toLocaleString()}</strong></div>
              <div><span>发送中预占</span><strong>{bucket.reserved.toLocaleString()}</strong></div>
            </div>
            <div className="quota-progress" aria-label={`${label}已使用 ${usage}%`}><i style={{ width: `${usage}%` }} /></div>
            <div className="quota-actions">
              <label className="field">登记总额度<input type="number" min={bucket.used + bucket.reserved} value={quotaTotal[model]} onChange={event => setQuotaTotal(old => ({ ...old, [model]: event.target.value }))} /></label>
              <button className="button secondary" onClick={() => {
                const total = Number(quotaTotal[model]);
                if (!Number.isFinite(total) || total < bucket.used + bucket.reserved) return;
                onQuotaChange({ ...quota, [model]: { ...bucket, total: Math.floor(total) } });
              }}>更新额度</button>
            </div>
          </section>;
        })}
      </div>
    </section>
    </>}
    {tab==="social" && <section className="surface admin-accounts">
      <div className="admin-accounts-header"><div><h2>社媒账号</h2><p>小红书、抖音账号独立管理，分配给本平台成员使用。</p></div>
        <label className="field">平台筛选<select aria-label="账号平台筛选" value={filter} onChange={event => setFilter(event.target.value as typeof filter)}><option>全部</option><option>小红书</option><option>抖音</option></select></label>
      </div>
      <div className="admin-account-list"><div className="admin-account-row admin-account-columns"><span>社媒账号</span><span>可使用的成员</span><span>登录状态</span><span>操作</span></div>
        {shown.map(account => <article className="admin-account-row" key={account.id}>
          <div className="admin-account-main"><strong>{account.name}</strong><small>{account.platform} · {account.handle}</small></div>
          <div className="admin-account-people">{account.assignedTo.length ? account.assignedTo.map(memberName).join("、") : "未分配成员"}</div>
          <StatusPill status={account.status} />
          <button className="button secondary" onClick={() => open(account)}>编辑与分配</button>
        </article>)}
        {!shown.length && <p className="table-empty">暂无此平台的社媒账号。</p>}
      </div>
    </section>}
    {draft && <div className="admin-dialog-backdrop"><section role="dialog" aria-modal="true" aria-label={editingId ? "编辑社媒账号" : "添加社媒账号"} className="admin-account-dialog">
      <div className="admin-dialog-shell">
        <header><h2>{editingId ? "编辑社媒账号" : "添加社媒账号"}</h2><button className="icon-button" aria-label="关闭账号表单" onClick={() => setDraft(null)}>×</button></header>
        <div className="admin-dialog-body">
          <p className="field-hint">账号由运维完成登录维护后使用；这里维护账号信息和成员分配。</p>
          <div className="admin-account-form">
            <label className="field">平台<select aria-label="账号平台" value={draft.platform} onChange={event => setDraft({ ...draft, platform: event.target.value as ManagedPlatform, status: "待运维" })}><option>小红书</option><option>抖音</option></select></label>
            <label className="field">账号名称<input aria-label="账号名称" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="例如：小红书品牌号" /></label>
            <label className="field">社媒账号标识<input aria-label="社媒账号标识" value={draft.handle} onChange={event => setDraft({ ...draft, handle: event.target.value, status: "待运维" })} placeholder="平台 ID / 用户名" /></label>
            <label className="field">登录状态<select aria-label="登录状态" value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as ManagedAccountStatus })}><option>待运维</option><option>正常</option><option>已失效</option><option>受限</option></select></label>
          </div>
          <fieldset className="admin-assignees"><legend>分配给平台成员</legend>{members.filter(m=>m.enabled).map(operator => <label key={operator.id} className="checkbox-label"><input type="checkbox" checked={draft.assignedTo.includes(operator.id)} onChange={event => setDraft({ ...draft, assignedTo: event.target.checked ? [...draft.assignedTo, operator.id] : draft.assignedTo.filter(item => item !== operator.id) })} />{operator.name}</label>)}</fieldset>
          <p className="field-hint">同一成员可以使用多个社媒账号，只有登录状态正常的账号可以执行评论任务。</p>
          {error && <p className="notice" role="alert">{error}</p>}
        </div>
        <footer><button className="button secondary" onClick={() => setDraft(null)}>取消</button><button className="button primary" onClick={save}>保存账号</button></footer>
      </div>
    </section></div>}
    {member && <div className="admin-dialog-backdrop"><section role="dialog" aria-modal="true" aria-label="平台成员设置" className="admin-account-dialog"><div className="admin-dialog-shell">
      <header><h2>{member.id?'编辑平台成员':'添加平台成员'}</h2><button className="icon-button" aria-label="关闭成员表单" onClick={()=>setMember(null)}>×</button></header>
      <div className="admin-dialog-body"><div className="admin-account-form">
        <label className="field">成员姓名<input aria-label="成员姓名" value={member.name} onChange={e=>setMember({...member,name:e.target.value})}/></label>
        <label className="field">平台登录账号<input aria-label="平台登录账号" value={member.login} onChange={e=>setMember({...member,login:e.target.value})}/></label>
        <label className="field">平台角色<select aria-label="平台角色" disabled={member.id===currentOperator} value={member.role} onChange={e=>setMember({...member,role:e.target.value as PlatformMember['role']})}><option>成员</option><option>管理员</option></select></label>
        <label className="field">成员状态<select aria-label="成员状态" disabled={member.id===currentOperator} value={member.enabled?'启用':'停用'} onChange={e=>setMember({...member,enabled:e.target.value==='启用'})}><option>启用</option><option>停用</option></select></label>
      </div><p className="field-hint">管理员可管理本主体的成员、社媒账号和额度；成员使用分配给自己的账号开展工作。</p>{member.id===currentOperator && <p className="field-hint">当前登录成员不能停用自己或取消自己的管理权限。</p>}<p className="field-hint">原型仅保存成员配置，不会创建真实登录凭据。</p>{memberError&&<p role="alert" className="notice">{memberError}</p>}</div>
      <footer><button className="button secondary" onClick={()=>setMember(null)}>取消</button><button className="button primary" onClick={saveMember}>保存成员</button></footer>
    </div></section></div>}
  </>;
}
