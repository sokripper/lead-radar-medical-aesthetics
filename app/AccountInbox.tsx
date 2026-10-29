"use client";
import {useState} from 'react';
import type {ManagedAccount} from './account-management';
import type {InboxMessage} from './account-inbox';
import {StatusPill} from './WorkspaceUI';

type Props = {
  previewTools?:boolean;
  accounts:ManagedAccount[]; monitoring:Record<string,boolean>; messages:InboxMessage[];
  accountId:string|null; onAccount:(id:string|null)=>void; onToggle:(id:string)=>void;
  onSimulate:(id:string,unmatched:boolean)=>void;
};
export default function AccountInbox({previewTools=false,accounts,monitoring,messages,accountId,onAccount,onToggle,onSimulate}:Props) {
  const [selected,setSelected]=useState<string|null>(null);
  const [search,setSearch]=useState('');
  const [page,setPage]=useState(1);
  const account=accounts.find(a=>a.id===accountId);
  const accountMessages=messages.filter(m=>m.accountId===accountId);
  const filtered=accountMessages.filter(m=>`${m.userName} ${m.text}`.includes(search.trim()));
  const pages=Math.max(1,Math.ceil(filtered.length/10));
  const currentPage=Math.min(page,pages);
  const visible=filtered.slice((currentPage-1)*10,currentPage*10);
  const active=visible.find(m=>m.id===selected) || visible[0];
  const state=(a:ManagedAccount)=>a.status!=='正常'?'账号异常':monitoring[a.id]===false?'已暂停':'监控中';
  if(!account) return <section className="surface account-inbox-overview">
    <div className="section-heading"><div><h2>账号私信</h2><p>查看已分配社媒账号收到的私信。</p></div></div>
    {!accounts.length ? <div className="empty-state">暂无分配给你的社媒账号。</div> : <div className="table-wrap"><table className="account-inbox-table"><thead><tr><th>社媒账号</th><th>拉取状态</th><th>私信数量</th><th>最新私信</th><th>最近收信时间</th><th>操作</th></tr></thead><tbody>{accounts.map(a=>{
      const items=messages.filter(m=>m.accountId===a.id);
      return <tr key={a.id}><td><strong>{a.name}</strong><small>{a.platform} · {a.handle}</small></td><td><StatusPill status={state(a)} /></td><td>{items.length}</td><td><span className="inbox-latest">{items[0]?.text || '暂无私信'}</span></td><td>{items[0]?.receivedAt || '—'}</td><td><button className="button text" onClick={()=>{onAccount(a.id);setSelected(null);setSearch('');setPage(1);}}>查看私信</button></td></tr>;
    })}</tbody></table></div>}
  </section>;
  return <>
    <section className="surface inbox-account-head">
      <button className="button text" onClick={()=>onAccount(null)}>← 返回账号列表</button>
      <div className="inbox-account-title"><div className="inbox-account-avatar">{account.name[0]}</div><div><h2>{account.name}</h2><p>{account.platform} · {account.handle}</p></div><StatusPill status={state(account)} /><button className="button secondary" disabled={account.status!=='正常'} onClick={()=>onToggle(account.id)}>{monitoring[account.id]===false?'恢复拉取':'暂停拉取'}</button></div>
    </section>
    <section className="surface account-inbox-workspace inbox-readonly">
      <div className="account-inbox-toolbar"><input aria-label="搜索账号下的私信" placeholder="搜索用户或私信内容" value={search} onChange={e=>{setSearch(e.target.value);setSelected(null);setPage(1);}}/><span className="field-hint">共 {accountMessages.length} 条私信</span>{previewTools && <details className="inbox-demo"><summary>测试收信</summary><div><button className="button secondary" disabled={account.status!=='正常'||monitoring[account.id]===false} onClick={()=>onSimulate(account.id,false)}>模拟收到私信</button></div></details>}</div>
      {!accountMessages.length ? <div className="empty-state"><h3>这个账号还没有收到私信</h3><p>拉取到的私信将显示在这里。</p></div> : !filtered.length ? <div className="empty-state">没有符合条件的私信。</div> : <div className="account-inbox-columns">
        <div className="inbox-message-list"><div className="inbox-message-list-body">{visible.map(m=><button className={`inbox-message-item ${active?.id===m.id?'active':''}`} key={m.id} onClick={()=>setSelected(m.id)}><div><strong>{m.userName}</strong></div><p>{m.text}</p><small>{m.receivedAt}</small></button>)}</div><div className="inbox-pagination"><span>{filtered.length} 条</span><button className="button text" aria-label="上一页私信" disabled={currentPage===1} onClick={()=>{setPage(currentPage-1);setSelected(null);}}>‹</button><span>{currentPage}/{pages}</span><button className="button text" aria-label="下一页私信" disabled={currentPage===pages} onClick={()=>{setPage(currentPage+1);setSelected(null);}}>›</button></div></div>
        {active && <div className="inbox-message-detail"><div className="inbox-detail-title"><div><h3>{active.userName}</h3>{active.userId && <small>用户 ID：{active.userId}</small>}</div><span>{active.receivedAt}</span></div><div className="inbox-incoming-message"><span>收到的私信</span><p>{active.text}</p></div><p className="inbox-readonly-note">私信仅供查看，如需回复，请前往小红书。</p></div>}
      </div>}
    </section>
  </>;
}
